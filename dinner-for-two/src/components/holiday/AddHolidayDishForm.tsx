'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLang } from '@/components/LanguageProvider'
import { HolidayDishCategory } from '@/types'

const CATEGORY_LABELS: Record<HolidayDishCategory, { en: string; ru: string }> = {
  cold_appetizers: { en: 'Cold Appetizers', ru: 'Холодные закуски' },
  hot_dishes: { en: 'Hot Dishes', ru: 'Горячие блюда' },
  salads: { en: 'Salads', ru: 'Салаты' },
  alcohol: { en: 'Alcohol', ru: 'Алкоголь' },
  drinks: { en: 'Drinks', ru: 'Напитки' },
  desserts: { en: 'Desserts', ru: 'Десерты' },
  other: { en: 'Other', ru: 'Прочее' }
}

interface AddHolidayDishFormProps {
  category: HolidayDishCategory | null
  onAdd: (name: string, category: HolidayDishCategory) => void
  onCancel: () => void
}

export function AddHolidayDishForm({ category, onAdd, onCancel }: AddHolidayDishFormProps) {
  const { lang } = useLang()
  const [name, setName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<HolidayDishCategory | null>(category)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedCategory) return
    onAdd(name.trim(), selectedCategory)
    setName('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lang === 'ru' ? 'Добавить блюдо' : 'Add Dish'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{lang === 'ru' ? 'Название блюда' : 'Dish Name'}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'ru' ? 'Введите название' : 'Enter dish name'}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="category">{lang === 'ru' ? 'Категория' : 'Category'}</Label>
            <select
              id="category"
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value as HolidayDishCategory)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">{lang === 'ru' ? 'Выберите категорию' : 'Select category'}</option>
              {(Object.keys(CATEGORY_LABELS) as HolidayDishCategory[]).map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat][lang]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!name.trim() || !selectedCategory}>
              {lang === 'ru' ? 'Добавить' : 'Add'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

