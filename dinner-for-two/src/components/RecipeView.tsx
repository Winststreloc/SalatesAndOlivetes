'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useLang } from './LanguageProvider'
import ReactMarkdown from 'react-markdown'

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
                <h3 className="font-semibold mb-2 text-foreground">Ingredients</h3>
                <ul className="list-disc pl-5 text-sm space-y-1 text-foreground">
                    {dish.ingredients?.map((ing: any) => (
                        <li key={ing.id}>
                            {ing.amount} {ing.unit} {ing.name}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div>
                <h3 className="font-semibold mb-2 text-foreground">Recipe</h3>
                {dish.recipe ? (
                    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => <p className="mb-3 text-foreground">{children}</p>,
                                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 text-foreground">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 text-foreground">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 text-foreground">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="text-foreground">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                                code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 border-muted-foreground pl-4 italic text-muted-foreground my-2">{children}</blockquote>,
                            }}
                        >
                            {dish.recipe}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">
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

