'use client'

import { useState, useEffect, useMemo } from 'react'
import { getDishes, toggleDishSelection, toggleIngredientsPurchased, deleteDish, getInviteCode } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { AddDishForm } from './AddDishForm'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useLang } from './LanguageProvider'
import { Trash2, Key, Share2 } from 'lucide-react'

export function Dashboard() {
  const { t, lang, setLang } = useLang()
  const [tab, setTab] = useState<'add' | 'list'>('add')
  const [dishes, setDishes] = useState<any[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  
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
    <div className="flex flex-col h-screen bg-gray-50 relative">
       {/* Header */}
       <div className="flex justify-between p-3 bg-white border-b items-center shadow-sm">
         <Button variant="ghost" size="icon" onClick={() => setShowInvite(!showInvite)}>
            <Key className="h-4 w-4" />
         </Button>
         <h1 className="font-semibold text-sm text-gray-700">Dinner for Two</h1>
         <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}>
            {lang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN'}
         </Button>
       </div>

       {/* Invite Modal Overlay */}
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
       <div className="flex-1 overflow-auto p-4 pb-24">
          <h1 className="text-xl font-bold mb-4">
             {tab === 'add' ? t.planMenu : t.shoppingList}
          </h1>
          
          {tab === 'add' ? (
            <>
              <AddDishForm onAdded={refreshDishes} />
              <div className="space-y-3">
                 {dishes.map(dish => (
                   <Card key={dish.id} className={dish.status === 'selected' ? 'border-green-500 border-2' : ''}>
                     <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center space-x-2 flex-1">
                           <Checkbox 
                             id={`dish-${dish.id}`} 
                             checked={dish.status === 'selected'}
                             onCheckedChange={() => handleToggleDish(dish.id, dish.status)}
                           />
                           <Label htmlFor={`dish-${dish.id}`} className="text-base font-semibold cursor-pointer flex-1 ml-2">
                             {dish.name}
                           </Label>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => handleDeleteDish(dish.id)}>
                             <Trash2 className="h-4 w-4" />
                        </Button>
                     </CardHeader>
                     <CardContent className="p-3 pt-0 pl-9">
                        <p className="text-xs text-gray-500">
                          {dish.ingredients?.map((i: any) => i.name).join(', ')}
                        </p>
                     </CardContent>
                   </Card>
                 ))}
                 {dishes.length === 0 && (
                   <div className="text-center text-gray-500 mt-8">{t.noDishes}</div>
                 )}
              </div>
            </>
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
       
       <div className="fixed bottom-0 left-0 right-0 border-t p-2 flex justify-around bg-white shadow-up">
          <Button variant={tab === 'add' ? 'default' : 'ghost'} onClick={() => setTab('add')} className="flex-1 mx-1">
            {t.planMenu}
          </Button>
          <Button variant={tab === 'list' ? 'default' : 'ghost'} onClick={() => setTab('list')} className="flex-1 mx-1">
            {t.shoppingList}
          </Button>
       </div>
    </div>
  )
}
