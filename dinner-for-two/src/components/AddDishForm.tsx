'use client'

import { useState } from 'react'
import { addDish } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AddDishForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setLoading(true)
    try {
      await addDish(name)
      setName('')
      onAdded()
    } catch (e) {
      alert('Failed to add dish')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <Input 
        placeholder="Dish name (e.g. Pasta)" 
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />
      <Button type="submit" disabled={loading}>
        {loading ? '...' : 'Add'}
      </Button>
    </form>
  )
}


