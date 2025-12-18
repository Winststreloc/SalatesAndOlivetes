'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { RealtimePayload, HolidayDish, HolidayDishApproval, HolidayDishIngredient } from '@/types'

type Callback<T> = (payload: RealtimePayload<T>) => void

interface HolidayRealtimeHandlers {
  onDishes?: Callback<HolidayDish>
  onApprovals?: Callback<HolidayDishApproval>
  onIngredients?: Callback<HolidayDishIngredient>
}

export function useHolidayRealtime(holidayGroupId?: string | null, handlers: HolidayRealtimeHandlers = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const handlersRef = useRef(handlers)

  // Update handlers ref when they change, but don't recreate subscription
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers.onDishes, handlers.onApprovals, handlers.onIngredients])

  useEffect(() => {
    if (!holidayGroupId) return

    const supabase = createClient()
    const channel = supabase.channel(`holiday-group-${holidayGroupId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: 'user' }
      }
    })
    channelRef.current = channel

    // Subscribe to holiday_dishes changes
    ;(channel as any).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'holiday_dishes',
      filter: `holiday_group_id=eq.${holidayGroupId}`
    }, (payload: RealtimePayload<HolidayDish>) => {
      handlersRef.current.onDishes?.(payload)
    })

    // Subscribe to holiday_dish_approvals changes
    ;(channel as any).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'holiday_dish_approvals'
    }, (payload: RealtimePayload<HolidayDishApproval>) => {
      handlersRef.current.onApprovals?.(payload)
    })

    // Subscribe to holiday_dish_ingredients changes
    // Подписываемся на все изменения ингредиентов через изменения блюд
    // (так как ингредиенты связаны с блюдами, которые принадлежат группе)
    ;(channel as any).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'holiday_dish_ingredients'
    }, (payload: RealtimePayload<HolidayDishIngredient>) => {
      handlersRef.current.onIngredients?.(payload)
    })

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    return () => {
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [holidayGroupId])

  return { isConnected, channel: channelRef.current }
}

