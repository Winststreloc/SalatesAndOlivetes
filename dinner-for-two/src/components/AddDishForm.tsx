'use client'

import { useState } from 'react'
import { addDish, generateDishIngredients } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLang } from './LanguageProvider'

export function AddDishForm({ day, onAdded, onCancel }: { day: number, onAdded: () => void, onCancel: () => void }) {
  const { t, lang } = useLang()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setLoading(true)
    try {
      // 1. Fast add with day
      const dish = await addDish(name, day)
      setName('')
      onAdded() 
      
      // 2. Async generate with LANGUAGE
      generateDishIngredients(dish.id, dish.name, lang).then(() => {
          onAdded() 
      })
      
    } catch (e) {
      alert(t.failedAdd)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-2 bg-gray-50 rounded">
      <Input 
        autoFocus
        placeholder={t.addDishPlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
        className="bg-white"
      />
      <Button type="submit" disabled={loading} size="sm">
        {loading ? '...' : t.add}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
          ✕
      </Button>
    </form>
  )
}
