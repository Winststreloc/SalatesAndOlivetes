'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Script from 'next/script'

// Add types for Telegram WebApp
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string
        initDataUnsafe: any
        ready: () => void
        expand: () => void
      }
    }
  }
}

interface User {
  id: number
  first_name: string
  username?: string
}

interface AuthContextType {
  user: User | null
  coupleId: string | null
  isLoading: boolean
  createCouple: () => Promise<any>
  joinCouple: (code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      // Check if running in Telegram WebApp
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready()
        const initData = window.Telegram.WebApp.initData
        
        if (initData) {
          try {
            const res = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData })
            })
            
            if (res.ok) {
              const data = await res.json()
              setUser(data.user)
              setCoupleId(data.couple_id)
            }
          } catch (e) {
            console.error('Auth check failed', e)
          }
        }
      } else {
        console.log('Telegram WebApp not detected')
        // For development, we might mock auth here if needed
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const createCouple = async () => {
    const res = await fetch('/api/couples/create', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setCoupleId(data.couple.id)
      return data.couple
    }
  }

  const joinCouple = async (code: string) => {
     const res = await fetch('/api/couples/join', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code })
     })
     if (res.ok) {
       const data = await res.json()
       setCoupleId(data.couple.id)
     } else {
       throw new Error('Failed to join')
     }
  }

  return (
    <AuthContext.Provider value={{ user, coupleId, isLoading, createCouple, joinCouple }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)


