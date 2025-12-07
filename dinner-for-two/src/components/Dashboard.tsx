'use client'

import { useState, useEffect, useMemo } from 'react'
import { getDishes, toggleDishSelection, toggleIngredientsPurchased } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { AddDishForm } from './AddDishForm'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export function Dashboard() {
  const [tab, setTab] = useState<'add' | 'list'>('add')
  const [dishes, setDishes] = useState<any[]>([])
  
  const refreshDishes = async () => {
    const data = await getDishes()
    setDishes(data)
  }

  useEffect(() => {
    refreshDishes()
  }, [])

  const handleToggleDish = async (id: string, currentStatus: string) => {
    // Optimistic update
    setDishes(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus === 'selected' ? 'proposed' : 'selected' } : d))
    await toggleDishSelection(id, currentStatus !== 'selected')
    refreshDishes()
  }

  const shoppingList = useMemo(() => {
    const selectedDishes = dishes.filter(d => d.status === 'selected')
    const map = new Map<string, { name: string, amount: number, unit: string, ids: string[], is_purchased: boolean }>()
    
    selectedDishes.forEach(dish => {
      dish.ingredients.forEach((ing: any) => {
        // Normalize key
        const key = `${ing.name.trim().toLowerCase()}-${ing.unit?.trim().toLowerCase() || ''}`
        const existing = map.get(key)
        const amount = parseFloat(ing.amount) || 0
        
        if (existing) {
          existing.amount += amount
          existing.ids.push(ing.id)
          // If any instance is NOT purchased, the aggregated item is NOT purchased
          if (!ing.is_purchased) existing.is_purchased = false 
        } else {
          map.set(key, { 
              name: ing.name, 
              amount, 
              unit: ing.unit, 
              ids: [ing.id],
              is_purchased: ing.is_purchased 
          })
        }
      })
    })
    
    return Array.from(map.values())
  }, [dishes])

  const handleToggleIngredient = async (item: any) => {
    const newStatus = !item.is_purchased
    // Optimistic
    setDishes(prev => prev.map(d => ({
        ...d,
        ingredients: d.ingredients.map((ing: any) => 
            item.ids.includes(ing.id) ? { ...ing, is_purchased: newStatus } : ing
        )
    })))
    
    await toggleIngredientsPurchased(item.ids, newStatus)
    refreshDishes()
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
       <div className="flex-1 overflow-auto p-4 pb-24">
          <h1 className="text-xl font-bold mb-4">
             {tab === 'add' ? 'Plan Menu' : 'Shopping List'}
          </h1>
          
          {tab === 'add' ? (
            <>
              <AddDishForm onAdded={refreshDishes} />
              <div className="space-y-3">
                 {dishes.map(dish => (
                   <Card key={dish.id} className={dish.status === 'selected' ? 'border-green-500 border-2' : ''}>
                     <CardHeader className="p-4 pb-2">
                        <div className="flex items-center space-x-2">
                           <Checkbox 
                             id={`dish-${dish.id}`} 
                             checked={dish.status === 'selected'}
                             onCheckedChange={() => handleToggleDish(dish.id, dish.status)}
                           />
                           <Label htmlFor={`dish-${dish.id}`} className="text-base font-semibold cursor-pointer flex-1">
                             {dish.name}
                           </Label>
                        </div>
                     </CardHeader>
                     <CardContent className="p-4 pt-0 pl-10">
                        <p className="text-xs text-gray-500">
                          {dish.ingredients?.map((i: any) => i.name).join(', ')}
                        </p>
                     </CardContent>
                   </Card>
                 ))}
                 {dishes.length === 0 && (
                   <div className="text-center text-gray-500 mt-8">No dishes yet. Add one!</div>
                 )}
              </div>
            </>
          ) : (
            <div className="space-y-2">
               {shoppingList.length === 0 ? (
                 <p className="text-gray-500 text-center mt-10">Select dishes in the Plan tab to generate a list.</p>
               ) : (
                 shoppingList.map((item, idx) => (
                   <div key={idx} className="flex items-center space-x-3 p-3 bg-white rounded shadow-sm">
                      <Checkbox 
                        id={`ing-${idx}`} 
                        checked={item.is_purchased}
                        onCheckedChange={() => handleToggleIngredient(item)}
                      />
                      <label htmlFor={`ing-${idx}`} className={`flex-1 cursor-pointer ${item.is_purchased ? 'line-through text-gray-400' : ''}`}>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-500 ml-2">
                          {item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''}
                        </span>
                      </label>
                   </div>
                 ))
               )}
            </div>
          )}
       </div>
       
       <div className="fixed bottom-0 left-0 right-0 border-t p-2 flex justify-around bg-white shadow-up">
          <Button variant={tab === 'add' ? 'default' : 'ghost'} onClick={() => setTab('add')} className="flex-1 mx-1">
            Plan Menu
          </Button>
          <Button variant={tab === 'list' ? 'default' : 'ghost'} onClick={() => setTab('list')} className="flex-1 mx-1">
            Shopping List
          </Button>
       </div>
    </div>
  )
}
