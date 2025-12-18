'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useLang } from '@/components/LanguageProvider'
import { HolidayDish } from '@/types'
import { CheckCircle2 } from 'lucide-react'
import { HolidayDishCard } from './HolidayDishCard'

interface HolidayApprovedDishesTabProps {
  dishes: HolidayDish[]
  approvals: Record<string, any[]>
  approvedByAll: Record<string, boolean>
  membersCount: number
  onApprove: (dishId: string) => void
  onRemoveApproval: (dishId: string) => void
  onDelete: (dishId: string) => void
  onShowIngredients?: (dish: HolidayDish) => void
  onView?: (dish: HolidayDish) => void
}

export function HolidayApprovedDishesTab({
  dishes,
  approvals,
  approvedByAll,
  membersCount,
  onApprove,
  onRemoveApproval,
  onDelete,
  onShowIngredients,
  onView
}: HolidayApprovedDishesTabProps) {
  const { t, lang } = useLang()

  // Фильтруем только одобренные блюда
  const approvedDishes = useMemo(() => {
    return dishes.filter(dish => approvedByAll[dish.id] === true)
  }, [dishes, approvedByAll])

  if (approvedDishes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">
            {lang === 'ru' ? 'Нет одобренных блюд' : 'No approved dishes'}
          </p>
          <p className="text-sm">
            {lang === 'ru' 
              ? 'Блюда появятся здесь после того, как все участники их одобрят'
              : 'Dishes will appear here once all members approve them'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {approvedDishes.map(dish => (
        <HolidayDishCard
          key={dish.id}
          dish={dish}
          approvals={approvals[dish.id] || []}
          isApprovedByAll={approvedByAll[dish.id] || false}
          membersCount={membersCount}
          onApprove={() => onApprove(dish.id)}
          onRemoveApproval={() => onRemoveApproval(dish.id)}
          onDelete={() => onDelete(dish.id)}
          onShowIngredients={onShowIngredients ? () => onShowIngredients(dish) : undefined}
          onView={onView ? () => onView(dish) : undefined}
        />
      ))}
    </div>
  )
}

