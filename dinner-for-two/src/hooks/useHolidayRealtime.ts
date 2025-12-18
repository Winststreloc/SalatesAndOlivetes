'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { RealtimePayload, HolidayDish, HolidayDishApproval } from '@/types'

type Callback<T> = (payload: RealtimePayload<T>) => void

interface HolidayRealtimeHandlers {
  onDishes?: Callback<HolidayDish>
  onApprovals?: Callback<HolidayDishApproval>
}

export function useHolidayRealtime(holidayGroupId?: string | null, handlers: HolidayRealtimeHandlers = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const handlersRef = useRef(handlers)

  // Update handlers ref when they change, but don't recreate subscription
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers.onDishes, handlers.onApprovals])

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

