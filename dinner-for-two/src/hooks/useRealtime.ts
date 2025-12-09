'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { RealtimePayload, Dish, Ingredient, ManualIngredient } from '@/types'

type Callback<T> = (payload: RealtimePayload<T>) => void

interface RealtimeHandlers {
  onDishes?: Callback<Dish>
  onIngredients?: Callback<Ingredient>
  onManualIngredients?: Callback<ManualIngredient>
}

export function useRealtime(coupleId?: string | null, handlers: RealtimeHandlers = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const handlersRef = useRef(handlers)

  // Update handlers ref when they change, but don't recreate subscription
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers.onDishes, handlers.onIngredients, handlers.onManualIngredients])

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

    // Use type assertion to bypass strict typing for postgres_changes
    // Use handlersRef to access latest handlers without recreating subscription
    ;(channel as any).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'dishes',
      filter: `couple_id=eq.${coupleId}`
    }, (payload: RealtimePayload<Dish>) => {
      handlersRef.current.onDishes?.(payload)
    })

    ;(channel as any).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ingredients'
    }, (payload: RealtimePayload<Ingredient>) => {
      handlersRef.current.onIngredients?.(payload)
    })

    ;(channel as any).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'manual_ingredients',
      filter: `couple_id=eq.${coupleId}`
    }, (payload: RealtimePayload<ManualIngredient>) => {
      handlersRef.current.onManualIngredients?.(payload)
    })

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    return () => {
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [coupleId])

  return { isConnected, channel: channelRef.current }
}


