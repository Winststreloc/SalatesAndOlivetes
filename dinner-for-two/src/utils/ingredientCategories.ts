// Utility to categorize ingredients for shopping list grouping

export type IngredientCategory = 
  | 'vegetables'
  | 'fruits'
  | 'meat'
  | 'dairy'
  | 'bakery'
  | 'pantry'
  | 'spices'
  | 'other'

export interface CategorizedIngredient {
  name: string
  amount: number
  unit: string
  ids: string[]
  is_purchased: boolean
  category: IngredientCategory
  dishIds?: string[]
  dishNames?: string[]
  isManual?: boolean
  manualId?: string
}

// Keywords for categorization (case-insensitive matching)
const CATEGORY_KEYWORDS: Record<IngredientCategory, string[]> = {
  vegetables: [
    'помидор', 'томат', 'огурец', 'перец', 'брокколи', 'кабачок', 'баклажан', 'гриб',
    'лук', 'чеснок', 'морковь', 'картофель', 'капуста', 'салат', 'шпинат', 'кабачок',
    'tomato', 'cucumber', 'pepper', 'broccoli', 'zucchini', 'eggplant', 'mushroom',
    'onion', 'garlic', 'carrot', 'potato', 'cabbage', 'lettuce', 'spinach'
  ],
  fruits: [
    'яблоко', 'банан', 'апельсин', 'лимон', 'груша', 'виноград', 'ягода',
    'apple', 'banana', 'orange', 'lemon', 'pear', 'grape', 'berry'
  ],
  meat: [
    'мясо', 'курица', 'говядина', 'свинина', 'индейка', 'рыба', 'морепродукт', 'фарш',
    'chicken', 'beef', 'pork', 'turkey', 'fish', 'seafood', 'meat', 'mince'
  ],
  dairy: [
    'молоко', 'сыр', 'творог', 'сметана', 'йогурт', 'масло', 'сливки',
    'milk', 'cheese', 'cottage', 'sour cream', 'yogurt', 'butter', 'cream'
  ],
  bakery: [
    'хлеб', 'булка', 'батон', 'хлебцы',
    'bread', 'bun', 'loaf', 'roll'
  ],
  pantry: [
    'макароны', 'рис', 'гречка', 'мука', 'сахар', 'масло растительное', 'уксус',
    'pasta', 'rice', 'buckwheat', 'flour', 'sugar', 'oil', 'vinegar'
  ],
  spices: [
    'соль', 'перец', 'специя', 'приправа', 'паприка', 'куркума', 'кориандр',
    'salt', 'pepper', 'spice', 'seasoning', 'paprika', 'turmeric', 'coriander'
  ],
  other: []
}

export function categorizeIngredient(name: string, lang: 'en' | 'ru' = 'ru'): IngredientCategory {
  const lowerName = name.toLowerCase().trim()
  
  // Check each category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'other') continue
    
    for (const keyword of keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return category as IngredientCategory
      }
    }
  }
  
  return 'other'
}

export function groupByCategory(items: Array<{ name: string, amount: number, unit: string, ids: string[], is_purchased: boolean }>): Record<IngredientCategory, CategorizedIngredient[]> {
  const categorized: Record<IngredientCategory, CategorizedIngredient[]> = {
    vegetables: [],
    fruits: [],
    meat: [],
    dairy: [],
    bakery: [],
    pantry: [],
    spices: [],
    other: []
  }
  
  items.forEach(item => {
    const category = categorizeIngredient(item.name)
    categorized[category].push({
      ...item,
      category
    })
  })
  
  // Sort each category alphabetically
  Object.keys(categorized).forEach(cat => {
    categorized[cat as IngredientCategory].sort((a, b) => a.name.localeCompare(b.name))
  })
  
  return categorized
}

