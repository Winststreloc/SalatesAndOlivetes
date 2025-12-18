'use client'
import { useAuth } from '@/components/AuthProvider'
import { PairingScreen } from '@/components/PairingScreen'
import { Dashboard } from '@/components/Dashboard'
import { Card } from '@/components/ui/card'
import { useLang } from '@/components/LanguageProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinHolidayGroup } from '@/app/actions'
import { parseHolidayInviteLink } from '@/utils/telegram'
import { showToast } from '@/utils/toast'

export default function Home() {
  const { user, coupleId, isLoading } = useAuth()
  const { t, lang } = useLang()
  const [processingInvite, setProcessingInvite] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Обработка deeplink для holiday групп
    if (typeof window === 'undefined' || !user || !coupleId) return

    const handleStartParam = async () => {
      // Проверяем start_param из Telegram
      if (window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
        const startParam = window.Telegram.WebApp.initDataUnsafe.start_param
        if (startParam.startsWith('holiday_')) {
          const inviteCode = startParam.replace('holiday_', '')
          const handledKey = `holiday_invite_${inviteCode}`
          if (inviteCode && !processingInvite && !sessionStorage.getItem(handledKey)) {
            setProcessingInvite(true)
            try {
              await joinHolidayGroup(inviteCode)
              sessionStorage.setItem(handledKey, '1')
              showToast.success(lang === 'ru' ? 'Вы присоединились к группе праздника' : 'Joined holiday group')
              router.replace(`${window.location.pathname}?holiday=groups`)
            } catch (error) {
              showToast.error(error instanceof Error ? error.message : 'Failed to join group')
            } finally {
              setProcessingInvite(false)
            }
          }
        }
      }

      // Проверяем URL параметры
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      if (code && !processingInvite) {
        const handledKey = `holiday_invite_${code}`
        if (sessionStorage.getItem(handledKey)) return
        setProcessingInvite(true)
        try {
          await joinHolidayGroup(code)
          sessionStorage.setItem(handledKey, '1')
          showToast.success(lang === 'ru' ? 'Вы присоединились к группе праздника' : 'Joined holiday group')
          // Очистить URL и перейти в группы
          router.replace(`${window.location.pathname}?holiday=groups`)
        } catch (error) {
          showToast.error(error instanceof Error ? error.message : 'Failed to join group')
        } finally {
          setProcessingInvite(false)
        }
      }
    }

    handleStartParam()
  }, [user, coupleId, processingInvite, lang, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    // If not in Telegram or auth failed
    return (
       <div className="flex items-center justify-center h-screen p-4 text-center">
         <Card className="p-6">
           {t.openInTg}
         </Card>
       </div>
    )
  }

  if (!coupleId) {
    return (
      <ErrorBoundary>
        <PairingScreen />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  )
}
