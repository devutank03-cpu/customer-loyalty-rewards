import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const rewards = await prisma.rewardItem.findMany({
      where: { active: true },
      orderBy: { pointsCost: 'asc' },
    })
    return NextResponse.json({ rewards }, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching rewards catalog:', error)
    return NextResponse.json(
      { error: 'Failed to load rewards catalog', details: error.message },
      { status: 500 }
    )
  }
}
