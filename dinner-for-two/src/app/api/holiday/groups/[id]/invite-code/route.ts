'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getHolidayGroupInviteCode } from '@/app/actions/holidayGroups'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const code = await getHolidayGroupInviteCode(id)
    return NextResponse.json({ inviteCode: code })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load invite code'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

