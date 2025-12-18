import useSWR from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Failed to fetch')
  }
  return res.json()
}

export function useHolidayInviteCode(groupId?: string) {
  const { data, error, isLoading, mutate } = useSWR<{ inviteCode: string | null }>(
    groupId ? `/api/holiday/groups/${groupId}/invite-code` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 60000
    }
  )

  return {
    inviteCode: data?.inviteCode ?? null,
    isLoading,
    error,
    mutate
  }
}

