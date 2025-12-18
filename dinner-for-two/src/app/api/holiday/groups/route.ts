'use server'

import { NextResponse } from 'next/server'
import { getHolidayGroups } from '@/app/actions/holidayGroups'

export async function GET() {
  try {
    const groups = await getHolidayGroups()
    return NextResponse.json(groups)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load groups'
    console.error('[api/holiday/groups] failed:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

