'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLang } from './LanguageProvider'

interface GlobalSearchProps {
  dishes: any[]
  ingredients: any[]
  onSelectDish?: (dish: any) => void
  onSelectIngredient?: (ingredient: any) => void
  isOpen: boolean
  onClose: () => void
}

export function GlobalSearch({ dishes, ingredients, onSelectDish, onSelectIngredient, isOpen, onClose }: GlobalSearchProps) {
  const { t } = useLang()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return { dishes: [], ingredients: [] }

    const lowerQuery = query.toLowerCase()
    
    const matchingDishes = dishes.filter(dish => 
      dish.name.toLowerCase().includes(lowerQuery) ||
      dish.recipe?.toLowerCase().includes(lowerQuery)
    )

    const matchingIngredients = ingredients.filter(ing => 
      ing.name.toLowerCase().includes(lowerQuery)
    )

    return { dishes: matchingDishes, ingredients: matchingIngredients }
  }, [query, dishes, ingredients])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-20">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search || 'Search...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {!query.trim() ? (
            <p className="text-muted-foreground text-center py-8">{t.search || 'Start typing to search...'}</p>
          ) : (
            <div className="space-y-4">
              {results.dishes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">{t.planMenu || 'Dishes'}</h3>
                  <div className="space-y-2">
                    {results.dishes.map(dish => (
                      <button
                        key={dish.id}
                        onClick={() => {
                          onSelectDish?.(dish)
                          onClose()
                        }}
                        className="w-full text-left p-3 bg-muted rounded hover:bg-muted/80 transition-colors"
                      >
                        <div className="font-medium text-foreground">{dish.name}</div>
                        {dish.recipe && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {dish.recipe.substring(0, 100)}...
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.ingredients.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-2">{t.shoppingList || 'Ingredients'}</h3>
                  <div className="space-y-2">
                    {results.ingredients.map((ing, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onSelectIngredient?.(ing)
                          onClose()
                        }}
                        className="w-full text-left p-3 bg-muted rounded hover:bg-muted/80 transition-colors"
                      >
                        <div className="font-medium text-foreground">{ing.name}</div>
                        {ing.amount && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {ing.amount} {ing.unit || ''}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.dishes.length === 0 && results.ingredients.length === 0 && (
                <p className="text-muted-foreground text-center py-8">{t.noResults || 'No results found'}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

