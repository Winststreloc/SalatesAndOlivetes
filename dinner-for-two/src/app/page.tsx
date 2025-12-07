'use client'
import { useAuth } from '@/components/AuthProvider'
import { PairingScreen } from '@/components/PairingScreen'
import { Dashboard } from '@/components/Dashboard'
import { Card } from '@/components/ui/card'
import { useLang } from '@/components/LanguageProvider'

export default function Home() {
  const { user, coupleId, isLoading } = useAuth()
  const { t } = useLang()

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
    return <PairingScreen />
  }

  return <Dashboard />
}
