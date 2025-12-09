'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { RealtimePayload, Dish, Ingredient, ManualIngredient } from '@/types'
import type { RealtimeChannel } from '@supabase/realtime-js'

type Callback<T> = (payload: RealtimePayload<T>) => void

interface RealtimeHandlers {
  onDishes?: Callback<Dish>
  onIngredients?: Callback<Ingredient>
  onManualIngredients?: Callback<ManualIngredient>
}

export function useRealtime(coupleId?: string | null, handlers: RealtimeHandlers = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!coupleId) return

    const supabase = createClient()
    const channel = supabase.channel(`dashboard-changes-${coupleId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: 'user' }
      }
    })
    channelRef.current = channel

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'dishes',
      filter: `couple_id=eq.${coupleId}`
    }, handlers.onDishes || (() => {}))

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ingredients'
    }, handlers.onIngredients || (() => {}))

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'manual_ingredients',
      filter: `couple_id=eq.${coupleId}`
    }, handlers.onManualIngredients || (() => {}))

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    return () => {
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [coupleId, handlers.onDishes, handlers.onIngredients, handlers.onManualIngredients])

  return { isConnected, channel: channelRef.current }
}


