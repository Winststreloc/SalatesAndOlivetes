'use client'

import { Button } from '@/components/ui/button'
import { Key, Settings, LogOut, Wifi, WifiOff } from 'lucide-react'
import { useLang } from '../LanguageProvider'
import { useAuth } from '../AuthProvider'
import { ConfirmDialog } from '../ConfirmDialog'
import { useState } from 'react'

interface DashboardHeaderProps {
  isRealtimeConnected: boolean
  onShowInvite: () => void
  onShowSettings: () => void
  onLogout: () => void
}

export function DashboardHeader({ 
  isRealtimeConnected, 
  onShowInvite, 
  onShowSettings,
  onLogout 
}: DashboardHeaderProps) {
  const { t } = useLang()
  const { logout } = useAuth()
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, title: string, description: string, onConfirm: () => void } | null>(null)

  const handleLogout = () => {
    setConfirmDialog({
      open: true,
      title: t.logout || 'Logout',
      description: t.logoutConfirm || 'Are you sure you want to leave the couple? You will need to create or join a new couple.',
      onConfirm: async () => {
        setConfirmDialog(null)
        if (typeof window !== 'undefined') {
          localStorage.setItem('skipAutoJoinOnce', '1')
        }
        await logout()
        onLogout()
      }
    })
  }

  return (
    <>
      <div className="flex justify-between p-3 bg-card border-b border-border items-center shadow-sm z-10 safe-area-inset-top">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onShowInvite}>
            <Key className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-sm text-foreground">S&O</h1>
          {isRealtimeConnected ? (
            <span title="Realtime connected">
              <Wifi className="h-3 w-3 text-green-500" />
            </span>
          ) : (
            <span title="Realtime disconnected">
              <WifiOff className="h-3 w-3 text-muted-foreground" />
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={onShowSettings}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </div>

      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          description={confirmDialog.description}
          variant="destructive"
        />
      )}
    </>
  )
}

