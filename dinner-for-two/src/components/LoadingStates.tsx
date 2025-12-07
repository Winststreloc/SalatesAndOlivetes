'use client'

import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function DishSkeleton() {
  return (
    <div className="border border-border rounded p-3 bg-card animate-pulse">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="h-4 w-24 mt-2" />
    </div>
  )
}

export function IngredientSkeleton() {
  return (
    <div className="p-3 bg-card rounded shadow-sm border border-border">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

export function LoadingSpinner({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8'
  }

  return (
    <div className="flex justify-center items-center p-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-muted-foreground`} />
    </div>
  )
}

export function ProgressBar({ progress, label }: { progress: number, label?: string }) {
  return (
    <div className="w-full">
      {label && <p className="text-sm text-muted-foreground mb-1">{label}</p>}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className="bg-primary h-2 transition-all duration-300 rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

