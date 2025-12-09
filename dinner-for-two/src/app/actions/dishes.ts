'use server'

import { revalidatePath } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { handleError, createErrorContext } from '@/utils/errorHandler'
import { hasPartner } from './couples'

export async function addDish(dishName: string, date?: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('addDish', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }
  if (!user.couple_id) {
    const error = new Error('Unauthorized: Please create or join a couple first')
    handleError(error, createErrorContext('addDish', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  const dishDate = date || new Date().toISOString().split('T')[0]

  const { data: dish, error } = await supabase
    .from('dishes')
    .insert({
      couple_id: user.couple_id,
      name: dishName,
      status: 'proposed',
      dish_date: dishDate,
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
      metadata: { dishName, date: dishDate },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
  return dish
}

export async function getDishes() {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) return []

  const supabase = await createServerSideClient()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 6)
  const endDateStr = endDate.toISOString().split('T')[0]
  
  const { data } = await supabase
    .from('dishes')
    .select('*, ingredients(*)')
    .eq('couple_id', user.couple_id)
    .or(`dish_date.gte.${todayStr},dish_date.is.null`)
    .order('dish_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    
  const filtered = (data || []).filter((dish: any) => {
    if (!dish.dish_date) return true
    const dishDate = new Date(dish.dish_date + 'T00:00:00')
    return dishDate >= today && dishDate <= endDate
  })
  
  return filtered
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
  
  const partnerExists = await hasPartner()
  
  const supabase = await createServerSideClient()
  
  const { data: dish } = await supabase
    .from('dishes')
    .select('created_by, status')
    .eq('id', dishId)
    .eq('couple_id', user.couple_id)
    .single()
  
  if (!dish) {
    throw new Error('Dish not found')
  }
  
  if (partnerExists && dish.created_by === user.telegram_id) {
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

export async function moveDish(dishId: string, date: string) {
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
    .update({ dish_date: date })
    .eq('id', dishId)
    .eq('couple_id', user.couple_id)

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('moveDish', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      coupleId: user.couple_id,
      metadata: { dishId, date },
      showToast: false,
    }))
    throw dbError
  }
    
  revalidatePath('/')
}

export async function updateRecipe(dishId: string, recipe: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('updateRecipe', {
      type: 'AUTH_ERROR',
      showToast: false,
    }))
    throw error
  }
  if (!user.couple_id) {
    const error = new Error('Unauthorized: Please create or join a couple first')
    handleError(error, createErrorContext('updateRecipe', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      showToast: false,
    }))
    throw error
  }
  
  const supabase = await createServerSideClient()
  
  const { data, error } = await supabase
    .from('dishes')
    .update({ recipe })
    .eq('id', dishId)
    .eq('couple_id', user.couple_id)
    .select()
    .single()

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('updateRecipe', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      coupleId: user.couple_id,
      metadata: { dishId, recipeLength: recipe?.length || 0 },
      showToast: true,
    }))
    throw dbError
  }
    
  revalidatePath('/')
  return data
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


