'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Share2 } from 'lucide-react'
import { useLang } from '../LanguageProvider'
import { showToast } from '@/utils/toast'

interface InviteModalProps {
  isOpen: boolean
  inviteCode: string | null
  botUsername: string | undefined
  onClose: () => void
}

export function InviteModal({ isOpen, inviteCode, botUsername, onClose }: InviteModalProps) {
  const { t } = useLang()

  if (!isOpen) return null

  const buildAppLink = (code?: string | null) => {
    if (!code || !botUsername) return ''
    return `https://t.me/${botUsername}/app?startapp=${code}`
  }

  const handleShare = () => {
    const inviteLink = buildAppLink(inviteCode)
    if (!inviteLink) return
    const inviteText = 'Join me in Salates and Olivetes!'
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(inviteText)}`
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleCopyLink = async () => {
    const inviteLink = buildAppLink(inviteCode)
    if (!inviteLink) return
    
    try {
      await navigator.clipboard.writeText(inviteLink)
      showToast.success(t.copied)
    } catch (e) {
      const textArea = document.createElement('textarea')
      textArea.value = inviteLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showToast.success(t.copied)
    }
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardHeader className="p-4 font-bold text-center">{t.inviteCode}</CardHeader>
        </CardHeader>
        <CardContent className="text-center pb-6">
          <div className="p-3 bg-muted rounded font-mono select-all text-xl font-bold mb-4 text-foreground">
            {inviteCode || '...'}
          </div>
          <div className="mb-4">
            <a 
              href={buildAppLink(inviteCode) || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 underline text-sm break-all"
            >
              {buildAppLink(inviteCode)}
            </a>
          </div>
          <Button className="w-full flex items-center gap-2 mb-2" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
            {t.shareLink}
          </Button>
          <Button variant="outline" className="w-full flex items-center gap-2 mb-2" onClick={handleCopyLink}>
            {t.copyLink}
          </Button>
          <Button variant="ghost" onClick={onClose}>{t.close}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

