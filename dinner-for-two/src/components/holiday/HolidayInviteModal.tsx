'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Share2, X } from 'lucide-react'
import { useLang } from '../LanguageProvider'
import { showToast } from '@/utils/toast'
import { generateHolidayInviteLink } from '@/utils/telegram'

interface HolidayInviteModalProps {
  isOpen: boolean
  inviteCode: string | null
  groupName: string
  botUsername?: string
  onClose: () => void
}

export function HolidayInviteModal({ isOpen, inviteCode, groupName, botUsername, onClose }: HolidayInviteModalProps) {
  const { t, lang } = useLang()

  if (!isOpen) return null

  const inviteLink = inviteCode ? generateHolidayInviteLink(inviteCode, botUsername) : ''

  const handleShare = () => {
    if (!inviteLink) return
    const inviteText = lang === 'ru' 
      ? `Присоединяйся к группе "${groupName}"!`
      : `Join the "${groupName}" group!`
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(inviteText)}`
    
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleCopyCode = async () => {
    if (!inviteCode) return
    
    try {
      await navigator.clipboard.writeText(inviteCode)
      showToast.success(lang === 'ru' ? 'Код скопирован' : 'Code copied')
    } catch (e) {
      const textArea = document.createElement('textarea')
      textArea.value = inviteCode
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showToast.success(lang === 'ru' ? 'Код скопирован' : 'Code copied')
    }
  }

  const handleCopyLink = async () => {
    if (!inviteLink) return
    
    try {
      await navigator.clipboard.writeText(inviteLink)
      showToast.success(lang === 'ru' ? 'Ссылка скопирована' : 'Link copied')
    } catch (e) {
      const textArea = document.createElement('textarea')
      textArea.value = inviteLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showToast.success(lang === 'ru' ? 'Ссылка скопирована' : 'Link copied')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
          <h2 className="font-bold text-center text-lg pr-8">
            {lang === 'ru' ? 'Группа создана!' : 'Group Created!'}
          </h2>
        </CardHeader>
        <CardContent className="text-center pb-6">
          <p className="text-sm text-muted-foreground mb-4">
            {lang === 'ru' 
              ? 'Пригласите друзей, отправив им код или ссылку:'
              : 'Invite friends by sharing the code or link:'}
          </p>
          
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">
              {lang === 'ru' ? 'Код приглашения:' : 'Invite Code:'}
            </p>
            <div className="p-3 bg-muted rounded font-mono select-all text-lg font-bold text-foreground break-all">
              {inviteCode || '...'}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={handleCopyCode}
            >
              {lang === 'ru' ? 'Копировать код' : 'Copy Code'}
            </Button>
          </div>

          {inviteLink && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">
                {lang === 'ru' ? 'Ссылка для приглашения:' : 'Invite Link:'}
              </p>
              <div className="p-2 bg-muted rounded text-xs break-all text-foreground mb-2">
                {inviteLink}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleCopyLink}
              >
                {lang === 'ru' ? 'Копировать ссылку' : 'Copy Link'}
              </Button>
            </div>
          )}

          <Button className="w-full flex items-center gap-2 mb-2" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
            {t.shareLink || (lang === 'ru' ? 'Поделиться' : 'Share')}
          </Button>
          
          <Button variant="ghost" onClick={onClose} className="w-full">
            {t.close || (lang === 'ru' ? 'Закрыть' : 'Close')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

