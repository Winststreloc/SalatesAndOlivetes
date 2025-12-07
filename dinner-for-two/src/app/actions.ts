'use server'

import OpenAI from 'openai'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// ... (rest of imports and openai client) ...
const openai = new OpenAI({
  apiKey: process.env.AIML_API_KEY,
  baseURL: "https://api.aimlapi.com/v1",
})

export async function addDish(dishName: string, dayOfWeek?: number) {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) throw new Error('Unauthorized')

  const supabase = await createServerSideClient()

  const { data: dish, error } = await supabase
    .from('dishes')
    .insert({
      couple_id: user.couple_id,
      name: dishName,
      status: 'proposed',
      day_of_week: dayOfWeek 
    })
    .select()
    .single()
    
  if (error) throw new Error(error.message)

  revalidatePath('/')
  return dish
}

export async function generateDishIngredients(dishId: string, dishName: string, lang: 'en' | 'ru' = 'ru') {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) throw new Error('Unauthorized')
  
  const supabase = await createServerSideClient()
  
  let ingredients: any[] = []
  let recipe: string = ''
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are a chef. 
          Generate a JSON object with a key 'ingredients' containing a list of ingredients for the dish and a key 'recipe' containing cooking instructions.
          Language of output: ${lang === 'ru' ? 'Russian' : 'English'}.
          
          Each ingredient must have:
          - 'name' (string, ${lang === 'ru' ? 'in Russian' : 'in English'})
          - 'amount' (number or string)
          - 'unit' (string, e.g. kg, g, pcs, ml)
          
          The 'recipe' should be a string with steps formatted nicely (markdown allowed).
          Return ONLY JSON.` 
        },
        { role: "user", content: `Dish: ${dishName}` }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content
    const parsed = JSON.parse(content || '{}')
    
    if (Array.isArray(parsed.ingredients)) {
        ingredients = parsed.ingredients
    }
    if (parsed.recipe) {
        recipe = parsed.recipe
    }
  } catch (e) {
    console.error('AI Generation failed', e)
    // Don't fail the whole action, just skip AI part
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
  if (!user || !user.couple_id) throw new Error('Unauthorized')
  
  const supabase = await createServerSideClient()
  
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
  if (!user || !user.couple_id) throw new Error('Unauthorized')
  
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
   if (!user || !user.couple_id) throw new Error('Unauthorized')

   const supabase = await createServerSideClient()
   const { error } = await supabase.from('ingredients').update({ is_purchased: isPurchased }).in('id', ingredientIds)
   
   if (error) throw new Error(error.message)
   
   revalidatePath('/')
}

export async function deleteDish(dishId: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) throw new Error('Unauthorized')
    
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
    if (!user) throw new Error('Unauthorized')
    
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
    if (!user) throw new Error('Unauthorized')
    
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
    
    if ([...sides, ...proteins, ...veggies, ...treats, ...cuisines].length === 0) return []
    
    try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: `You are a creative chef. Suggest 4 distinct dinner ideas based on preferences.
              Return ONLY a JSON object with a key 'ideas' containing an array of strings (dish names).
              Language of output: ${lang === 'ru' ? 'Russian' : 'English'}.` 
            },
            { 
              role: "user", 
              content: `
              Preferred Sides: ${sides.join(', ') || 'Any'}
              Preferred Proteins: ${proteins.join(', ') || 'Any'}
              Preferred Veggies: ${veggies.join(', ') || 'Any'}
              Cuisines: ${cuisines.join(', ') || 'Any'}
              Treats/Cheat meal desires: ${treats.join(', ')}
              
              Guidelines:
              1. Mix comfort food and healthy options based on choices.
              2. If 'Treats' are selected, include at least one option from there.
              3. Use different cooking methods.
              4. Suggest COMPLETE dish names.` 
            }
          ],
          response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content
        const parsed = JSON.parse(content || '{}')
        return Array.isArray(parsed.ideas) ? parsed.ideas : []
    } catch (e) {
        console.error(e)
        return []
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
    redirect('/')
}
