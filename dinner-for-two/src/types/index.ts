'use client'

export type DishStatus = 'proposed' | 'selected' | 'purchased'

export interface Ingredient {
  id: string
  dish_id: string
  name: string
  amount: number | string
  unit: string
  is_purchased: boolean
  created_at?: string
  dishIds?: string[]
  dishNames?: string[]
}

export interface ManualIngredient {
  id: string
  couple_id: string
  name: string
  amount?: string
  unit?: string
  is_purchased: boolean
  created_at?: string
}

export interface Dish {
  id: string
  couple_id: string
  name: string
  status: DishStatus
  dish_date?: string | null
  created_at?: string
  created_by?: string | number
  recipe?: string | null
  calories?: number | null
  ingredients?: Ingredient[]
}

export interface CouplePreferences {
  useAI?: boolean
  theme?: 'light' | 'dark'
  language?: 'en' | 'ru' | 'auto'
}

export interface Couple {
  id: string
  invite_code?: string
  status?: 'pending' | 'active'
  preferences?: CouplePreferences
  created_at?: string
}

export interface User {
  telegram_id: number
  first_name?: string
  username?: string
  photo_url?: string
  couple_id?: string | null
  created_at?: string
}

export interface ShoppingListItem {
  name: string
  amount: number
  unit: string
  ids: string[]
  is_purchased: boolean
  dishIds: string[]
  dishNames: string[]
  isManual: boolean
  manualId?: string
}

export type TabType = 'plan' | 'list' | 'ideas' | 'history'

export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
}

// Supabase Realtime channel type
export type RealtimeChannel = {
  on: (event: string, filter: Record<string, unknown>, callback: (payload: RealtimePayload<unknown>) => void) => RealtimeChannel
  subscribe: (callback: (status: string) => void) => void
  unsubscribe: () => void
}

// Drag and Drop types
export interface DragResult {
  draggableId: string
  type: string
  source: {
    droppableId: string
    index: number
  }
  destination?: {
    droppableId: string
    index: number
  } | null
  reason: string
}

// Droppable/Draggable provided props
export interface DroppableProvided {
  innerRef: (element: HTMLElement | null) => void
  droppableProps: Record<string, unknown>
  placeholder: React.ReactElement | null
}

export interface DraggableProvided {
  innerRef: (element: HTMLElement | null) => void
  draggableProps: Record<string, unknown>
  dragHandleProps: Record<string, unknown> | null
}


