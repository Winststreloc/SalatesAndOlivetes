'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { revalidatePath } from 'next/cache'

// Use OpenAI fallback or Google Gemini
// But here we switch completely to Gemini as requested
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

export async function addDish(dishName: string) {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) throw new Error('Unauthorized')

  const supabase = await createServerSideClient()

  // 1. Generate ingredients
  let ingredients: any[] = []
  
  try {
    // Using gemini-2.0-flash-exp as requested
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
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
    
    // Clean up markdown code blocks if any
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.ingredients)) {
        ingredients = parsed.ingredients
    }
  } catch (e) {
    console.error('AI Generation failed', e)
  }

  // 2. Save Dish
  const { data: dish, error } = await supabase
    .from('dishes')
    .insert({
      couple_id: user.couple_id,
      name: dishName,
      status: 'proposed'
    })
    .select()
    .single()
    
  if (error) throw new Error(error.message)

  // 3. Save Ingredients
  if (ingredients.length > 0) {
    const ingredientsToInsert = ingredients.map((ing: any) => ({
      dish_id: dish.id,
      name: ing.name,
      amount: String(ing.amount),
      unit: ing.unit,
    }))
    
    await supabase.from('ingredients').insert(ingredientsToInsert)
  }

  revalidatePath('/')
  return dish
}

export async function getDishes() {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) return []

  const supabase = await createServerSideClient()
  
  const { data } = await supabase
    .from('dishes')
    .select('*, ingredients(*)')
    .eq('couple_id', user.couple_id)
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
