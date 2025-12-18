'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLang } from '@/components/LanguageProvider'
import { HolidayDish, HolidayDishApproval } from '@/types'
import { CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

interface HolidayDishCardProps {
  dish: HolidayDish
  approvals: HolidayDishApproval[]
  isApprovedByAll: boolean
  membersCount: number
  onApprove: () => void
  onRemoveApproval: () => void
  onDelete: () => void
  onShowIngredients?: () => void
}

export function HolidayDishCard({
  dish,
  approvals,
  isApprovedByAll,
  membersCount,
  onApprove,
  onRemoveApproval,
  onDelete,
  onShowIngredients
}: HolidayDishCardProps) {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const currentUserApproved = approvals.some(a => a.telegram_id === user?.id)
  const approvalCount = approvals.length

  return (
    <Card className={isApprovedByAll ? 'border-green-500' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{dish.name}</h3>
              {isApprovedByAll && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>
                {approvalCount} / {membersCount} {lang === 'ru' ? 'одобрений' : 'approvals'}
              </span>
            </div>
            {dish.recipe && (
              <p className="text-sm text-muted-foreground line-clamp-2">{dish.recipe}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-4">
            {onShowIngredients && (
              <Button size="sm" variant="outline" onClick={onShowIngredients}>
                {lang === 'ru' ? 'Ингредиенты' : 'Ingredients'}
              </Button>
            )}
            {currentUserApproved ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onRemoveApproval}
                className="text-green-600 border-green-600"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {lang === 'ru' ? 'Одобрено' : 'Approved'}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onApprove}
                disabled={isApprovedByAll}
              >
                <XCircle className="w-4 h-4 mr-1" />
                {lang === 'ru' ? 'Одобрить' : 'Approve'}
              </Button>
            )}
            {dish.created_by === user?.id && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

