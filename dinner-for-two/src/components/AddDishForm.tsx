'use client'

import { useState } from 'react'
import { addDish, generateDishIngredients, deleteDish } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLang } from './LanguageProvider'
import { showToast } from '@/utils/toast'

export function AddDishForm({ day, onAdded, onCancel, onRemove }: { day: number, onAdded: (dish?: any) => void, onCancel: () => void, onRemove?: (dishId: string) => void }) {
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
      generateDishIngredients(dish.id, dish.name, lang).catch(async (err) => {
        console.error('Failed to generate ingredients:', err)
        const errorMessage = err?.message || ''
        const isValidationError = errorMessage.includes('valid dish name') || 
                                  errorMessage.includes('INVALID_INPUT') || 
                                  errorMessage.includes('не название блюда') || 
                                  errorMessage.includes('not a food-related') ||
                                  errorMessage.includes('связанное с едой') ||
                                  errorMessage.includes('food-related')
        
        if (isValidationError) {
          // Show error to user
          showToast.error(errorMessage || (t.invalidDishName || 'Please enter a valid dish name (food-related only)'))
          // Remove from local state immediately
          if (onRemove) {
            onRemove(dish.id)
          }
          // Delete the invalid dish from database
          try {
            await deleteDish(dish.id)
            console.log('Deleted invalid dish:', dish.id)
          } catch (deleteErr) {
            console.error('Failed to delete invalid dish:', deleteErr)
          }
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
