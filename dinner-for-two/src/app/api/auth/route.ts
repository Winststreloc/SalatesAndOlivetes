import { NextResponse } from 'next/server'
import { validateTelegramWebAppData } from '@/utils/telegram'
import { createServerSideClient } from '@/lib/supabase-server'
import { SignJWT } from 'jose'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { initData } = body

    if (!initData) {
      console.error('Auth Error: No initData provided')
      return NextResponse.json({ error: 'No initData provided' }, { status: 400 })
    }

    console.log('Validating initData...') // Log start of validation
    const validation = validateTelegramWebAppData(initData)
    
    if (!validation) {
      console.error('Auth Error: Validation failed. Token:', process.env.TELEGRAM_BOT_TOKEN?.slice(0, 5) + '...')
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 })
    }

    const { user } = validation
    console.log('User validated:', user.id, user.first_name)

    const supabase = await createServerSideClient()
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        telegram_id: user.id,
        first_name: user.first_name,
        username: user.username,
        photo_url: user.photo_url,
      })

    if (upsertError) {
      console.error('Database Error upserting user:', upsertError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    const { data: userData } = await supabase
        .from('users')
        .select('couple_id')
        .eq('telegram_id', user.id)
        .single()

    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET || 'default-secret-do-not-use-in-prod')
    const token = await new SignJWT({ telegram_id: user.id, couple_id: userData?.couple_id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)

    const response = NextResponse.json({ success: true, user, couple_id: userData?.couple_id })
    
    response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    })

    return response

  } catch (e) {
    console.error('Auth Internal Error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
