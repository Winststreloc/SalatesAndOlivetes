'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { useLang } from './LanguageProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Share2 } from 'lucide-react'

export function PairingScreen() {
  const { createCouple, joinCouple } = useAuth()
  const { t, lang, setLang } = useLang()
  const [inviteCode, setInviteCode] = useState('')
  const [createdCode, setCreatedCode] = useState<string | null>(null)

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
        alert(t.invalidCode)
    }
  }

  const handleShare = () => {
    if (!createdCode) return
    const inviteText = `Join me in Dinner for Two! My code: ${createdCode}`
    // Use Telegram URL scheme to open share dialog
    // This will open a chat selection to send the message
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteText)}`
    
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url)
    } else {
        window.open(url, '_blank')
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 items-center justify-center h-screen bg-gray-50 relative">
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
               <div className="text-center text-sm text-gray-500">{t.or}</div>
               <div className="flex gap-2">
                 <Input 
                   placeholder={t.enterCode}
                   value={inviteCode} 
                   onChange={(e) => setInviteCode(e.target.value)} 
                 />
                 <Button variant="outline" onClick={handleJoin}>{t.join}</Button>
               </div>
             </>
           ) : (
             <div className="text-center">
               <p className="mb-2">{t.shareCode}</p>
               <div className="p-4 bg-gray-100 rounded font-mono select-all text-lg font-bold">
                 {createdCode}
               </div>
               
               <Button className="w-full mt-4 flex items-center gap-2" onClick={handleShare}>
                 <Share2 className="w-4 h-4" />
                 {t.shareLink}
               </Button>
               
               <p className="text-xs text-gray-500 mt-4">{t.waiting}</p>
               <Button className="mt-2" variant="ghost" onClick={() => window.location.reload()}>{t.refresh}</Button>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  )
}
