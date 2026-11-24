import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminPasscode } from '@/lib/auth'
import { generateUniqueBoxCodes } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin authentication
    const auth = verifyAdminPasscode(request)
    if (!auth.authorized) {
      return auth.response!
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON request payload' },
        { status: 400 }
      )
    }

    const { name, productName, pointsPerCode, quantity } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: "Field 'name' (batch identifier) is required" },
        { status: 400 }
      )
    }

    if (!productName || typeof productName !== 'string' || !productName.trim()) {
      return NextResponse.json(
        { error: "Field 'productName' is required" },
        { status: 400 }
      )
    }

    const numPoints = Number(pointsPerCode)
    if (isNaN(numPoints) || numPoints <= 0 || !Number.isInteger(numPoints)) {
      return NextResponse.json(
        { error: "Field 'pointsPerCode' must be a positive integer" },
        { status: 400 }
      )
    }

    const numQuantity = Number(quantity)
    if (isNaN(numQuantity) || numQuantity <= 0 || !Number.isInteger(numQuantity)) {
      return NextResponse.json(
        { error: "Field 'quantity' must be a positive integer" },
        { status: 400 }
      )
    }

    if (numQuantity > 10000) {
      return NextResponse.json(
        { error: 'Maximum batch quantity per request is 10,000 codes' },
        { status: 400 }
      )
    }

    // 2. Seed 3 default RewardItem entries if none exist
    const existingRewardCount = await prisma.rewardItem.count()
    if (existingRewardCount === 0) {
      await prisma.rewardItem.createMany({
        data: [
          {
            title: 'Factory Branded Steel Thermos (500ml)',
            description: 'Double-walled vacuum insulated stainless steel water bottle keeps drinks cold for 24h or hot for 12h.',
            pointsCost: 100,
            stock: 50,
            active: true,
          },
          {
            title: 'Professional Multi-Tool Work Set',
            description: '14-in-1 heavy duty stainless steel folding multi-tool with nylon sheath for maintenance and workshop tasks.',
            pointsCost: 250,
            stock: 30,
            active: true,
          },
          {
            title: 'Rugged Waterproof Factory Duffel',
            description: 'Heavy duty 45L waterproof tarp material duffel bag designed for industrial site and field transport.',
            pointsCost: 500,
            stock: 15,
            active: true,
          },
        ],
      })
    }

    // 3. Generate cryptographically random unique codes
    const generatedCodes = generateUniqueBoxCodes(numQuantity)

    // 4. Create Batch record and link BoxCodes atomically
    const batch = await prisma.$transaction(async (tx) => {
      const createdBatch = await tx.batch.create({
        data: {
          name: name.trim(),
          productName: productName.trim(),
          pointsPerCode: numPoints,
          quantity: numQuantity,
          codes: {
            create: generatedCodes.map((code) => ({
              code,
              status: 'UNCLAIMED',
            })),
          },
        },
        include: {
          codes: {
            select: {
              id: true,
              code: true,
              status: true,
              createdAt: true,
            },
          },
        },
      })

      return createdBatch
    })

    return NextResponse.json(
      {
        message: `Batch '${batch.name}' created with ${batch.quantity} codes successfully.`,
        batch: {
          id: batch.id,
          name: batch.name,
          productName: batch.productName,
          pointsPerCode: batch.pointsPerCode,
          quantity: batch.quantity,
          createdAt: batch.createdAt,
          codesSample: batch.codes.slice(0, 5),
          totalCodesGenerated: batch.codes.length,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating batch:', error)
    return NextResponse.json(
      { error: 'Failed to create batch and generate codes', details: error.message },
      { status: 500 }
    )
  }
}
