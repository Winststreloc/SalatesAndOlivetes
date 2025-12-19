'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { getDish, getInviteCode, getManualIngredients, hasPartner, generateDishIngredients, toggleIngredientsPurchased, addManualIngredient, updateManualIngredient, deleteManualIngredient, deleteIngredient, updateIngredient, addDish, deleteDish, getCouplePreferences, updateRecipe } from '@/app/actions'
import { useLang } from './LanguageProvider'
import { useAuth } from './AuthProvider'
import { useDishes } from '@/hooks/useDishes'
import { useRealtime } from '@/hooks/useRealtime'
import { useShoppingList } from '@/hooks/useShoppingList'
import { useCoupleSettings } from '@/hooks/useCoupleSettings'
import { IdeasTab } from './IdeasTab'
import { RecipeView } from './RecipeView'
import { HistoryView } from './HistoryView'
import { ConfirmDialog } from './ConfirmDialog'
import { FloatingActionButton } from './FloatingActionButton'
import { GlobalSearch } from './GlobalSearch'
import { DashboardHeader } from './dashboard/DashboardHeader'
import { DashboardTabs, TabType } from './dashboard/DashboardTabs'
import { ShoppingListTab } from './dashboard/ShoppingListTab'
import { SettingsModal } from './dashboard/SettingsModal'
import { InviteModal } from './dashboard/InviteModal'
import { DaySelectorModal } from './dashboard/DaySelectorModal'
import { showToast } from '@/utils/toast'
import { handleError, createErrorContext } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'
import { getWeekDates } from '@/utils/dateUtils'
import { Dish, ShoppingListItem, ManualIngredient, RealtimePayload, Ingredient, HolidayGroup } from '@/types'
import { HolidayGroupsList } from './holiday/HolidayGroupsList'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Skeleton } from './ui/skeleton'
import type { PlanTabProps } from './dashboard/PlanTab'

const PlanTab = dynamic<PlanTabProps>(
  () => import('./dashboard/PlanTab').then(m => m.PlanTab),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        {[1, 2, 3].map((key) => (
          <div key={key} className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            <div className="bg-muted p-3 font-semibold text-foreground flex justify-between items-center">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-6" />
            </div>
            <div className="p-2 space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }
)

const HolidayGroupView = dynamic(
  () => import('./holiday/HolidayGroupView').then(m => m.HolidayGroupView),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }
)

export function Dashboard() {
  const { t, lang } = useLang()
  const { coupleId, logout, user } = useAuth()
  const [tab, setTab] = useState<TabType>('plan')
  const [showHolidayGroups, setShowHolidayGroups] = useState(false)
  const [selectedHolidayGroup, setSelectedHolidayGroup] = useState<HolidayGroup | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [addingDay, setAddingDay] = useState<string | null>(null)
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)
  const [showDaySelector, setShowDaySelector] = useState(false)
  const [pendingIdea, setPendingIdea] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'alphabetical' | 'category' | 'amount'>('category')
  const [manualIngredients, setManualIngredients] = useState<ManualIngredient[]>([])
  const [editingIngredient, setEditingIngredient] = useState<{ id: string, type: 'dish' | 'manual', name: string, amount: string, unit: string } | null>(null)
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const [hasPartnerUser, setHasPartnerUser] = useState<boolean | null>(null) // null = loading, false/true = loaded
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, title: string, description: string, onConfirm: () => void } | null>(null)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPurchasedItems, setShowPurchasedItems] = useState<Record<string, boolean>>({})
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  const isMountedRef = useRef(true)
  const deletingDishesRef = useRef<Set<string>>(new Set())
  const recentlyAddedDishesRef = useRef<Set<string>>(new Set())

  // Use custom hooks
  const { dishes, setDishes, isLoading: isLoadingDishes, refresh: refreshDishes } = useDishes()
  const { preferences, setPreferences, isLoading: isLoadingPreferences, save: savePreferences } = useCoupleSettings(coupleId)
  const { shoppingList, categorizedList } = useShoppingList(dishes, manualIngredients)

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

  // Realtime subscription
  const { isConnected: isRealtimeConnected } = useRealtime(coupleId, {
    onDishes: (payload: RealtimePayload<Dish>) => {
      // Handle dishes updates
      if (payload.eventType === 'INSERT') {
        const newDishId = payload.new.id
        if (newDishId && isMountedRef.current && !recentlyAddedDishesRef.current.has(newDishId)) {
          getDish(newDishId).then(dish => {
            if (dish && isMountedRef.current) {
              setDishes(prev => {
                const existingIndex = prev.findIndex(d => d.id === dish.id)
                if (existingIndex >= 0) {
                  const updated = [...prev]
                  updated[existingIndex] = dish
                  return updated
                }
                return [...prev, dish]
              })
            }
          }).catch(err => console.error('Failed to fetch new dish:', err))
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedDishId = payload.new.id
        if (updatedDishId && isMountedRef.current) {
          getDish(updatedDishId).then(dish => {
            if (dish && isMountedRef.current) {
              setDishes(prev => prev.map(d => d.id === dish.id ? dish : d))
            }
          }).catch(err => console.error('Failed to fetch updated dish:', err))
        }
      } else if (payload.eventType === 'DELETE') {
        if (!deletingDishesRef.current.has(payload.old.id) && isMountedRef.current) {
          setDishes(prev => prev.filter(d => d.id !== payload.old.id))
        }
      }
    },
    onIngredients: (payload: RealtimePayload<Ingredient>) => {
      const dishId = payload.new?.dish_id || payload.old?.dish_id
      if (dishId && isMountedRef.current) {
        getDish(dishId).then(dish => {
          if (dish && isMountedRef.current) {
            setDishes(prev => prev.map(d => d.id === dish.id ? dish : d))
          }
        }).catch(err => logger.error('Failed to fetch dish with updated ingredients', err, { dishId }))
      }
    },
    onManualIngredients: (payload: RealtimePayload<ManualIngredient>) => {
      if (payload.eventType === 'INSERT') {
        const newIngredient = payload.new
        if (newIngredient?.id && isMountedRef.current) {
          setManualIngredients(prev => {
            if (prev.some(ing => ing.id === newIngredient.id)) {
              return prev.map(ing => ing.id === newIngredient.id ? newIngredient : ing)
            }
            return [...prev, newIngredient]
          })
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedIngredient = payload.new
        if (updatedIngredient?.id && isMountedRef.current) {
          setManualIngredients(prev => prev.map(ing => ing.id === updatedIngredient.id ? { ...ing, ...updatedIngredient } : ing))
        }
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id
        if (deletedId && isMountedRef.current) {
          setManualIngredients(prev => prev.filter(ing => ing.id !== deletedId))
        }
      }
    }
  })

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!coupleId) return
    Promise.all([
      refreshDishes(),
      loadInviteCode(),
      loadManualIngredients(),
      checkHasPartner()
    ]).catch(error => console.error('Failed to load initial data:', error))
  }, [coupleId, refreshDishes, loadInviteCode, loadManualIngredients, checkHasPartner])

  const orderedDates = useMemo(() => getWeekDates(), [])

  const handleAddIdea = (name: string) => {
    setPendingIdea(name)
    setShowDaySelector(true)
  }

  const handleConfirmAddIdea = async (date: string) => {
    if (!pendingIdea) return
    setShowDaySelector(false)
    const name = pendingIdea
    setPendingIdea(null)
    
    try {
      const dish = await addDish(name, date)
      if (isMountedRef.current) {
        recentlyAddedDishesRef.current.add(dish.id)
        setTimeout(() => recentlyAddedDishesRef.current.delete(dish.id), 2000)
        setDishes(prev => [...prev, { ...dish, ingredients: [], status: 'proposed' }])
      }
      
      const prefs = await getCouplePreferences()
      const useAI = prefs.useAI !== false
      
      if (useAI) {
        generateDishIngredients(dish.id, dish.name, lang).catch(async (err) => {
          const errorMessage = err?.message || ''
          const isValidationError = errorMessage.includes('valid dish name') || 
                                    errorMessage.includes('INVALID_INPUT') || 
                                    errorMessage.includes('не название блюда') || 
                                    errorMessage.includes('not a food-related')
          
          if (isValidationError) {
            showToast.error(errorMessage || (t.invalidDishName || 'Please enter a valid dish name'))
            if (isMountedRef.current) {
              setDishes(prev => prev.filter(d => d.id !== dish.id))
              try {
                await deleteDish(dish.id)
              } catch (deleteErr) {
                logger.error('Failed to delete invalid dish', deleteErr as Error, { dishId: dish.id })
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
      }
      
      if (isMountedRef.current) {
        setTab('plan')
        showToast.success(t.addSuccess || 'Dish added successfully')
      }
    } catch (error: unknown) {
      handleError(error as Error, createErrorContext('handleConfirmAddIdea', {
        type: 'DATABASE_ERROR',
        userId: undefined,
        metadata: { dishName: name, date },
      }))
      const errorMessage = error instanceof Error ? error.message : (t.failedAdd || 'Failed to add dish')
      showToast.error(errorMessage)
    }
  }

  const handleSaveRecipe = useCallback(async (recipe: string) => {
    if (!selectedDish) return
    try {
      const updated = await updateRecipe(selectedDish.id, recipe)
      if (isMountedRef.current) {
        setDishes(prev => prev.map(d => d.id === selectedDish.id ? { ...d, recipe: updated.recipe } : d))
        setSelectedDish(prev => prev && prev.id === selectedDish.id ? { ...prev, recipe: updated.recipe } : prev)
      }
      showToast.success(t.settingsSaved || 'Saved successfully')
    } catch (error: unknown) {
      handleError(error as Error, createErrorContext('handleSaveRecipe', {
        type: 'DATABASE_ERROR',
        userId: undefined,
        metadata: { dishId: selectedDish.id, recipeLength: recipe?.length || 0 },
        showToast: true,
      }))
    }
  }, [t, selectedDish])

  const handleToggleIngredient = async (item: ShoppingListItem) => {
    try {
      const newStatus = !item.is_purchased
      const idsToUpdate: string[] = []
      
      if (item.ids && item.ids.length > 0) {
        idsToUpdate.push(...item.ids)
        if (isMountedRef.current) {
          setDishes(prev => prev.map(d => ({
            ...d,
            ingredients: d.ingredients?.map((ing: Ingredient) => 
              item.ids.includes(ing.id) ? { ...ing, is_purchased: newStatus } : ing
            ) || []
          })))
        }
      }
      
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
    } catch (e: unknown) {
      console.error('Failed to toggle ingredient:', e)
      if (isMountedRef.current) {
        refreshDishes()
        loadManualIngredients()
        showToast.error((e instanceof Error ? e.message : 'Failed to update ingredient'))
      }
    }
  }

  const handleDeleteIngredient = async (item: ShoppingListItem, onConfirm: () => Promise<void>) => {
    setConfirmDialog({
      open: true,
      title: t.deleteIngredient || 'Delete Ingredient',
      description: t.deleteIngredientConfirm || 'Are you sure you want to delete this ingredient?',
      onConfirm: async () => {
        setConfirmDialog(null)
        await onConfirm()
      }
    })
  }

  const handleUpdateIngredient = async (item: ShoppingListItem, name: string, amount: string, unit: string) => {
    if (!isMountedRef.current) return
    try {
      if (item.ids.length > 0) {
        for (const id of item.ids) {
          await updateIngredient(id, name, amount, unit)
        }
        await refreshDishes()
      }
      
      if (item.manualId) {
        await updateManualIngredient(item.manualId, name, amount, unit)
        await loadManualIngredients()
      }
      
      if (isMountedRef.current) {
        setEditingIngredient(null)
        showToast.success(t.updateIngredientSuccess || 'Ingredient updated successfully')
      }
    } catch (e: unknown) {
      console.error('Failed to update ingredient:', e)
      if (isMountedRef.current) {
        showToast.error((e instanceof Error ? e.message : 'Failed to update ingredient'))
      }
    }
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
    } catch (e: unknown) {
      console.error('Failed to add ingredient:', e)
      if (isMountedRef.current) {
        showToast.error((e instanceof Error ? e.message : 'Failed to add ingredient'))
      }
    }
  }

  const categoryLabels: Record<string, string> = useMemo(() => ({
    vegetables: t.categoryVegetables,
    fruits: t.categoryFruits,
    meat: t.categoryMeat,
    dairy: t.categoryDairy,
    bakery: t.categoryBakery,
    pantry: t.categoryPantry,
    spices: t.categorySpices,
    other: t.categoryOther
  }), [t])

  const categoryOrder = ['vegetables', 'fruits', 'meat', 'dairy', 'bakery', 'pantry', 'spices', 'other']

  const handleExportText = () => {
    let text = `${t.shoppingList}\n\n`
    
    if (sortBy === 'category') {
      categoryOrder.forEach(category => {
        const items = categorizedList[category as keyof typeof categorizedList]
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
        const items = categorizedList[category as keyof typeof categorizedList]
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
    
    const url = `https://t.me/share/url?url=${encodeURIComponent(text)}&text=${encodeURIComponent(t.shoppingList)}`
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleDishAdded = useCallback((dish: Dish) => {
    if (isMountedRef.current) {
      recentlyAddedDishesRef.current.add(dish.id)
      setTimeout(() => recentlyAddedDishesRef.current.delete(dish.id), 2000)
      setDishes(prev => {
        const existingIndex = prev.findIndex(d => d.id === dish.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = dish
          return updated
        }
        return [...prev, { ...dish, ingredients: dish.ingredients || [], status: dish.status || 'proposed' }]
      })
    }
  }, [])

  const handleDishRemoved = useCallback((dishId: string) => {
    if (isMountedRef.current) {
      setDishes(prev => prev.filter(d => d.id !== dishId))
    }
  }, [])

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('holiday') === 'groups') {
      setShowHolidayGroups(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!showHolidayGroups && searchParams.get('holiday')) {
      router.replace(pathname)
    }
  }, [showHolidayGroups, searchParams, router, pathname])

  // Если показываем holiday группы, рендерим их вместо обычного Dashboard
  if (showHolidayGroups) {
    if (selectedHolidayGroup) {
      return (
        <HolidayGroupView
          group={selectedHolidayGroup}
          onBack={() => setSelectedHolidayGroup(null)}
        />
      )
    }
    return (
      <HolidayGroupsList
        onSelectGroup={(group) => setSelectedHolidayGroup(group)}
        onCreateGroup={() => {}}
        onBack={() => setShowHolidayGroups(false)}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background relative">
      <DashboardHeader
        isRealtimeConnected={isRealtimeConnected}
        onShowInvite={() => setShowInvite(true)}
        onShowSettings={() => setShowSettings(true)}
        onLogout={() => {}}
        onShowHolidayGroups={() => setShowHolidayGroups(true)}
      />

      <InviteModal
        isOpen={showInvite}
        inviteCode={inviteCode}
        botUsername={botUsername}
        onClose={() => setShowInvite(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        preferences={preferences}
        isLoading={isLoadingPreferences}
        onClose={() => setShowSettings(false)}
        onSave={savePreferences}
        onPreferencesChange={setPreferences}
      />

      <RecipeView 
        dish={selectedDish} 
        isOpen={!!selectedDish} 
        onClose={() => setSelectedDish(null)} 
        onSave={handleSaveRecipe}
        onIngredientAdded={async (updatedDish) => {
          if (isMountedRef.current) {
            setSelectedDish(updatedDish)
            setDishes(prev => prev.map(d => d.id === updatedDish.id ? updatedDish : d))
          }
        }}
      />

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

      <DaySelectorModal
        isOpen={showDaySelector}
        dates={orderedDates}
        onSelect={handleConfirmAddIdea}
        onClose={() => { setShowDaySelector(false); setPendingIdea(null) }}
      />

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
              if (isMountedRef.current) {
                setDishes(loadedDishes)
                setTab('plan')
              }
            }} 
          />
        )}

        {tab === 'plan' && (
          <PlanTab
            dishes={dishes}
            isLoading={isLoadingDishes}
            orderedDates={orderedDates}
            addingDay={addingDay}
            selectedDish={selectedDish}
            user={user}
            hasPartner={hasPartnerUser}
            couplePreferences={preferences}
            recentlyAddedDishesRef={recentlyAddedDishesRef}
            deletingDishesRef={deletingDishesRef}
            isMountedRef={isMountedRef}
            onSetAddingDay={setAddingDay}
            onSetSelectedDish={setSelectedDish}
            onDishAdded={handleDishAdded}
            onDishRemoved={handleDishRemoved}
            onDishesUpdate={setDishes}
            onRefreshDishes={refreshDishes}
            onConfirmDelete={(dishId, onConfirm) => {
              setConfirmDialog({
                open: true,
                title: t.delete || 'Delete',
                description: t.deleteDishConfirm || 'Are you sure you want to delete this dish?',
                onConfirm
              })
            }}
          />
        )}

        {tab === 'list' && (
          <ShoppingListTab
            dishes={dishes}
            manualIngredients={manualIngredients}
            searchQuery={searchQuery}
            sortBy={sortBy}
            showPurchasedItems={showPurchasedItems}
            editingIngredient={editingIngredient}
            showAddIngredient={showAddIngredient}
            onSearchQueryChange={setSearchQuery}
            onSortByChange={setSortBy}
            onShowPurchasedItemsChange={setShowPurchasedItems}
            onEditingIngredientChange={setEditingIngredient}
            onShowAddIngredientChange={setShowAddIngredient}
            onToggleIngredient={handleToggleIngredient}
            onDeleteIngredient={handleDeleteIngredient}
            onUpdateIngredient={handleUpdateIngredient}
            onAddManualIngredient={handleAddManualIngredient}
            onExportText={handleExportText}
            onExportTelegram={handleExportTelegram}
            onSelectDish={setSelectedDish}
            onSetTab={setTab}
          />
        )}
      </div>
      
      <DashboardTabs activeTab={tab} onTabChange={setTab} />

      <FloatingActionButton onClick={() => {
        const today = new Date().toISOString().split('T')[0]
        const dishesByDate: Record<string, Dish[]> = {}
        orderedDates.forEach(date => {
          dishesByDate[date] = []
        })
        dishes.forEach(d => {
          if (d.dish_date) {
            const dateStr = d.dish_date.split('T')[0]
            if (dishesByDate[dateStr]) {
              dishesByDate[dateStr].push(d)
            }
          }
        })
        const firstEmptyDate = orderedDates.find(date => !dishesByDate[date] || dishesByDate[date].length === 0) ?? today
        setAddingDay(firstEmptyDate)
        setTab('plan')
      }} />
    </div>
  )
}

