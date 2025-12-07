'use client'

import { useState, useEffect, useMemo } from 'react'
import { getDishes, toggleDishSelection, toggleIngredientsPurchased, deleteDish, getInviteCode } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { AddDishForm } from './AddDishForm'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useLang } from './LanguageProvider'
import { Trash2, Key, Share2, Loader2, Plus, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const { t, lang, setLang } = useLang()
  const [tab, setTab] = useState<'plan' | 'list'>('plan')
  const [dishes, setDishes] = useState<any[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  
  // Track which day is currently adding a dish
  const [addingDay, setAddingDay] = useState<number | null>(null)
  
  const refreshDishes = async () => {
    const data = await getDishes()
    setDishes(data)
  }

  const loadInviteCode = async () => {
      const code = await getInviteCode()
      setInviteCode(code)
  }

  useEffect(() => {
    refreshDishes()
    loadInviteCode()
    
    const interval = setInterval(refreshDishes, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleDish = async (id: string, currentStatus: string) => {
    // Optimistic update
    setDishes(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus === 'selected' ? 'proposed' : 'selected' } : d))
    await toggleDishSelection(id, currentStatus !== 'selected')
    refreshDishes()
  }
  
  const handleDeleteDish = async (id: string) => {
      if (!confirm('Are you sure?')) return
      setDishes(prev => prev.filter(d => d.id !== id))
      await deleteDish(id)
      refreshDishes()
  }
  
  const handleShare = () => {
    if (!inviteCode) return
    const inviteText = `Join me in Dinner for Two! My code: ${inviteCode}`
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteText)}`
    
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url)
    } else {
        window.open(url, '_blank')
    }
  }

  const shoppingList = useMemo(() => {
    // Include all selected dishes OR dishes assigned to a day (which are implicitly selected)
    // Actually in our logic adding to a day sets status='selected'
    const selectedDishes = dishes.filter(d => d.status === 'selected')
    const map = new Map<string, { name: string, amount: number, unit: string, ids: string[], is_purchased: boolean }>()
    
    selectedDishes.forEach(dish => {
      dish.ingredients.forEach((ing: any) => {
        const key = `${ing.name.trim().toLowerCase()}-${ing.unit?.trim().toLowerCase() || ''}`
        const existing = map.get(key)
        const amount = parseFloat(ing.amount) || 0
        
        if (existing) {
          existing.amount += amount
          existing.ids.push(ing.id)
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
    setDishes(prev => prev.map(d => ({
        ...d,
        ingredients: d.ingredients.map((ing: any) => 
            item.ids.includes(ing.id) ? { ...ing, is_purchased: newStatus } : ing
        )
    })))
    await toggleIngredientsPurchased(item.ids, newStatus)
    refreshDishes()
  }
  
  // Group dishes by day
  const dishesByDay = useMemo(() => {
      const groups: Record<number, any[]> = {}
      for(let i=0; i<7; i++) groups[i] = []
      
      dishes.forEach(d => {
          if (d.day_of_week !== null && d.day_of_week !== undefined) {
              groups[d.day_of_week].push(d)
          } else {
              // Handle unscheduled dishes if any (maybe in a separate section or force day selection)
              // For now, let's assume we only add to days. 
              // If we have legacy dishes without day, maybe show them in "Ideas"?
          }
      })
      return groups
  }, [dishes])

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
       {/* Header */}
       <div className="flex justify-between p-3 bg-white border-b items-center shadow-sm z-10">
         <Button variant="ghost" size="icon" onClick={() => setShowInvite(!showInvite)}>
            <Key className="h-4 w-4" />
         </Button>
         <h1 className="font-semibold text-sm text-gray-700">Dinner for Two</h1>
         <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}>
            {lang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN'}
         </Button>
       </div>

       {/* Invite Modal */}
       {showInvite && (
           <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <Card className="w-full max-w-sm">
                   <CardHeader>
                       <CardHeader className="p-4 font-bold text-center">{t.inviteCode}</CardHeader>
                   </CardHeader>
                   <CardContent className="text-center pb-6">
                       <div className="p-3 bg-gray-100 rounded font-mono select-all text-xl font-bold mb-4">
                           {inviteCode || '...'}
                       </div>
                       
                       <Button className="w-full flex items-center gap-2 mb-2" onClick={handleShare}>
                         <Share2 className="w-4 h-4" />
                         {t.shareLink}
                       </Button>

                       <Button variant="ghost" onClick={() => setShowInvite(false)}>{t.close}</Button>
                   </CardContent>
               </Card>
           </div>
       )}

       {/* Content */}
       <div className="flex-1 overflow-auto p-4 pb-24 scroll-smooth">
          <h1 className="text-xl font-bold mb-4">
             {tab === 'plan' ? t.planMenu : t.shoppingList}
          </h1>
          
          {tab === 'plan' ? (
            <div className="space-y-6">
               {/* Day Blocks */}
               {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
                   <div key={dayIndex} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                       <div className="bg-gray-100 p-3 font-semibold text-gray-700 flex justify-between items-center">
                           <span>{t.days[dayIndex]}</span>
                           <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setAddingDay(dayIndex)}>
                               <Plus className="h-4 w-4" />
                           </Button>
                       </div>
                       
                       <div className="p-2 space-y-2">
                           {/* List dishes for this day */}
                           {dishesByDay[dayIndex].map(dish => (
                               <div key={dish.id} className="border rounded p-3 relative group">
                                   <div className="flex justify-between items-start">
                                       <div className="font-medium pr-6">{dish.name}</div>
                                       <button 
                                          onClick={() => handleDeleteDish(dish.id)}
                                          className="text-gray-400 hover:text-red-500 absolute top-2 right-2"
                                       >
                                           <Trash2 className="h-4 w-4" />
                                       </button>
                                   </div>
                                   <div className="mt-1">
                                       {dish.ingredients && dish.ingredients.length > 0 ? (
                                            <p className="text-xs text-gray-500">
                                              {dish.ingredients.map((i: any) => i.name).join(', ')}
                                            </p>
                                        ) : (
                                            <div className="flex items-center text-xs text-blue-500 animate-pulse">
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                {t.generating}
                                            </div>
                                        )}
                                   </div>
                               </div>
                           ))}
                           
                           {/* Add Form for this day */}
                           {addingDay === dayIndex ? (
                               <AddDishForm 
                                  day={dayIndex} 
                                  onAdded={() => {
                                      setAddingDay(null)
                                      refreshDishes()
                                  }} 
                                  onCancel={() => setAddingDay(null)} 
                               />
                           ) : (
                               dishesByDay[dayIndex].length === 0 && (
                                   <div className="text-xs text-gray-400 text-center py-2 cursor-pointer hover:text-gray-600" onClick={() => setAddingDay(dayIndex)}>
                                       + {t.add}
                                   </div>
                               )
                           )}
                       </div>
                   </div>
               ))}
            </div>
          ) : (
            <div className="space-y-2">
               {shoppingList.length === 0 ? (
                 <p className="text-gray-500 text-center mt-10">{t.selectDishesHint}</p>
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
       
       <div className="fixed bottom-0 left-0 right-0 border-t p-2 flex justify-around bg-white shadow-up z-20">
          <Button variant={tab === 'plan' ? 'default' : 'ghost'} onClick={() => setTab('plan')} className="flex-1 mx-1">
            <Calendar className="w-4 h-4 mr-2" />
            {t.planMenu}
          </Button>
          <Button variant={tab === 'list' ? 'default' : 'ghost'} onClick={() => setTab('list')} className="flex-1 mx-1">
            {t.shoppingList}
          </Button>
       </div>
    </div>
  )
}
