'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useLang } from './LanguageProvider'
import { getPreferences, updatePreferences, generateIdeas } from '@/app/actions'
import { Loader2, Lightbulb, Settings } from 'lucide-react'

const SIDES = ['buckwheat', 'pasta', 'rice', 'potato']
const PROTEINS = ['chicken', 'beef', 'pork', 'fish']

export function IdeasTab({ onSelectIdea }: { onSelectIdea: (name: string) => void }) {
  const { t } = useLang()
  const [prefs, setPrefs] = useState<any>({ sides: [], proteins: [] })
  const [ideas, setIdeas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    getPreferences().then(setPrefs)
  }, [])

  const handleSave = async () => {
      setLoading(true)
      await updatePreferences(prefs)
      setLoading(false)
      setShowSettings(false)
  }

  const handleGenerate = async () => {
      setLoading(true)
      const newIdeas = await generateIdeas()
      setIdeas(newIdeas)
      setLoading(false)
  }

  const togglePref = (type: 'sides' | 'proteins', value: string) => {
      setPrefs((prev: any) => {
          const list = prev[type] || []
          if (list.includes(value)) {
              return { ...prev, [type]: list.filter((i: string) => i !== value) }
          } else {
              return { ...prev, [type]: [...list, value] }
          }
      })
  }

  if (showSettings) {
      return (
          <div className="p-4 bg-white rounded-lg shadow space-y-4">
              <h2 className="font-bold text-lg mb-2">{t.settings}</h2>
              
              <div>
                  <h3 className="font-semibold mb-2">{t.sides}</h3>
                  <div className="grid grid-cols-2 gap-2">
                      {SIDES.map(item => (
                          <div key={item} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`side-${item}`} 
                                checked={prefs.sides?.includes(item)}
                                onCheckedChange={() => togglePref('sides', item)}
                              />
                              <Label htmlFor={`side-${item}`}>{t[item as keyof typeof t]}</Label>
                          </div>
                      ))}
                  </div>
              </div>

              <div>
                  <h3 className="font-semibold mb-2">{t.proteins}</h3>
                  <div className="grid grid-cols-2 gap-2">
                      {PROTEINS.map(item => (
                          <div key={item} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`prot-${item}`} 
                                checked={prefs.proteins?.includes(item)}
                                onCheckedChange={() => togglePref('proteins', item)}
                              />
                              <Label htmlFor={`prot-${item}`}>{t[item as keyof typeof t]}</Label>
                          </div>
                      ))}
                  </div>
              </div>
              
              <Button className="w-full mt-4" onClick={handleSave} disabled={loading}>
                  {loading ? '...' : t.save}
              </Button>
          </div>
      )
  }

  return (
      <div className="space-y-4">
          <div className="flex justify-between items-center">
             <Button variant="outline" onClick={() => setShowSettings(true)} size="sm">
                 <Settings className="w-4 h-4 mr-2" />
                 {t.settings}
             </Button>
          </div>
          
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50">
               {ideas.length === 0 ? (
                   <div className="text-center text-gray-500 mb-4">
                       <Lightbulb className="w-12 h-12 mx-auto mb-2 text-yellow-400" />
                       <p>{t.noIdeas}</p>
                   </div>
               ) : (
                   <div className="w-full space-y-2 mb-4">
                       {ideas.map((idea, idx) => (
                           <Card key={idx}>
                               <CardContent className="p-3 flex justify-between items-center">
                                   <span>{idea}</span>
                                   <Button size="sm" onClick={() => onSelectIdea(idea)}>{t.useIdea}</Button>
                               </CardContent>
                           </Card>
                       ))}
                   </div>
               )}
               
               <Button onClick={handleGenerate} disabled={loading} className="w-full">
                   {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                   {t.generateIdeas}
               </Button>
          </div>
      </div>
  )
}

