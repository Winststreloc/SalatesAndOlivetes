'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLang } from './LanguageProvider'
import { X } from 'lucide-react'

export function IngredientForm({ 
  initialName = '', 
  initialAmount = '', 
  initialUnit = '',
  onSubmit, 
  onCancel 
}: { 
  initialName?: string
  initialAmount?: string
  initialUnit?: string
  onSubmit: (name: string, amount: string, unit: string) => void
  onCancel: () => void 
}) {
  const { t } = useLang()
  const [name, setName] = useState(initialName)
  const [amount, setAmount] = useState(initialAmount)
  const [unit, setUnit] = useState(initialUnit)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), amount.trim(), unit.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-muted rounded-lg space-y-2 border border-border">
      <div className="flex gap-2">
        <Input
          placeholder={t.ingredientName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          autoFocus
          required
        />
        <Input
          placeholder={t.ingredientAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24"
        />
        <Input
          placeholder={t.ingredientUnit}
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-20"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="submit" size="sm">{t.save}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}

