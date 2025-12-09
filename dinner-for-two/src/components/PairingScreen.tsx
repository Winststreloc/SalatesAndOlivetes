'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { useLang } from './LanguageProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Share2 } from 'lucide-react'
import { showToast } from '@/utils/toast'

export function PairingScreen() {
  const { createCouple, joinCouple } = useAuth()
  const { t, lang, setLang } = useLang()
  const [inviteCode, setInviteCode] = useState('')
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'dev'

  // Check for invite parameter in URL
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1) Prefer Telegram start_param when WebApp opened via deep link
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param
    if (startParam) {
      setInviteCode(startParam)
      return
    }

    // 2) Fallback to query param (useful for local dev in browser)
    const params = new URLSearchParams(window.location.search)
    const inviteParam = params.get('invite')
    if (inviteParam) {
      setInviteCode(inviteParam)
      // Optionally auto-join if code is provided
      // handleJoin() // Uncomment if you want auto-join
    }
  }, [])

  const handleCreate = async () => {
    const couple = await createCouple()
    if (couple) {
        setCreatedCode(couple.invite_code)
    }
  }

  const handleJoin = async () => {
    try {
        await joinCouple(inviteCode)
    } catch (e) {
        showToast.error(t.invalidCode)
    }
  }

  // Link to send code to bot (start_param). Bot should respond with WebApp button.
  const buildBotLink = (code: string) =>
    `https://t.me/${botUsername}?start=${code}`

  // Link to open the WebApp directly with startapp param (Telegram will open bot WebApp)
  const buildAppLink = (code: string) =>
    `https://t.me/${botUsername}/app?startapp=${code}`

  // Fallback link for local/dev or if bot username missing
  const buildFallbackLink = (code: string) => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${appUrl}?invite=${code}`
  }

  const handleShare = () => {
    if (!createdCode) return
    // Share bot link so recipient starts bot and it can reply with WebApp button
    const inviteLink = botUsername ? buildBotLink(createdCode) : buildFallbackLink(createdCode)
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join me in S&O!')}`
    
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url)
    } else {
        window.open(url, '_blank')
    }
  }

  const handleCopyLink = async () => {
    if (!createdCode) return
    const inviteLink = botUsername ? buildBotLink(createdCode) : buildFallbackLink(createdCode)
    
    try {
        await navigator.clipboard.writeText(inviteLink)
        showToast.success(t.copied)
    } catch (e) {
        // Fallback for older browsers
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
    <div className="flex flex-col gap-4 p-4 items-center justify-center h-screen bg-background relative">
      <div className="absolute top-4 right-4">
         <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}>
            {lang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN'}
         </Button>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
           <CardTitle>{t.welcome}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
           {!createdCode ? (
             <>
               <Button onClick={handleCreate} className="w-full">{t.startNew}</Button>
               <div className="text-center text-sm text-muted-foreground">{t.or}</div>
               <div className="flex gap-2">
                 <Input 
                   placeholder={t.enterCode}
                   value={inviteCode} 
                  onChange={(e: any) => setInviteCode(e.target.value)} 
                 />
                 <Button variant="outline" onClick={handleJoin}>{t.join}</Button>
               </div>
             </>
           ) : (
             <div className="text-center">
               <p className="mb-2">{t.shareCode}</p>
               <div className="p-4 bg-muted rounded font-mono select-all text-lg font-bold mb-4 text-foreground">
                 {createdCode}
               </div>
               <div className="mb-4">
                   <a 
                       href={typeof window !== 'undefined'
                        ? (botUsername ? buildBotLink(createdCode) : buildFallbackLink(createdCode))
                        : '#'}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="text-blue-500 hover:text-blue-700 underline text-sm break-all"
                   >
                       {typeof window !== 'undefined'
                        ? (botUsername ? buildBotLink(createdCode) : buildFallbackLink(createdCode))
                        : ''}
                   </a>
                   {botUsername && (
                     <div className="mt-2 text-xs">
                       <a
                         href={buildAppLink(createdCode)}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-blue-500 hover:text-blue-700 underline break-all"
                       >
                         Открыть WebApp: {buildAppLink(createdCode)}
                       </a>
                     </div>
                   )}
               </div>
               
               <Button className="w-full mt-4 flex items-center gap-2" onClick={handleShare}>
                 <Share2 className="w-4 h-4" />
                 {t.shareLink}
               </Button>
               <Button variant="outline" className="w-full mt-2" onClick={handleCopyLink}>
                 {t.copyLink}
               </Button>
               
               <p className="text-xs text-gray-500 mt-4">{t.waiting}</p>
               <Button className="mt-2" variant="ghost" onClick={() => window.location.reload()}>{t.refresh}</Button>
             </div>
           )}
        </CardContent>
      </Card>
      <div className="absolute left-4 bottom-4 text-xs text-muted-foreground">
        v{appVersion}
      </div>
    </div>
  )
}
