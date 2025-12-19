'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLang } from '@/components/LanguageProvider'
import { HolidayDish, HolidayDishIngredient } from '@/types'
import { addHolidayDishIngredient, updateHolidayDishIngredient, deleteHolidayDishIngredient, generateHolidayDishIngredients } from '@/app/actions'
import { showToast } from '@/utils/toast'
import { Loader2, Plus, Wand2, Trash2, X } from 'lucide-react'

interface HolidayIngredientEditorProps {
  dish: HolidayDish
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void // callback to refresh dish data
  onIngredientsChange?: (dishId: string, ingredients: HolidayDishIngredient[]) => void
}

export function HolidayIngredientEditor({ dish, isOpen, onClose, onUpdated, onIngredientsChange }: HolidayIngredientEditorProps) {
  const { lang } = useLang()
  const [ingredients, setIngredients] = useState<HolidayDishIngredient[]>([])
  const [adding, setAdding] = useState(false)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [newIngredient, setNewIngredient] = useState({ name: '', amount: '', unit: '' })

  useEffect(() => {
    if (isOpen) {
      setIngredients(dish.holiday_dish_ingredients || [])
    }
  }, [isOpen, dish])

  const handleAdd = async () => {
    if (!newIngredient.name.trim()) return
    const name = newIngredient.name.trim()
    const optimistic: HolidayDishIngredient = {
      id: `temp-${Date.now()}`,
      holiday_dish_id: dish.id,
      name,
      amount: newIngredient.amount || '',
      unit: newIngredient.unit || '',
      is_purchased: false,
    }
    const prev = ingredients
    const next = [...ingredients, optimistic]
    setIngredients(next)
    onIngredientsChange?.(dish.id, next)
    setAdding(true)
    try {
      await addHolidayDishIngredient(dish.id, name, newIngredient.amount, newIngredient.unit)
      setNewIngredient({ name: '', amount: '', unit: '' })
      await onUpdated()
      showToast.success(lang === 'ru' ? 'Ингредиент добавлен' : 'Ingredient added')
    } catch (e) {
      setIngredients(prev)
      onIngredientsChange?.(dish.id, prev)
      showToast.error(e instanceof Error ? e.message : 'Failed to add ingredient')
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (ing: HolidayDishIngredient) => {
    setSavingIds(prev => new Set(prev).add(ing.id))
    try {
      await updateHolidayDishIngredient(ing.id, ing.name, ing.amount || '', ing.unit || '')
      await onUpdated()
      showToast.success(lang === 'ru' ? 'Сохранено' : 'Saved')
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(ing.id)
        return next
      })
    }
  }

  const handleDelete = async (id: string) => {
    const prev = ingredients
    const next = ingredients.filter(ing => ing.id !== id)
    setIngredients(next)
    onIngredientsChange?.(dish.id, next)
    setSavingIds(prev => new Set(prev).add(id))
    try {
      await deleteHolidayDishIngredient(id)
      await onUpdated()
      showToast.success(lang === 'ru' ? 'Удалено' : 'Deleted')
    } catch (e) {
      // rollback on error
      setIngredients(prev)
      onIngredientsChange?.(dish.id, prev)
      showToast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setSavingIds(prev => {
        const nextSet = new Set(prev)
        nextSet.delete(id)
        return nextSet
      })
    }
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    showToast.success(lang === 'ru' ? 'Генерация запущена' : 'Generation started')
    // Запускаем генерацию в фоне, чтобы не блокировать другие действия
    void generateHolidayDishIngredients(dish.id, dish.name, lang)
      .then(async () => {
        await onUpdated()
        showToast.success(lang === 'ru' ? 'Сгенерировано' : 'Generated')
      })
      .catch(e => {
        showToast.error(e instanceof Error ? e.message : 'Failed to generate')
      })
      .finally(() => setIsGenerating(false))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md md:max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{lang === 'ru' ? 'Ингредиенты' : 'Ingredients'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              {lang === 'ru' ? 'Сгенерировать ИИ' : 'Generate with AI'}
            </Button>
          </div>

          <div className="border-t" />

          <div className="space-y-3 max-h-64 overflow-auto pr-1">
            {ingredients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {lang === 'ru' ? 'Нет ингредиентов' : 'No ingredients yet'}
              </p>
            )}
            {ingredients.map((ing, idx) => (
              <div key={ing.id} className="grid grid-cols-12 md:grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-12 md:col-span-5"
                  value={ing.name}
                  onChange={(e) => {
                    const val = e.target.value
                    setIngredients(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item))
                  }}
                />
                <Input
                  className="col-span-6 md:col-span-3"
                  value={ing.amount || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setIngredients(prev => prev.map((item, i) => i === idx ? { ...item, amount: val } : item))
                  }}
                  placeholder={lang === 'ru' ? 'Кол-во' : 'Amount'}
                />
                <Input
                  className="col-span-6 md:col-span-2"
                  value={ing.unit || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setIngredients(prev => prev.map((item, i) => i === idx ? { ...item, unit: val } : item))
                  }}
                  placeholder={lang === 'ru' ? 'Ед.' : 'Unit'}
                />
                <div className="col-span-12 md:col-span-2 flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => handleUpdate(ingredients[idx])} disabled={savingIds.has(ing.id)}>
                    {savingIds.has(ing.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓'}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(ing.id)} disabled={savingIds.has(ing.id)}>
                    {savingIds.has(ing.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t" />

          <div className="grid grid-cols-12 md:grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-12 md:col-span-5"
              value={newIngredient.name}
              onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
              placeholder={lang === 'ru' ? 'Новый ингредиент' : 'New ingredient'}
            />
            <Input
              className="col-span-6 md:col-span-3"
              value={newIngredient.amount}
              onChange={(e) => setNewIngredient(prev => ({ ...prev, amount: e.target.value }))}
              placeholder={lang === 'ru' ? 'Кол-во' : 'Amount'}
            />
            <Input
              className="col-span-6 md:col-span-2"
              value={newIngredient.unit}
              onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
              placeholder={lang === 'ru' ? 'Ед.' : 'Unit'}
            />
            <Button size="sm" className="col-span-12 md:col-span-2" onClick={handleAdd} disabled={adding || !newIngredient.name.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              {lang === 'ru' ? 'Добавить' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

