'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { revalidatePath } from 'next/cache'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

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

export async function generateDishIngredients(dishId: string, dishName: string) {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) throw new Error('Unauthorized')
  
  const supabase = await createServerSideClient()
  
  let ingredients: any[] = []
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are a chef. 
      Generate a JSON object with a key 'ingredients' containing a list of ingredients for the dish "${dishName}". 
      Each ingredient must have:
      - 'name' (string, Russian or English based on dish name)
      - 'amount' (number)
      - 'unit' (string, e.g. kg, g, pcs, ml)
      
      Output ONLY raw JSON without markdown formatting.
    `
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.ingredients)) {
        ingredients = parsed.ingredients
    }
  } catch (e) {
    console.error('AI Generation failed', e)
    return { success: false, error: 'AI failed' }
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

export async function generateIdeas() {
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
    
    // Check if at least some preference is set
    if ([...sides, ...proteins, ...veggies, ...treats, ...cuisines].length === 0) return []
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
          You are a creative chef. Suggest 4 distinct dinner ideas based on these user preferences:
          
          Preferred Sides: ${sides.join(', ') || 'Any'}
          Preferred Proteins: ${proteins.join(', ') || 'Any'}
          Preferred Veggies: ${veggies.join(', ') || 'Any'}
          Cuisines: ${cuisines.join(', ') || 'Any'}
          Treats/Cheat meal desires: ${treats.join(', ')}
          
          Guidelines:
          1. Mix comfort food and healthy options based on choices.
          2. If 'Treats' are selected, include at least one option from there (e.g. homemade pizza or sushi bowl).
          3. Use different cooking methods (oven, pan, stew).
          4. Suggest COMPLETE dish names (e.g. "Grilled Chicken with Roasted Vegetables").
          
          Return ONLY a JSON array of strings (dish names). Example: ["Fried Chicken with Rice", "Baked Fish with Potatoes"]
        `
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const ideas = JSON.parse(text);
        return Array.isArray(ideas) ? ideas : []
    } catch (e) {
        console.error(e)
        return []
    }
}
