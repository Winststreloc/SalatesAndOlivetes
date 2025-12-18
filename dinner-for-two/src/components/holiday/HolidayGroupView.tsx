'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLang } from '@/components/LanguageProvider'
import { 
  getHolidayDishes, 
  addHolidayDish, 
  deleteHolidayDish,
  approveHolidayDish,
  removeHolidayDishApproval,
  getHolidayDishApprovals,
  isHolidayDishApprovedByAll,
  getHolidayGroupMembers,
  getHolidayGroupInviteCode,
  generateHolidayDishIngredients,
  addHolidayDishIngredient
} from '@/app/actions'
import { HolidayGroup, HolidayDish, HolidayDishCategory, RealtimePayload } from '@/types'
import { generateHolidayInviteLink } from '@/utils/telegram'
import { showToast } from '@/utils/toast'
import { Users, Share2, Plus, Menu, ShoppingCart, CheckCircle2 } from 'lucide-react'
import { AddHolidayDishForm } from './AddHolidayDishForm'
import { HolidayDishCard } from './HolidayDishCard'
import { useHolidayRealtime } from '@/hooks/useHolidayRealtime'
import { HolidayInviteModal } from './HolidayInviteModal'
import { HolidayApprovedDishesTab } from './HolidayApprovedDishesTab'
import { HolidayShoppingListTab } from './HolidayShoppingListTab'
import { HolidayIngredientEditor } from './HolidayIngredientEditor'
import { HolidayDishModal } from './HolidayDishModal'

const CATEGORY_LABELS: Record<HolidayDishCategory, { en: string; ru: string }> = {
  cold_appetizers: { en: 'Cold Appetizers', ru: 'Холодные закуски' },
  hot_dishes: { en: 'Hot Dishes', ru: 'Горячие блюда' },
  salads: { en: 'Salads', ru: 'Салаты' },
  alcohol: { en: 'Alcohol', ru: 'Алкоголь' },
  desserts: { en: 'Desserts', ru: 'Десерты' },
  drinks: { en: 'Drinks', ru: 'Напитки' },
  other: { en: 'Other', ru: 'Прочее' }
}

interface HolidayGroupViewProps {
  group: HolidayGroup
  onBack: () => void
}

export function HolidayGroupView({ group, onBack }: HolidayGroupViewProps) {
  const { t, lang } = useLang()
  const [dishes, setDishes] = useState<HolidayDish[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<HolidayDishCategory | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [approvals, setApprovals] = useState<Record<string, any[]>>({})
  const [approvedByAll, setApprovedByAll] = useState<Record<string, boolean>>({})
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'menu' | 'approved' | 'shopping'>('menu')
  const [ingredientEditorDish, setIngredientEditorDish] = useState<HolidayDish | null>(null)
  const [viewDish, setViewDish] = useState<HolidayDish | null>(null)
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  const isMountedRef = useRef(true)

  // Realtime subscription
  const { isConnected: isRealtimeConnected } = useHolidayRealtime(group.id, {
    onDishes: (payload: RealtimePayload<HolidayDish>) => {
      if (payload.eventType === 'INSERT') {
        loadData()
      } else if (payload.eventType === 'UPDATE') {
        loadData()
      } else if (payload.eventType === 'DELETE') {
        if (isMountedRef.current) {
          setDishes(prev => prev.filter(d => d.id !== payload.old.id))
        }
      }
    },
    onApprovals: () => {
      // Перезагрузить апрувы при изменении
      loadData()
    },
    onIngredients: () => {
      // Перезагрузить данные при изменении ингредиентов
      loadData()
    }
  })

  const loadData = useCallback(async () => {
    if (!isMountedRef.current) return
    setIsLoading(true)
    try {
      const [dishesData, membersData, code] = await Promise.all([
        getHolidayDishes(group.id),
        getHolidayGroupMembers(group.id),
        getHolidayGroupInviteCode(group.id)
      ])
      if (isMountedRef.current) {
        setDishes(dishesData as HolidayDish[])
        setMembers(membersData)
        setInviteCode(code)
        
        // Загрузить апрувы для всех блюд
        const approvalsMap: Record<string, any[]> = {}
        const approvedByAllMap: Record<string, boolean> = {}
        for (const dish of dishesData) {
          const dishApprovals = await getHolidayDishApprovals(dish.id)
          approvalsMap[dish.id] = dishApprovals
          approvedByAllMap[dish.id] = await isHolidayDishApprovedByAll(dish.id)
        }
        setApprovals(approvalsMap)
        setApprovedByAll(approvedByAllMap)
      }
    } catch (error) {
      console.error('Failed to load holiday group data:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [group.id])

  useEffect(() => {
    isMountedRef.current = true
    loadData()
    return () => {
      isMountedRef.current = false
    }
  }, [loadData])

  const handleAddDish = async (name: string, category: HolidayDishCategory, asProduct: boolean) => {
    try {
      const dish = await addHolidayDish(group.id, name, category)
      if (isMountedRef.current) {
        setDishes(prev => [...prev, dish as HolidayDish])
        setShowAddForm(false)
        setSelectedCategory(null)
        showToast.success(t.addSuccess || 'Dish added successfully')
        // Загрузить апрувы для нового блюда
        const dishApprovals = await getHolidayDishApprovals(dish.id)
        setApprovals(prev => ({ ...prev, [dish.id]: dishApprovals }))
        setApprovedByAll(prev => ({ ...prev, [dish.id]: false }))
        // Если отметили как товар — сразу добавим в покупки
        if (asProduct) {
          try {
            await addHolidayDishIngredient(dish.id, dish.name, '', '')
            await loadData()
          } catch (e) {
            console.error('Failed to mark product dish', e)
          }
        }
      }
    } catch (error) {
      // Более мягкое сообщение, если ошибка пришла с сервера
      const message = error instanceof Error ? error.message : 'Failed to add dish'
      showToast.error(message)
    }
  }

  const handleDeleteDish = async (dishId: string) => {
    try {
      await deleteHolidayDish(dishId)
      if (isMountedRef.current) {
        setDishes(prev => prev.filter(d => d.id !== dishId))
        const newApprovals = { ...approvals }
        delete newApprovals[dishId]
        setApprovals(newApprovals)
        const newApprovedByAll = { ...approvedByAll }
        delete newApprovedByAll[dishId]
        setApprovedByAll(newApprovedByAll)
        showToast.success('Dish deleted successfully')
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to delete dish')
    }
  }

  const handleApprove = async (dishId: string) => {
    try {
      await approveHolidayDish(dishId)
      const dishApprovals = await getHolidayDishApprovals(dishId)
      const isApproved = await isHolidayDishApprovedByAll(dishId)
      const dish = dishes.find(d => d.id === dishId)
      // Если блюдо без ингредиентов (например, алкоголь), добавим сам товар в покупки
      if (dish && (!dish.holiday_dish_ingredients || dish.holiday_dish_ingredients.length === 0)) {
        try {
          await addHolidayDishIngredient(dish.id, dish.name, '', '')
          await loadData()
        } catch (e) {
          // не блокируем основное действие
          console.error('Failed to add dish as ingredient', e)
        }
      }
      if (isMountedRef.current) {
        setApprovals(prev => ({ ...prev, [dishId]: dishApprovals }))
        setApprovedByAll(prev => ({ ...prev, [dishId]: isApproved }))
        showToast.success('Dish approved')
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to approve dish')
    }
  }

  const handleRemoveApproval = async (dishId: string) => {
    try {
      await removeHolidayDishApproval(dishId)
      const dishApprovals = await getHolidayDishApprovals(dishId)
      const isApproved = await isHolidayDishApprovedByAll(dishId)
      if (isMountedRef.current) {
        setApprovals(prev => ({ ...prev, [dishId]: dishApprovals }))
        setApprovedByAll(prev => ({ ...prev, [dishId]: isApproved }))
        showToast.success('Approval removed')
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to remove approval')
    }
  }

  const handleShare = () => {
    if (!inviteCode) return
    const link = generateHolidayInviteLink(inviteCode, botUsername)
    
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(group.name)}`)
    } else {
      navigator.clipboard.writeText(link)
      showToast.success(lang === 'ru' ? 'Ссылка скопирована' : 'Link copied to clipboard')
    }
  }

  const handleShowInvite = () => {
    setShowInviteModal(true)
  }

  const dishesByCategory = dishes.reduce((acc, dish) => {
    if (!acc[dish.category]) {
      acc[dish.category] = []
    }
    acc[dish.category].push(dish)
    return acc
  }, {} as Record<HolidayDishCategory, HolidayDish[]>)

  const categoryOrder: HolidayDishCategory[] = [
    'cold_appetizers',
    'hot_dishes',
    'salads',
    'alcohol',
    'desserts',
    'drinks',
    'other'
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <>
      <HolidayInviteModal
        isOpen={showInviteModal}
        inviteCode={inviteCode}
        groupName={group.name}
        botUsername={botUsername}
        onClose={() => setShowInviteModal(false)}
      />

      <div className="flex flex-col h-screen bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <Button variant="ghost" onClick={onBack}>← Back</Button>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isRealtimeConnected && (
                <span className="text-green-500 text-xs">●</span>
              )}
              <Button variant="outline" size="sm" onClick={handleShowInvite}>
                <Share2 className="w-4 h-4 mr-2" />
                {lang === 'ru' ? 'Код приглашения' : 'Invite Code'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                {t.shareLink || 'Share'}
              </Button>
            </div>
          </div>
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {group.holiday_type && (
          <p className="text-sm text-muted-foreground mt-1">{group.holiday_type}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Users className="w-4 h-4" />
          <span className="text-sm">{members.length} {lang === 'ru' ? 'участников' : 'members'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto overflow-x-auto p-4">
        {showAddForm ? (
          <AddHolidayDishForm
            category={selectedCategory}
            onAdd={handleAddDish}
            onCancel={() => {
              setShowAddForm(false)
              setSelectedCategory(null)
            }}
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'menu' | 'approved' | 'shopping')} className="w-full min-w-[320px]">
              <TabsList className="w-full mb-4 overflow-x-auto flex gap-2">
                <TabsTrigger value="menu" className="flex-shrink-0">
                  <Menu className="w-4 h-4 mr-2" />
                  {lang === 'ru' ? 'Меню' : 'Menu'}
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {lang === 'ru' ? 'Одобренные' : 'Approved'}
                </TabsTrigger>
                <TabsTrigger value="shopping" className="flex-shrink-0">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {lang === 'ru' ? 'Покупки' : 'Shopping'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="menu" className="space-y-6">
                {categoryOrder.map(category => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category][lang]}</h2>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCategory(category)
                          setShowAddForm(true)
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t.add || 'Add'}
                      </Button>
                    </div>
                    {dishesByCategory[category]?.length > 0 ? (
                      dishesByCategory[category].map(dish => {
                        const isProductDish =
                          dish.category === 'alcohol' ||
                          dish.category === 'drinks' ||
                          (dish.holiday_dish_ingredients?.length === 1 &&
                            dish.holiday_dish_ingredients[0].name.toLowerCase() === dish.name.toLowerCase())
                        return (
                          <HolidayDishCard
                            key={dish.id}
                            dish={dish}
                            approvals={approvals[dish.id] || []}
                            isApprovedByAll={approvedByAll[dish.id] || false}
                            membersCount={members.length}
                            onApprove={() => handleApprove(dish.id)}
                            onRemoveApproval={() => handleRemoveApproval(dish.id)}
                            onDelete={() => handleDeleteDish(dish.id)}
                        onView={() => setViewDish(dish)}
                        onShowIngredients={isProductDish ? undefined : () => setIngredientEditorDish(dish)}
                          />
                        )
                      })
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                          {t.noDishes || 'No dishes in this category'}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="approved">
                <HolidayApprovedDishesTab
                  dishes={dishes}
                  approvals={approvals}
                  approvedByAll={approvedByAll}
                  membersCount={members.length}
                  onApprove={handleApprove}
                  onRemoveApproval={handleRemoveApproval}
                  onDelete={handleDeleteDish}
                  onShowIngredients={(dish: HolidayDish) => setIngredientEditorDish(dish)}
                  onView={(dish: HolidayDish) => setViewDish(dish)}
                />
              </TabsContent>

              <TabsContent value="shopping">
                <HolidayShoppingListTab
                  dishes={dishes}
                  approvedByAll={approvedByAll}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
      <HolidayIngredientEditor
        dish={ingredientEditorDish as any}
        isOpen={!!ingredientEditorDish}
        onClose={() => setIngredientEditorDish(null)}
        onUpdated={loadData}
      />
      <HolidayDishModal
        dish={viewDish}
        isOpen={!!viewDish}
        onClose={() => setViewDish(null)}
        onEditIngredients={
          viewDish && viewDish.holiday_dish_ingredients?.length
            ? () => {
                setIngredientEditorDish(viewDish)
                setViewDish(null)
              }
            : undefined
        }
      />
    </>
  )
}

