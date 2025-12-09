'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { handleError, createErrorContext } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'

// Initialize Google Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

export async function addDish(dishName: string, dayOfWeek?: number) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('addDish', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false, // Will be handled by caller
    }))
    throw error
  }
  if (!user.couple_id) {
    const error = new Error('Unauthorized: Please create or join a couple first')
    handleError(error, createErrorContext('addDish', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      showToast: false, // Will be handled by caller
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  const { data: dish, error } = await supabase
    .from('dishes')
    .insert({
      couple_id: user.couple_id,
      name: dishName,
      status: 'proposed',
      day_of_week: dayOfWeek,
      created_by: user.telegram_id
    })
    .select()
    .single()
    
  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('addDish', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      coupleId: user.couple_id,
      metadata: { dishName, dayOfWeek },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
  return dish
}

export async function generateDishIngredients(dishId: string, dishName: string, lang: 'en' | 'ru' = 'ru') {
  const user = await getUserFromSession()
  if (!user) {
    handleError(new Error('No user session'), createErrorContext('generateDishIngredients', {
      type: 'AUTH_ERROR',
      showToast: false,
    }))
    return { success: false }
  }
  if (!user.couple_id) {
    handleError(new Error('User has no couple_id'), createErrorContext('generateDishIngredients', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      showToast: false,
    }))
    return { success: false }
  }
  
  // Check if AI is disabled in couple preferences
  const supabase = await createServerSideClient()
  const { data: coupleData } = await supabase
    .from('couples')
    .select('preferences')
    .eq('id', user.couple_id)
    .single()
  
  const couplePrefs = coupleData?.preferences || {}
  const useAI = couplePrefs.useAI !== false // Default to true if not set
  
  if (!useAI) {
    logger.info('AI generation disabled in couple preferences', {
      dishId,
      dishName,
      coupleId: user.couple_id
    })
    return { success: false, skipped: true, reason: 'AI_DISABLED' }
  }
  
  const supabase = await createServerSideClient()
  
  // Check cache first
  const dishNameLower = dishName.toLowerCase().trim()
  const { data: cached } = await supabase
    .from('dish_cache')
    .select('ingredients, recipe')
    .eq('dish_name_lower', dishNameLower)
    .eq('lang', lang)
    .single()
  
  let ingredients: any[] = []
  let recipe: string = ''
  
  if (cached) {
    // Use cached data
    console.log('Using cached data for:', dishName)
    ingredients = cached.ingredients || []
    recipe = cached.recipe || ''
    
    // Update usage count
    await supabase
      .from('dish_cache')
      .update({ usage_count: (cached as any).usage_count + 1 })
      .eq('dish_name_lower', dishNameLower)
      .eq('lang', lang)
  } else {
    // Generate new data
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-robotics-er-1.5-preview' })
      
      const prompt = `You are a chef assistant. Your task is to validate if the input is a food-related dish name and generate ingredients/recipe.

IMPORTANT VALIDATION RULES:
1. If the input is NOT related to food/cooking (e.g., programming questions, general questions, commands, spam, non-food items), return: {"error": "INVALID_INPUT", "message": "${lang === 'ru' ? 'Это не название блюда, связанное с едой. Пожалуйста, введите валидное название блюда.' : 'This is not a food-related dish name. Please enter a valid dish name.'}"}
2. If the input IS a valid dish name, proceed with generating ingredients and recipe.

If valid, generate a JSON object with:
- 'ingredients': array of ingredients, each with 'name' (string), 'amount' (number or string), 'unit' (string, e.g. kg, g, pcs, ml)
- 'recipe': string with cooking instructions (markdown allowed)

Language of output: ${lang === 'ru' ? 'Russian' : 'English'}.
Return ONLY valid JSON, no other text.

Input: ${dishName}`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const content = response.text()
      
      // Try to extract JSON from response (might have markdown code blocks)
      let jsonContent = content.trim()
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }
      
      const parsed = JSON.parse(jsonContent || '{}')
      
      // Check if AI returned an error (invalid input)
      if (parsed.error === 'INVALID_INPUT') {
        const validationError = new Error(parsed.message || (lang === 'ru' ? 'Пожалуйста, введите валидное название блюда (только связанное с едой)' : 'Please enter a valid dish name (food-related only)'))
        handleError(validationError, createErrorContext('generateDishIngredients', {
          type: 'VALIDATION_ERROR',
          userId: String(user.telegram_id),
          coupleId: user.couple_id,
          metadata: { dishName, dishId, lang },
          showToast: false, // Will be handled by caller
        }))
        throw validationError
      }
      
      if (Array.isArray(parsed.ingredients)) {
          ingredients = parsed.ingredients
      }
      if (parsed.recipe) {
          recipe = parsed.recipe
      }
      
      // Save to cache
      if (ingredients.length > 0 || recipe) {
        await supabase
          .from('dish_cache')
          .upsert({
            dish_name: dishName,
            dish_name_lower: dishNameLower,
            ingredients: ingredients,
            recipe: recipe,
            lang: lang,
            usage_count: 1
          }, {
            onConflict: 'dish_name_lower,lang'
          })
      }
    } catch (e: any) {
      // If it's a validation error, re-throw it to show to user
      if (e.message && (e.message.includes('valid dish name') || e.message.includes('INVALID_INPUT') || e.message.includes('не название блюда') || e.message.includes('not a food-related'))) {
        throw e // Already logged above
      }
      
      // Log other AI errors
      handleError(e, createErrorContext('generateDishIngredients', {
        type: 'AI_ERROR',
        userId: String(user.telegram_id),
        coupleId: user.couple_id,
        metadata: { dishName, dishId, lang },
        showToast: false, // Don't show toast for AI errors, just log
      }))
      // For other errors, don't fail the whole action, just skip AI part
    }
  }

  // Update dish with recipe
  if (recipe) {
      await supabase.from('dishes').update({ recipe }).eq('id', dishId)
  }

  if (ingredients.length > 0) {
    const ingredientsToInsert = ingredients.map((ing: any) => ({
      dish_id: dishId,
      name: ing.name,
      amount: String(ing.amount),
      unit: ing.unit,
    }))
    
    logger.info('Inserting ingredients into database', {
      dishId,
      dishName,
      count: ingredientsToInsert.length,
      ingredients: ingredientsToInsert.map(ing => ({ name: ing.name, amount: ing.amount, unit: ing.unit }))
    })
    
    const { data, error } = await supabase.from('ingredients').insert(ingredientsToInsert)
    
    if (error) {
      logger.error('Failed to insert ingredients', error, {
        dishId,
        dishName,
        count: ingredientsToInsert.length
      })
    } else {
      logger.info('Successfully inserted ingredients', {
        dishId,
        dishName,
        count: ingredientsToInsert.length,
        insertedIds: data
      })
    }
  }
  
  revalidatePath('/')
  return { success: true }
}


export async function getDishes() {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) return []

  const supabase = await createServerSideClient()
  
  const { data } = await supabase
    .from('dishes')
    .select('*, ingredients(*)')
    .eq('couple_id', user.couple_id)
    .order('day_of_week', { ascending: true }) // Order by day
    .order('created_at', { ascending: false })
    
  return data || []
}

export async function getDish(dishId: string) {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) return null

  const supabase = await createServerSideClient()
  
  const { data } = await supabase
    .from('dishes')
    .select('*, ingredients(*)')
    .eq('id', dishId)
    .eq('couple_id', user.couple_id)
    .single()
    
  return data
}

export async function hasPartner() {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) return false

  const supabase = await createServerSideClient()
  
  // Get all users in the couple
  const { data: users, error } = await supabase
    .from('users')
    .select('telegram_id')
    .eq('couple_id', user.couple_id)
  
  if (error || !users) return false
  
  // Check if there are at least 2 users in the couple
  return users.length >= 2
}

export async function toggleDishSelection(dishId: string, isSelected: boolean) {
  const user = await getUserFromSession()
  if (!user) {
    console.error('toggleDishSelection: No user session')
    throw new Error('Unauthorized: Please log in')
  }
  if (!user.couple_id) {
    console.error('toggleDishSelection: User has no couple_id', user.telegram_id)
    throw new Error('Unauthorized: Please create or join a couple first')
  }
  
  const supabase = await createServerSideClient()
  
  // Get dish to check if user is the creator
  const { data: dish } = await supabase
    .from('dishes')
    .select('created_by, status')
    .eq('id', dishId)
    .eq('couple_id', user.couple_id)
    .single()
  
  if (!dish) {
    throw new Error('Dish not found')
  }
  
  // Only partner (not creator) can approve/disapprove
  if (dish.created_by === user.telegram_id) {
    throw new Error('You cannot approve your own dish. Only your partner can approve it.')
  }
  
  const { error } = await supabase
    .from('dishes')
    .update({ status: isSelected ? 'selected' : 'proposed' })
    .eq('id', dishId)
    .eq('couple_id', user.couple_id)

  if (error) throw new Error(error.message)
    
  revalidatePath('/')
}

export async function moveDish(dishId: string, dayOfWeek: number) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('moveDish', {
      type: 'AUTH_ERROR',
      showToast: false,
    }))
    throw error
  }
  if (!user.couple_id) {
    const error = new Error('Unauthorized: Please create or join a couple first')
    handleError(error, createErrorContext('moveDish', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      showToast: false,
    }))
    throw error
  }
  
  const supabase = await createServerSideClient()
  
  const { error } = await supabase
    .from('dishes')
    .update({ day_of_week: dayOfWeek })
    .eq('id', dishId)
    .eq('couple_id', user.couple_id)

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('moveDish', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      coupleId: user.couple_id,
      metadata: { dishId, dayOfWeek },
      showToast: false,
    }))
    throw dbError
  }
    
  revalidatePath('/')
}

export async function toggleIngredientsPurchased(ingredientIds: string[], isPurchased: boolean) {
   const user = await getUserFromSession()
   if (!user) {
     const error = new Error('Unauthorized: Please log in')
     handleError(error, createErrorContext('toggleIngredientsPurchased', {
       type: 'AUTH_ERROR',
       showToast: false,
     }))
     throw error
   }
   if (!user.couple_id) {
     const error = new Error('Unauthorized: Please create or join a couple first')
     handleError(error, createErrorContext('toggleIngredientsPurchased', {
       type: 'AUTH_ERROR',
       userId: String(user.telegram_id),
       showToast: false,
     }))
     throw error
   }

   const supabase = await createServerSideClient()
   
   // Try to update dish ingredients first
   const { error: dishError } = await supabase
     .from('ingredients')
     .update({ is_purchased: isPurchased })
     .in('id', ingredientIds)
   
   // If no dish ingredients found, try manual ingredients
   if (dishError) {
     const { error: manualError } = await supabase
       .from('manual_ingredients')
       .update({ is_purchased: isPurchased })
       .in('id', ingredientIds)
       .eq('couple_id', user.couple_id)
     
     if (manualError) {
       const dbError = new Error(manualError.message)
       handleError(dbError, createErrorContext('toggleIngredientsPurchased', {
         type: 'DATABASE_ERROR',
         userId: String(user.telegram_id),
         coupleId: user.couple_id,
         metadata: { ingredientIds, isPurchased },
         showToast: false,
       }))
       throw dbError
     }
   }
   
   revalidatePath('/')
}

export async function deleteDish(dishId: string) {
    const user = await getUserFromSession()
    if (!user) {
      const error = new Error('Unauthorized: Please log in')
      handleError(error, createErrorContext('deleteDish', {
        type: 'AUTH_ERROR',
        showToast: false,
      }))
      throw error
    }
    if (!user.couple_id) {
      const error = new Error('Unauthorized: Please create or join a couple first')
      handleError(error, createErrorContext('deleteDish', {
        type: 'AUTH_ERROR',
        userId: String(user.telegram_id),
        showToast: false,
      }))
      throw error
    }
    
    const supabase = await createServerSideClient()
    
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', dishId)
      .eq('couple_id', user.couple_id)
      
    if (error) {
      const dbError = new Error(error.message)
      handleError(dbError, createErrorContext('deleteDish', {
        type: 'DATABASE_ERROR',
        userId: String(user.telegram_id),
        coupleId: user.couple_id,
        metadata: { dishId },
        showToast: false,
      }))
      throw dbError
    }
    
    revalidatePath('/')
}

export async function getInviteCode() {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) return null

    const supabase = await createServerSideClient()
    const { data } = await supabase
        .from('couples')
        .select('invite_code')
        .eq('id', user.couple_id)
        .single()
        
    return data?.invite_code
}

// User Preferences Actions

export async function updatePreferences(prefs: any) {
    const user = await getUserFromSession()
    if (!user) {
      console.error('updatePreferences: No user session')
      throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    const { error } = await supabase
        .from('users')
        .update({ preferences: prefs })
        .eq('telegram_id', user.telegram_id)
        
    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function getPreferences() {
    const user = await getUserFromSession()
    if (!user) return {}
    
    const supabase = await createServerSideClient()
    const { data } = await supabase
        .from('users')
        .select('preferences')
        .eq('telegram_id', user.telegram_id)
        .single()
        
    return data?.preferences || {}
}

export async function getCouplePreferences() {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) return { useAI: true }
    
    const supabase = await createServerSideClient()
    const { data } = await supabase
        .from('couples')
        .select('preferences')
        .eq('id', user.couple_id)
        .single()
        
    return data?.preferences || { useAI: true }
}

export async function updateCouplePreferences(preferences: Record<string, any>) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in and join a couple')
    }
    
    const supabase = await createServerSideClient()
    const { error } = await supabase
        .from('couples')
        .update({ preferences })
        .eq('id', user.couple_id)
        
    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function generateIdeas(lang: 'en' | 'ru' = 'ru') {
    const user = await getUserFromSession()
    if (!user) {
      console.error('generateIdeas: No user session')
      return []
    }
    
    const supabase = await createServerSideClient()
    const { data } = await supabase
        .from('users')
        .select('preferences')
        .eq('telegram_id', user.telegram_id)
        .single()
        
    const prefs = data?.preferences || {}
    const sides = prefs.sides || []
    const proteins = prefs.proteins || []
    const veggies = prefs.veggies || []
    const treats = prefs.treats || []
    const cuisines = prefs.cuisines || []
    
    const hasAnyPreferences = [...sides, ...proteins, ...veggies, ...treats, ...cuisines].length > 0
    const hasCuisine = cuisines.length > 0
    
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-robotics-er-1.5-preview' })
        
        let prompt = ''
        
        if (hasCuisine) {
            // Restaurant-style dishes when cuisine is selected
            prompt = `You are a creative chef. Suggest 4 distinct restaurant-style dinner ideas based on preferences.
Return ONLY a JSON object with a key 'ideas' containing an array of strings (dish names).
Language of output: ${lang === 'ru' ? 'Russian' : 'English'}.

Preferred Sides: ${sides.join(', ') || 'Any'}
Preferred Proteins: ${proteins.join(', ') || 'Any'}
Preferred Veggies: ${veggies.join(', ') || 'Any'}
Cuisines: ${cuisines.join(', ')}
Treats/Cheat meal desires: ${treats.join(', ') || 'None'}

Guidelines:
1. Suggest RESTAURANT-STYLE dishes from the selected cuisines (${cuisines.join(', ')}).
2. Use authentic names and cooking techniques from these cuisines.
3. Make dishes sophisticated and restaurant-quality.
4. If 'Treats' are selected, include at least one option from there.
5. Suggest COMPLETE dish names with proper cuisine terminology.

Return ONLY valid JSON, no other text.`
        } else {
            // Simple home-style dishes when no cuisine is selected
            prompt = `You are a home cook. Suggest 4 distinct simple, everyday home-style dinner ideas based on preferences.
Return ONLY a JSON object with a key 'ideas' containing an array of strings (dish names).
Language of output: ${lang === 'ru' ? 'Russian' : 'English'}.

${hasAnyPreferences ? `Preferred Sides: ${sides.join(', ') || 'Any'}
Preferred Proteins: ${proteins.join(', ') || 'Any'}
Preferred Veggies: ${veggies.join(', ') || 'Any'}
Treats/Cheat meal desires: ${treats.join(', ') || 'None'}` : 'No specific preferences - suggest common home meals.'}

Guidelines:
1. Suggest SIMPLE, EVERYDAY home-style dishes (like "гречка с сосисками", "макароны с котлетой", "рис с курицей").
2. Use common, accessible ingredients that people cook at home regularly.
3. Keep dishes practical and easy to prepare.
4. Avoid fancy restaurant names - use simple, straightforward dish descriptions.
5. If preferences are provided, use them, but keep it simple and homey.
6. Suggest COMPLETE dish names in simple language.

Examples of good home-style dishes: гречка с сосисками, макароны с фаршем, рис с курицей, картошка с котлетой, плов, борщ, суп с фрикадельками.

Return ONLY valid JSON, no other text.`
        }

        const result = await model.generateContent(prompt)
        const response = await result.response
        const content = response.text()
        
        // Try to extract JSON from response (might have markdown code blocks)
        let jsonContent = content.trim()
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '')
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '')
        }
        
        const parsed = JSON.parse(jsonContent || '{}')
        return Array.isArray(parsed.ideas) ? parsed.ideas : []
    } catch (e) {
        console.error(e)
        return []
    }
}

// Weekly Plans History

export async function saveWeeklyPlan(weekStartDate: string, dishes: any[]) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { error } = await supabase
        .from('weekly_plans')
        .upsert({
            couple_id: user.couple_id,
            week_start_date: weekStartDate,
            dishes: dishes
        }, {
            onConflict: 'couple_id,week_start_date'
        })
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}

export async function getWeeklyPlans() {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) return []
    
    const supabase = await createServerSideClient()
    
    const { data } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('couple_id', user.couple_id)
        .order('week_start_date', { ascending: false })
        .limit(20) // Last 20 weeks
    
    return data || []
}

export async function loadWeeklyPlan(planId: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('id', planId)
        .eq('couple_id', user.couple_id)
        .single()
    
    if (error) throw new Error(error.message)
    return data
}

export async function deleteWeeklyPlan(planId: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { error } = await supabase
        .from('weekly_plans')
        .delete()
        .eq('id', planId)
        .eq('couple_id', user.couple_id)
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}

// Manual Ingredients Management

export async function addManualIngredient(name: string, amount?: string, unit?: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { data, error } = await supabase
        .from('manual_ingredients')
        .insert({
            couple_id: user.couple_id,
            name: name.trim(),
            amount: amount || '',
            unit: unit || '',
            is_purchased: false
        })
        .select()
        .single()
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return data
}

export async function updateManualIngredient(ingredientId: string, name?: string, amount?: string, unit?: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (amount !== undefined) updates.amount = amount
    if (unit !== undefined) updates.unit = unit
    
    const { error } = await supabase
        .from('manual_ingredients')
        .update(updates)
        .eq('id', ingredientId)
        .eq('couple_id', user.couple_id)
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}

export async function deleteManualIngredient(ingredientId: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { error } = await supabase
        .from('manual_ingredients')
        .delete()
        .eq('id', ingredientId)
        .eq('couple_id', user.couple_id)
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}

export async function deleteIngredient(ingredientId: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', ingredientId)
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}

export async function updateIngredient(ingredientId: string, name?: string, amount?: string, unit?: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (amount !== undefined) updates.amount = amount
    if (unit !== undefined) updates.unit = unit
    
    const { error } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', ingredientId)
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}

export async function getManualIngredients() {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) return []
    
    const supabase = await createServerSideClient()
    
    const { data } = await supabase
        .from('manual_ingredients')
        .select('*')
        .eq('couple_id', user.couple_id)
        .order('created_at', { ascending: false })
    
    return data || []
}

// Logout is now handled via API route /api/auth/logout
// This function is kept for backward compatibility but redirects to home
export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
    redirect('/')
}
