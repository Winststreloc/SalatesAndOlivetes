import { NextResponse } from 'next/server'
import { createHolidayGroup } from '@/app/actions/holidayGroups'

export async function POST(request: Request) {
  try {
    const { name, holidayType } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const group = await createHolidayGroup(name, holidayType)
    return NextResponse.json({ success: true, group })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create holiday group'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

