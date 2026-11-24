import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeContact } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON request payload' },
        { status: 400 }
      )
    }

    const { rewardId, contact, customerId } = body

    if (!rewardId || typeof rewardId !== 'string') {
      return NextResponse.json(
        { error: "Field 'rewardId' is required and must be a valid ID" },
        { status: 400 }
      )
    }

    if ((!contact || typeof contact !== 'string') && (!customerId || typeof customerId !== 'string')) {
      return NextResponse.json(
        { error: "Either 'contact' or 'customerId' must be provided to identify the customer" },
        { status: 400 }
      )
    }

    const normalizedContact = contact ? normalizeContact(contact) : undefined

    // Run atomic points deduction, stock decrement, and redemption creation inside transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Find customer
      const customer = await tx.customer.findFirst({
        where: customerId ? { id: customerId } : { contact: normalizedContact },
      })

      if (!customer) {
        return {
          success: false,
          statusCode: 404,
          error: 'Customer account not found',
        }
      }

      // 2. Find reward item
      const reward = await tx.rewardItem.findUnique({
        where: { id: rewardId },
      })

      if (!reward || !reward.active) {
        return {
          success: false,
          statusCode: 404,
          error: 'Reward item is not found or is currently inactive',
        }
      }

      // Check stock
      if (reward.stock <= 0) {
        return {
          success: false,
          statusCode: 400,
          error: `Reward item '${reward.title}' is currently out of stock`,
        }
      }

      // Check customer points balance
      if (customer.pointsBalance < reward.pointsCost) {
        return {
          success: false,
          statusCode: 400,
          error: `Insufficient points balance. You have ${customer.pointsBalance} points, but this reward costs ${reward.pointsCost} points.`,
        }
      }

      // 3. Atomically decrement reward stock (guarding stock > 0)
      const stockUpdate = await tx.rewardItem.updateMany({
        where: {
          id: reward.id,
          stock: { gt: 0 },
        },
        data: {
          stock: { decrement: 1 },
        },
      })

      if (stockUpdate.count === 0) {
        return {
          success: false,
          statusCode: 400,
          error: `Reward item '${reward.title}' just went out of stock`,
        }
      }

      // 4. Atomically deduct customer points balance (guarding pointsBalance >= pointsCost)
      const balanceUpdate = await tx.customer.updateMany({
        where: {
          id: customer.id,
          pointsBalance: { gte: reward.pointsCost },
        },
        data: {
          pointsBalance: { decrement: reward.pointsCost },
        },
      })

      if (balanceUpdate.count === 0) {
        throw new Error('Points balance verification failed during atomic deduction')
      }

      // 5. Create RewardRedemption record
      const redemption = await tx.rewardRedemption.create({
        data: {
          customerId: customer.id,
          rewardId: reward.id,
          pointsSpent: reward.pointsCost,
          status: 'PENDING',
        },
        include: {
          reward: true,
        },
      })

      // 6. Fetch refreshed customer balance
      const updatedCustomer = await tx.customer.findUnique({
        where: { id: customer.id },
        select: {
          id: true,
          name: true,
          contact: true,
          pointsBalance: true,
          totalEarned: true,
        },
      })

      return {
        success: true,
        data: {
          message: `Reward '${reward.title}' redeemed successfully!`,
          redemption: {
            id: redemption.id,
            status: redemption.status,
            pointsSpent: redemption.pointsSpent,
            reward: {
              id: reward.id,
              title: reward.title,
              description: reward.description,
            },
            createdAt: redemption.createdAt,
          },
          customer: updatedCustomer,
        },
      }
    })

    if (!transactionResult.success) {
      return NextResponse.json(
        { error: transactionResult.error },
        { status: transactionResult.statusCode }
      )
    }

    return NextResponse.json(transactionResult.data, { status: 200 })
  } catch (error: any) {
    console.error('Error redeeming reward:', error)
    return NextResponse.json(
      { error: 'Failed to process reward redemption', details: error.message },
      { status: 500 }
    )
  }
}
