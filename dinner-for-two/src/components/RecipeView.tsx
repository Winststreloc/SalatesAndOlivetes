'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useLang } from './LanguageProvider'
import ReactMarkdown from 'react-markdown'
import { Textarea } from '@/components/ui/textarea'
import { useEffect, useState } from 'react'
import { IngredientForm } from './IngredientForm'
import { addDishIngredient, getDish } from '@/app/actions'
import { showToast } from '@/utils/toast'
import { handleError, createErrorContext } from '@/utils/errorHandler'
import { Plus } from 'lucide-react'

import { Dish, Ingredient } from '@/types'

export function RecipeView({ dish, isOpen, onClose, onSave, onIngredientAdded }: { dish: Dish | null, isOpen: boolean, onClose: () => void, onSave: (recipe: string) => Promise<void> | void, onIngredientAdded?: (updatedDish: Dish) => void }) {
  const { t } = useLang()
  const [editMode, setEditMode] = useState(false)
  const [recipeText, setRecipeText] = useState(dish?.recipe || '')
  const [saving, setSaving] = useState(false)
  const [showAddIngredient, setShowAddIngredient] = useState(false)
  const [addingIngredient, setAddingIngredient] = useState(false)
  
  useEffect(() => {
    if (dish && !editMode) {
      setRecipeText(dish.recipe || '')
    }
  }, [dish, editMode])
  
  if (!dish) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(recipeText)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAddIngredient = async (name: string, amount: string, unit: string) => {
    if (!dish?.id) return
    
    setAddingIngredient(true)
    try {
      await addDishIngredient(dish.id, name, amount, unit)
      // Fetch updated dish with new ingredient
      const updatedDish = await getDish(dish.id)
      if (updatedDish && onIngredientAdded) {
        onIngredientAdded(updatedDish)
      }
      setShowAddIngredient(false)
      showToast.success(t.addIngredientSuccess || 'Ingredient added successfully')
    } catch (error: unknown) {
      handleError(error, createErrorContext('handleAddIngredient', {
        type: 'DATABASE_ERROR',
        metadata: { dishId: dish.id, name, amount, unit },
        showToast: true,
      }))
    } finally {
      setAddingIngredient(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{dish.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
            {(dish.calories !== undefined && dish.calories !== null) || 
             (dish.proteins !== undefined && dish.proteins !== null) || 
             (dish.fats !== undefined && dish.fats !== null) || 
             (dish.carbs !== undefined && dish.carbs !== null) ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {dish.calories !== undefined && dish.calories !== null && (
                        <div className="text-muted-foreground">
                            {t.calories || 'Calories'}: <span className="font-semibold text-foreground">{dish.calories}</span> kcal
                        </div>
                    )}
                    {dish.proteins !== undefined && dish.proteins !== null && (
                        <div className="text-muted-foreground">
                            {t.proteins || 'Proteins'}: <span className="font-semibold text-foreground">{dish.proteins}</span> g
                        </div>
                    )}
                    {dish.fats !== undefined && dish.fats !== null && (
                        <div className="text-muted-foreground">
                            {t.fats || 'Fats'}: <span className="font-semibold text-foreground">{dish.fats}</span> g
                        </div>
                    )}
                    {dish.carbs !== undefined && dish.carbs !== null && (
                        <div className="text-muted-foreground">
                            {t.carbs || 'Carbs'}: <span className="font-semibold text-foreground">{dish.carbs}</span> g
                        </div>
                    )}
                </div>
            ) : null}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">Ingredients</h3>
                    {!showAddIngredient && (
                        <Button variant="ghost" size="sm" onClick={() => setShowAddIngredient(true)}>
                            <Plus className="w-4 h-4 mr-1" />
                            {t.addIngredient || 'Add Ingredient'}
                        </Button>
                    )}
                </div>
                {showAddIngredient ? (
                    <IngredientForm
                        onSubmit={handleAddIngredient}
                        onCancel={() => setShowAddIngredient(false)}
                    />
                ) : (
                    <ul className="list-disc pl-5 text-sm space-y-1 text-foreground">
                        {dish.ingredients && dish.ingredients.length > 0 ? (
                            dish.ingredients?.map((ing: Ingredient) => (
                                <li key={ing.id}>
                                    {ing.amount} {ing.unit} {ing.name}
                                </li>
                            ))
                        ) : (
                            <li className="text-muted-foreground italic">
                                {t.noIngredients || 'No ingredients yet'}
                            </li>
                        )}
                    </ul>
                )}
            </div>
            
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">Recipe</h3>
                    {!editMode ? (
                      <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                        {t.edit || 'Edit'}
                      </Button>
                    ) : null}
                </div>
                {editMode ? (
                  <div className="space-y-3">
                    <Textarea
                      value={recipeText}
                      onChange={(e) => setRecipeText(e.target.value)}
                      rows={10}
                      placeholder={t.recipePlaceholder || 'Describe how to cook this dish...'}
                      className="text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => { setRecipeText(dish.recipe || ''); setEditMode(false) }}>
                        {t.cancel || 'Cancel'}
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? t.saving || 'Saving...' : (t.save || 'Save')}
                      </Button>
                    </div>
                  </div>
                ) : dish.recipe ? (
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
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground italic">
                          {t.generating || 'Recipe not available yet...'}
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                        {t.add || 'Add'}
                      </Button>
                    </div>
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

