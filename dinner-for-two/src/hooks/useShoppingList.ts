'use client'

import { useMemo } from 'react'
import { Dish, ShoppingListItem } from '@/types'
import { groupByCategory } from '@/utils/ingredientCategories'

export function useShoppingList(dishes: Dish[], manualIngredients: any[]) {
  const shoppingList = useMemo<ShoppingListItem[]>(() => {
    const selectedDishes = (dishes || []).filter(d => d.status === 'selected')
    const map = new Map<string, ShoppingListItem>()
    
    selectedDishes.forEach(dish => {
      (dish.ingredients || []).forEach((ing: any) => {
        const cleanName = ing.name?.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim().toLowerCase()
        const cleanUnit = ing.unit?.trim().toLowerCase() || ''
        let singularName = cleanName
        if (cleanName?.endsWith('oes')) singularName = cleanName.slice(0, -2)
        else if (cleanName?.endsWith('s') && !cleanName.endsWith('ss')) singularName = cleanName.slice(0, -1)
        const key = `${singularName}-${cleanUnit}`
        const existing = map.get(key)
        let amount = parseFloat(String(ing.amount).replace(',', '.')) || 0
        
        if (existing) {
          existing.amount += amount
          existing.ids.push(ing.id)
          if (!existing.dishIds.includes(dish.id)) {
            existing.dishIds.push(dish.id)
            existing.dishNames.push(dish.name)
          }
          if (!ing.is_purchased) existing.is_purchased = false 
        } else {
          map.set(key, { 
              name: ing.name?.trim() || '', 
              amount, 
              unit: ing.unit, 
              ids: [ing.id],
              is_purchased: ing.is_purchased,
              dishIds: [dish.id],
              dishNames: [dish.name],
              isManual: false
          })
        }
      })
    })
    
    manualIngredients.forEach((ing: any) => {
      const cleanName = ing.name?.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim().toLowerCase()
      const cleanUnit = ing.unit?.trim().toLowerCase() || ''
      const key = `${cleanName}-${cleanUnit}`
      
      const existing = map.get(key)
      let amount = parseFloat(String(ing.amount).replace(',', '.')) || 0
      
      if (existing) {
        existing.amount += amount
        existing.is_purchased = existing.is_purchased && ing.is_purchased
        existing.isManual = true
        existing.manualId = ing.id
      } else {
        map.set(key, { 
          name: ing.name?.trim() || '', 
          amount, 
          unit: ing.unit, 
          ids: [], 
          is_purchased: ing.is_purchased, 
          dishIds: [], 
          dishNames: [], 
          isManual: true,
          manualId: ing.id
        })
      }
    })
    
    return Array.from(map.values())
  }, [dishes, manualIngredients])

  const categorizedList = useMemo(() => groupByCategory(shoppingList), [shoppingList])

  return { shoppingList, categorizedList }
}


