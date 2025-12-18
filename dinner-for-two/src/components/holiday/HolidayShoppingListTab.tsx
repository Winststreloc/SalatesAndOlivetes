'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { useLang } from '@/components/LanguageProvider'
import { HolidayDish, HolidayDishIngredient } from '@/types'
import { toggleHolidayIngredientsPurchased } from '@/app/actions'
import { showToast } from '@/utils/toast'
import { categorizeIngredient, groupByCategory, IngredientCategory, CategorizedIngredient } from '@/utils/ingredientCategories'
import { Download, Share2 } from 'lucide-react'

interface HolidayShoppingListTabProps {
  dishes: HolidayDish[]
  approvedByAll: Record<string, boolean>
  onUpdated?: () => void | Promise<void>
  onToggleIngredient?: (ids: string[], newStatus: boolean) => Promise<void>
}

interface ShoppingListItem {
  name: string
  amount: number
  unit: string
  ids: string[]
  is_purchased: boolean
  dishIds: string[]
  dishNames: string[]
}

export function HolidayShoppingListTab({ dishes, approvedByAll, onUpdated, onToggleIngredient }: HolidayShoppingListTabProps) {
  const { t, lang } = useLang()
  const [showPurchased, setShowPurchased] = useState(false)

  // Получаем ингредиенты только из одобренных блюд
  const shoppingList = useMemo(() => {
    const approvedDishes = dishes.filter(dish => approvedByAll[dish.id] === true)
    const ingredientMap = new Map<string, ShoppingListItem>()

    approvedDishes.forEach(dish => {
      dish.holiday_dish_ingredients?.forEach((ing: HolidayDishIngredient) => {
        const key = `${ing.name.trim().toLowerCase()}_${(ing.unit || '').trim().toLowerCase()}`
        const existing = ingredientMap.get(key)

        if (existing) {
          // Объединяем одинаковые ингредиенты
          existing.ids.push(ing.id)
          existing.dishIds.push(dish.id)
          existing.dishNames.push(dish.name)
          
          // Суммируем количество
          const existingAmount = parseFloat(String(existing.amount)) || 0
          const newAmount = parseFloat(String(ing.amount)) || 0
          existing.amount = existingAmount + newAmount
          
          // Если хотя бы один куплен, считаем купленным
          if (ing.is_purchased) {
            existing.is_purchased = true
          }
        } else {
          ingredientMap.set(key, {
            name: ing.name,
            amount: parseFloat(String(ing.amount)) || 0,
            unit: ing.unit || '',
            ids: [ing.id],
            is_purchased: ing.is_purchased,
            dishIds: [dish.id],
            dishNames: [dish.name]
          })
        }
      })
    })

    return Array.from(ingredientMap.values())
  }, [dishes, approvedByAll])

  // Группируем по категориям
  const categorizedList = useMemo(() => {
    const items = shoppingList.map(item => ({
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      ids: item.ids,
      is_purchased: item.is_purchased
    }))
    return groupByCategory(items)
  }, [shoppingList])

  // Фильтруем по статусу покупки
  const filteredList = useMemo(() => {
    if (showPurchased) return shoppingList
    return shoppingList.filter(item => !item.is_purchased)
  }, [shoppingList, showPurchased])

  const filteredCategorized = useMemo(() => {
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

    Object.keys(categorizedList).forEach(category => {
      const items = categorizedList[category as IngredientCategory]
      result[category as IngredientCategory] = showPurchased 
        ? items 
        : items.filter(item => !item.is_purchased)
    })

    return result
  }, [categorizedList, showPurchased])

  const handleToggleIngredient = async (item: ShoppingListItem) => {
    try {
      const newStatus = !item.is_purchased
      if (onToggleIngredient) {
        await onToggleIngredient(item.ids, newStatus)
      } else {
        await toggleHolidayIngredientsPurchased(item.ids, newStatus)
        if (onUpdated) await onUpdated()
      }
      showToast.success(lang === 'ru' ? 'Обновлено' : 'Updated')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to update')
    }
  }

  const handleExportText = () => {
    let text = `${lang === 'ru' ? 'Список покупок' : 'Shopping List'}\n\n`
    
    Object.keys(filteredCategorized).forEach(category => {
      const items = filteredCategorized[category as IngredientCategory]
      if (items.length === 0) return
      
      const categoryLabels: Record<IngredientCategory, { en: string; ru: string }> = {
        vegetables: { en: 'Vegetables', ru: 'Овощи' },
        fruits: { en: 'Fruits', ru: 'Фрукты' },
        meat: { en: 'Meat', ru: 'Мясо' },
        dairy: { en: 'Dairy', ru: 'Молочные продукты' },
        bakery: { en: 'Bakery', ru: 'Хлебобулочные' },
        pantry: { en: 'Pantry', ru: 'Бакалея' },
        spices: { en: 'Spices', ru: 'Специи' },
        other: { en: 'Other', ru: 'Прочее' }
      }
      
      text += `${categoryLabels[category as IngredientCategory][lang]}:\n`
      items.forEach(item => {
        const amount = item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''
        const check = item.is_purchased ? '✓' : '☐'
        text += `  ${check} ${item.name}${amount ? ` - ${amount}` : ''}\n`
      })
      text += '\n'
    })
    
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
    let text = `🛒 ${lang === 'ru' ? 'Список покупок' : 'Shopping List'}\n\n`
    
    Object.keys(filteredCategorized).forEach(category => {
      const items = filteredCategorized[category as IngredientCategory]
      if (items.length === 0) return
      
      const categoryLabels: Record<IngredientCategory, { en: string; ru: string }> = {
        vegetables: { en: 'Vegetables', ru: 'Овощи' },
        fruits: { en: 'Fruits', ru: 'Фрукты' },
        meat: { en: 'Meat', ru: 'Мясо' },
        dairy: { en: 'Dairy', ru: 'Молочные продукты' },
        bakery: { en: 'Bakery', ru: 'Хлебобулочные' },
        pantry: { en: 'Pantry', ru: 'Бакалея' },
        spices: { en: 'Spices', ru: 'Специи' },
        other: { en: 'Other', ru: 'Прочее' }
      }
      
      text += `📦 ${categoryLabels[category as IngredientCategory][lang]}:\n`
      items.forEach(item => {
        const amount = item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''
        const check = item.is_purchased ? '✅' : '☐'
        text += `${check} ${item.name}${amount ? ` - ${amount}` : ''}\n`
      })
      text += '\n'
    })
    
    const url = `https://t.me/share/url?url=${encodeURIComponent(text)}&text=${encodeURIComponent(lang === 'ru' ? 'Список покупок' : 'Shopping List')}`
    
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const categoryOrder: IngredientCategory[] = ['vegetables', 'fruits', 'meat', 'dairy', 'bakery', 'pantry', 'spices', 'other']
  const categoryLabels: Record<IngredientCategory, { en: string; ru: string }> = {
    vegetables: { en: 'Vegetables', ru: 'Овощи' },
    fruits: { en: 'Fruits', ru: 'Фрукты' },
    meat: { en: 'Meat', ru: 'Мясо' },
    dairy: { en: 'Dairy', ru: 'Молочные продукты' },
    bakery: { en: 'Bakery', ru: 'Хлебобулочные' },
    pantry: { en: 'Pantry', ru: 'Бакалея' },
    spices: { en: 'Spices', ru: 'Специи' },
    other: { en: 'Other', ru: 'Прочее' }
  }

  if (filteredList.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">
            {lang === 'ru' ? 'Нет ингредиентов для покупки' : 'No ingredients to buy'}
          </p>
          <p className="text-sm">
            {lang === 'ru' 
              ? 'Добавьте ингредиенты к одобренным блюдам'
              : 'Add ingredients to approved dishes'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-purchased"
            checked={showPurchased}
            onCheckedChange={(checked) => setShowPurchased(checked === true)}
          />
          <label htmlFor="show-purchased" className="text-sm cursor-pointer">
            {lang === 'ru' ? 'Показать купленные' : 'Show purchased'}
          </label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportText}>
            <Download className="w-4 h-4 mr-2" />
            {lang === 'ru' ? 'Экспорт' : 'Export'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportTelegram}>
            <Share2 className="w-4 h-4 mr-2" />
            {lang === 'ru' ? 'Telegram' : 'Telegram'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {categoryOrder.map(category => {
          const items = filteredCategorized[category]
          if (items.length === 0) return null

          return (
            <Card key={category}>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">{categoryLabels[category][lang]}</h3>
                <div className="space-y-2">
                  {items.map(item => {
                    const shoppingItem = filteredList.find(si => si.name === item.name && si.unit === item.unit)
                    if (!shoppingItem) return null

                    return (
                      <div
                        key={`${item.name}-${item.unit}`}
                        className={`flex items-center gap-3 p-2 rounded ${shoppingItem.is_purchased ? 'opacity-60' : ''}`}
                      >
                        <Checkbox
                          checked={shoppingItem.is_purchased}
                          onCheckedChange={() => handleToggleIngredient(shoppingItem)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{shoppingItem.name}</div>
                          {shoppingItem.amount > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {parseFloat(shoppingItem.amount.toFixed(2))} {shoppingItem.unit}
                            </div>
                          )}
                          {shoppingItem.dishNames.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {lang === 'ru' ? 'Для:' : 'For:'} {shoppingItem.dishNames.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

