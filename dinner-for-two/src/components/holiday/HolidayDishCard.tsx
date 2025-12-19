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
  onView?: () => void
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
  onView,
  onShowIngredients
}: HolidayDishCardProps) {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const currentUserApproved = approvals.some(a => a.telegram_id === user?.id)
  const approvalCount = approvals.length
  const avatars = approvals
    .map(a => a.users)
    .filter(Boolean)
    .slice(0, 8) as { telegram_id: number; first_name?: string; username?: string; photo_url?: string }[]

  return (
    <Card className={isApprovedByAll ? 'border-green-500' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg break-words">{dish.name}</h3>
              {isApprovedByAll && (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>
                {approvalCount} / {membersCount} {lang === 'ru' ? 'одобрений' : 'approvals'}
              </span>
            </div>
            {avatars.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                {avatars.map(u => {
                  const initials = (u.first_name || u.username || '?').slice(0, 1).toUpperCase()
                  return u.photo_url ? (
                    <div
                      key={u.telegram_id}
                      className="h-8 w-8 rounded-full bg-cover bg-center border border-border"
                      style={{ backgroundImage: `url(${u.photo_url})` }}
                      title={u.first_name || u.username || ''}
                    />
                  ) : (
                    <div
                      key={u.telegram_id}
                      className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold border border-border"
                      title={u.first_name || u.username || ''}
                    >
                      {initials}
                    </div>
                  )
                })}
                {approvalCount > avatars.length && (
                  <span className="text-xs text-muted-foreground">+{approvalCount - avatars.length}</span>
                )}
              </div>
            )}
            {dish.recipe && (
              <p className="text-sm text-muted-foreground line-clamp-2 break-words">{dish.recipe}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {onView && (
              <Button size="sm" variant="secondary" onClick={onView}>
                {lang === 'ru' ? 'Подробнее' : 'Details'}
              </Button>
            )}
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
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={!onDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

