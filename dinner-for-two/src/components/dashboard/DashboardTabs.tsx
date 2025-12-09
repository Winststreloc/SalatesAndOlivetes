'use client'

import { Button } from '@/components/ui/button'
import { Calendar, Lightbulb, History } from 'lucide-react'
import { useLang } from '../LanguageProvider'

export type TabType = 'plan' | 'list' | 'ideas' | 'history'

interface DashboardTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  const { t } = useLang()

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border p-2 bg-card shadow-up z-20">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <Button variant={activeTab === 'plan' ? 'default' : 'ghost'} onClick={() => onTabChange('plan')} className="flex-shrink-0 whitespace-nowrap">
          <Calendar className="w-4 h-4 mr-2" />
          <span className="text-xs">{t.planMenu}</span>
        </Button>
        <Button variant={activeTab === 'ideas' ? 'default' : 'ghost'} onClick={() => onTabChange('ideas')} className="flex-shrink-0 whitespace-nowrap">
          <Lightbulb className="w-4 h-4 mr-2" />
          <span className="text-xs">{t.ideas}</span>
        </Button>
        <Button variant={activeTab === 'list' ? 'default' : 'ghost'} onClick={() => onTabChange('list')} className="flex-shrink-0 whitespace-nowrap">
          <span className="text-xs">{t.shoppingList}</span>
        </Button>
        <Button variant={activeTab === 'history' ? 'default' : 'ghost'} onClick={() => onTabChange('history')} className="flex-shrink-0 whitespace-nowrap">
          <History className="w-4 h-4 mr-2" />
          <span className="text-xs">{t.history}</span>
        </Button>
      </div>
    </div>
  )
}

