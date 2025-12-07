'use client'

import { useState } from 'react'
import { addDish, generateDishIngredients } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLang } from './LanguageProvider'
import { showToast } from '@/utils/toast'

export function AddDishForm({ day, onAdded, onCancel }: { day: number, onAdded: (dish?: any) => void, onCancel: () => void }) {
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
      
      // Pass dish to onAdded for optimistic update
      onAdded(dish) 
      
      // 2. Async generate with LANGUAGE (don't wait)
      generateDishIngredients(dish.id, dish.name, lang).catch(err => {
        console.error('Failed to generate ingredients:', err)
        // Show error if validation failed
        if (err.message && (err.message.includes('valid dish name') || err.message.includes('INVALID_INPUT') || err.message.includes('не название блюда') || err.message.includes('not a food-related'))) {
          showToast.error(err.message || (t.invalidDishName || 'Please enter a valid dish name (food-related only)'))
          // Remove the dish that was added optimistically
          // Note: The dish is already added, but we can't easily remove it here
          // The user will see the error and can delete it manually if needed
        }
      })
      
    } catch (e: any) {
      console.error('Failed to add dish:', e)
      // Show specific error message if validation failed
      const errorMessage = e.message?.includes('valid dish name') 
        ? (t.invalidDishName || 'Please enter a valid dish name (food-related only)')
        : t.failedAdd
      showToast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-2 bg-muted rounded">
      <Input 
        autoFocus
        placeholder={t.addDishPlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
        className="bg-card"
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
