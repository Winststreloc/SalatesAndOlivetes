import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserFromSession } from '@/utils/auth'
import { createServerSideClient } from '@/lib/supabase-server'

export async function POST() {
  const user = await getUserFromSession()
  
  // If user exists, remove them from couple in database
  if (user && user.telegram_id) {
    const supabase = await createServerSideClient()
    await supabase
      .from('users')
      .update({ couple_id: null })
      .eq('telegram_id', user.telegram_id)
  }
  
  // Delete session cookie
  const cookieStore = await cookies()
  cookieStore.delete('session')
  
  return NextResponse.json({ success: true })
}

