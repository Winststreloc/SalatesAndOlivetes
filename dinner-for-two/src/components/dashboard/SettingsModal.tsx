'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { X, Moon, Sun, Loader2 } from 'lucide-react'
import { useLang } from '../LanguageProvider'
import { useTheme } from '../ThemeProvider'
import { CouplePreferences } from '@/types'

interface SettingsModalProps {
  isOpen: boolean
  preferences: CouplePreferences
  isLoading: boolean
  onClose: () => void
  onSave: (preferences: CouplePreferences) => Promise<void>
  onPreferencesChange: (preferences: CouplePreferences) => void
}

export function SettingsModal({ 
  isOpen, 
  preferences, 
  isLoading, 
  onClose, 
  onSave,
  onPreferencesChange 
}: SettingsModalProps) {
  const { t, lang, setLang } = useLang()
  const { theme, toggleTheme } = useTheme()

  if (!isOpen) return null

  const handleSave = async () => {
    await onSave(preferences)
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="p-4 font-bold text-lg">{t.coupleSettings}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="useAI"
                checked={preferences.useAI !== false}
                onCheckedChange={(checked: boolean) => {
                  onPreferencesChange({ ...preferences, useAI: checked !== false })
                }}
              />
              <div className="flex-1">
                <Label htmlFor="useAI" className="font-medium cursor-pointer">
                  {t.useAIForIngredients}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.useAIForIngredientsDesc}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Label className="font-medium">
                  {t.theme || 'Theme'}
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme} className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span>{theme === 'dark' ? (t.darkMode || 'Dark') : (t.lightMode || 'Light')}</span>
              </Button>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Label className="font-medium">
                  {t.language || 'Language'}
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLang(lang === 'en' ? 'ru' : 'en')} className="flex items-center gap-2">
                <span>{lang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN'}</span>
              </Button>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
            >
              {t.close}
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.saving || 'Saving...'}
                </>
              ) : (
                t.save || 'Save'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

