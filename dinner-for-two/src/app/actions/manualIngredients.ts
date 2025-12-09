'use server'

import { revalidatePath } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'

export async function addManualIngredient(name: string, amount?: string, unit?: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { data, error } = await supabase
        .from('manual_ingredients')
        .insert({
            couple_id: user.couple_id,
            name: name.trim(),
            amount: amount || '',
            unit: unit || '',
            is_purchased: false
        })
        .select()
        .single()
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return data
}

export async function updateManualIngredient(ingredientId: string, name?: string, amount?: string, unit?: string) {
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
        .from('manual_ingredients')
        .update(updates)
        .eq('id', ingredientId)
        .eq('couple_id', user.couple_id)
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}

export async function deleteManualIngredient(ingredientId: string) {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) {
        throw new Error('Unauthorized: Please log in')
    }
    
    const supabase = await createServerSideClient()
    
    const { error } = await supabase
        .from('manual_ingredients')
        .delete()
        .eq('id', ingredientId)
        .eq('couple_id', user.couple_id)
    
    if (error) throw new Error(error.message)
    revalidatePath('/')
    return { success: true }
}

export async function getManualIngredients() {
    const user = await getUserFromSession()
    if (!user || !user.couple_id) return []
    
    const supabase = await createServerSideClient()
    
    const { data } = await supabase
        .from('manual_ingredients')
        .select('*')
        .eq('couple_id', user.couple_id)
        .order('created_at', { ascending: false })
    
    return data || []
}


