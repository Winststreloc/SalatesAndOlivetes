'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getCouplePreferences, updateCouplePreferences } from '@/app/actions'
import { CouplePreferences } from '@/types'

export function useCoupleSettings(coupleId?: string | null) {
  const [preferences, setPreferences] = useState<CouplePreferences>({ useAI: true })
  const [isLoading, setIsLoading] = useState(false)
  const isMountedRef = useRef(true)

  const load = useCallback(async () => {
    if (!coupleId) return
    setIsLoading(true)
    try {
      const prefs = await getCouplePreferences()
      if (isMountedRef.current) setPreferences(prefs)
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [coupleId])

  const save = useCallback(async (prefs: CouplePreferences) => {
    if (!coupleId) return
    setIsLoading(true)
    try {
      await updateCouplePreferences(prefs)
      if (isMountedRef.current) setPreferences(prefs)
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [coupleId])

  useEffect(() => {
    isMountedRef.current = true
    load()
    return () => { isMountedRef.current = false }
  }, [load])

  return { preferences, setPreferences, isLoading, load, save }
}


