'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLang } from '../LanguageProvider'
import { getDateButtonLabel } from '@/utils/dateUtils'

interface DaySelectorModalProps {
  isOpen: boolean
  dates: string[]
  onSelect: (date: string) => void
  onClose: () => void
}

export function DaySelectorModal({ isOpen, dates, onSelect, onClose }: DaySelectorModalProps) {
  const { t, lang } = useLang()

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardHeader className="p-4 font-bold text-center">{t.selectDay}</CardHeader>
        </CardHeader>
        <CardContent className="text-center pb-6">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {dates.map(date => (
              <Button
                key={date}
                variant="outline"
                onClick={() => onSelect(date)}
                className="h-12"
              >
                {getDateButtonLabel(date, lang)}
              </Button>
            ))}
          </div>
          <Button variant="ghost" onClick={onClose}>
            {t.close}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

