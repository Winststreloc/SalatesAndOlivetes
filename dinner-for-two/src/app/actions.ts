'use server'

import OpenAI from 'openai'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { revalidatePath } from 'next/cache'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function addDish(dishName: string) {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) throw new Error('Unauthorized')

  const supabase = await createServerSideClient()

  // 1. Generate ingredients
  let ingredients: any[] = []
  
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a chef. Return a JSON object with a key 'ingredients' containing a list of ingredients for the dish. Each ingredient should have 'name', 'amount' (string number), and 'unit' (string). Return ONLY JSON." 
        },
        { role: "user", content: `Ingredients for ${dishName}` }
      ],
      model: "gpt-3.5-turbo-0125",
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content
    const parsed = JSON.parse(content || '{}')
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
