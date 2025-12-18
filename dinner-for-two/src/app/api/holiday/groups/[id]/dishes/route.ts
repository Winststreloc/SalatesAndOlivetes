'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getHolidayDishes } from '@/app/actions/holidayDishes'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const dishes = await getHolidayDishes(id)
    return NextResponse.json(dishes)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dishes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

