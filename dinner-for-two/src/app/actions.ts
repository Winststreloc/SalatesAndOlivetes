'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Initialize Google Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

export async function addDish(dishName: string, dayOfWeek?: number) {
  const user = await getUserFromSession()
  if (!user) {
    console.error('addDish: No user session')
    throw new Error('Unauthorized: Please log in')
  }
  if (!user.couple_id) {
    console.error('addDish: User has no couple_id', user.telegram_id)
    throw new Error('Unauthorized: Please create or join a couple first')
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
    
  if (error) throw new Error(error.message)

  revalidatePath('/')
  return dish
}

export async function generateDishIngredients(dishId: string, dishName: string, lang: 'en' | 'ru' = 'ru') {
  const user = await getUserFromSession()
  if (!user) {
    console.error('generateDishIngredients: No user session')
    return { success: false }
  }
  if (!user.couple_id) {
    console.error('generateDishIngredients: User has no couple_id', user.telegram_id)
    return { success: false }
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
      
      const prompt = `You are a chef. 
Generate a JSON object with a key 'ingredients' containing a list of ingredients for the dish and a key 'recipe' containing cooking instructions.
Language of output: ${lang === 'ru' ? 'Russian' : 'English'}.

Each ingredient must have:
- 'name' (string, ${lang === 'ru' ? 'in Russian' : 'in English'})
- 'amount' (number or string)
- 'unit' (string, e.g. kg, g, pcs, ml)

The 'recipe' should be a string with steps formatted nicely (markdown allowed).
Return ONLY valid JSON, no other text.

Dish: ${dishName}`

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
    } catch (e) {
      console.error('AI Generation failed', e)
      // Don't fail the whole action, just skip AI part
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
    
    await supabase.from('ingredients').insert(ingredientsToInsert)
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
    console.error('moveDish: No user session')
    throw new Error('Unauthorized: Please log in')
  }
  if (!user.couple_id) {
    console.error('moveDish: User has no couple_id', user.telegram_id)
    throw new Error('Unauthorized: Please create or join a couple first')
  }
  
  const supabase = await createServerSideClient()
  
  const { error } = await supabase
    .from('dishes')
    .update({ day_of_week: dayOfWeek })
    .eq('id', dishId)
    .eq('couple_id', user.couple_id)

  if (error) throw new Error(error.message)
    
  revalidatePath('/')
}

export async function toggleIngredientsPurchased(ingredientIds: string[], isPurchased: boolean) {
   const user = await getUserFromSession()
   if (!user) {
     console.error('toggleIngredientsPurchased: No user session')
     throw new Error('Unauthorized: Please log in')
   }
   if (!user.couple_id) {
     console.error('toggleIngredientsPurchased: User has no couple_id', user.telegram_id)
     throw new Error('Unauthorized: Please create or join a couple first')
   }

   const supabase = await createServerSideClient()
   const { error } = await supabase.from('ingredients').update({ is_purchased: isPurchased }).in('id', ingredientIds)
   
   if (error) throw new Error(error.message)
   
   revalidatePath('/')
}

export async function deleteDish(dishId: string) {
    const user = await getUserFromSession()
    if (!user) {
      console.error('deleteDish: No user session')
      throw new Error('Unauthorized: Please log in')
    }
    if (!user.couple_id) {
      console.error('deleteDish: User has no couple_id', user.telegram_id)
      throw new Error('Unauthorized: Please create or join a couple first')
    }
    
    const supabase = await createServerSideClient()

    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', dishId)
      .eq('couple_id', user.couple_id)
      
    if (error) throw new Error(error.message)
    
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

// Logout is now handled via API route /api/auth/logout
// This function is kept for backward compatibility but redirects to home
export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
    redirect('/')
}
