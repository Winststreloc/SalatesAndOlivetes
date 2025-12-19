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
        openTelegramLink: (url: string) => void
      }
    }
  }
}

interface User {
  id: number // This is the telegram_id
  first_name: string
  username?: string
}

interface AuthContextType {
  user: User | null
  coupleId: string | null
  isLoading: boolean
  createCouple: () => Promise<any>
  joinCouple: (code: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const allowLocalDev = process.env.NEXT_PUBLIC_ALLOW_LOCAL_DEV === 'true'
  const devUser: User = {
    id: Number(process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID) || 0,
    first_name: 'Dev User',
    username: 'dev',
  }
  const devCouple = process.env.NEXT_PUBLIC_DEV_COUPLE_ID || 'dev-couple'

  useEffect(() => {
    const initAuth = async () => {
      let nextUser: User | null = null
      let nextCouple: string | null = null

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
              nextUser = data.user
              nextCouple = data.couple_id
            }
          } catch (e) {
            console.error('Auth check failed', e)
          }
        }
      } else {
        console.log('Telegram WebApp not detected')
      }

      // Dev bypass: allow running UI locally without Telegram shell OR when Telegram auth failed/absent
      if (!nextUser && allowLocalDev) {
        nextUser = devUser
      }
      if (allowLocalDev && !nextCouple) {
        nextCouple = devCouple
      }

      if (nextUser) setUser(nextUser)
      if (nextCouple) setCoupleId(nextCouple)
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

  const logout = async () => {
    try {
      // Call API to delete session cookie
      await fetch('/api/auth/logout', { method: 'POST' })
      
      // Clear coupleId to show PairingScreen
      setCoupleId(null)
      
      // Re-authenticate if still in Telegram to get fresh session without couple_id
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        const initData = window.Telegram.WebApp.initData
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData })
          })
          
          if (res.ok) {
            const data = await res.json()
            setUser(data.user)
            setCoupleId(data.couple_id || null) // Should be null after logout
          }
        } catch (e) {
          console.error('Re-auth after logout failed', e)
          // Clear user if re-auth fails
          setUser(null)
        }
      } else {
        // Not in Telegram, clear user
        setUser(null)
      }
    } catch (e) {
      console.error('Logout failed', e)
      // Even if API call fails, clear coupleId
      setCoupleId(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, coupleId, isLoading, createCouple, joinCouple, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)


