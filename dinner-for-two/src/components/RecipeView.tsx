'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useLang } from './LanguageProvider'

export function RecipeView({ dish, isOpen, onClose }: { dish: any, isOpen: boolean, onClose: () => void }) {
  const { t } = useLang()
  
  if (!dish) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{dish.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
            <div>
                <h3 className="font-semibold mb-2">Ingredients</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                    {dish.ingredients?.map((ing: any) => (
                        <li key={ing.id}>
                            {ing.amount} {ing.unit} {ing.name}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div>
                <h3 className="font-semibold mb-2">Recipe</h3>
                {dish.recipe ? (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
                        {dish.recipe}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 italic">
                        {t.generating || 'Recipe not available yet...'}
                    </p>
                )}
            </div>
        </div>
        
        <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>{t.close}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

