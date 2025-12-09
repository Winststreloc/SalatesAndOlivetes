'use server'

import { revalidatePath } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { Dish } from '@/types'

export async function saveWeeklyPlan(weekStartDate: string, dishes: Dish[]) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { error } = await supabase
        .from('weekly_plans')
        .upsert({
            couple_id: user.couple_id,
            week_start_date: weekStartDate,
            dishes: dishes
        }, {
            onConflict: 'couple_id,week_start_date'
        })
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}

export async function getWeeklyPlans() {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) return []
    
    const supabase = await createServerSideClient()
    
    const { data } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('couple_id', user.couple_id)
        .order('week_start_date', { ascending: false })
        .limit(20)
    
    return data || []
}

export async function loadWeeklyPlan(planId: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('id', planId)
        .eq('couple_id', user.couple_id)
        .single()
    
    if (error) throw new Error(error.message)
    return data
}

export async function deleteWeeklyPlan(planId: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { error } = await supabase
        .from('weekly_plans')
        .delete()
        .eq('id', planId)
        .eq('couple_id', user.couple_id)
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}


