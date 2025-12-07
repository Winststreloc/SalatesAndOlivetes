import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/utils/auth'
import { createServerSideClient } from '@/lib/supabase-server'
import { SignJWT } from 'jose'

export async function POST(request: Request) {
  const { invite_code } = await request.json()
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (user.couple_id) return NextResponse.json({ error: 'Already in a couple' }, { status: 400 })

  const supabase = await createServerSideClient()
  
  // Find couple
  const { data: couple } = await supabase
    .from('couples')
    .select()
    .eq('invite_code', invite_code)
    .single()
    
  if (!couple) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  
  // Update user
  await supabase
    .from('users')
    .update({ couple_id: couple.id })
    .eq('telegram_id', user.telegram_id)

  // Update couple status
  await supabase
    .from('couples')
    .update({ status: 'active' })
    .eq('id', couple.id)

  // Update session cookie
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET || 'default-secret-do-not-use-in-prod')
  const token = await new SignJWT({ telegram_id: user.telegram_id, couple_id: couple.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)

  const response = NextResponse.json({ success: true, couple })
  response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
  })

  return response
}


