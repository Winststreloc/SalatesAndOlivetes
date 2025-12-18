'use server'

import { revalidatePath } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { handleError, createErrorContext } from '@/utils/errorHandler'

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

