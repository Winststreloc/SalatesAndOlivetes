import useSWR from 'swr'
import { HolidayMember } from '@/types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Failed to fetch')
  }
  return res.json()
}

export function useHolidayGroupMembers(groupId?: string) {
  const { data, error, isLoading, mutate } = useSWR<HolidayMember[]>(
    groupId ? `/api/holiday/groups/${groupId}/members` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 20000
    }
  )

  return {
    members: data || [],
    isLoading,
    error,
    mutate
  }
}

