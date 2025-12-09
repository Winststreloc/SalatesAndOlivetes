'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { handleError, createErrorContext } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

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
  
  const supabase = await createServerSideClient()
  const { data: coupleData } = await supabase
    .from('couples')
    .select('preferences')
    .eq('id', user.couple_id)
    .single()
  
  const couplePrefs = coupleData?.preferences || {}
  const useAI = couplePrefs.useAI !== false
  
  if (!useAI) {
    logger.info('AI generation disabled in couple preferences', {
      dishId,
      dishName,
      coupleId: user.couple_id
    })
    return { success: false, skipped: true, reason: 'AI_DISABLED' }
  }
  
  const dishNameLower = dishName.toLowerCase().trim()
  const { data: cached } = await supabase
    .from('dish_cache')
    .select('ingredients, recipe, calories')
    .eq('dish_name_lower', dishNameLower)
    .eq('lang', lang)
    .single()
  
  let ingredients: any[] = []
  let recipe: string = ''
  let calories: number | null = null
  
  if (cached) {
    ingredients = cached.ingredients || []
    recipe = cached.recipe || ''
    calories = cached.calories ?? null
    
    await supabase
      .from('dish_cache')
      .update({ usage_count: (cached as any).usage_count + 1 })
      .eq('dish_name_lower', dishNameLower)
      .eq('lang', lang)
  } else {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-robotics-er-1.5-preview' })
      
      const prompt = `You are a chef assistant. Your task is to validate if the input is a food-related dish name and generate ingredients/recipe plus an estimated calorie count.

IMPORTANT VALIDATION RULES:
1. If the input is NOT related to food/cooking (e.g., programming questions, general questions, commands, spam, non-food items), return: {"error": "INVALID_INPUT", "message": "${lang === 'ru' ? 'Это не название блюда, связанное с едой. Пожалуйста, введите валидное название блюда.' : 'This is not a food-related dish name. Please enter a valid dish name.'}"}
2. If the input IS a valid dish name, proceed with generating ingredients and recipe.

If valid, generate a JSON object with:
- 'ingredients': array of ingredients, each with 'name' (string), 'amount' (number or string), 'unit' (string, e.g. kg, g, pcs, ml)
- 'recipe': string with cooking instructions (markdown allowed)
- 'calories': integer number with estimated total kcal for the whole dish (not per 100g)

Language of output: ${lang === 'ru' ? 'Russian' : 'English'}.
Return ONLY valid JSON, no other text.

Input: ${dishName}`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const content = response.text()
      
      let jsonContent = content.trim()
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }
      
      const parsed = JSON.parse(jsonContent || '{}')
      
      if (parsed.error === 'INVALID_INPUT') {
        const validationError = new Error(parsed.message || (lang === 'ru' ? 'Пожалуйста, введите валидное название блюда (только связанное с едой)' : 'Please enter a valid dish name (food-related only)'))
        handleError(validationError, createErrorContext('generateDishIngredients', {
          type: 'VALIDATION_ERROR',
          userId: String(user.telegram_id),
          coupleId: user.couple_id,
          metadata: { dishName, dishId, lang },
          showToast: false,
        }))
        throw validationError
      }
      
      if (Array.isArray(parsed.ingredients)) {
          ingredients = parsed.ingredients
      }
      if (parsed.recipe) {
          recipe = parsed.recipe
      }
      if (parsed.calories !== undefined && parsed.calories !== null && !Number.isNaN(Number(parsed.calories))) {
          calories = Number(parsed.calories)
      }
      
      if (ingredients.length > 0 || recipe) {
        await supabase
          .from('dish_cache')
          .upsert({
            dish_name: dishName,
            dish_name_lower: dishNameLower,
            ingredients: ingredients,
            recipe: recipe,
            calories: calories,
            lang: lang,
            usage_count: 1
          }, {
            onConflict: 'dish_name_lower,lang'
          })
      }
    } catch (e: any) {
      if (e.message && (e.message.includes('valid dish name') || e.message.includes('INVALID_INPUT') || e.message.includes('не название блюда') || e.message.includes('not a food-related'))) {
        throw e
      }
      
      handleError(e, createErrorContext('generateDishIngredients', {
        type: 'AI_ERROR',
        userId: String(user.telegram_id),
        coupleId: user.couple_id,
        metadata: { dishName, dishId, lang },
        showToast: false,
      }))
    }
  }

  const dishUpdate: Record<string, any> = {}
  if (recipe) dishUpdate.recipe = recipe
  if (calories !== null && calories !== undefined) dishUpdate.calories = calories
  if (Object.keys(dishUpdate).length > 0) {
      await supabase.from('dishes').update(dishUpdate).eq('id', dishId)
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
  
  return { success: true }
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
            prompt = `You are a home cook. Suggest 4 distinct simple, everyday home-style dinner ideas based on preferences.
Return ONLY a JSON object with a key 'ideas' containing an array of strings (dish names).
Language of output: ${lang === 'ru' ? 'Russian' : 'English'}.

${hasAnyPreferences ? `Preferred Sides: ${sides.join(', ') || 'Any'}
Preferred Proteins: ${proteins.join(', ') || 'Any'}
Preferred Veggies: ${veggies.join(', ') || 'Any'}
Treats/Cheat meal desires: ${treats.join(', ') || 'None'}` : 'No specific preferences - suggest common home meals.'}

Guidelines:
1. Suggest SIMPLE, EVERYDAY home-style dishes (like \"гречка с сосисками\", \"макароны с котлетой\", \"рис с курицей\").
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


