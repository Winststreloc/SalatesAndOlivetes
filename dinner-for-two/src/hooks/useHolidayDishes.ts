import useSWR from 'swr'
import { HolidayDish } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Failed to fetch')
  }
  return res.json()
}

export function useHolidayDishes(groupId?: string) {
  const { data, error, isLoading, mutate } = useSWR<HolidayDish[]>(
    groupId ? `/api/holiday/groups/${groupId}/dishes` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 20000
    }
  )

  return {
    dishes: data || [],
    isLoading,
    error,
    mutate
  }
}

