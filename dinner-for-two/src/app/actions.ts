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
      status: 'selected', // If added to a day, it is implicitly selected
      day_of_week: dayOfWeek // 0-6
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
