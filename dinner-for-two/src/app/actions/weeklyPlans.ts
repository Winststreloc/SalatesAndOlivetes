'use server'

import { revalidatePath } from 'next/cache'
import { createServerSideClient } from '@/lib/supabase-server'
import { getUserFromSession } from '@/utils/auth'
import { Dish, WeeklyPlan } from '@/types'

export async function saveWeeklyPlan(weekStartDate: string, dishes: Dish[]) {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) {
    throw new Error('Unauthorized: Please log in')
  }

  const supabase = await createServerSideClient()

  const { data: planRow, error: upsertError } = await supabase
    .from('weekly_plans')
    .upsert({
      couple_id: user.couple_id,
      week_start_date: weekStartDate
    }, {
      onConflict: 'couple_id,week_start_date'
    })
    .select('id')
    .single()

  if (upsertError) throw new Error(upsertError.message)

  const planId = planRow?.id
  if (!planId) throw new Error('Failed to create weekly plan')

  const { error: cleanupError } = await supabase
    .from('weekly_plan_dishes')
    .delete()
    .eq('plan_id', planId)

  if (cleanupError) throw new Error(cleanupError.message)

  if (dishes.length > 0) {
    const planDishPayload = dishes.map((dish, index) => ({
      plan_id: planId,
      dish_id: dish.id,
      name: dish.name,
      status: dish.status || 'proposed',
      dish_date: dish.dish_date || null,
      recipe: dish.recipe || null,
      calories: dish.calories ?? null,
      proteins: dish.proteins ?? null,
      fats: dish.fats ?? null,
      carbs: dish.carbs ?? null,
      created_by: dish.created_by ? Number(dish.created_by) : null,
      position: index + 1
    }))

    const { data: insertedDishes, error: insertDishesError } = await supabase
      .from('weekly_plan_dishes')
      .insert(planDishPayload)
      .select('id, position')

    if (insertDishesError) throw new Error(insertDishesError.message)

    const positionToId = new Map((insertedDishes || []).map(pd => [pd.position, pd.id]))

    const ingredientsPayload = dishes.flatMap((dish, idx) => {
      const planDishId = positionToId.get(idx + 1)
      if (!planDishId || !dish.ingredients || dish.ingredients.length === 0) return []
      return dish.ingredients.map((ing) => ({
        plan_dish_id: planDishId,
        ingredient_id: (ing as any).ingredient_id ?? ing.id ?? null,
        name: ing.name,
        amount: ing.amount !== undefined && ing.amount !== null ? String(ing.amount) : '',
        unit: ing.unit || '',
        is_purchased: ing.is_purchased ?? false
      }))
    }).filter((row) => !!row.plan_dish_id)

    if (ingredientsPayload.length > 0) {
      const { error: insertIngredientsError } = await supabase
        .from('weekly_plan_ingredients')
        .insert(ingredientsPayload)

      if (insertIngredientsError) throw new Error(insertIngredientsError.message)
    }
  }

  revalidatePath('/')
  return { success: true }
}

export async function getWeeklyPlans(): Promise<WeeklyPlan[]> {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) return []

  const supabase = await createServerSideClient()

  const { data, error } = await supabase
    .from('weekly_plans')
    .select('id, couple_id, week_start_date, created_at, weekly_plan_dishes(count)')
    .eq('couple_id', user.couple_id)
    .order('week_start_date', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)

  return (data || []).map((plan: any) => ({
    id: plan.id,
    couple_id: plan.couple_id,
    week_start_date: plan.week_start_date,
    created_at: plan.created_at,
    dish_count: Array.isArray(plan.weekly_plan_dishes) && plan.weekly_plan_dishes.length > 0
      ? plan.weekly_plan_dishes[0].count || 0
      : 0
  }))
}

export async function loadWeeklyPlan(planId: string): Promise<WeeklyPlan> {
  const user = await getUserFromSession()
  if (!user || !user.couple_id) {
    throw new Error('Unauthorized: Please log in')
  }

  const supabase = await createServerSideClient()

  const { data, error } = await supabase
    .from('weekly_plans')
    .select(`
      id,
      couple_id,
      week_start_date,
      created_at,
      weekly_plan_dishes (
        id,
        plan_id,
        dish_id,
        name,
        status,
        dish_date,
        recipe,
        calories,
        proteins,
        fats,
        carbs,
        created_by,
        position,
        weekly_plan_ingredients (
          id,
          plan_dish_id,
          ingredient_id,
          name,
          amount,
          unit,
          is_purchased
        )
      )
    `)
    .eq('id', planId)
    .eq('couple_id', user.couple_id)
    .single()

  if (error) throw new Error(error.message)

  const dishes = (data.weekly_plan_dishes || [])
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
    .map((dish: any) => ({
      id: dish.dish_id || dish.id,
      couple_id: data.couple_id,
      name: dish.name,
      status: dish.status,
      dish_date: dish.dish_date,
      recipe: dish.recipe,
      calories: dish.calories,
      proteins: dish.proteins,
      fats: dish.fats,
      carbs: dish.carbs,
      created_by: dish.created_by ?? undefined,
      ingredients: (dish.weekly_plan_ingredients || []).map((ing: any) => ({
        id: ing.ingredient_id || ing.id,
        dish_id: dish.dish_id || dish.id,
        name: ing.name,
        amount: ing.amount || '',
        unit: ing.unit || '',
        is_purchased: ing.is_purchased ?? false
      }))
    }))

  return {
    id: data.id,
    couple_id: data.couple_id,
    week_start_date: data.week_start_date,
    created_at: data.created_at,
    dishes
  }
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


