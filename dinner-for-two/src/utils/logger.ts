/**
 * Development logger utility
 * Provides structured logging for development with different log levels
 */

const isDev = process.env.NODE_ENV === 'development'

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: any
}

/**
 * Structured logger for development
 */
export const logger = {
  log: (message: string, context?: LogContext) => {
    if (isDev) {
      console.log(`[LOG] ${message}`, context || '')
    }
  },
  
  info: (message: string, context?: LogContext) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, context || '')
    }
  },
  
  warn: (message: string, context?: LogContext) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, context || '')
    }
  },
  
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        ...context,
      })
    }
  },
  
  debug: (message: string, context?: LogContext) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, context || '')
    }
  },
  
  /**
   * Log API requests/responses
   */
  api: (method: string, url: string, data?: any, response?: any) => {
    if (isDev) {
      console.group(`[API] ${method} ${url}`)
      if (data) console.log('Request:', data)
      if (response) console.log('Response:', response)
      console.groupEnd()
    }
  },
  
  /**
   * Log component lifecycle events
   */
  component: (componentName: string, event: string, props?: any) => {
    if (isDev) {
      console.log(`[COMPONENT] ${componentName}: ${event}`, props || '')
    }
  },
  
  /**
   * Log state changes
   */
  state: (componentName: string, stateName: string, oldValue: any, newValue: any) => {
    if (isDev) {
      console.log(`[STATE] ${componentName}.${stateName}:`, {
        from: oldValue,
        to: newValue,
      })
    }
  },
}

