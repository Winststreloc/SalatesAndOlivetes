'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLang } from '@/components/LanguageProvider'
import { HolidayDish, HolidayDishApproval } from '@/types'
import { CheckCircle2, XCircle, Trash2, Eye, List } from 'lucide-react'
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
      <CardContent className="p-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-lg break-words">{dish.name}</h3>
              {isApprovedByAll && (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-start gap-1 flex-shrink-0">
              {onView && (
                <Button size="icon" variant="ghost" onClick={onView} title={lang === 'ru' ? 'Подробнее' : 'Details'}>
                  <Eye className="w-4 h-4" />
                  <span className="sr-only">{lang === 'ru' ? 'Подробнее' : 'Details'}</span>
                </Button>
              )}
              {onShowIngredients && (
                <Button size="icon" variant="outline" onClick={onShowIngredients} title={lang === 'ru' ? 'Ингредиенты' : 'Ingredients'}>
                  <List className="w-4 h-4" />
                  <span className="sr-only">{lang === 'ru' ? 'Ингредиенты' : 'Ingredients'}</span>
                </Button>
              )}
              {currentUserApproved ? (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onRemoveApproval}
                  className="text-green-600 border-green-600"
                  title={lang === 'ru' ? 'Снять одобрение' : 'Remove approval'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="sr-only">{lang === 'ru' ? 'Снять одобрение' : 'Remove approval'}</span>
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={onApprove}
                  disabled={isApprovedByAll}
                  title={lang === 'ru' ? 'Одобрить' : 'Approve'}
                >
                  <XCircle className="w-4 h-4" />
                  <span className="sr-only">{lang === 'ru' ? 'Одобрить' : 'Approve'}</span>
                </Button>
              )}
              <Button
                size="icon"
                variant="destructive"
                onClick={onDelete}
                disabled={!onDelete}
                title={lang === 'ru' ? 'Удалить' : 'Delete'}
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">{lang === 'ru' ? 'Удалить' : 'Delete'}</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>
              {approvalCount} / {membersCount} {lang === 'ru' ? 'одобрений' : 'approvals'}
            </span>
            {avatars.length > 0 && (
              <div className="flex items-center -space-x-2">
                {avatars.map((u) => {
                  const initials = (u.first_name || u.username || '?').slice(0, 1).toUpperCase()
                  return u.photo_url ? (
                    <div
                      key={u.telegram_id}
                      className="h-6 w-6 rounded-full bg-cover bg-center border border-border"
                      style={{ backgroundImage: `url(${u.photo_url})` }}
                      title={u.first_name || u.username || ''}
                    />
                  ) : (
                    <div
                      key={u.telegram_id}
                      className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[9px] font-semibold border border-border"
                      title={u.first_name || u.username || ''}
                    >
                      {initials}
                    </div>
                  )
                })}
                {approvalCount > avatars.length && (
                  <span className="text-xs text-muted-foreground ml-3">+{approvalCount - avatars.length}</span>
                )}
              </div>
            )}
          </div>

          {dish.recipe && (
            <p className="text-sm text-muted-foreground line-clamp-2 break-words mt-1 w-full">{dish.recipe}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

