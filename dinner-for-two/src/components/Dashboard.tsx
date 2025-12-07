'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { getDishes, toggleDishSelection, toggleIngredientsPurchased, deleteDish, getInviteCode, moveDish, addDish, generateDishIngredients } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { AddDishForm } from './AddDishForm'
import { IdeasTab } from './IdeasTab'
import { RecipeView } from './RecipeView'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useLang } from './LanguageProvider'
import { useAuth } from './AuthProvider'
import { Trash2, Key, Share2, Loader2, Plus, Calendar, CheckCircle2, Lightbulb, BookOpen, LogOut, Wifi, WifiOff } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase'

export function Dashboard() {
  const { t, lang, setLang } = useLang()
  const { coupleId, logout, user } = useAuth()
  const [tab, setTab] = useState<'plan' | 'list' | 'ideas'>('plan')
  const [dishes, setDishes] = useState<any[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [addingDay, setAddingDay] = useState<number | null>(null)
  const [selectedDish, setSelectedDish] = useState<any | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [showDaySelector, setShowDaySelector] = useState(false)
  const [pendingIdea, setPendingIdea] = useState<string | null>(null)
  const channelRef = useRef<any>(null)
  
  const refreshDishes = async () => {
    const data = await getDishes()
    setDishes(data)
    setLastUpdate(new Date())
  }

  const loadInviteCode = async () => {
      const code = await getInviteCode()
      setInviteCode(code)
  }

  useEffect(() => {
    if (!coupleId) return // Wait for coupleId to be available
    
    refreshDishes()
    loadInviteCode()
    
    // Supabase Realtime subscription with filtering
    const supabase = createClient()
    
    const channel = supabase.channel(`dashboard-changes-${coupleId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: 'user' }
      }
    })
    
    // Subscribe to dishes changes for this couple
    channel
        .on(
            'postgres_changes',
            { 
                event: '*', 
                schema: 'public', 
                table: 'dishes',
                filter: `couple_id=eq.${coupleId}`
            },
            (payload) => {
                console.log('🔔 Realtime dishes update:', payload.eventType, payload)
                
                // Optimistic updates based on event type
                if (payload.eventType === 'INSERT') {
                    // New dish added - refresh to get full data with ingredients
                    setTimeout(() => refreshDishes(), 100)
                } else if (payload.eventType === 'UPDATE') {
                    // Dish updated - update local state immediately
                    setDishes(prev => prev.map(d => 
                        d.id === payload.new.id ? { ...d, ...payload.new } : d
                    ))
                    // Then refresh to get related ingredients
                    setTimeout(() => refreshDishes(), 100)
                } else if (payload.eventType === 'DELETE') {
                    // Dish deleted - remove from local state
                    setDishes(prev => prev.filter(d => d.id !== payload.old.id))
                } else {
                    refreshDishes()
                }
            }
        )
        .on(
            'postgres_changes',
            { 
                event: '*', 
                schema: 'public', 
                table: 'ingredients',
                // Filter by dishes that belong to this couple
                // Note: We can't filter directly on ingredients, so we refresh dishes
            },
            (payload) => {
                console.log('🔔 Realtime ingredients update:', payload.eventType, payload)
                // Ingredients changed - refresh dishes to get updated ingredient lists
                setTimeout(() => refreshDishes(), 100)
            }
        )
        .subscribe((status) => {
            console.log('📡 Realtime subscription status:', status)
            setIsRealtimeConnected(status === 'SUBSCRIBED')
        })

    channelRef.current = channel

    return () => {
        console.log('🔌 Cleaning up Realtime subscription')
        supabase.removeChannel(channel)
        channelRef.current = null
    }
  }, [coupleId])

  const handleToggleDish = async (id: string, currentStatus: string) => {
    setDishes(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus === 'selected' ? 'proposed' : 'selected' } : d))
    await toggleDishSelection(id, currentStatus !== 'selected')
  }
  
  const handleDeleteDish = async (id: string) => {
      if (!confirm('Are you sure?')) return
      setDishes(prev => prev.filter(d => d.id !== id))
      await deleteDish(id)
  }
  
  const handleShare = () => {
    if (!inviteCode) return
    const inviteText = `Join me in S&O! My code: ${inviteCode}`
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteText)}`
    
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url)
    } else {
        window.open(url, '_blank')
    }
  }

  const handleAddIdea = (name: string) => {
      // Show day selector modal
      setPendingIdea(name)
      setShowDaySelector(true)
  }

  const handleConfirmAddIdea = async (day: number) => {
      if (!pendingIdea) return
      
      setShowDaySelector(false)
      const name = pendingIdea
      setPendingIdea(null)
      
      try {
          const dish = await addDish(name, day)
          
          // Optimistic update - add dish to local state immediately
          setDishes(prev => [...prev, {
              ...dish,
              ingredients: [],
              status: 'proposed'
          }])
          
          // Refresh to get full data (with ingredients when they're generated)
          setTimeout(() => refreshDishes(), 500)
          
          // Pass LANG here - generate ingredients asynchronously
          generateDishIngredients(dish.id, dish.name, lang).then(() => {
              // Refresh again after ingredients are generated
              refreshDishes()
          })
          
          setTab('plan')
      } catch (e) {
          console.error('Failed to add dish:', e)
          alert(t.failedAdd || 'Failed to add dish')
      }
  }

  const shoppingList = useMemo(() => {
    const selectedDishes = dishes.filter(d => d.status === 'selected')
    const map = new Map<string, { name: string, amount: number, unit: string, ids: string[], is_purchased: boolean }>()
    
    selectedDishes.forEach(dish => {
      dish.ingredients.forEach((ing: any) => {
        // Improved deduplication
        const cleanName = ing.name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim().toLowerCase()
        const cleanUnit = ing.unit?.trim().toLowerCase() || ''
        
        let singularName = cleanName
        if (cleanName.endsWith('oes')) singularName = cleanName.slice(0, -2)
        else if (cleanName.endsWith('s') && !cleanName.endsWith('ss')) singularName = cleanName.slice(0, -1)
        
        const key = `${singularName}-${cleanUnit}`
        
        const existing = map.get(key)
        let amount = parseFloat(String(ing.amount).replace(',', '.')) || 0
        
        if (existing) {
          existing.amount += amount
          existing.ids.push(ing.id)
          if (!ing.is_purchased) existing.is_purchased = false 
        } else {
          map.set(key, { 
              name: ing.name.trim(), 
              amount, 
              unit: ing.unit, 
              ids: [ing.id],
              is_purchased: ing.is_purchased 
          })
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
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
  }
  
  const dishesByDay = useMemo(() => {
      const groups: Record<number, any[]> = {}
      for(let i=0; i<7; i++) groups[i] = []
      dishes.forEach(d => {
          if (d.day_of_week !== null && d.day_of_week !== undefined) {
              groups[d.day_of_week].push(d)
          }
      })
      return groups
  }, [dishes])

  // Dynamic Days Ordering
  const orderedDays = useMemo(() => {
      const todayIndex = new Date().getDay(); // 0=Sun
      // Convert to our 0=Mon system:
      // Sun(0) -> 6, Mon(1) -> 0, ...
      const today = todayIndex === 0 ? 6 : todayIndex - 1;

      const days = [];
      for(let i=0; i<7; i++) {
          days.push((today + i) % 7);
      }
      return days;
  }, [])

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const sourceDay = parseInt(result.source.droppableId);
    const destDay = parseInt(result.destination.droppableId);
    const dishId = result.draggableId;
    if (sourceDay === destDay) return;

    setDishes(prev => prev.map(d => {
        if (d.id === dishId) {
            return { ...d, day_of_week: destDay }
        }
        return d
    }))
    await moveDish(dishId, destDay);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
       <div className="flex justify-between p-3 bg-white border-b items-center shadow-sm z-10">
         <div className="flex items-center space-x-2">
             <Button variant="ghost" size="icon" onClick={() => setShowInvite(!showInvite)}>
                <Key className="h-4 w-4" />
             </Button>
             <h1 className="font-semibold text-sm text-gray-700">S&O</h1>
             {isRealtimeConnected ? (
                 <span title="Realtime connected">
                     <Wifi className="h-3 w-3 text-green-500" />
                 </span>
             ) : (
                 <span title="Realtime disconnected">
                     <WifiOff className="h-3 w-3 text-gray-400" />
                 </span>
             )}
         </div>
         <div className="flex items-center space-x-1">
             <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}>
                {lang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN'}
             </Button>
             <Button variant="ghost" size="icon" onClick={async () => {
                await logout()
             }}>
                <LogOut className="h-4 w-4 text-red-400" />
             </Button>
         </div>
       </div>

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
       
       <RecipeView dish={selectedDish} isOpen={!!selectedDish} onClose={() => setSelectedDish(null)} />

       {/* Day Selector Modal */}
       {showDaySelector && (
           <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <Card className="w-full max-w-sm">
                   <CardHeader>
                       <CardHeader className="p-4 font-bold text-center">{t.selectDay}</CardHeader>
                   </CardHeader>
                   <CardContent className="text-center pb-6">
                       <div className="grid grid-cols-2 gap-2 mb-4">
                           {orderedDays.map(dayIndex => (
                               <Button
                                   key={dayIndex}
                                   variant="outline"
                                   onClick={() => handleConfirmAddIdea(dayIndex)}
                                   className="h-12"
                               >
                                   {t.days[dayIndex]}
                               </Button>
                           ))}
                       </div>
                       <Button variant="ghost" onClick={() => { setShowDaySelector(false); setPendingIdea(null) }}>
                           {t.close}
                       </Button>
                   </CardContent>
               </Card>
           </div>
       )}

       <div className="flex-1 overflow-auto p-4 pb-24 scroll-smooth">
          <h1 className="text-xl font-bold mb-4">
             {tab === 'plan' ? t.planMenu : (tab === 'list' ? t.shoppingList : t.ideas)}
          </h1>
          
          {tab === 'ideas' && (
              <IdeasTab onSelectIdea={handleAddIdea} />
          )}

          {tab === 'plan' && (
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="space-y-6">
                   {orderedDays.map(dayIndex => (
                       <Droppable key={dayIndex} droppableId={String(dayIndex)}>
                           {(provided: any) => (
                               <div 
                                 ref={provided.innerRef}
                                 {...provided.droppableProps}
                                 className="bg-white rounded-lg shadow-sm border overflow-hidden"
                               >
                                   <div className="bg-gray-100 p-3 font-semibold text-gray-700 flex justify-between items-center">
                                       <span>{t.days[dayIndex]}</span>
                                       <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setAddingDay(dayIndex)}>
                                           <Plus className="h-4 w-4" />
                                       </Button>
                                   </div>
                                   
                                   <div className="p-2 space-y-2 min-h-[50px]">
                                       {dishesByDay[dayIndex].map((dish, index) => (
                                           <Draggable key={dish.id} draggableId={dish.id} index={index}>
                                               {(provided: any) => (
                                                   <div
                                                       ref={provided.innerRef}
                                                       {...provided.draggableProps}
                                                       {...provided.dragHandleProps}
                                                       className={`border rounded p-3 relative group bg-white ${dish.status === 'proposed' ? 'border-dashed border-orange-300' : 'border-green-500'}`}
                                                       style={{ ...provided.draggableProps.style }}
                                                   >
                                                       <div className="flex justify-between items-start">
                                                           <div className="font-medium pr-6 flex items-center cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSelectedDish(dish)}>
                                                               <BookOpen className="w-4 h-4 mr-2 text-gray-400" />
                                                               {dish.name}
                                                           </div>
                                                           <div className="absolute top-2 right-2 flex gap-2">
                                                               {/* Show approve button only if user is NOT the creator */}
                                                               {dish.status === 'proposed' && dish.created_by !== user?.id && (
                                                                   <button 
                                                                     className="text-gray-300 hover:text-green-500"
                                                                     onPointerDown={(e) => { e.stopPropagation(); handleToggleDish(dish.id, dish.status) }}
                                                                     title={t.approve}
                                                                   >
                                                                       <CheckCircle2 className="h-5 w-5" />
                                                                   </button>
                                                               )}
                                                               {/* Show unapprove button if dish is selected and user is NOT the creator */}
                                                               {dish.status === 'selected' && dish.created_by !== user?.id && (
                                                                   <button 
                                                                     className="text-green-500 hover:text-orange-500"
                                                                     onPointerDown={(e) => { e.stopPropagation(); handleToggleDish(dish.id, dish.status) }}
                                                                     title={t.unapprove}
                                                                   >
                                                                       <CheckCircle2 className="h-5 w-5" />
                                                                   </button>
                                                               )}
                                                               <button 
                                                                  onClick={() => handleDeleteDish(dish.id)}
                                                                  className="text-gray-300 hover:text-red-500"
                                                                  onPointerDown={(e) => e.stopPropagation()}
                                                               >
                                                                   <Trash2 className="h-4 w-4" />
                                                               </button>
                                                           </div>
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
                                               )}
                                           </Draggable>
                                       ))}
                                       {provided.placeholder}
                                       
                                       {addingDay === dayIndex ? (
                                           <AddDishForm 
                                              day={dayIndex} 
                                              onAdded={async (dish) => {
                                                  setAddingDay(null)
                                                  
                                                  // Optimistic update - add dish immediately to local state
                                                  if (dish) {
                                                      setDishes(prev => [...prev, {
                                                          ...dish,
                                                          ingredients: [],
                                                          status: 'proposed'
                                                      }])
                                                  }
                                                  
                                                  // Refresh to get full data (with ingredients when generated)
                                                  await refreshDishes()
                                                  setTimeout(() => refreshDishes(), 1000)
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
                           )}
                       </Droppable>
                   ))}
                </div>
            </DragDropContext>
          )}

          {tab === 'list' && (
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
            <span className="text-xs">{t.planMenu}</span>
          </Button>
          <Button variant={tab === 'ideas' ? 'default' : 'ghost'} onClick={() => setTab('ideas')} className="flex-1 mx-1">
            <Lightbulb className="w-4 h-4 mr-2" />
            <span className="text-xs">{t.ideas}</span>
          </Button>
          <Button variant={tab === 'list' ? 'default' : 'ghost'} onClick={() => setTab('list')} className="flex-1 mx-1">
            {/* Shopping cart icon? */}
            <span className="text-xs">{t.shoppingList}</span>
          </Button>
       </div>
    </div>
  )
}
