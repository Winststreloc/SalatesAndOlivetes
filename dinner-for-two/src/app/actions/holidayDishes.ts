'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { handleError, createErrorContext } from '@/utils/errorHandler'

export type HolidayDishCategory = 'cold_appetizers' | 'hot_dishes' | 'salads' | 'alcohol' | 'desserts' | 'drinks' | 'other'

export async function addHolidayDish(
  holidayGroupId: string,
  name: string,
  category: HolidayDishCategory
) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('addHolidayDish', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  // Проверить, является ли пользователь участником группы
  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', holidayGroupId)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) {
    const error = new Error('You are not a member of this holiday group')
    handleError(error, createErrorContext('addHolidayDish', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      metadata: { holidayGroupId },
      showToast: true,
    }))
    throw error
  }

  const { data: dish, error } = await supabase
    .from('holiday_dishes')
    .insert({
      holiday_group_id: holidayGroupId,
      name,
      category,
      created_by: user.telegram_id
    })
    .select()
    .single()

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('addHolidayDish', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { holidayGroupId, name, category },
      showToast: false,
    }))
    throw dbError
  }

  revalidateTag(`holiday-group-${holidayGroupId}`)
  revalidatePath('/')
  return dish
}

export async function getHolidayDishes(holidayGroupId: string) {
  const user = await getUserFromSession()
  if (!user) return []

  const tag = `holiday-group-${holidayGroupId}`
  const getDishesCached = unstable_cache(
    async (groupId: string, telegramId: number) => {
      const supabase = await createServerSideClient()

      const { data: member } = await supabase
        .from('holiday_members')
        .select('id')
        .eq('holiday_group_id', groupId)
        .eq('telegram_id', telegramId)
        .single()

      if (!member) return []

      const { data: dishes } = await supabase
        .from('holiday_dishes')
        .select('*, holiday_dish_ingredients(*)')
        .eq('holiday_group_id', groupId)
        .order('created_at', { ascending: false })

      return dishes || []
    },
    ['holiday-group-dishes', holidayGroupId],
    { tags: [tag], revalidate: 60 }
  )

  return getDishesCached(holidayGroupId, user.telegram_id)
}

export async function getHolidayDish(dishId: string) {
  const user = await getUserFromSession()
  if (!user) return null

  const supabase = await createServerSideClient()

  const { data: dish } = await supabase
    .from('holiday_dishes')
    .select('*, holiday_dish_ingredients(*), holiday_groups!inner(id)')
    .eq('id', dishId)
    .single()

  if (!dish) return null

  // Проверить, является ли пользователь участником группы
  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', dish.holiday_groups.id)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) return null

  return dish
}

export async function deleteHolidayDish(dishId: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('deleteHolidayDish', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  // Получить блюдо и проверить права
  const { data: dish } = await supabase
    .from('holiday_dishes')
    .select('holiday_group_id, created_by')
    .eq('id', dishId)
    .single()

  if (!dish) {
    const error = new Error('Dish not found')
    handleError(error, createErrorContext('deleteHolidayDish', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { dishId },
      showToast: true,
    }))
    throw error
  }

  // Проверить, является ли пользователь участником группы
  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', dish.holiday_group_id)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) {
    const error = new Error('You are not a member of this holiday group')
    handleError(error, createErrorContext('deleteHolidayDish', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      metadata: { dishId },
      showToast: true,
    }))
    throw error
  }

  const { error } = await supabase
    .from('holiday_dishes')
    .delete()
    .eq('id', dishId)

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('deleteHolidayDish', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { dishId },
      showToast: false,
    }))
    throw dbError
  }

  revalidateTag(`holiday-group-${dish.holiday_group_id}`)
  revalidatePath('/')
}

export async function updateHolidayDishRecipe(dishId: string, recipe: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('updateHolidayDishRecipe', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  // Получить блюдо и проверить права
  const { data: dish } = await supabase
    .from('holiday_dishes')
    .select('holiday_group_id')
    .eq('id', dishId)
    .single()

  if (!dish) {
    const error = new Error('Dish not found')
    handleError(error, createErrorContext('updateHolidayDishRecipe', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { dishId },
      showToast: true,
    }))
    throw error
  }

  // Проверить, является ли пользователь участником группы
  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', dish.holiday_group_id)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) {
    const error = new Error('You are not a member of this holiday group')
    handleError(error, createErrorContext('updateHolidayDishRecipe', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      metadata: { dishId },
      showToast: true,
    }))
    throw error
  }

  const { data, error } = await supabase
    .from('holiday_dishes')
    .update({ recipe })
    .eq('id', dishId)
    .select()
    .single()

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('updateHolidayDishRecipe', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { dishId, recipeLength: recipe?.length || 0 },
      showToast: true,
    }))
    throw dbError
  }

  revalidateTag(`holiday-group-${dish.holiday_group_id}`)
  revalidatePath('/')
  return data
}

