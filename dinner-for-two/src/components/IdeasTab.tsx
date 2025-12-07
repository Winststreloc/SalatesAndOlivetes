'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useLang } from './LanguageProvider'
import { getPreferences, updatePreferences, generateIdeas } from '@/app/actions'
import { Loader2, Lightbulb, Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Categories definition
const CATEGORIES = {
    sides: ['buckwheat', 'pasta', 'rice', 'potato', 'quinoa', 'bulgur', 'lentils'],
    proteins: ['chicken', 'beef', 'pork', 'turkey', 'fish', 'seafood'],
    veggies: ['tomato', 'cucumber', 'pepper', 'broccoli', 'zucchini', 'eggplant', 'mushrooms'],
    treats: ['pizza', 'sushi', 'burger', 'shawarma'],
    cuisines: ['italian', 'asian', 'russian', 'georgian', 'mexican']
}

export function IdeasTab({ onSelectIdea }: { onSelectIdea: (name: string) => void }) {
  const { t, lang } = useLang()
  const [prefs, setPrefs] = useState<any>({ sides: [], proteins: [], veggies: [], treats: [], cuisines: [] })
  const [ideas, setIdeas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    getPreferences().then(data => {
        // Ensure all arrays exist
        setPrefs({
            sides: data.sides || [],
            proteins: data.proteins || [],
            veggies: data.veggies || [],
            treats: data.treats || [],
            cuisines: data.cuisines || []
        })
    })
  }, [])

  const handleSave = async () => {
      setLoading(true)
      await updatePreferences(prefs)
      setLoading(false)
      setShowSettings(false)
  }

  const handleGenerate = async () => {
      setLoading(true)
      // Pass language here
      const newIdeas = await generateIdeas(lang)
      setIdeas(newIdeas)
      setLoading(false)
  }

  const togglePref = (type: string, value: string) => {
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
          <div className="p-4 bg-white rounded-lg shadow h-full flex flex-col">
              <h2 className="font-bold text-lg mb-4">{t.settings}</h2>
              
              <div className="flex-1 overflow-auto space-y-6 pr-2">
                  {Object.entries(CATEGORIES).map(([key, items]) => (
                      <div key={key}>
                          <h3 className="font-semibold mb-2 text-primary">{t[key as keyof typeof t]}</h3>
                          <div className="grid grid-cols-2 gap-3">
                              {items.map(item => (
                                  <div key={item} className="flex items-center space-x-2">
                                      <Checkbox 
                                        id={`${key}-${item}`} 
                                        checked={prefs[key]?.includes(item)}
                                        onCheckedChange={() => togglePref(key, item)}
                                      />
                                      <Label htmlFor={`${key}-${item}`} className="text-sm cursor-pointer">
                                          {t[item as keyof typeof t]}
                                      </Label>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
              
              <div className="pt-4 border-t mt-2">
                  <Button className="w-full" onClick={handleSave} disabled={loading}>
                      {loading ? '...' : t.save}
                  </Button>
              </div>
          </div>
      )
  }

  return (
      <div className="space-y-4">
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
             <Button variant="outline" onClick={() => setShowSettings(true)} size="sm" className="bg-white">
                 <Settings className="w-4 h-4 mr-2" />
                 {t.settings}
             </Button>
          </div>
          
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-gray-50 min-h-[300px]">
               {ideas.length === 0 ? (
                   <div className="text-center text-gray-500 mb-8 max-w-xs">
                       <Lightbulb className="w-16 h-16 mx-auto mb-4 text-yellow-400 opacity-50" />
                       <p className="text-lg font-medium">{t.noIdeas}</p>
                   </div>
               ) : (
                   <div className="w-full space-y-3 mb-6">
                       {ideas.map((idea, idx) => (
                           <Card key={idx} className="hover:shadow-md transition-shadow">
                               <CardContent className="p-4 flex justify-between items-center">
                                   <span className="font-medium text-lg">{idea}</span>
                                   <Button size="sm" onClick={() => onSelectIdea(idea)} className="ml-4">{t.useIdea}</Button>
                               </CardContent>
                           </Card>
                       ))}
                   </div>
               )}
               
               <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 text-lg shadow-lg">
                   {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Lightbulb className="w-5 h-5 mr-2" />}
                   {t.generateIdeas}
               </Button>
          </div>
      </div>
  )
}
