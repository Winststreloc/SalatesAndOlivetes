'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLang } from '@/components/LanguageProvider'
import { HolidayDish, HolidayDishIngredient } from '@/types'
import { X } from 'lucide-react'

interface HolidayDishModalProps {
  dish: HolidayDish | null
  isOpen: boolean
  onClose: () => void
  onEditIngredients?: () => void
}

export function HolidayDishModal({ dish, isOpen, onClose, onEditIngredients }: HolidayDishModalProps) {
  const { lang } = useLang()

  if (!isOpen || !dish) return null

  const ingredients = dish.holiday_dish_ingredients || []

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{dish.name}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {dish.recipe ? (
            <div>
              <h3 className="text-sm font-semibold mb-1">{lang === 'ru' ? 'Рецепт' : 'Recipe'}</h3>
              <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                {dish.recipe}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {lang === 'ru' ? 'Рецепт не указан' : 'No recipe provided'}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">{lang === 'ru' ? 'Ингредиенты' : 'Ingredients'}</h3>
              {onEditIngredients && (
                <Button size="sm" variant="outline" onClick={onEditIngredients}>
                  {lang === 'ru' ? 'Редактировать' : 'Edit'}
                </Button>
              )}
            </div>
            {ingredients.length > 0 ? (
              <ul className="text-sm space-y-1">
                {ingredients.map((ing: HolidayDishIngredient) => (
                  <li key={ing.id} className="flex items-center gap-2">
                    <span>{ing.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">
                {lang === 'ru' ? 'Нет ингредиентов' : 'No ingredients yet'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

