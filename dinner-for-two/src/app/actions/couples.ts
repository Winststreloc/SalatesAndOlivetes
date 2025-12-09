'use server'

import { revalidatePath } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'

export async function hasPartner() {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) return false

  const supabase = await createServerSideClient()
  
  const { data: users, error } = await supabase
    .from('users')
    .select('telegram_id')
    .eq('couple_id', user.couple_id)
  
  if (error || !users) return false
  
  return users.length >= 2
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

export async function updatePreferences(prefs: Record<string, unknown>) {
    const user = await getUserFromSession()
    if (!user) {
      console.error('updatePreferences: No user session')
      throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    const { error } = await supabase
        .from('users')
        .update({ preferences: prefs })
        .eq('telegram_id', user.telegram_id)
        
    if (error) throw new Error(error.message)
    revalidatePath('/')
}

export async function getPreferences() {
    const user = await getUserFromSession()
    if (!user) return {}
    
    const supabase = await createServerSideClient()
    const { data } = await supabase
        .from('users')
        .select('preferences')
        .eq('telegram_id', user.telegram_id)
        .single()
        
    return data?.preferences || {}
}

export async function getCouplePreferences() {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) return { useAI: true }
    
    const supabase = await createServerSideClient()
    const { data } = await supabase
        .from('couples')
        .select('preferences')
        .eq('id', user.couple_id)
        .single()
        
    return data?.preferences || { useAI: true }
}

import { CouplePreferences } from '@/types'

export async function updateCouplePreferences(preferences: CouplePreferences) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in and join a couple')
    }
    
    const supabase = await createServerSideClient()
    const { error } = await supabase
        .from('couples')
        .update({ preferences })
        .eq('id', user.couple_id)
        
    if (error) throw new Error(error.message)
    revalidatePath('/')
}


