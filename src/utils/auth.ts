import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function getUserFromSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  
  if (!token) return null
  
  try {
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET || 'default-secret-do-not-use-in-prod')
    const { payload } = await jwtVerify(token, secret)
    return payload as { telegram_id: number; couple_id?: string }
  } catch (e) {
    return null
  }
}


