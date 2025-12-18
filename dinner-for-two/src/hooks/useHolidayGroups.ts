import useSWR from 'swr'
import { HolidayGroup } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Failed to fetch')
  }
  return res.json()
}

export function useHolidayGroups() {
  const { data, error, isLoading, mutate } = useSWR<HolidayGroup[]>('/api/holiday/groups', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000
  })

  return {
    groups: data || [],
    isLoading,
    error,
    mutate
  }
}

