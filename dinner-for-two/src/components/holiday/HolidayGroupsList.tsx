'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLang } from '@/components/LanguageProvider'
import { getHolidayGroups, createHolidayGroup, joinHolidayGroup } from '@/app/actions'
import { HolidayGroup } from '@/types'
import { showToast } from '@/utils/toast'
import { Plus, Users, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface HolidayGroupsListProps {
  onSelectGroup: (group: HolidayGroup) => void
  onCreateGroup: () => void
}

export function HolidayGroupsList({ onSelectGroup, onCreateGroup }: HolidayGroupsListProps) {
  const { t, lang } = useLang()
  const [groups, setGroups] = useState<HolidayGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [holidayType, setHolidayType] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const isMountedRef = useRef(true)

  const loadGroups = useCallback(async () => {
    if (!isMountedRef.current) return
    setIsLoading(true)
    try {
      const data = await getHolidayGroups()
      if (isMountedRef.current) {
        setGroups(data as HolidayGroup[])
      }
    } catch (error) {
      console.error('Failed to load holiday groups:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to load groups')
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    loadGroups()
    return () => {
      isMountedRef.current = false
    }
  }, [loadGroups])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    try {
      const group = await createHolidayGroup(groupName.trim(), holidayType.trim() || undefined)
      if (isMountedRef.current) {
        setGroups(prev => [group as HolidayGroup, ...prev])
        setShowCreateForm(false)
        setGroupName('')
        setHolidayType('')
        showToast.success(lang === 'ru' ? 'Группа создана' : 'Group created')
        onSelectGroup(group as HolidayGroup)
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to create group')
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    try {
      const group = await joinHolidayGroup(inviteCode.trim())
      if (isMountedRef.current) {
        await loadGroups()
        setShowJoinForm(false)
        setInviteCode('')
        showToast.success(lang === 'ru' ? 'Вы присоединились к группе' : 'Joined group')
        onSelectGroup(group as HolidayGroup)
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to join group')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (showCreateForm) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">{lang === 'ru' ? 'Создать группу праздника' : 'Create Holiday Group'}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">{lang === 'ru' ? 'Название группы' : 'Group Name'}</Label>
                <Input
                  id="name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={lang === 'ru' ? 'Например: День рождения Маши' : 'e.g., Maria\'s Birthday'}
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="type">{lang === 'ru' ? 'Тип праздника (необязательно)' : 'Holiday Type (optional)'}</Label>
                <Input
                  id="type"
                  value={holidayType}
                  onChange={(e) => setHolidayType(e.target.value)}
                  placeholder={lang === 'ru' ? 'Например: День рождения' : 'e.g., Birthday'}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={!groupName.trim()}>
                  {lang === 'ru' ? 'Создать' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowCreateForm(false)
                  setGroupName('')
                  setHolidayType('')
                }}>
                  {lang === 'ru' ? 'Отмена' : 'Cancel'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showJoinForm) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">{lang === 'ru' ? 'Присоединиться к группе' : 'Join Holiday Group'}</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <Label htmlFor="code">{lang === 'ru' ? 'Код приглашения' : 'Invite Code'}</Label>
                <Input
                  id="code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder={lang === 'ru' ? 'Введите код приглашения' : 'Enter invite code'}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={!inviteCode.trim()}>
                  {lang === 'ru' ? 'Присоединиться' : 'Join'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowJoinForm(false)
                  setInviteCode('')
                }}>
                  {lang === 'ru' ? 'Отмена' : 'Cancel'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold mb-4">{lang === 'ru' ? 'Группы праздников' : 'Holiday Groups'}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateForm(true)} className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            {lang === 'ru' ? 'Создать группу' : 'Create Group'}
          </Button>
          <Button onClick={() => setShowJoinForm(true)} variant="outline" className="flex-1">
            {lang === 'ru' ? 'Присоединиться' : 'Join Group'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {lang === 'ru' ? 'Нет групп праздников' : 'No holiday groups'}
              </p>
              <p className="text-sm">
                {lang === 'ru' 
                  ? 'Создайте новую группу или присоединитесь к существующей'
                  : 'Create a new group or join an existing one'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <Card
                key={group.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectGroup(group)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                      {group.holiday_type && (
                        <p className="text-sm text-muted-foreground mb-2">{group.holiday_type}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{lang === 'ru' ? 'Группа' : 'Group'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

