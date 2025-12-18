'use server'

import { revalidatePath } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { handleError, createErrorContext } from '@/utils/errorHandler'

export async function createHolidayGroup(name: string, holidayType?: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('createHolidayGroup', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  const { data: group, error: groupError } = await supabase
    .from('holiday_groups')
    .insert({
      name,
      holiday_type: holidayType || null,
      created_by: user.telegram_id
    })
    .select()
    .single()

  if (groupError) {
    const dbError = new Error(groupError.message)
    handleError(dbError, createErrorContext('createHolidayGroup', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { name, holidayType },
      showToast: false,
    }))
    throw dbError
  }

  // Автоматически добавляем создателя как участника
  const { error: memberError } = await supabase
    .from('holiday_members')
    .insert({
      holiday_group_id: group.id,
      telegram_id: user.telegram_id
    })

  if (memberError) {
    const dbError = new Error(memberError.message)
    handleError(dbError, createErrorContext('createHolidayGroup', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { groupId: group.id },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
  return group
}

export async function joinHolidayGroup(inviteCode: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('joinHolidayGroup', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  // Найти группу по invite_code
  const { data: group, error: groupError } = await supabase
    .from('holiday_groups')
    .select('id')
    .eq('invite_code', inviteCode)
    .single()

  if (groupError || !group) {
    const error = new Error('Holiday group not found')
    handleError(error, createErrorContext('joinHolidayGroup', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { inviteCode },
      showToast: true,
    }))
    throw error
  }

  // Проверить, не является ли пользователь уже участником
  const { data: existingMember } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', group.id)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (existingMember) {
    // Уже участник, просто возвращаем группу
    return group
  }

  // Добавить пользователя как участника
  const { error: memberError } = await supabase
    .from('holiday_members')
    .insert({
      holiday_group_id: group.id,
      telegram_id: user.telegram_id
    })

  if (memberError) {
    const dbError = new Error(memberError.message)
    handleError(dbError, createErrorContext('joinHolidayGroup', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { groupId: group.id },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
  return group
}

export async function getHolidayGroup(groupId: string) {
  const user = await getUserFromSession()
  if (!user) return null

  const supabase = await createServerSideClient()

  // Проверить, является ли пользователь участником
  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', groupId)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) return null

  const { data: group } = await supabase
    .from('holiday_groups')
    .select('*')
    .eq('id', groupId)
    .single()

  return group
}

export async function getHolidayGroups() {
  const user = await getUserFromSession()
  if (!user) return []

  const supabase = await createServerSideClient()

  // Сначала получить ID групп, в которых пользователь является участником
  const { data: members } = await supabase
    .from('holiday_members')
    .select('holiday_group_id')
    .eq('telegram_id', user.telegram_id)

  if (!members || members.length === 0) return []

  const groupIds = members.map(m => m.holiday_group_id)

  const { data: groups } = await supabase
    .from('holiday_groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: false })

  return groups || []
}

export async function getHolidayGroupInviteCode(groupId: string) {
  const user = await getUserFromSession()
  if (!user) return null

  const supabase = await createServerSideClient()

  // Проверить, является ли пользователь участником
  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', groupId)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) return null

  const { data: group } = await supabase
    .from('holiday_groups')
    .select('invite_code')
    .eq('id', groupId)
    .single()

  return group?.invite_code || null
}

export async function getHolidayGroupMembers(groupId: string) {
  const user = await getUserFromSession()
  if (!user) return []

  const supabase = await createServerSideClient()

  // Проверить, является ли пользователь участником
  const { data: member } = await supabase
    .from('holiday_members')
    .select('id')
    .eq('holiday_group_id', groupId)
    .eq('telegram_id', user.telegram_id)
    .single()

  if (!member) return []

  const { data: members } = await supabase
    .from('holiday_members')
    .select('*')
    .eq('holiday_group_id', groupId)

  // Получить информацию о пользователях отдельно
  if (members && members.length > 0) {
    const userIds = members.map(m => m.telegram_id)
    const { data: users } = await supabase
      .from('users')
      .select('telegram_id, first_name, username, photo_url')
      .in('telegram_id', userIds)

    // Объединить данные
    return members.map(member => ({
      ...member,
      users: users?.find(u => u.telegram_id === member.telegram_id)
    }))
  }

  return []
}

export async function leaveHolidayGroup(groupId: string) {
  const user = await getUserFromSession()
  if (!user) {
    const error = new Error('Unauthorized: Please log in')
    handleError(error, createErrorContext('leaveHolidayGroup', {
      type: 'AUTH_ERROR',
      userId: undefined,
      showToast: false,
    }))
    throw error
  }

  const supabase = await createServerSideClient()

  // Проверить, является ли пользователь создателем группы
  const { data: group } = await supabase
    .from('holiday_groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (group?.created_by === user.telegram_id) {
    const error = new Error('Cannot leave group you created. Delete the group instead.')
    handleError(error, createErrorContext('leaveHolidayGroup', {
      type: 'VALIDATION_ERROR',
      userId: String(user.telegram_id),
      metadata: { groupId },
      showToast: true,
    }))
    throw error
  }

  const { error } = await supabase
    .from('holiday_members')
    .delete()
    .eq('holiday_group_id', groupId)
    .eq('telegram_id', user.telegram_id)

  if (error) {
    const dbError = new Error(error.message)
    handleError(dbError, createErrorContext('leaveHolidayGroup', {
      type: 'DATABASE_ERROR',
      userId: String(user.telegram_id),
      metadata: { groupId },
      showToast: false,
    }))
    throw dbError
  }

  revalidatePath('/')
}

