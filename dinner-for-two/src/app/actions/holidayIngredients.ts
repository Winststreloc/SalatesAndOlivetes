'use server'

import { revalidatePath } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { handleError, createErrorContext } from '@/utils/errorHandler'
import { generateHolidayDishIngredients } from './ai'

export async function addHolidayDishIngredient(holidayDishId: string, name: string, amount?: string, unit?: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('addHolidayDishIngredient', {
      type: 'AUTH_ERROR',
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  // Проверить принадлежность к группе
  const { data: dish } = await supabase
    .from('holiday_dishes')
    .select('holiday_group_id')
    .eq('id', holidayDishId)
    .single()

  if (!dish) {
    const error = new Error('Dish not found')
    handleError(error, createErrorContext('addHolidayDishIngredient', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { holidayDishId },
      showToast: true,
    }))
    throw error
  }

  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', dish.holiday_group_id)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) {
    const error = new Error('You are not a member of this holiday group')
    handleError(error, createErrorContext('addHolidayDishIngredient', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      metadata: { holidayDishId },
      showToast: true,
    }))
    throw error
  }

  const { error } = await supabase
    .from('holiday_dish_ingredients')
    .insert({
      holiday_dish_id: holidayDishId,
      name,
      amount: amount ?? '',
      unit: unit ?? '',
      is_purchased: false,
    })

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('addHolidayDishIngredient', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { holidayDishId, name },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
}

export async function regenerateHolidayDishIngredients(holidayDishId: string, dishName: string, lang: 'en' | 'ru' = 'ru') {
  // Просто прокси на generateHolidayDishIngredients для удобства UI
  return generateHolidayDishIngredients(holidayDishId, dishName, lang)
}

export async function updateHolidayDishIngredient(ingredientId: string, name: string, amount?: string, unit?: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('updateHolidayDishIngredient', {
      type: 'AUTH_ERROR',
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  // Найти ингредиент и блюдо
  const { data: ingredient } = await supabase
    .from('holiday_dish_ingredients')
    .select('holiday_dish_id, holiday_dishes!inner(holiday_group_id)')
    .eq('id', ingredientId)
    .single()

  if (!ingredient) {
    const error = new Error('Ingredient not found')
    handleError(error, createErrorContext('updateHolidayDishIngredient', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: true,
    }))
    throw error
  }

  const groupId = ingredient.holiday_dishes?.[0]?.holiday_group_id
  if (!groupId) {
    const error = new Error('Ingredient does not belong to a holiday group')
    handleError(error, createErrorContext('updateHolidayDishIngredient', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: true,
    }))
    throw error
  }

  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', groupId)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) {
    const error = new Error('You are not a member of this holiday group')
    handleError(error, createErrorContext('updateHolidayDishIngredient', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: true,
    }))
    throw error
  }

  const { error } = await supabase
    .from('holiday_dish_ingredients')
    .update({
      name,
      amount: amount ?? '',
      unit: unit ?? '',
    })
    .eq('id', ingredientId)

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('updateHolidayDishIngredient', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId, name },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
}

export async function deleteHolidayDishIngredient(ingredientId: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('deleteHolidayDishIngredient', {
      type: 'AUTH_ERROR',
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  const { data: ingredient } = await supabase
    .from('holiday_dish_ingredients')
    .select('holiday_dish_id, holiday_dishes!inner(holiday_group_id)')
    .eq('id', ingredientId)
    .single()

  if (!ingredient) {
    const error = new Error('Ingredient not found')
    handleError(error, createErrorContext('deleteHolidayDishIngredient', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: true,
    }))
    throw error
  }

  const groupId = ingredient.holiday_dishes?.[0]?.holiday_group_id
  if (!groupId) {
    const error = new Error('Ingredient does not belong to a holiday group')
    handleError(error, createErrorContext('deleteHolidayDishIngredient', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: true,
    }))
    throw error
  }

  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', groupId)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) {
    const error = new Error('You are not a member of this holiday group')
    handleError(error, createErrorContext('deleteHolidayDishIngredient', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: true,
    }))
    throw error
  }

  const { error } = await supabase
    .from('holiday_dish_ingredients')
    .delete()
    .eq('id', ingredientId)

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('deleteHolidayDishIngredient', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
}

export async function toggleHolidayIngredientPurchased(ingredientId: string, isPurchased: boolean) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('toggleHolidayIngredientPurchased', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  // Получить ингредиент и проверить права через блюдо
  const { data: ingredient } = await supabase
    .from('holiday_dish_ingredients')
    .select('holiday_dish_id, holiday_dishes!inner(holiday_group_id)')
    .eq('id', ingredientId)
    .single()

  if (!ingredient) {
    const error = new Error('Ingredient not found')
    handleError(error, createErrorContext('toggleHolidayIngredientPurchased', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: true,
    }))
    throw error
  }

  // Проверить, является ли пользователь участником группы
  const holidayGroupId = ingredient.holiday_dishes?.[0]?.holiday_group_id
  if (!holidayGroupId) {
    const error = new Error('Ingredient does not belong to a holiday group')
    handleError(error, createErrorContext('toggleHolidayIngredientPurchased', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: true,
    }))
    throw error
  }

  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', holidayGroupId)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) {
    const error = new Error('You are not a member of this holiday group')
    handleError(error, createErrorContext('toggleHolidayIngredientPurchased', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId },
      showToast: true,
    }))
    throw error
  }

  const { error } = await supabase
    .from('holiday_dish_ingredients')
    .update({ is_purchased: isPurchased })
    .eq('id', ingredientId)

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('toggleHolidayIngredientPurchased', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientId, isPurchased },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
}

export async function toggleHolidayIngredientsPurchased(ingredientIds: string[], isPurchased: boolean) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('toggleHolidayIngredientsPurchased', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  if (ingredientIds.length === 0) return

  // Получить все ингредиенты и проверить права
  const { data: ingredients } = await supabase
    .from('holiday_dish_ingredients')
    .select('id, holiday_dish_id, holiday_dishes!inner(holiday_group_id)')
    .in('id', ingredientIds)

  if (!ingredients || ingredients.length === 0) return

  // Проверить, что все ингредиенты принадлежат группам, в которых пользователь является участником
  const groupIds = [...new Set(
    ingredients
      .map(ing => ing.holiday_dishes?.[0]?.holiday_group_id)
      .filter((id): id is string => Boolean(id))
  )]
  
  const { data: members } = await supabase
    .from('holiday_members')
    .select('holiday_group_id')
    .eq('telegram_id', user.telegram_id)
    .in('holiday_group_id', groupIds)

  if (!members || members.length === 0) {
    const error = new Error('You are not a member of these holiday groups')
    handleError(error, createErrorContext('toggleHolidayIngredientsPurchased', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientIds },
      showToast: true,
    }))
    throw error
  }

  const memberGroupIds = new Set(members.map(m => m.holiday_group_id))
  const validIngredientIds = ingredients
    .filter(ing => {
      const groupId = ing.holiday_dishes?.[0]?.holiday_group_id
      return groupId ? memberGroupIds.has(groupId) : false
    })
    .map(ing => ing.id)

  if (validIngredientIds.length === 0) return

  const { error } = await supabase
    .from('holiday_dish_ingredients')
    .update({ is_purchased: isPurchased })
    .in('id', validIngredientIds)

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('toggleHolidayIngredientsPurchased', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { ingredientIds, isPurchased },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
}

