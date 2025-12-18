'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { handleError, createErrorContext } from '@/utils/errorHandler'

export async function approveHolidayDish(dishId: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('approveHolidayDish', {
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
    handleError(error, createErrorContext('approveHolidayDish', {
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
    handleError(error, createErrorContext('approveHolidayDish', {
      type: 'AUTH_ERROR',
      userId: String(user.telegram_id),
      metadata: { dishId },
      showToast: true,
    }))
    throw error
  }

  // Проверить, не апрувнул ли уже пользователь это блюдо
  const { data: existingApproval } = await supabase
    .from('holiday_dish_approvals')
    .select('id')
    .eq('holiday_dish_id', dishId)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (existingApproval) {
    // Уже апрувнуто, просто возвращаем успех
    return { success: true, alreadyApproved: true }
  }

  // Добавить апрув
  const { error } = await supabase
    .from('holiday_dish_approvals')
    .insert({
      holiday_dish_id: dishId,
      telegram_id: user.telegram_id
    })

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('approveHolidayDish', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { dishId },
      showToast: false,
    }))
    throw dbError
  }

  revalidateTag(`holiday-group-${dish.holiday_group_id}`)
  revalidatePath('/')
  return { success: true, alreadyApproved: false }
}

export async function removeHolidayDishApproval(dishId: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('removeHolidayDishApproval', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  const { error } = await supabase
    .from('holiday_dish_approvals')
    .delete()
    .eq('holiday_dish_id', dishId)
    .eq('telegram_id', user.telegram_id)

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('removeHolidayDishApproval', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { dishId },
      showToast: false,
    }))
    throw dbError
  }

  // Получить группу блюда, чтобы инвалидировать кэш
  const { data: dish } = await supabase
    .from('holiday_dishes')
    .select('holiday_group_id')
    .eq('id', dishId)
    .single()

  if (dish?.holiday_group_id) {
    revalidateTag(`holiday-group-${dish.holiday_group_id}`)
  }
  revalidatePath('/')
}

export async function getHolidayDishApprovals(dishId: string) {
  const user = await getUserFromSession()
  if (!user) return []

  const supabase = await createServerSideClient()

  const { data: approvals } = await supabase
    .from('holiday_dish_approvals')
    .select('*, users:telegram_id (telegram_id, first_name, username)')
    .eq('holiday_dish_id', dishId)

  return approvals || []
}

export async function isHolidayDishApprovedByAll(dishId: string): Promise<boolean> {
  const user = await getUserFromSession()
  if (!user) return false

  const supabase = await createServerSideClient()

  // Получить блюдо и группу
  const { data: dish } = await supabase
    .from('holiday_dishes')
    .select('holiday_group_id')
    .eq('id', dishId)
    .single()

  if (!dish) return false

  // Получить всех участников группы
  const { data: members } = await supabase
    .from('holiday_members')
    .select('telegram_id')
    .eq('holiday_group_id', dish.holiday_group_id)

  if (!members || members.length === 0) return false

  // Получить все апрувы для этого блюда
  const { data: approvals } = await supabase
    .from('holiday_dish_approvals')
    .select('telegram_id')
    .eq('holiday_dish_id', dishId)

  if (!approvals) return false

  // Проверить, что каждый участник апрувнул
  const memberIds = new Set(members.map(m => m.telegram_id))
  const approvalIds = new Set(approvals.map(a => a.telegram_id))

  return memberIds.size === approvalIds.size && 
         Array.from(memberIds).every(id => approvalIds.has(id))
}

