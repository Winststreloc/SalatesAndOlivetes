'use client'

import React, { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

// Use Sentry's official ErrorBoundary with custom fallback
export function ErrorBoundary({ children, fallback }: Props) {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            An unexpected error occurred. The error has been reported.
          </p>
          <Button
            onClick={() => {
              window.location.reload()
            }}
            className="w-full"
          >
            Reload Page
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const fallbackRender: Sentry.FallbackRender = ({ error, resetError }) => {
    if (fallback) {
      return <>{fallback}</>
    }
    return defaultFallback
  }

  return (
    <Sentry.ErrorBoundary
      fallback={fallbackRender}
      beforeCapture={(scope, error, errorInfo) => {
        // Check for React infinite loop errors (error #310)
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined
        const componentStack = errorInfo && typeof errorInfo === 'object' && 'componentStack' in errorInfo
          ? String((errorInfo as any).componentStack)
          : undefined
        
        const isReactError = errorMessage?.includes('Minified React error') || 
                            errorMessage?.includes('Maximum update depth exceeded') ||
                            componentStack?.includes('useEffect')
        
        scope.setTag('errorBoundary', true)
        scope.setTag('react_error', isReactError)
        scope.setTag('error_type', isReactError ? 'infinite_loop' : 'unknown')
        
        if (componentStack) {
          scope.setContext('react', {
            componentStack: componentStack,
          })
        }
        
        scope.setExtra('errorInfo', errorInfo)
        scope.setExtra('errorMessage', errorMessage)
        if (errorStack) {
          scope.setExtra('errorStack', errorStack)
        }
        
        console.error('🔴 ErrorBoundary caught an error:', error, errorInfo)
        console.log('📤 Sending error to Sentry via ErrorBoundary...')
      }}
      showDialog={false}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}

