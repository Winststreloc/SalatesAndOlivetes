'use client'

import { useMemo, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen, CheckCircle2, Trash2, Loader2 } from 'lucide-react'
import { AddDishForm } from '../AddDishForm'
import { DishSkeleton } from '../LoadingStates'
import { Skeleton } from '@/components/ui/skeleton'
import { useLang } from '../LanguageProvider'
import { formatDate, getWeekDates } from '@/utils/dateUtils'
import { Dish, Ingredient } from '@/types'
import type { DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd'
import { toggleDishSelection, moveDish, deleteDish } from '@/app/actions'
import { showToast } from '@/utils/toast'
import { logger } from '@/utils/logger'

interface PlanTabProps {
  dishes: Dish[]
  isLoading: boolean
  orderedDates: string[]
  addingDay: string | null
  selectedDish: Dish | null
  user: { id: number; first_name: string; username?: string } | null
  hasPartner: boolean
  couplePreferences: { useAI?: boolean }
  recentlyAddedDishesRef: React.MutableRefObject<Set<string>>
  deletingDishesRef: React.MutableRefObject<Set<string>>
  isMountedRef: React.MutableRefObject<boolean>
  onSetAddingDay: (date: string | null) => void
  onSetSelectedDish: (dish: Dish | null) => void
  onDishAdded: (dish: Dish) => void
  onDishRemoved: (dishId: string) => void
  onDishesUpdate: (updater: (prev: Dish[]) => Dish[]) => void
  onRefreshDishes: () => Promise<void>
  onConfirmDelete: (dishId: string, onConfirm: () => Promise<void>) => void
}

export function PlanTab({
  dishes,
  isLoading,
  orderedDates,
  addingDay,
  selectedDish,
  user,
  hasPartner,
  couplePreferences,
  recentlyAddedDishesRef,
  deletingDishesRef,
  isMountedRef,
  onSetAddingDay,
  onSetSelectedDish,
  onDishAdded,
  onDishRemoved,
  onDishesUpdate,
  onRefreshDishes,
  onConfirmDelete
}: PlanTabProps) {
  const { t, lang } = useLang()

  const dishesByDate = useMemo(() => {
    const groups: Record<string, Dish[]> = {}
    orderedDates.forEach(date => {
      groups[date] = []
    })
    dishes.forEach(d => {
      if (d.dish_date) {
        const dateStr = d.dish_date.split('T')[0]
        if (groups[dateStr]) {
          groups[dateStr].push(d)
        }
      }
    })
    return groups
  }, [dishes, orderedDates])

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const sourceDate = result.source.droppableId
    const destDate = result.destination.droppableId
    const dishId = result.draggableId
    if (sourceDate === destDate) return

    onDishesUpdate(prev => prev.map(d => {
      if (d.id === dishId) {
        return { ...d, dish_date: destDate }
      }
      return d
    }))
    await moveDish(dishId, destDate)
  }

  const handleToggleDish = async (id: string, currentStatus: string) => {
    if (!isMountedRef.current) return
    try {
      onDishesUpdate(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus === 'selected' ? 'proposed' : 'selected' } : d))
      await toggleDishSelection(id, currentStatus !== 'selected')
    } catch (e: unknown) {
      console.error('Failed to toggle dish:', e)
      if (isMountedRef.current) {
        onRefreshDishes()
      }
    }
  }

  const handleDeleteDish = async (id: string) => {
    onConfirmDelete(id, async () => {
      if (!isMountedRef.current) return
      
      deletingDishesRef.current.add(id)
      
      try {
        onDishesUpdate(prev => {
          if (!isMountedRef.current) return prev
          return prev.filter(d => d.id !== id)
        })
        
        await deleteDish(id)
        
        setTimeout(() => {
          deletingDishesRef.current.delete(id)
        }, 1000)
        
        if (isMountedRef.current) {
          showToast.success(t.deleteSuccess || 'Dish deleted successfully')
        }
      } catch (e: unknown) {
        console.error('Failed to delete dish:', e)
        deletingDishesRef.current.delete(id)
        if (isMountedRef.current) {
          onRefreshDishes()
          showToast.error((e instanceof Error ? e.message : 'Failed to delete dish'))
        }
      }
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {orderedDates.map(date => (
          <div key={date} className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            <div className="bg-muted p-3 font-semibold text-foreground">
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="p-2 space-y-2">
              <DishSkeleton />
              <DishSkeleton />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6">
        {orderedDates.map(date => (
          <Droppable key={date} droppableId={date}>
            {(provided: DroppableProvided) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-card rounded-lg shadow-sm border border-border overflow-hidden"
              >
                <div className="bg-muted p-3 font-semibold text-foreground flex justify-between items-center">
                  <span>{formatDate(date, lang)}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSetAddingDay(date)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="p-2 space-y-2 min-h-[50px]">
                  {dishesByDate[date]?.map((dish, index) => {
                    const swipeHandlers = {
                      onTouchStart: (e: React.TouchEvent) => {
                        const touch = e.touches[0]
                        const startX = touch.clientX
                        const startY = touch.clientY
                        
                        const handleTouchMove = (moveEvent: TouchEvent) => {
                          const currentTouch = moveEvent.touches[0]
                          const deltaX = currentTouch.clientX - startX
                          const deltaY = currentTouch.clientY - startY
                          
                          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                            if (deltaX > 0) {
                              if (dish.status === 'proposed' && ((dish.created_by !== user?.id && hasPartner) || (dish.created_by === user?.id && !hasPartner))) {
                                handleToggleDish(dish.id, dish.status)
                              }
                            } else {
                              handleDeleteDish(dish.id)
                            }
                            document.removeEventListener('touchmove', handleTouchMove)
                            document.removeEventListener('touchend', handleTouchEnd)
                          }
                        }
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove)
                          document.removeEventListener('touchend', handleTouchEnd)
                        }
                        
                        document.addEventListener('touchmove', handleTouchMove)
                        document.addEventListener('touchend', handleTouchEnd)
                      }
                    }
                    
                    return (
                      <Draggable key={dish.id} draggableId={dish.id} index={index}>
                        {(provided: DraggableProvided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            {...swipeHandlers}
                            className={`border border-border rounded p-3 relative group bg-card ${dish.status === 'proposed' ? 'border-dashed border-orange-300' : 'border-green-500'}`}
                            style={{ ...provided.draggableProps.style }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="font-medium pr-6 flex items-center cursor-pointer hover:text-blue-600 transition-colors gap-2 flex-wrap" onClick={() => onSetSelectedDish(dish)}>
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                                <span>{dish.name}</span>
                                {dish.calories ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {dish.calories} kcal
                                  </span>
                                ) : null}
                              </div>
                              <div className="absolute top-2 right-2 flex gap-2">
                                {dish.status === 'proposed' && (
                                  ((dish.created_by !== user?.id && hasPartner) || 
                                   (dish.created_by === user?.id && !hasPartner))
                                ) && (
                                  <button 
                                    className="text-muted-foreground hover:text-green-500"
                                    onPointerDown={(e) => { e.stopPropagation(); handleToggleDish(dish.id, dish.status) }}
                                    title={t.approve}
                                  >
                                    <CheckCircle2 className="h-5 w-5" />
                                  </button>
                                )}
                                {dish.status === 'selected' && (
                                  ((dish.created_by !== user?.id && hasPartner) || 
                                   (dish.created_by === user?.id && !hasPartner))
                                ) && (
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
                                  className="text-muted-foreground hover:text-red-500 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-1">
                              {dish.ingredients && dish.ingredients.length > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  {dish.ingredients?.map((i: Ingredient) => i.name).join(', ') || ''}
                                </p>
                              ) : (
                                couplePreferences.useAI !== false && (
                                  <div className="flex items-center text-xs text-blue-500 animate-pulse">
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    {t.generating}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                  
                  {addingDay === date ? (
                    <AddDishForm 
                      date={date} 
                      onAdded={async (dish) => {
                        if (!isMountedRef.current) return
                        onSetAddingDay(null)
                        
                        if (dish && isMountedRef.current) {
                          recentlyAddedDishesRef.current.add(dish.id)
                          setTimeout(() => {
                            recentlyAddedDishesRef.current.delete(dish.id)
                          }, 2000)
                          
                          onDishAdded(dish)
                        }
                      }}
                      onRemove={(dishId) => {
                        if (isMountedRef.current) {
                          onDishRemoved(dishId)
                        }
                      }}
                      onCancel={() => onSetAddingDay(null)} 
                    />
                  ) : (
                    (!dishesByDate[date] || dishesByDate[date].length === 0) && (
                      <div className="text-xs text-muted-foreground text-center py-2 cursor-pointer hover:text-foreground" onClick={() => onSetAddingDay(date)}>
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
  )
}

