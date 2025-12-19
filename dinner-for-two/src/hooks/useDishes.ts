'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { addDish, deleteDish, getDish, getDishes, moveDish, updateRecipe } from '@/app/actions'
import { Dish } from '@/types'

export function useDishes(initialDishes?: Dish[]) {
  const [dishes, setDishes] = useState<Dish[]>(initialDishes ?? [])
  const [isLoading, setIsLoading] = useState<boolean>(initialDishes === undefined)
  const isMountedRef = useRef(true)
  const skipInitialFetch = initialDishes !== undefined

  useEffect(() => {
    if (skipInitialFetch) {
      setDishes(initialDishes || [])
      setIsLoading(false)
    }
  }, [initialDishes, skipInitialFetch])

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return
    setIsLoading(true)
    try {
      const data = await getDishes()
      if (isMountedRef.current) setDishes(data as Dish[])
    } finally {
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [])

  const add = useCallback(async (name: string, date?: string) => {
    const dish = await addDish(name, date)
    await refresh()
    return dish
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    await deleteDish(id)
    await refresh()
  }, [refresh])

  const move = useCallback(async (id: string, date: string) => {
    await moveDish(id, date)
    await refresh()
  }, [refresh])

  const saveRecipe = useCallback(async (id: string, recipe: string) => {
    await updateRecipe(id, recipe)
    const updated = await getDish(id)
    if (updated && isMountedRef.current) {
      setDishes(prev => prev.map(d => d.id === updated.id ? (updated as Dish) : d))
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    if (!skipInitialFetch) {
      refresh()
    }
    return () => { isMountedRef.current = false }
  }, [refresh, skipInitialFetch])

  return {
    dishes,
    setDishes,
    isLoading,
    refresh,
    add,
    remove,
    move,
    saveRecipe,
  }
}


