/**
 * Centralized error handling utility
 * All errors should be processed through this handler for consistent logging and user feedback
 */

import * as Sentry from '@sentry/nextjs'
import { showToast } from './toast'

export type ErrorType = 
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'AI_ERROR'
  | 'NETWORK_ERROR'
  | 'REALTIME_ERROR'
  | 'UNKNOWN_ERROR'

export interface ErrorContext {
  action?: string // название действия (например, 'addDish', 'generateIngredients')
  userId?: string
  coupleId?: string
  metadata?: Record<string, any> // дополнительная информация
  showToast?: boolean // показывать ли toast пользователю
  severity?: 'error' | 'warning' | 'info'
  type?: ErrorType // тип ошибки для классификации
}

/**
 * Centralized error handler
 * Logs errors to Sentry and optionally shows toast notifications to users
 */
export function handleError(
  error: Error | unknown,
  context?: ErrorContext
): { message: string; type: ErrorType } {
  // Extract error message
  let errorMessage = 'An unexpected error occurred'
  let errorType: ErrorType = context?.type || 'UNKNOWN_ERROR'

  if (error instanceof Error) {
    errorMessage = error.message
  } else if (typeof error === 'string') {
    errorMessage = error
  }

  // Classify error type if not provided
  if (!context?.type) {
    const lowerMessage = errorMessage.toLowerCase()
    
    if (
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('please log in') ||
      lowerMessage.includes('please create or join')
    ) {
      errorType = 'AUTH_ERROR'
    } else if (
      lowerMessage.includes('valid dish name') ||
      lowerMessage.includes('invalid_input') ||
      lowerMessage.includes('не название блюда') ||
      lowerMessage.includes('validation')
    ) {
      errorType = 'VALIDATION_ERROR'
    } else if (
      lowerMessage.includes('database') ||
      lowerMessage.includes('supabase') ||
      lowerMessage.includes('sql') ||
      lowerMessage.includes('row-level security')
    ) {
      errorType = 'DATABASE_ERROR'
    } else if (
      lowerMessage.includes('ai generation') ||
      lowerMessage.includes('gemini') ||
      lowerMessage.includes('openai') ||
      lowerMessage.includes('api key')
    ) {
      errorType = 'AI_ERROR'
    } else if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('websocket') ||
      lowerMessage.includes('realtime')
    ) {
      errorType = 'NETWORK_ERROR'
    }
  } else {
    errorType = context.type
  }

  // Log to Sentry with context
  Sentry.captureException(error, {
    tags: {
      errorType,
      action: context?.action || 'unknown',
    },
    contexts: {
      error: {
        type: errorType,
        action: context?.action,
        userId: context?.userId,
        coupleId: context?.coupleId,
        ...context?.metadata,
      },
    },
    level: context?.severity === 'warning' ? 'warning' : 
          context?.severity === 'info' ? 'info' : 'error',
  })

  // Show toast to user if requested (default: true for errors, false for warnings/info)
  if (context?.showToast !== false && context?.severity !== 'info') {
    const userMessage = getUserFriendlyMessage(errorMessage, errorType)
    if (context?.severity === 'warning') {
      showToast.warning(userMessage)
    } else {
      showToast.error(userMessage)
    }
  }

  return {
    message: errorMessage,
    type: errorType,
  }
}

/**
 * Get user-friendly error message based on error type
 */
function getUserFriendlyMessage(message: string, type: ErrorType): string {
  const lowerMessage = message.toLowerCase()

  switch (type) {
    case 'AUTH_ERROR':
      if (lowerMessage.includes('please log in')) {
        return 'Please log in to continue'
      }
      if (lowerMessage.includes('please create or join')) {
        return 'Please create or join a couple first'
      }
      return 'Authentication error. Please try again.'

    case 'VALIDATION_ERROR':
      return message // AI validation errors already have user-friendly messages

    case 'DATABASE_ERROR':
      return 'Database error. Please try again later.'

    case 'AI_ERROR':
      if (lowerMessage.includes('api key') || lowerMessage.includes('quota')) {
        return 'AI service temporarily unavailable. Please try again later.'
      }
      return 'Failed to generate content. Please try again.'

    case 'NETWORK_ERROR':
    case 'REALTIME_ERROR':
      return 'Connection error. Please check your internet connection.'

    default:
      return 'Something went wrong. Please try again.'
  }
}

/**
 * Helper to create error context
 */
export function createErrorContext(
  action: string,
  options?: Partial<ErrorContext>
): ErrorContext {
  return {
    action,
    showToast: true,
    severity: 'error',
    ...options,
  }
}



