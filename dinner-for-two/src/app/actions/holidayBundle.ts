'use server'

import { getUserFromSession } from '@/utils/auth'
import { createServerSideClient } from '@/lib/supabase-server'
import { handleError, createErrorContext } from '@/utils/errorHandler'

/**
 * Собирает стартовые данные для праздничной группы одним запросом:
 * блюда + ингредиенты, участники, инвайт-код, апрувы и флаг approvedByAll.
 */
export async function getHolidayGroupBundle(groupId: string) {
  const user = await getUserFromSession()
  if (!user) {
    return { auth: false }
  }

  const supabase = await createServerSideClient()

  // Проверка участия
  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', groupId)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) {
    return { auth: false }
  }

  try {
    const [membersRes, inviteRes, dishesRes] = await Promise.all([
      supabase
        .from('holiday_members')
        .select('*')
        .eq('holiday_group_id', groupId),
      supabase
        .from('holiday_groups')
        .select('invite_code')
        .eq('id', groupId)
        .single(),
      supabase
        .from('holiday_dishes')
        .select('*, holiday_dish_ingredients(*)')
        .eq('holiday_group_id', groupId)
        .order('created_at', { ascending: false })
    ])

    const dishes = dishesRes.data || []
    const dishIds = dishes.map(d => d.id)

    let approvalsMap: Record<string, any[]> = {}
    let approvedByAll: Record<string, boolean> = {}

    if (dishIds.length > 0) {
      const { data: approvals } = await supabase
        .from('holiday_dish_approvals')
        .select('*')
        .in('holiday_dish_id', dishIds)

      const approvalsList = approvals || []
      approvalsMap = dishIds.reduce((acc, id) => {
        acc[id] = approvalsList.filter(a => a.holiday_dish_id === id)
        return acc
      }, {} as Record<string, any[]>)

      const membersCount = membersRes.data?.length || 0
      approvedByAll = dishIds.reduce((acc, id) => {
        const count = approvalsMap[id]?.length || 0
        acc[id] = membersCount > 0 && count >= membersCount
        return acc
      }, {} as Record<string, boolean>)
    }

    return {
      auth: true,
      dishes,
      members: membersRes.data || [],
      inviteCode: inviteRes.data?.invite_code || null,
      approvalsMap,
      approvedByAll,
    }
  } catch (error) {
    handleError(error as Error, createErrorContext('getHolidayGroupBundle', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { groupId },
      showToast: false,
    }))
    throw error
  }
}

