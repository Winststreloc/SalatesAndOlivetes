'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Plus, Download, Share2, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { IngredientForm } from '../IngredientForm'
import { useLang } from '../LanguageProvider'
import { useShoppingList } from '@/hooks/useShoppingList'
import { Dish, ShoppingListItem, ManualIngredient } from '@/types'
import { IngredientCategory, CategorizedIngredient, groupByCategory } from '@/utils/ingredientCategories'
import { toggleIngredientsPurchased, addManualIngredient, updateManualIngredient, deleteManualIngredient, deleteIngredient, updateIngredient } from '@/app/actions'
import { showToast } from '@/utils/toast'

interface ShoppingListTabProps {
  dishes: Dish[]
  manualIngredients: ManualIngredient[]
  searchQuery: string
  sortBy: 'alphabetical' | 'category' | 'amount'
  showPurchasedItems: Record<string, boolean>
  editingIngredient: { id: string, type: 'dish' | 'manual', name: string, amount: string, unit: string } | null
  showAddIngredient: boolean
  onSearchQueryChange: (query: string) => void
  onSortByChange: (sortBy: 'alphabetical' | 'category' | 'amount') => void
  onShowPurchasedItemsChange: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  onEditingIngredientChange: (ingredient: { id: string, type: 'dish' | 'manual', name: string, amount: string, unit: string } | null) => void
  onShowAddIngredientChange: (show: boolean) => void
  onToggleIngredient: (item: ShoppingListItem) => Promise<void>
  onDeleteIngredient: (item: ShoppingListItem, onConfirm: () => Promise<void>) => void
  onUpdateIngredient: (item: ShoppingListItem, name: string, amount: string, unit: string) => Promise<void>
  onAddManualIngredient: (name: string, amount: string, unit: string) => Promise<void>
  onExportText: () => void
  onExportTelegram: () => void
  onSelectDish: (dish: Dish) => void
  onSetTab: (tab: 'plan' | 'list' | 'ideas' | 'history') => void
}

export function ShoppingListTab({
  dishes,
  manualIngredients,
  searchQuery,
  sortBy,
  showPurchasedItems,
  editingIngredient,
  showAddIngredient,
  onSearchQueryChange,
  onSortByChange,
  onShowPurchasedItemsChange,
  onEditingIngredientChange,
  onShowAddIngredientChange,
  onToggleIngredient,
  onDeleteIngredient,
  onUpdateIngredient,
  onAddManualIngredient,
  onExportText,
  onExportTelegram,
  onSelectDish,
  onSetTab
}: ShoppingListTabProps) {
  const { t } = useLang()
  const { shoppingList: baseShoppingList, categorizedList: baseCategorizedList } = useShoppingList(dishes, manualIngredients)

  // Apply search filter
  const shoppingList = useMemo(() => {
    if (!searchQuery.trim()) return baseShoppingList
    const query = searchQuery.toLowerCase()
    return baseShoppingList.filter(item => item.name.toLowerCase().includes(query))
  }, [baseShoppingList, searchQuery])

  // Apply sorting and separate by purchase status
  const sortedShoppingList = useMemo(() => {
    const unpurchased = shoppingList.filter(item => !item.is_purchased)
    const purchased = shoppingList.filter(item => item.is_purchased)
    
    const sortItems = (itemsToSort: ShoppingListItem[]) => {
      if (sortBy === 'alphabetical') {
        return [...itemsToSort].sort((a, b) => a.name.localeCompare(b.name))
      } else if (sortBy === 'amount') {
        return [...itemsToSort].sort((a, b) => b.amount - a.amount)
      }
      return itemsToSort
    }
    
    return [...sortItems(unpurchased), ...sortItems(purchased)]
  }, [shoppingList, sortBy])

  // Categorized list with sorting
  const categorizedList = useMemo(() => {
    const result: Record<IngredientCategory, CategorizedIngredient[]> = {
      vegetables: [],
      fruits: [],
      meat: [],
      dairy: [],
      bakery: [],
      pantry: [],
      spices: [],
      other: []
    }
    
    Object.keys(baseCategorizedList).forEach(cat => {
      const category = cat as IngredientCategory
      const items = baseCategorizedList[category]
      const unpurchased = items.filter(item => !item.is_purchased)
      const purchased = items.filter(item => item.is_purchased)
      
      // When sorting by category, sort items within each category alphabetically by default
      // When sorting by alphabetical/amount, still group by category but sort within
      if (sortBy === 'alphabetical' || sortBy === 'category') {
        unpurchased.sort((a, b) => a.name.localeCompare(b.name))
        purchased.sort((a, b) => a.name.localeCompare(b.name))
      } else if (sortBy === 'amount') {
        unpurchased.sort((a, b) => b.amount - a.amount)
        purchased.sort((a, b) => b.amount - a.amount)
      }
      
      result[category] = [...unpurchased, ...purchased]
    })
    
    return result
  }, [baseCategorizedList, sortBy])

  const categoryLabels: Record<IngredientCategory, string> = {
    vegetables: t.categoryVegetables,
    fruits: t.categoryFruits,
    meat: t.categoryMeat,
    dairy: t.categoryDairy,
    bakery: t.categoryBakery,
    pantry: t.categoryPantry,
    spices: t.categorySpices,
    other: t.categoryOther
  }
  
  const categoryOrder: IngredientCategory[] = ['vegetables', 'fruits', 'meat', 'dairy', 'bakery', 'pantry', 'spices', 'other']

  if (shoppingList.length === 0) {
    return <p className="text-muted-foreground text-center mt-10">{t.selectDishesHint}</p>
  }

  const renderIngredientItem = (
    item: ShoppingListItem | CategorizedIngredient,
    itemKey: string,
    isPurchased: boolean = false
  ) => {
    const isEditing = editingIngredient?.id === itemKey
    
    if (isEditing) {
      return (
        <IngredientForm
          initialName={item.name}
          initialAmount={String(item.amount)}
          initialUnit={item.unit}
          onSubmit={(name, amount, unit) => onUpdateIngredient(item as ShoppingListItem, name, amount, unit)}
          onCancel={() => onEditingIngredientChange(null)}
        />
      )
    }

    return (
      <div className={`p-3 bg-card rounded shadow-sm border border-border ${isPurchased ? 'opacity-75' : ''}`}>
        <div className="flex items-start space-x-3">
          <Checkbox 
            id={`ing-${itemKey}`} 
            checked={item.is_purchased}
            onCheckedChange={() => onToggleIngredient(item as ShoppingListItem)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <label htmlFor={`ing-${itemKey}`} className={`flex-1 cursor-pointer ${item.is_purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{item.name}</span>
                  {item.isManual && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{t.manualIngredient}</span>
                  )}
                  <span className="text-muted-foreground">
                    {item.amount > 0 ? `${parseFloat(item.amount.toFixed(2))} ${item.unit || ''}` : ''}
                  </span>
                </div>
              </label>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => onEditingIngredientChange({ 
                    id: itemKey, 
                    type: item.isManual ? 'manual' : 'dish', 
                    name: item.name, 
                    amount: String(item.amount), 
                    unit: item.unit 
                  })}
                  className="text-muted-foreground hover:text-blue-500 p-1"
                  title={t.editIngredient}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteIngredient(item as ShoppingListItem, async () => {
                    if (item.ids && item.ids.length > 0) {
                      for (const id of item.ids) {
                        await deleteIngredient(id)
                      }
                    }
                    if (item.manualId) {
                      await deleteManualIngredient(item.manualId)
                    }
                    showToast.success(t.deleteIngredientSuccess || 'Ingredient deleted successfully')
                  })}
                  className="text-muted-foreground hover:text-red-500 p-1"
                  title={t.deleteIngredient}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {item.dishNames && item.dishNames.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">{t.forDishes}: </span>
                {item.dishNames.map((dishName: string, i: number) => {
                  const dish = dishes.find(d => d.name === dishName && d.status === 'selected' && (item.dishIds?.includes(d.id) ?? false))
                  return dish ? (
                    <button
                      key={i}
                      onClick={() => {
                        onSelectDish(dish)
                        onSetTab('plan')
                      }}
                      className="text-blue-500 hover:underline mr-1"
                    >
                      {dishName}{i < (item.dishNames?.length ?? 0) - 1 ? ', ' : ''}
                    </button>
                  ) : (
                    <span key={i} className="mr-1">{dishName}{i < (item.dishNames?.length ?? 0) - 1 ? ', ' : ''}</span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as 'alphabetical' | 'category' | 'amount')}
          className="w-auto min-w-[140px]"
        >
          <option value="category">{t.sortCategory}</option>
          <option value="alphabetical">{t.sortAlphabetical}</option>
          <option value="amount">{t.sortAmount}</option>
        </Select>
      </div>
      
      {/* Add Ingredient Button */}
      <div className="mb-4">
        {showAddIngredient ? (
          <IngredientForm
            onSubmit={onAddManualIngredient}
            onCancel={() => onShowAddIngredientChange(false)}
          />
        ) : (
          <Button variant="outline" size="sm" onClick={() => onShowAddIngredientChange(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {t.addIngredient}
          </Button>
        )}
      </div>
      
      {/* Export Buttons */}
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={onExportText} className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          {t.exportAsText}
        </Button>
        <Button variant="outline" size="sm" onClick={onExportTelegram} className="flex-1">
          <Share2 className="w-4 h-4 mr-2" />
          {t.exportAsTelegram}
        </Button>
      </div>
      
      {/* Grouped by Category */}
      {sortBy === 'category' ? (
        categoryOrder.map(category => {
          const items = categorizedList[category]
          if (items.length === 0) return null
          
          const unpurchased = items.filter(item => !item.is_purchased)
          const purchased = items.filter(item => item.is_purchased)
          
          return (
            <div key={category} className="mb-4">
              <h3 className="font-semibold text-sm text-foreground mb-2 px-2">
                {categoryLabels[category]}
              </h3>
              
              {/* Unpurchased items */}
              {unpurchased.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-foreground mb-1 px-2 opacity-70">
                    {t.toBuy}
                  </h4>
                  <div className="space-y-2">
                    {unpurchased.map((item, idx) => (
                      <div key={`${category}-${idx}`}>
                        {renderIngredientItem(item, `${category}-${idx}`, false)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Purchased items */}
              {purchased.length > 0 && (
                <div className="mb-3">
                  <button
                    onClick={() => onShowPurchasedItemsChange(prev => ({ ...prev, [category]: !prev[category] }))}
                    className="flex items-center justify-between w-full px-2 py-1 text-xs font-medium text-muted-foreground opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <span>{t.purchased} ({purchased.length})</span>
                    {showPurchasedItems[category] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {showPurchasedItems[category] && (
                    <div className="space-y-2 mt-1">
                      {purchased.map((item, idx) => (
                        <div key={`${category}-purchased-${idx}`}>
                          {renderIngredientItem(item, `${category}-purchased-${idx}`, true)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      ) : (
        /* Flat list for alphabetical/amount sorting */
        <>
          {/* Unpurchased items */}
          {sortedShoppingList.filter(item => !item.is_purchased).length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-foreground mb-2 px-2">
                {t.toBuy}
              </h3>
              <div className="space-y-2">
                {sortedShoppingList.filter(item => !item.is_purchased).map((item, idx) => (
                  <div key={idx}>
                    {renderIngredientItem(item, String(idx), false)}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Purchased items */}
          {sortedShoppingList.filter(item => item.is_purchased).length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => onShowPurchasedItemsChange(prev => ({ ...prev, 'flat-list': !prev['flat-list'] }))}
                className="flex items-center justify-between w-full px-2 py-2 text-sm font-semibold text-muted-foreground opacity-70 hover:opacity-100 transition-opacity"
              >
                <span>{t.purchased} ({sortedShoppingList.filter(item => item.is_purchased).length})</span>
                {showPurchasedItems['flat-list'] ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showPurchasedItems['flat-list'] && (
                <div className="space-y-2 mt-2">
                  {sortedShoppingList.filter(item => item.is_purchased).map((item, idx) => (
                    <div key={`purchased-${idx}`}>
                      {renderIngredientItem(item, `purchased-${idx}`, true)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

