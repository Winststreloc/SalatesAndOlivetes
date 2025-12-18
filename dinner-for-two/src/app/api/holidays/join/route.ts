import { NextResponse } from 'next/server'
import { joinHolidayGroup } from '@/app/actions/holidayGroups'

export async function POST(request: Request) {
  try {
    const { inviteCode } = await request.json()
    
    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
    }

    const group = await joinHolidayGroup(inviteCode)
    return NextResponse.json({ success: true, group })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to join holiday group'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

