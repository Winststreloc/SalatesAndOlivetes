/**
 * Validates if a dish name is related to food/cooking
 * Returns true if valid, false if invalid
 */

// Keywords that indicate the input is NOT about food
const INVALID_KEYWORDS = [
  // Technology
  'code', 'programming', 'javascript', 'python', 'html', 'css', 'react', 'node',
  'computer', 'laptop', 'phone', 'iphone', 'android', 'software', 'app', 'website',
  'код', 'программирование', 'компьютер', 'телефон', 'приложение', 'сайт',
  
  // General non-food
  'car', 'машина', 'автомобиль', 'house', 'дом', 'work', 'работа', 'job', 'работа',
  'money', 'деньги', 'buy', 'купить', 'sell', 'продать', 'help', 'помощь',
  'test', 'тест', 'hello', 'привет', 'hi', 'bye', 'пока',
  
  // Explicitly non-food requests
  'write', 'напиши', 'tell', 'расскажи', 'explain', 'объясни', 'how to', 'как',
  'what is', 'что такое', 'who is', 'кто такой', 'where', 'где', 'when', 'когда',
  
  // Spam/abuse
  'spam', 'реклама', 'advertisement', 'click', 'клик', 'link', 'ссылка',
  
  // Too short or meaningless
  'a', 'an', 'the', 'и', 'а', 'но', 'или',
  
  // Numbers only
  /^\d+$/
]

// Keywords that indicate the input IS about food
const FOOD_KEYWORDS = [
  // Cooking methods
  'cook', 'bake', 'fry', 'boil', 'grill', 'roast', 'steam', 'stew',
  'готовить', 'печь', 'жарить', 'варить', 'тушить', 'запекать',
  
  // Food categories
  'dish', 'meal', 'food', 'recipe', 'cuisine', 'dinner', 'lunch', 'breakfast',
  'блюдо', 'еда', 'рецепт', 'кухня', 'ужин', 'обед', 'завтрак',
  
  // Common ingredients
  'chicken', 'beef', 'pork', 'fish', 'rice', 'pasta', 'bread', 'salad',
  'курица', 'говядина', 'свинина', 'рыба', 'рис', 'макароны', 'хлеб', 'салат',
  
  // Cooking terms
  'soup', 'sauce', 'spice', 'herb', 'ingredient',
  'суп', 'соус', 'специя', 'приправа', 'ингредиент'
]

/**
 * Validates if a dish name is related to food
 */
export function isValidDishName(name: string): { valid: boolean; reason?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, reason: 'Empty or invalid input' }
  }
  
  const trimmed = name.trim()
  
  // Too short
  if (trimmed.length < 2) {
    return { valid: false, reason: 'Name too short' }
  }
  
  // Too long (likely not a dish name)
  if (trimmed.length > 100) {
    return { valid: false, reason: 'Name too long' }
  }
  
  const lower = trimmed.toLowerCase()
  
  // Check for invalid keywords
  for (const keyword of INVALID_KEYWORDS) {
    if (typeof keyword === 'string') {
      if (lower.includes(keyword.toLowerCase())) {
        // Check if it's actually a food-related word (e.g., "chicken" contains "code" but is valid)
        const isFoodRelated = FOOD_KEYWORDS.some(fk => lower.includes(fk.toLowerCase()))
        if (!isFoodRelated) {
          return { valid: false, reason: `Contains invalid keyword: ${keyword}` }
        }
      }
    } else if (keyword instanceof RegExp) {
      if (keyword.test(trimmed)) {
        return { valid: false, reason: 'Invalid format' }
      }
    }
  }
  
  // Check if it contains food-related keywords
  const hasFoodKeyword = FOOD_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()))
  
  // If it's very short and has no food keywords, it's probably invalid
  if (trimmed.length < 5 && !hasFoodKeyword) {
    // But allow common dish names
    const commonDishes = ['pizza', 'sushi', 'pasta', 'salad', 'soup', 'steak', 'burger',
                          'пицца', 'суши', 'паста', 'салат', 'суп', 'стейк', 'бургер']
    const isCommonDish = commonDishes.some(dish => lower.includes(dish))
    if (!isCommonDish) {
      return { valid: false, reason: 'Too short and not food-related' }
    }
  }
  
  // Check for suspicious patterns (questions, commands, etc.)
  const questionPatterns = [
    /^(what|how|when|where|why|who|что|как|когда|где|почему|кто)\s+/i,
    /^(tell|explain|write|напиши|расскажи|объясни)\s+/i,
    /\?$/, // Ends with question mark
  ]
  
  for (const pattern of questionPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'Looks like a question or command, not a dish name' }
    }
  }
  
  // If it passes all checks, it's probably valid
  return { valid: true }
}



