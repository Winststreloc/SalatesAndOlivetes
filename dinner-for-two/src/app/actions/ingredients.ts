'use server'

import { revalidatePath } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { handleError, createErrorContext } from '@/utils/errorHandler'

export async function addDishIngredient(dishId: string, name: string, amount?: string, unit?: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('addDishIngredient', {
      type: 'AUTH_ERROR',
      showToast: false,
    }))
    throw error
  }
  if (!user.couple_id) {
    const error = new Error('Unauthorized: Please create or join a couple first')
    handleError(error, createErrorContext('addDishIngredient', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()
  
  const { data: dish, error: dishError } = await supabase
    .from('dishes')
    .select('id, couple_id')
    .eq('id', dishId)
    .eq('couple_id', user.couple_id)
    .single()

  if (dishError || !dish) {
    const error = new Error('Dish not found or unauthorized')
    handleError(error, createErrorContext('addDishIngredient', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      coupleId: user.couple_id,
      metadata: { dishId },
      showToast: false,
    }))
    throw error
  }

  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      dish_id: dishId,
      name: name.trim(),
      amount: amount || '',
      unit: unit || '',
      is_purchased: false
    })
    .select()
    .single()
    
  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('addDishIngredient', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      coupleId: user.couple_id,
      metadata: { dishId, name, amount, unit },
      showToast: false,
    }))
    throw dbError
  }
    
  revalidatePath('/')
  return data
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
   
   const { error: dishError } = await supabase
     .from('ingredients')
     .update({ is_purchased: isPurchased })
     .in('id', ingredientIds)
   
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
    
    const updates: Record<string, string | undefined> = {}
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


