import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function getUserFromSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  
  if (!token) {
    console.log('getUserFromSession: No session token found')
    return null
  }
  
  try {
    const secretKey = process.env.SUPABASE_JWT_SECRET
    if (!secretKey) {
      console.error('getUserFromSession: SUPABASE_JWT_SECRET is not set')
      return null
    }
    
    const secret = new TextEncoder().encode(secretKey)
    const { payload } = await jwtVerify(token, secret)
    return payload as { telegram_id: number; couple_id?: string }
  } catch (e) {
    console.error('getUserFromSession: Token verification failed', e)
    return null
  }
}

