'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getHolidayGroupMembers } from '@/app/actions/holidayGroups'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const members = await getHolidayGroupMembers(id)
    return NextResponse.json(members)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load members'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

