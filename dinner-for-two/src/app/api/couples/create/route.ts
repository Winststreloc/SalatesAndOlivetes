import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/utils/auth'
import { createServerSideClient } from '@/lib/supabase-server'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

export async function POST() {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (user.couple_id) {
     return NextResponse.json({ error: 'Already in a couple' }, { status: 400 })
  }

  const supabase = await createServerSideClient()
  
  // Create couple
  const { data: couple, error } = await supabase
    .from('couples')
    .insert({})
    .select()
    .single()
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  // Update user in DB
  await supabase
    .from('users')
    .update({ couple_id: couple.id })
    .eq('telegram_id', user.telegram_id)
    
  // Update session cookie with new couple_id
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET || 'default-secret-do-not-use-in-prod')
  const token = await new SignJWT({ telegram_id: user.telegram_id, couple_id: couple.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)

  const response = NextResponse.json({ couple })
  response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
  })

  return response
}

