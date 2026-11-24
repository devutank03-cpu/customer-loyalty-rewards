import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeContact } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawContact = searchParams.get('contact')

    if (!rawContact || !rawContact.trim()) {
      return NextResponse.json(
        { error: "Query parameter 'contact' (email or phone) is required" },
        { status: 400 }
      )
    }

    const normalizedContact = normalizeContact(rawContact)

    // Fetch customer profile along with claimed boxes and redemption history
    const customer = await prisma.customer.findUnique({
      where: { contact: normalizedContact },
      include: {
        claimedBoxes: {
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                productName: true,
                pointsPerCode: true,
              },
            },
          },
          orderBy: { redeemedAt: 'desc' },
        },
        redemptions: {
          include: {
            reward: {
              select: {
                id: true,
                title: true,
                description: true,
                pointsCost: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found. No box codes have been claimed with this contact yet.' },
        { status: 404 }
      )
    }

    // Fetch active reward items catalog
    const availableRewards = await prisma.rewardItem.findMany({
      where: { active: true },
      orderBy: { pointsCost: 'asc' },
    })

    return NextResponse.json(
      {
        customer: {
          id: customer.id,
          name: customer.name,
          contact: customer.contact,
          pointsBalance: customer.pointsBalance,
          totalEarned: customer.totalEarned,
          createdAt: customer.createdAt,
        },
        claimedBoxes: customer.claimedBoxes.map((box) => ({
          id: box.id,
          code: box.code,
          batchName: box.batch.name,
          productName: box.batch.productName,
          pointsEarned: box.batch.pointsPerCode,
          redeemedAt: box.redeemedAt,
        })),
        redemptions: customer.redemptions.map((redemption) => ({
          id: redemption.id,
          pointsSpent: redemption.pointsSpent,
          status: redemption.status,
          createdAt: redemption.createdAt,
          reward: redemption.reward,
        })),
        availableRewards,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching customer profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer profile', details: error.message },
      { status: 500 }
    )
  }
}
