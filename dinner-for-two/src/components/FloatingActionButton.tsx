'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useLang } from './LanguageProvider'

interface FloatingActionButtonProps {
  onClick: () => void
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  const { t } = useLang()

  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-20 right-4 z-30 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
      aria-label={t.add}
    >
      <Plus className="w-6 h-6" />
    </Button>
  )
}

