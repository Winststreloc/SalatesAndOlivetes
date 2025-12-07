'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { getDishes, getDish, toggleDishSelection, toggleIngredientsPurchased, deleteDish, getInviteCode, moveDish, addDish, generateDishIngredients, getWeeklyPlans, saveWeeklyPlan, loadWeeklyPlan, addManualIngredient, updateManualIngredient, deleteManualIngredient, deleteIngredient, updateIngredient, getManualIngredients, hasPartner } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { AddDishForm } from './AddDishForm'
import { IdeasTab } from './IdeasTab'
import { RecipeView } from './RecipeView'
import { HistoryView } from './HistoryView'
import { IngredientForm } from './IngredientForm'
import { ConfirmDialog } from './ConfirmDialog'
import { FloatingActionButton } from './FloatingActionButton'
import { GlobalSearch } from './GlobalSearch'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useLang } from './LanguageProvider'
import { useAuth } from './AuthProvider'
import { useTheme } from './ThemeProvider'
import { Trash2, Key, Share2, Loader2, Plus, Calendar, CheckCircle2, Lightbulb, BookOpen, LogOut, Wifi, WifiOff, Search, History, Moon, Sun, Download, Edit2, X } from 'lucide-react'
import { groupByCategory, IngredientCategory, CategorizedIngredient } from '@/utils/ingredientCategories'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/utils/toast'
import { useSwipeable } from 'react-swipeable'
import { DishSkeleton } from './LoadingStates'
import { Skeleton } from '@/components/ui/skeleton'
import { triggerHaptic } from '@/utils/haptics'
import { handleError, createErrorContext } from '@/utils/errorHandler'
import * as Sentry from '@sentry/nextjs'

export function Dashboard() {
  const { t, lang, setLang } = useLang()
  const { coupleId, logout, user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = useState<'plan' | 'list' | 'ideas' | 'history'>('plan')
  const [dishes, setDishes] = useState<any[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [addingDay, setAddingDay] = useState<number | null>(null)
  const [selectedDish, setSelectedDish] = useState<any | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [showDaySelector, setShowDaySelector] = useState(false)
  const [pendingIdea, setPendingIdea] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'alphabetical' | 'category' | 'amount'>('category')
  const [manualIngredients, setManualIngredients] = useState<any[]>([])
  const [editingIngredient, setEditingIngredient] = useState<{ id: string, type: 'dish' | 'manual', name: string, amount: string, unit: string } | null>(null)
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const [hasPartnerUser, setHasPartnerUser] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, title: string, description: string, onConfirm: () => void } | null>(null)
  const [isLoadingDishes, setIsLoadingDishes] = useState(true)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const channelRef = useRef<any>(null)
  const isMountedRef = useRef(true)
  const deletingDishesRef = useRef<Set<string>>(new Set())
  const recentlyAddedDishesRef = useRef<Set<string>>(new Set())
  
  const checkHasPartner = useCallback(async () => {
      if (!isMountedRef.current) return
      try {
        const hasPartnerResult = await hasPartner()
        if (isMountedRef.current) {
          setHasPartnerUser(hasPartnerResult)
        }
      } catch (error) {
        console.error('Failed to check partner:', error)
      }
  }, [])

  const refreshDishes = useCallback(async () => {
    if (!isMountedRef.current) return
    setIsLoadingDishes(true)
    try {
      const data = await getDishes()
      if (isMountedRef.current) {
        setDishes(data)
        setLastUpdate(new Date())
        // Also check for partner when refreshing dishes
        await checkHasPartner()
      }
    } catch (error) {
      console.error('Failed to refresh dishes:', error)
      if (isMountedRef.current) {
        showToast.error('Failed to load dishes')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingDishes(false)
      }
    }
  }, [checkHasPartner])

  const loadInviteCode = useCallback(async () => {
      try {
        const code = await getInviteCode()
        if (isMountedRef.current) {
          setInviteCode(code)
        }
      } catch (error) {
        console.error('Failed to load invite code:', error)
      }
  }, [])

  const loadManualIngredients = useCallback(async () => {
      if (!isMountedRef.current) return
      try {
        const data = await getManualIngredients()
        if (isMountedRef.current) {
          setManualIngredients(data)
        }
      } catch (error) {
        console.error('Failed to load manual ingredients:', error)
      }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    
    // Test message to verify Sentry is working
    console.log('🧪 Dashboard mounted - sending test message to Sentry...');
    Sentry.captureMessage('hello from Dashboard', {
      level: 'info',
      tags: {
        test: true,
        source: 'dashboard_mount',
        component: 'Dashboard',
      },
      extra: {
        timestamp: new Date().toISOString(),
        coupleId: coupleId || 'not_set',
      },
    });
    console.log('✅ Test message sent to Sentry from Dashboard');
    
    return () => {
      // Mark as unmounted before cleanup
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!coupleId) return // Wait for coupleId to be available
    
    let cancelled = false
    
    const loadData = async () => {
      if (!isMountedRef.current || cancelled) return
      try {
        await Promise.all([
          refreshDishes(),
          loadInviteCode(),
          loadManualIngredients(),
          checkHasPartner()
        ])
      } catch (error) {
        console.error('Failed to load initial data:', error)
      }
    }
    
    loadData()
    
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
                    // New dish added - fetch only this dish with ingredients
                    const newDishId = (payload.new as any).id
                    if (newDishId && isMountedRef.current) {
                      // Skip if we recently added this dish optimistically (to avoid duplicate updates)
                      if (recentlyAddedDishesRef.current.has(newDishId)) {
                        console.log('⏭️ Skipping Realtime INSERT - already handled optimistically')
                        // Remove from set after a delay
                        setTimeout(() => {
                          recentlyAddedDishesRef.current.delete(newDishId)
                        }, 2000)
                        return
                      }
                      
                      // Use a ref to capture the current mounted state
                      const currentMounted = isMountedRef.current
                      getDish(newDishId).then(dish => {
                        if (!currentMounted || !isMountedRef.current) return
                        if (dish) {
                          setDishes(prev => {
                            if (!isMountedRef.current) return prev
                            // Check if dish already exists (from optimistic update)
                            const existingIndex = prev.findIndex(d => d.id === dish.id)
                            if (existingIndex >= 0) {
                              // Update existing dish with full data (including ingredients)
                              const updated = [...prev]
                              updated[existingIndex] = dish
                              return updated
                            }
                            // Add new dish if it doesn't exist
                            return [...prev, dish]
                          })
                        }
                      }).catch(err => {
                        console.error('Failed to fetch new dish:', err)
                      })
                    }
                } else if (payload.eventType === 'UPDATE') {
                    // Dish updated - update local state immediately
                    const updatedDishId = (payload.new as any).id
                    if (updatedDishId && isMountedRef.current) {
                      const currentMounted = isMountedRef.current
                      // Check if recipe or status changed (might affect ingredients)
                      const hasRecipeChange = (payload.new as any).recipe !== undefined
                      const hasStatusChange = (payload.new as any).status !== undefined
                      
                      if (hasRecipeChange || hasStatusChange) {
                        // Fetch full dish to get updated ingredients
                        getDish(updatedDishId).then(dish => {
                          if (!currentMounted || !isMountedRef.current) return
                          if (dish) {
                            setDishes(prev => {
                              if (!isMountedRef.current) return prev
                              return prev.map(d => d.id === dish.id ? dish : d)
                            })
                          }
                        }).catch(err => {
                          console.error('Failed to fetch updated dish:', err)
                          // Fallback to simple update
                          if (currentMounted && isMountedRef.current) {
                            setDishes(prev => {
                              if (!isMountedRef.current) return prev
                              return prev.map(d => 
                                d.id === updatedDishId ? { ...d, ...(payload.new as any) } : d
                              )
                            })
                          }
                        })
                      } else {
                        // Simple field update, no need to fetch
                        if (isMountedRef.current) {
                          setDishes(prev => {
                            if (!isMountedRef.current) return prev
                            return prev.map(d => 
                              d.id === updatedDishId ? { ...d, ...(payload.new as any) } : d
                            )
                          })
                        }
                      }
                    }
                } else if (payload.eventType === 'DELETE') {
                    // Dish deleted - remove from local state
                    // Skip if we're already deleting this dish (optimistic update already handled it)
                    if (deletingDishesRef.current.has(payload.old.id)) {
                      console.log('⏭️ Skipping Realtime DELETE - already handled optimistically')
                      return
                    }
                    
                    // Only remove if it still exists (avoid duplicate removal)
                    if (isMountedRef.current) {
                      setDishes(prev => {
                        if (!isMountedRef.current) return prev
                        const exists = prev.some(d => d.id === payload.old.id)
                        if (!exists) {
                          // Already removed, skip
                          return prev
                        }
                        return prev.filter(d => d.id !== payload.old.id)
                      })
                    }
                } else {
                    // Unknown event type - refresh dishes as fallback
                    if (isMountedRef.current) {
                      refreshDishes()
                    }
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
                // Ingredients changed - update only the affected dish
                const dishId = (payload.new as any)?.dish_id || (payload.old as any)?.dish_id
                if (dishId && isMountedRef.current) {
                  const currentMounted = isMountedRef.current
                  getDish(dishId).then(dish => {
                    if (!currentMounted || !isMountedRef.current) return
                    if (dish) {
                      setDishes(prev => {
                        if (!isMountedRef.current) return prev
                        return prev.map(d => d.id === dish.id ? dish : d)
                      })
                    }
                  }).catch(err => {
                    console.error('Failed to fetch dish with updated ingredients:', err)
                  })
                }
            }
        )
        .on(
            'postgres_changes',
            { 
                event: '*', 
                schema: 'public', 
                table: 'manual_ingredients',
                filter: `couple_id=eq.${coupleId}`
            },
            (payload) => {
                console.log('🔔 Realtime manual ingredients update:', payload.eventType, payload)
                // Manual ingredients changed - update only the changed item
                if (payload.eventType === 'INSERT') {
                  // Add new manual ingredient
                  const newIngredient = payload.new as any
                  if (newIngredient?.id && isMountedRef.current) {
                    setManualIngredients(prev => {
                      if (!isMountedRef.current) return prev
                      // Check if already exists
                      if (prev.some(ing => ing.id === newIngredient.id)) {
                        return prev.map(ing => ing.id === newIngredient.id ? newIngredient : ing)
                      }
                      return [...prev, newIngredient]
                    })
                  }
                } else if (payload.eventType === 'UPDATE') {
                  // Update existing manual ingredient
                  const updatedIngredient = payload.new as any
                  if (updatedIngredient?.id && isMountedRef.current) {
                    setManualIngredients(prev => {
                      if (!isMountedRef.current) return prev
                      return prev.map(ing => 
                        ing.id === updatedIngredient.id ? { ...ing, ...updatedIngredient } : ing
                      )
                    })
                  }
                } else if (payload.eventType === 'DELETE') {
                  // Remove manual ingredient
                  const deletedId = (payload.old as any)?.id
                  if (deletedId && isMountedRef.current) {
                    setManualIngredients(prev => {
                      if (!isMountedRef.current) return prev
                      return prev.filter(ing => ing.id !== deletedId)
                    })
                  }
                }
            }
        )
        .subscribe((status) => {
            console.log('📡 Realtime subscription status:', status)
            if (isMountedRef.current) {
              setIsRealtimeConnected(status === 'SUBSCRIBED')
            }
            
            if (status === 'CHANNEL_ERROR') {
              console.error('❌ Realtime channel error')
              if (isMountedRef.current) {
                setIsRealtimeConnected(false)
              }
            } else if (status === 'TIMED_OUT') {
              console.warn('⏱️ Realtime connection timed out')
              if (isMountedRef.current) {
                setIsRealtimeConnected(false)
              }
            } else if (status === 'CLOSED') {
              console.warn('🔒 Realtime channel closed')
              if (isMountedRef.current) {
                setIsRealtimeConnected(false)
              }
            }
        })

    channelRef.current = channel

    return () => {
        console.log('🔌 Cleaning up Realtime subscription')
        cancelled = true
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }
    }
  }, [coupleId, refreshDishes, loadInviteCode, loadManualIngredients, checkHasPartner])

  const handleToggleDish = async (id: string, currentStatus: string) => {
    if (!isMountedRef.current) return
    try {
      setDishes(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus === 'selected' ? 'proposed' : 'selected' } : d))
      await toggleDishSelection(id, currentStatus !== 'selected')
    } catch (e: any) {
      console.error('Failed to toggle dish:', e)
      if (isMountedRef.current) {
        refreshDishes()
      }
    }
  }
  
  const handleDeleteDish = async (id: string) => {
      setConfirmDialog({
        open: true,
        title: t.delete || 'Delete',
        description: t.deleteDishConfirm || 'Are you sure you want to delete this dish?',
        onConfirm: async () => {
          setConfirmDialog(null)
          if (!isMountedRef.current) return
          
          // Mark dish as being deleted to prevent Realtime handler from processing it
          deletingDishesRef.current.add(id)
          
          try {
            // Optimistic update - remove immediately from UI
            if (isMountedRef.current) {
              setDishes(prev => {
                // Double check component is still mounted inside setState callback
                if (!isMountedRef.current) return prev
                return prev.filter(d => d.id !== id)
              })
            }
            
            // Delete from database
            await deleteDish(id)
            
            // Remove from deleting set after a delay to allow Realtime event to be ignored
            setTimeout(() => {
              deletingDishesRef.current.delete(id)
            }, 1000)
            
            if (isMountedRef.current) {
              showToast.success(t.deleteSuccess || 'Dish deleted successfully')
            }
          } catch (e: any) {
            console.error('Failed to delete dish:', e)
            // Remove from deleting set on error
            deletingDishesRef.current.delete(id)
            // Revert optimistic update only if component is still mounted
            if (isMountedRef.current) {
              refreshDishes()
              showToast.error(e.message || 'Failed to delete dish')
            }
          }
        }
      })
  }
  
  const handleShare = () => {
    if (!inviteCode) return
    // Create a direct link that opens the app with pre-filled invite code
    const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const inviteLink = `${appUrl}?invite=${inviteCode}`
    const inviteText = `Join me in S&O! Click the link: ${inviteLink}`
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join me in S&O!')}`
    
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url)
    } else {
        window.open(url, '_blank')
    }
  }

  const handleCopyLink = async () => {
    if (!inviteCode) return
    const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const inviteLink = `${appUrl}?invite=${inviteCode}`
    
    try {
        await navigator.clipboard.writeText(inviteLink)
        showToast.success(t.copied)
    } catch (e) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = inviteLink
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        showToast.success(t.copied)
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
          if (isMountedRef.current) {
            // Mark as recently added to skip WebSocket INSERT event
            recentlyAddedDishesRef.current.add(dish.id)
            setTimeout(() => {
              recentlyAddedDishesRef.current.delete(dish.id)
            }, 2000)
            
            setDishes(prev => {
              if (!isMountedRef.current) return prev
              return [...prev, {
                  ...dish,
                  ingredients: [],
                  status: 'proposed'
              }]
            })
          }
          
          // Pass LANG here - generate ingredients asynchronously
          // Ingredients will be added via WebSocket when generated
          generateDishIngredients(dish.id, dish.name, lang).catch(async (err) => {
            console.error('Failed to generate ingredients:', err)
            const errorMessage = err?.message || ''
            const isValidationError = errorMessage.includes('valid dish name') || 
                                      errorMessage.includes('INVALID_INPUT') || 
                                      errorMessage.includes('не название блюда') || 
                                      errorMessage.includes('not a food-related') ||
                                      errorMessage.includes('связанное с едой') ||
                                      errorMessage.includes('food-related')
            
            if (isValidationError) {
              // Show error to user
              showToast.error(errorMessage || (t.invalidDishName || 'Please enter a valid dish name (food-related only)'))
              // Remove from local state and delete from database
              if (isMountedRef.current) {
                setDishes(prev => prev.filter(d => d.id !== dish.id))
                try {
                  await deleteDish(dish.id)
                  console.log('Deleted invalid dish:', dish.id)
                } catch (deleteErr) {
                  console.error('Failed to delete invalid dish:', deleteErr)
                  handleError(deleteErr as Error, createErrorContext('handleConfirmAddIdea', {
                    type: 'DATABASE_ERROR',
                    userId: undefined,
                    metadata: { dishId: dish.id, action: 'deleteInvalidDish' },
                  }))
                }
              }
            } else {
              handleError(err as Error, createErrorContext('handleConfirmAddIdea', {
                type: 'AI_ERROR',
                userId: undefined,
                metadata: { dishId: dish.id, dishName: name, lang },
              }))
            }
          })
          
          if (isMountedRef.current) {
            setTab('plan')
            showToast.success(t.addSuccess || 'Dish added successfully')
          }
      } catch (error: any) {
          console.error('Failed to add dish:', error)
          handleError(error, createErrorContext('handleConfirmAddIdea', {
            type: 'DATABASE_ERROR',
            userId: undefined,
            metadata: { dishName: name, day },
          }))
          // Show specific error message if validation failed
          const errorMessage = error?.message?.includes('valid dish name') 
            ? (t.invalidDishName || 'Please enter a valid dish name (food-related only)')
            : (error?.message || t.failedAdd || 'Failed to add dish')
          showToast.error(errorMessage)
      }
  }

  const shoppingList = useMemo(() => {
    const selectedDishes = dishes.filter(d => d.status === 'selected')
    const map = new Map<string, { 
      name: string, 
      amount: number, 
      unit: string, 
      ids: string[], 
      is_purchased: boolean,
      dishIds: string[],
      dishNames: string[],
      isManual: boolean,
      manualId?: string
    }>()
    
    // Add ingredients from dishes
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
          if (!existing.dishIds.includes(dish.id)) {
            existing.dishIds.push(dish.id)
            existing.dishNames.push(dish.name)
          }
          if (!ing.is_purchased) existing.is_purchased = false 
        } else {
          map.set(key, { 
              name: ing.name.trim(), 
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
    
    // Add manual ingredients
    manualIngredients.forEach((ing: any) => {
      const cleanName = ing.name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim().toLowerCase()
      const cleanUnit = ing.unit?.trim().toLowerCase() || ''
      const key = `${cleanName}-${cleanUnit}`
      
      const existing = map.get(key)
      let amount = parseFloat(String(ing.amount).replace(',', '.')) || 0
      
      if (existing) {
        // Merge with existing ingredient
        existing.amount += amount
        if (ing.is_purchased) existing.is_purchased = true
      } else {
        map.set(key, {
          name: ing.name.trim(),
          amount,
          unit: ing.unit || '',
          ids: [],
          is_purchased: ing.is_purchased,
          dishIds: [],
          dishNames: [],
          isManual: true,
          manualId: ing.id
        })
      }
    })
    
    let items = Array.from(map.values())
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(item => item.name.toLowerCase().includes(query))
    }
    
    // Separate items by purchase status - unpurchased first
    const unpurchased = items.filter(item => !item.is_purchased)
    const purchased = items.filter(item => item.is_purchased)
    
    // Apply sorting within each group
    const sortItems = (itemsToSort: typeof items) => {
      if (sortBy === 'alphabetical') {
        return [...itemsToSort].sort((a, b) => a.name.localeCompare(b.name))
      } else if (sortBy === 'amount') {
        return [...itemsToSort].sort((a, b) => b.amount - a.amount)
      }
      // category sorting is handled by groupByCategory
      return itemsToSort
    }
    
    // Always return unpurchased first, then purchased
    return [...sortItems(unpurchased), ...sortItems(purchased)]
  }, [dishes, manualIngredients, searchQuery, sortBy])
  
  const categorizedList = useMemo(() => {
    const categorized = groupByCategory(shoppingList)
    // Within each category, separate by purchase status and sort unpurchased first
    const result: Record<IngredientCategory, CategorizedIngredient[]> = {
      vegetables: [],
      fruits: [],
      meat: [],
      dairy: [],
      bakery: [],
      pantry: [],
      spices: [],
      other: []
    }
    
    Object.keys(categorized).forEach(cat => {
      const category = cat as IngredientCategory
      const items = categorized[category]
      const unpurchased = items.filter(item => !item.is_purchased)
      const purchased = items.filter(item => item.is_purchased)
      
      // Apply sorting within each group
      if (sortBy === 'alphabetical') {
        unpurchased.sort((a, b) => a.name.localeCompare(b.name))
        purchased.sort((a, b) => a.name.localeCompare(b.name))
      } else if (sortBy === 'amount') {
        unpurchased.sort((a, b) => b.amount - a.amount)
        purchased.sort((a, b) => b.amount - a.amount)
      }
      
      // Always unpurchased first
      result[category] = [...unpurchased, ...purchased]
    })
    
    return result
  }, [shoppingList, sortBy])
  
  const categoryLabels: Record<IngredientCategory, string> = {
    vegetables: t.categoryVegetables,
    fruits: t.categoryFruits,
    meat: t.categoryMeat,
    dairy: t.categoryDairy,
    bakery: t.categoryBakery,
    pantry: t.categoryPantry,
    spices: t.categorySpices,
    other: t.categoryOther
  }
  
  const categoryOrder: IngredientCategory[] = ['vegetables', 'fruits', 'meat', 'dairy', 'bakery', 'pantry', 'spices', 'other']

  const handleExportText = () => {
    let text = `${t.shoppingList}\n\n`
    
    if (sortBy === 'category') {
      categoryOrder.forEach(category => {
        const items = categorizedList[category]
        if (items.length === 0) return
        
        text += `${categoryLabels[category]}:\n`
        items.forEach(item => {
          const amount = item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''
          const check = item.is_purchased ? '✓' : '☐'
          text += `  ${check} ${item.name}${amount ? ` - ${amount}` : ''}\n`
        })
        text += '\n'
      })
    } else {
      shoppingList.forEach(item => {
        const amount = item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''
        const check = item.is_purchased ? '✓' : '☐'
        text += `${check} ${item.name}${amount ? ` - ${amount}` : ''}\n`
      })
    }
    
    // Create and download file
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportTelegram = () => {
    let text = `🛒 ${t.shoppingList}\n\n`
    
    if (sortBy === 'category') {
      categoryOrder.forEach(category => {
        const items = categorizedList[category]
        if (items.length === 0) return
        
        text += `📦 ${categoryLabels[category]}:\n`
        items.forEach(item => {
          const amount = item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''
          const check = item.is_purchased ? '✅' : '☐'
          text += `${check} ${item.name}${amount ? ` - ${amount}` : ''}\n`
        })
        text += '\n'
      })
    } else {
      shoppingList.forEach(item => {
        const amount = item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''
        const check = item.is_purchased ? '✅' : '☐'
        text += `${check} ${item.name}${amount ? ` - ${amount}` : ''}\n`
      })
    }
    
    // Share via Telegram
    const url = `https://t.me/share/url?url=${encodeURIComponent(text)}&text=${encodeURIComponent(t.shoppingList)}`
    
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url)
    } else {
        window.open(url, '_blank')
    }
  }

  const handleToggleIngredient = async (item: any) => {
    try {
      const newStatus = !item.is_purchased
      const idsToUpdate: string[] = []
      
      // Collect all IDs to update
      if (item.ids && item.ids.length > 0) {
        idsToUpdate.push(...item.ids)
        // Update dish ingredients in local state
        if (isMountedRef.current) {
          setDishes(prev => prev.map(d => ({
              ...d,
              ingredients: d.ingredients.map((ing: any) => 
                  item.ids.includes(ing.id) ? { ...ing, is_purchased: newStatus } : ing
              )
          })))
        }
      }
      
      // Update manual ingredients
      if (item.manualId) {
        idsToUpdate.push(item.manualId)
        if (isMountedRef.current) {
          setManualIngredients(prev => prev.map(ing => 
            ing.id === item.manualId ? { ...ing, is_purchased: newStatus } : ing
          ))
        }
      }
      
      if (idsToUpdate.length > 0) {
        await toggleIngredientsPurchased(idsToUpdate, newStatus)
      }
    } catch (e: any) {
      console.error('Failed to toggle ingredient:', e)
      if (isMountedRef.current) {
        refreshDishes()
        loadManualIngredients()
        showToast.error(e.message || 'Failed to update ingredient')
      }
    }
  }

  const handleDeleteIngredient = async (item: any) => {
    setConfirmDialog({
      open: true,
      title: t.deleteIngredient || 'Delete Ingredient',
      description: t.deleteIngredientConfirm || 'Are you sure you want to delete this ingredient?',
      onConfirm: async () => {
        setConfirmDialog(null)
        if (!isMountedRef.current) return
        
        try {
          // Delete from dish ingredients
          if (item.ids.length > 0) {
            for (const id of item.ids) {
              await deleteIngredient(id)
            }
            if (isMountedRef.current) {
              await refreshDishes()
            }
          }
          
          // Delete manual ingredient
          if (item.manualId) {
            await deleteManualIngredient(item.manualId)
            if (isMountedRef.current) {
              await loadManualIngredients()
            }
          }
          if (isMountedRef.current) {
            showToast.success(t.deleteIngredientSuccess || 'Ingredient deleted successfully')
          }
        } catch (e: any) {
          console.error('Failed to delete ingredient:', e)
          if (isMountedRef.current) {
            showToast.error(e.message || 'Failed to delete ingredient')
          }
        }
      }
    })
  }

  const handleAddManualIngredient = async (name: string, amount: string, unit: string) => {
    if (!isMountedRef.current) return
    try {
      await addManualIngredient(name, amount, unit)
      if (isMountedRef.current) {
        await loadManualIngredients()
        setShowAddIngredient(false)
        showToast.success(t.addIngredientSuccess || 'Ingredient added successfully')
      }
    } catch (e: any) {
      console.error('Failed to add ingredient:', e)
      if (isMountedRef.current) {
        showToast.error(e.message || 'Failed to add ingredient')
      }
    }
  }

  const handleUpdateIngredient = async (item: any, name: string, amount: string, unit: string) => {
    if (!isMountedRef.current) return
    try {
      // Update dish ingredients
      if (item.ids.length > 0) {
        for (const id of item.ids) {
          await updateIngredient(id, name, amount, unit)
        }
        if (isMountedRef.current) {
          await refreshDishes()
        }
      }
      
      // Update manual ingredient
      if (item.manualId) {
        await updateManualIngredient(item.manualId, name, amount, unit)
        if (isMountedRef.current) {
          await loadManualIngredients()
        }
      }
      
      if (isMountedRef.current) {
        setEditingIngredient(null)
        showToast.success(t.updateIngredientSuccess || 'Ingredient updated successfully')
      }
    } catch (e: any) {
      console.error('Failed to update ingredient:', e)
      if (isMountedRef.current) {
        showToast.error(e.message || 'Failed to update ingredient')
      }
    }
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
    <div className="flex flex-col h-screen bg-background relative">
                 <div className="flex justify-between p-3 bg-card border-b border-border items-center shadow-sm z-10 safe-area-inset-top">
         <div className="flex items-center space-x-2">
             <Button variant="ghost" size="icon" onClick={() => setShowInvite(!showInvite)}>
                <Key className="h-4 w-4" />
             </Button>
             <h1 className="font-semibold text-sm text-foreground">S&O</h1>
             {isRealtimeConnected ? (
                 <span title="Realtime connected">
                     <Wifi className="h-3 w-3 text-green-500" />
                 </span>
             ) : (
                 <span title="Realtime disconnected">
                     <WifiOff className="h-3 w-3 text-muted-foreground" />
                 </span>
             )}
         </div>
         <div className="flex items-center space-x-1">
             <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}>
                {lang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN'}
             </Button>
             <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
             </Button>
             <Button variant="ghost" size="icon" onClick={() => {
                setConfirmDialog({
                  open: true,
                  title: t.logout || 'Logout',
                  description: t.logoutConfirm || 'Are you sure you want to leave the couple? You will need to create or join a new couple.',
                  onConfirm: async () => {
                    setConfirmDialog(null)
                    await logout()
                  }
                })
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
                       <div className="p-3 bg-muted rounded font-mono select-all text-xl font-bold mb-4 text-foreground">
                           {inviteCode || '...'}
                       </div>
                       <div className="mb-4">
                           <a 
                               href={typeof window !== 'undefined' ? `${window.location.origin}?invite=${inviteCode}` : '#'}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="text-blue-500 hover:text-blue-700 underline text-sm break-all"
                           >
                               {typeof window !== 'undefined' ? `${window.location.origin}?invite=${inviteCode}` : ''}
                           </a>
                       </div>
                       <Button className="w-full flex items-center gap-2 mb-2" onClick={handleShare}>
                         <Share2 className="w-4 h-4" />
                         {t.shareLink}
                       </Button>
                       <Button variant="outline" className="w-full flex items-center gap-2 mb-2" onClick={handleCopyLink}>
                         {t.copyLink}
                       </Button>
                       <Button variant="ghost" onClick={() => setShowInvite(false)}>{t.close}</Button>
                   </CardContent>
               </Card>
           </div>
       )}
       
       <RecipeView dish={selectedDish} isOpen={!!selectedDish} onClose={() => setSelectedDish(null)} />

       <GlobalSearch
         dishes={dishes}
         ingredients={shoppingList}
         onSelectDish={(dish) => {
           setSelectedDish(dish)
           setTab('plan')
         }}
         isOpen={showGlobalSearch}
         onClose={() => setShowGlobalSearch(false)}
       />

       {confirmDialog && (
         <ConfirmDialog
           open={confirmDialog.open}
           onOpenChange={(open) => !open && setConfirmDialog(null)}
           onConfirm={confirmDialog.onConfirm}
           title={confirmDialog.title}
           description={confirmDialog.description}
           variant="destructive"
         />
       )}

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
             {tab === 'plan' ? t.planMenu : (tab === 'list' ? t.shoppingList : (tab === 'ideas' ? t.ideas : t.history))}
          </h1>
          
          {tab === 'ideas' && (
              <IdeasTab onSelectIdea={handleAddIdea} />
          )}

          {tab === 'history' && (
              <HistoryView 
                currentDishes={dishes} 
                onLoadWeek={async (loadedDishes) => {
                  // Replace current dishes with loaded ones
                  // Need to recreate dishes in DB or just show them
                  if (isMountedRef.current) {
                    setDishes(loadedDishes)
                    setTab('plan')
                  }
                }} 
              />
          )}

          {tab === 'plan' && (
            isLoadingDishes ? (
              <div className="space-y-6">
                {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => (
                  <div key={dayIndex} className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
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
            ) : (
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="space-y-6">
                   {orderedDays.map(dayIndex => (
                       <Droppable key={dayIndex} droppableId={String(dayIndex)}>
                           {(provided: any) => (
                               <div 
                                 ref={provided.innerRef}
                                 {...provided.droppableProps}
                                 className="bg-card rounded-lg shadow-sm border border-border overflow-hidden"
                                       >
                                           <div className="bg-muted p-3 font-semibold text-foreground flex justify-between items-center">
                                       <span>{t.days[dayIndex]}</span>
                                       <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setAddingDay(dayIndex)}>
                                           <Plus className="h-4 w-4" />
                                       </Button>
                                   </div>
                                   
                                   <div className="p-2 space-y-2 min-h-[50px]">
                                       {dishesByDay[dayIndex].map((dish, index) => {
                                           const swipeHandlers = useSwipeable({
                                             onSwipedLeft: () => {
                                               handleDeleteDish(dish.id)
                                             },
                                             onSwipedRight: () => {
                                               if (dish.status === 'proposed' && ((dish.created_by !== user?.id && hasPartnerUser) || (dish.created_by === user?.id && !hasPartnerUser))) {
                                                 handleToggleDish(dish.id, dish.status)
                                               }
                                             },
                                             trackMouse: false,
                                             trackTouch: true,
                                             preventScrollOnSwipe: true
                                           })
                                           
                                           return (
                                           <Draggable key={dish.id} draggableId={dish.id} index={index}>
                                               {(provided: any) => (
                                                   <div
                                                       ref={(el) => {
                                                         provided.innerRef(el)
                                                         if (swipeHandlers.ref) {
                                                           swipeHandlers.ref(el)
                                                         }
                                                       }}
                                                       {...provided.draggableProps}
                                                       {...provided.dragHandleProps}
                                                       {...Object.fromEntries(Object.entries(swipeHandlers).filter(([key]) => key !== 'ref'))}
                                                       className={`border border-border rounded p-3 relative group bg-card ${dish.status === 'proposed' ? 'border-dashed border-orange-300' : 'border-green-500'}`}
                                                       style={{ ...provided.draggableProps.style }}
                                                   >
                                                       <div className="flex justify-between items-start">
                                                           <div className="font-medium pr-6 flex items-center cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setSelectedDish(dish)}>
                                                                   <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                                                               {dish.name}
                                                           </div>
                                                           <div className="absolute top-2 right-2 flex gap-2">
                                                               {/* Show approve button if:
                                                                   - User is NOT the creator AND has a partner, OR
                                                                   - User IS the creator AND has NO partner (solo mode) */}
                                                               {dish.status === 'proposed' && (
                                                                   (dish.created_by !== user?.id && hasPartnerUser) || 
                                                                   (dish.created_by === user?.id && !hasPartnerUser)
                                                               ) && (
                                                                   <button 
                                                                     className="text-muted-foreground hover:text-green-500"
                                                                     onPointerDown={(e) => { e.stopPropagation(); handleToggleDish(dish.id, dish.status) }}
                                                                     title={t.approve}
                                                                   >
                                                                       <CheckCircle2 className="h-5 w-5" />
                                                                   </button>
                                                               )}
                                                               {/* Show unapprove button if:
                                                                   - User is NOT the creator AND has a partner, OR
                                                                   - User IS the creator AND has NO partner (solo mode) */}
                                                               {dish.status === 'selected' && (
                                                                   (dish.created_by !== user?.id && hasPartnerUser) || 
                                                                   (dish.created_by === user?.id && !hasPartnerUser)
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
                                           )
                                       })}
                                       {provided.placeholder}
                                       
                                       {addingDay === dayIndex ? (
                                           <AddDishForm 
                                              day={dayIndex} 
                                              onAdded={async (dish) => {
                                                  if (!isMountedRef.current) return
                                                  setAddingDay(null)
                                                  
                                                  // Optimistic update - add dish immediately to local state
                                                  if (dish && isMountedRef.current) {
                                                      // Mark as recently added to skip WebSocket INSERT event
                                                      recentlyAddedDishesRef.current.add(dish.id)
                                                      setTimeout(() => {
                                                        recentlyAddedDishesRef.current.delete(dish.id)
                                                      }, 2000)
                                                      
                                                      setDishes(prev => {
                                                        if (!isMountedRef.current) return prev
                                                        return [...prev, {
                                                            ...dish,
                                                            ingredients: [],
                                                            status: 'proposed'
                                                        }]
                                                      })
                                                  }
                                                  
                                                  // Ingredients will be added via WebSocket when generated
                                                  // No need to refresh - WebSocket will update the dish automatically
                                              }}
                                              onRemove={(dishId) => {
                                                // Remove dish from local state if validation fails
                                                if (isMountedRef.current) {
                                                  setDishes(prev => prev.filter(d => d.id !== dishId))
                                                }
                                              }}
                                              onCancel={() => setAddingDay(null)} 
                                           />
                                       ) : (
                                           dishesByDay[dayIndex].length === 0 && (
                                               <div className="text-xs text-muted-foreground text-center py-2 cursor-pointer hover:text-foreground" onClick={() => setAddingDay(dayIndex)}>
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
          )}

          {tab === 'list' && (
            <div className="space-y-4">
               {shoppingList.length === 0 ? (
                 <p className="text-muted-foreground text-center mt-10">{t.selectDishesHint}</p>
               ) : (
                 <>
                   {/* Search and Sort Controls */}
                   <div className="flex gap-2 mb-4">
                     <div className="flex-1 relative">
                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input
                         placeholder={t.search}
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="pl-10"
                       />
                     </div>
                     <Select
                       value={sortBy}
                       onChange={(e) => setSortBy(e.target.value as 'alphabetical' | 'category' | 'amount')}
                       className="w-auto min-w-[140px]"
                     >
                       <option value="category">{t.sortCategory}</option>
                       <option value="alphabetical">{t.sortAlphabetical}</option>
                       <option value="amount">{t.sortAmount}</option>
                     </Select>
                   </div>
                   
                   {/* Add Ingredient Button */}
                   <div className="mb-4">
                     {showAddIngredient ? (
                       <IngredientForm
                         onSubmit={handleAddManualIngredient}
                         onCancel={() => setShowAddIngredient(false)}
                       />
                     ) : (
                       <Button variant="outline" size="sm" onClick={() => setShowAddIngredient(true)} className="w-full">
                         <Plus className="w-4 h-4 mr-2" />
                         {t.addIngredient}
                       </Button>
                     )}
                   </div>
                   
                   {/* Export Buttons */}
                   <div className="flex gap-2 mb-4">
                     <Button variant="outline" size="sm" onClick={handleExportText} className="flex-1">
                       <Download className="w-4 h-4 mr-2" />
                       {t.exportAsText}
                     </Button>
                     <Button variant="outline" size="sm" onClick={handleExportTelegram} className="flex-1">
                       <Share2 className="w-4 h-4 mr-2" />
                       {t.exportAsTelegram}
                     </Button>
                   </div>
                   
                   {/* Grouped by Category */}
                   {sortBy === 'category' ? (
                     categoryOrder.map(category => {
                       const items = categorizedList[category]
                       if (items.length === 0) return null
                       
                       // Separate by purchase status
                       const unpurchased = items.filter(item => !item.is_purchased)
                       const purchased = items.filter(item => item.is_purchased)
                       
                       return (
                         <div key={category} className="mb-4">
                           <h3 className="font-semibold text-sm text-foreground mb-2 px-2">
                             {categoryLabels[category]}
                           </h3>
                           
                           {/* Unpurchased items */}
                           {unpurchased.length > 0 && (
                             <div className="mb-3">
                               <h4 className="text-xs font-medium text-foreground mb-1 px-2 opacity-70">
                                 {t.toBuy}
                               </h4>
                               <div className="space-y-2">
                                 {unpurchased.map((item, idx) => (
                                   <div key={`${category}-${idx}`} className="p-3 bg-card rounded shadow-sm border border-border">
                                 {editingIngredient?.id === `${category}-${idx}` ? (
                                   <IngredientForm
                                     initialName={item.name}
                                     initialAmount={String(item.amount)}
                                     initialUnit={item.unit}
                                     onSubmit={(name, amount, unit) => handleUpdateIngredient(item, name, amount, unit)}
                                     onCancel={() => setEditingIngredient(null)}
                                   />
                                 ) : (
                                   <div className="flex items-start space-x-3">
                                     <Checkbox 
                                       id={`ing-${category}-${idx}`} 
                                       checked={item.is_purchased}
                                       onCheckedChange={() => handleToggleIngredient(item)}
                                       className="mt-1"
                                     />
                                     <div className="flex-1 min-w-0">
                                       <div className="flex items-center justify-between">
                                         <label htmlFor={`ing-${category}-${idx}`} className={`flex-1 cursor-pointer ${item.is_purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                           <div className="flex items-center gap-2 flex-wrap">
                                             <span className="font-medium">{item.name}</span>
                                             {item.isManual && (
                                               <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{t.manualIngredient}</span>
                                             )}
                                             <span className="text-muted-foreground">
                                               {item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''}
                                             </span>
                                           </div>
                                         </label>
                                         <div className="flex gap-1 ml-2">
                                           <button
                                             onClick={() => setEditingIngredient({ id: `${category}-${idx}`, type: item.isManual ? 'manual' : 'dish', name: item.name, amount: String(item.amount), unit: item.unit })}
                                             className="text-muted-foreground hover:text-blue-500 p-1"
                                             title={t.editIngredient}
                                           >
                                             <Edit2 className="w-4 h-4" />
                                           </button>
                                           <button
                                             onClick={() => handleDeleteIngredient(item)}
                                             className="text-muted-foreground hover:text-red-500 p-1"
                                             title={t.deleteIngredient}
                                           >
                                             <Trash2 className="w-4 h-4" />
                                           </button>
                                         </div>
                                       </div>
                                       {item.dishNames && item.dishNames.length > 0 && (
                                         <div className="mt-1 text-xs text-muted-foreground">
                                           <span className="font-medium">{t.forDishes}: </span>
                                           {item.dishNames.map((dishName: string, i: number) => {
                                             const dish = dishes.find(d => d.name === dishName && d.status === 'selected' && (item.dishIds?.includes(d.id) ?? false))
                                             return dish ? (
                                               <button
                                                 key={i}
                                                 onClick={() => {
                                                   setSelectedDish(dish)
                                                   setTab('plan')
                                                 }}
                                                 className="text-blue-500 hover:underline mr-1"
                                               >
                                                 {dishName}{i < (item.dishNames?.length ?? 0) - 1 ? ', ' : ''}
                                               </button>
                                             ) : (
                                               <span key={i} className="mr-1">{dishName}{i < (item.dishNames?.length ?? 0) - 1 ? ', ' : ''}</span>
                                             )
                                           })}
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 )}
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                           
                           {/* Purchased items */}
                           {purchased.length > 0 && (
                             <div className="mb-3">
                               <h4 className="text-xs font-medium text-muted-foreground mb-1 px-2 opacity-70">
                                 {t.purchased}
                               </h4>
                               <div className="space-y-2">
                                 {purchased.map((item, idx) => (
                                   <div key={`${category}-purchased-${idx}`} className="p-3 bg-card rounded shadow-sm border border-border opacity-75">
                                     {editingIngredient?.id === `${category}-purchased-${idx}` ? (
                                       <IngredientForm
                                         initialName={item.name}
                                         initialAmount={String(item.amount)}
                                         initialUnit={item.unit}
                                         onSubmit={(name, amount, unit) => handleUpdateIngredient(item, name, amount, unit)}
                                         onCancel={() => setEditingIngredient(null)}
                                       />
                                     ) : (
                                       <div className="flex items-start space-x-3">
                                         <Checkbox 
                                           id={`ing-${category}-purchased-${idx}`} 
                                           checked={item.is_purchased}
                                           onCheckedChange={() => handleToggleIngredient(item)}
                                           className="mt-1"
                                         />
                                         <div className="flex-1 min-w-0">
                                           <div className="flex items-center justify-between">
                                             <label htmlFor={`ing-${category}-purchased-${idx}`} className={`flex-1 cursor-pointer ${item.is_purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                               <div className="flex items-center gap-2 flex-wrap">
                                                 <span className="font-medium">{item.name}</span>
                                                 {item.isManual && (
                                                   <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{t.manualIngredient}</span>
                                                 )}
                                                 <span className="text-muted-foreground">
                                                   {item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''}
                                                 </span>
                                               </div>
                                             </label>
                                             <div className="flex gap-1 ml-2">
                                               <button
                                                 onClick={() => setEditingIngredient({ id: `${category}-purchased-${idx}`, type: item.isManual ? 'manual' : 'dish', name: item.name, amount: String(item.amount), unit: item.unit })}
                                                 className="text-muted-foreground hover:text-blue-500 p-1"
                                                 title={t.editIngredient}
                                               >
                                                 <Edit2 className="w-4 h-4" />
                                               </button>
                                               <button
                                                 onClick={() => handleDeleteIngredient(item)}
                                                 className="text-muted-foreground hover:text-red-500 p-1"
                                                 title={t.deleteIngredient}
                                               >
                                                 <Trash2 className="w-4 h-4" />
                                               </button>
                                             </div>
                                           </div>
                                           {item.dishNames && item.dishNames.length > 0 && (
                                             <div className="mt-1 text-xs text-muted-foreground">
                                               <span className="font-medium">{t.forDishes}: </span>
                                               {item.dishNames.map((dishName: string, i: number) => {
                                                 const dish = dishes.find(d => d.name === dishName && d.status === 'selected' && (item.dishIds?.includes(d.id) ?? false))
                                                 return dish ? (
                                                   <button
                                                     key={i}
                                                     onClick={() => {
                                                       setSelectedDish(dish)
                                                       setTab('plan')
                                                     }}
                                                     className="text-blue-500 hover:underline mr-1"
                                                   >
                                                     {dishName}{i < (item.dishNames?.length ?? 0) - 1 ? ', ' : ''}
                                                   </button>
                                                 ) : (
                                                   <span key={i} className="mr-1">{dishName}{i < (item.dishNames?.length ?? 0) - 1 ? ', ' : ''}</span>
                                                 )
                                               })}
                                             </div>
                                           )}
                                         </div>
                                       </div>
                                     )}
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                       )
                     })
                   ) : (
                     /* Flat list for alphabetical/amount sorting - grouped by purchase status */
                     (() => {
                       const unpurchased = shoppingList.filter(item => !item.is_purchased)
                       const purchased = shoppingList.filter(item => item.is_purchased)
                       
                       return (
                         <>
                           {/* Unpurchased items */}
                           {unpurchased.length > 0 && (
                             <div className="mb-4">
                               <h3 className="font-semibold text-sm text-foreground mb-2 px-2">
                                 {t.toBuy}
                               </h3>
                               <div className="space-y-2">
                                 {unpurchased.map((item, idx) => (
                       <div key={idx} className="p-3 bg-card rounded shadow-sm border border-border">
                         {editingIngredient?.id === String(idx) ? (
                           <IngredientForm
                             initialName={item.name}
                             initialAmount={String(item.amount)}
                             initialUnit={item.unit}
                             onSubmit={(name, amount, unit) => handleUpdateIngredient(item, name, amount, unit)}
                             onCancel={() => setEditingIngredient(null)}
                           />
                         ) : (
                           <div className="flex items-start space-x-3">
                             <Checkbox 
                               id={`ing-${idx}`} 
                               checked={item.is_purchased}
                               onCheckedChange={() => handleToggleIngredient(item)}
                               className="mt-1"
                             />
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between">
                                 <label htmlFor={`ing-${idx}`} className={`flex-1 cursor-pointer ${item.is_purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                   <div className="flex items-center gap-2 flex-wrap">
                                     <span className="font-medium">{item.name}</span>
                                     {item.isManual && (
                                       <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{t.manualIngredient}</span>
                                     )}
                                     <span className="text-muted-foreground">
                                       {item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''}
                                     </span>
                                   </div>
                                 </label>
                                 <div className="flex gap-1 ml-2">
                                   <button
                                     onClick={() => setEditingIngredient({ id: String(idx), type: item.isManual ? 'manual' : 'dish', name: item.name, amount: String(item.amount), unit: item.unit })}
                                     className="text-muted-foreground hover:text-blue-500 p-2 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
                                     title={t.editIngredient}
                                   >
                                     <Edit2 className="w-4 h-4" />
                                   </button>
                                   <button
                                     onClick={() => handleDeleteIngredient(item)}
                                     className="text-muted-foreground hover:text-red-500 p-2 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
                                     title={t.deleteIngredient}
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>
                                       {item.dishNames && item.dishNames.length > 0 && (
                                         <div className="mt-1 text-xs text-muted-foreground">
                                           <span className="font-medium">{t.forDishes}: </span>
                                           {item.dishNames.map((dishName: string, i: number) => {
                                             const dish = dishes.find(d => d.name === dishName && d.status === 'selected' && item.dishIds.includes(d.id))
                                             return dish ? (
                                               <button
                                                 key={i}
                                                 onClick={() => {
                                                   setSelectedDish(dish)
                                                   setTab('plan')
                                                 }}
                                                 className="text-blue-500 hover:underline mr-1"
                                               >
                                                 {dishName}{i < item.dishNames.length - 1 ? ', ' : ''}
                                               </button>
                                             ) : (
                                               <span key={i} className="mr-1">{dishName}{i < item.dishNames.length - 1 ? ', ' : ''}</span>
                                             )
                                           })}
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 )}
                               </div>
                             ))}
                             </div>
                           </div>
                           )}
                           
                           {/* Purchased items */}
                           {purchased.length > 0 && (
                             <div className="mb-4">
                               <h3 className="font-semibold text-sm text-muted-foreground mb-2 px-2 opacity-70">
                                 {t.purchased}
                               </h3>
                               <div className="space-y-2">
                                 {purchased.map((item, idx) => (
                                   <div key={`purchased-${idx}`} className="p-3 bg-card rounded shadow-sm border border-border opacity-75">
                                     {editingIngredient?.id === `purchased-${idx}` ? (
                                       <IngredientForm
                                         initialName={item.name}
                                         initialAmount={String(item.amount)}
                                         initialUnit={item.unit}
                                         onSubmit={(name, amount, unit) => handleUpdateIngredient(item, name, amount, unit)}
                                         onCancel={() => setEditingIngredient(null)}
                                       />
                                     ) : (
                                       <div className="flex items-start space-x-3">
                                         <Checkbox 
                                           id={`ing-purchased-${idx}`} 
                                           checked={item.is_purchased}
                                           onCheckedChange={() => handleToggleIngredient(item)}
                                           className="mt-1"
                                         />
                                         <div className="flex-1 min-w-0">
                                           <div className="flex items-center justify-between">
                                             <label htmlFor={`ing-purchased-${idx}`} className={`flex-1 cursor-pointer ${item.is_purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                               <div className="flex items-center gap-2 flex-wrap">
                                                 <span className="font-medium">{item.name}</span>
                                                 {item.isManual && (
                                                   <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{t.manualIngredient}</span>
                                                 )}
                                                 <span className="text-muted-foreground">
                                                   {item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''}
                                                 </span>
                                               </div>
                                             </label>
                                             <div className="flex gap-1 ml-2">
                                               <button
                                                 onClick={() => setEditingIngredient({ id: `purchased-${idx}`, type: item.isManual ? 'manual' : 'dish', name: item.name, amount: String(item.amount), unit: item.unit })}
                                                 className="text-muted-foreground hover:text-blue-500 p-2 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
                                                 title={t.editIngredient}
                                               >
                                                 <Edit2 className="w-4 h-4" />
                                               </button>
                                               <button
                                                 onClick={() => handleDeleteIngredient(item)}
                                                 className="text-muted-foreground hover:text-red-500 p-2 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
                                                 title={t.deleteIngredient}
                                               >
                                                 <Trash2 className="w-4 h-4" />
                                               </button>
                                             </div>
                                           </div>
                                           {item.dishNames && item.dishNames.length > 0 && (
                                             <div className="mt-1 text-xs text-muted-foreground">
                                               <span className="font-medium">{t.forDishes}: </span>
                                               {item.dishNames.map((dishName: string, i: number) => {
                                                 const dish = dishes.find(d => d.name === dishName && d.status === 'selected' && (item.dishIds?.includes(d.id) ?? false))
                                                 return dish ? (
                                                   <button
                                                     key={i}
                                                     onClick={() => {
                                                       setSelectedDish(dish)
                                                       setTab('plan')
                                                     }}
                                                     className="text-blue-500 hover:underline mr-1"
                                                   >
                                                     {dishName}{i < (item.dishNames?.length ?? 0) - 1 ? ', ' : ''}
                                                   </button>
                                                 ) : (
                                                   <span key={i} className="mr-1">{dishName}{i < (item.dishNames?.length ?? 0) - 1 ? ', ' : ''}</span>
                                                 )
                                               })}
                                             </div>
                                           )}
                                         </div>
                                       </div>
                                     )}
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                         </>
                       )
                     })()
                   )}
                 </>
               )}
            </div>
          )}
       </div>
       
       <div className="fixed bottom-0 left-0 right-0 border-t border-border p-2 bg-card shadow-up z-20">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <Button variant={tab === 'plan' ? 'default' : 'ghost'} onClick={() => setTab('plan')} className="flex-shrink-0 whitespace-nowrap">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="text-xs">{t.planMenu}</span>
            </Button>
            <Button variant={tab === 'ideas' ? 'default' : 'ghost'} onClick={() => setTab('ideas')} className="flex-shrink-0 whitespace-nowrap">
              <Lightbulb className="w-4 h-4 mr-2" />
              <span className="text-xs">{t.ideas}</span>
            </Button>
            <Button variant={tab === 'list' ? 'default' : 'ghost'} onClick={() => setTab('list')} className="flex-shrink-0 whitespace-nowrap">
              <span className="text-xs">{t.shoppingList}</span>
            </Button>
            <Button variant={tab === 'history' ? 'default' : 'ghost'} onClick={() => setTab('history')} className="flex-shrink-0 whitespace-nowrap">
              <History className="w-4 h-4 mr-2" />
              <span className="text-xs">{t.history}</span>
            </Button>
          </div>
       </div>

       {/* Floating Action Button */}
       <FloatingActionButton onClick={() => {
         // Find first day without dishes or current day
         const today = new Date().getDay()
         const currentDayIndex = today === 0 ? 6 : today - 1
         const firstEmptyDay = orderedDays.find(dayIndex => dishesByDay[dayIndex].length === 0) ?? currentDayIndex
         setAddingDay(firstEmptyDay)
         setTab('plan')
       }} />
    </div>
  )
}
