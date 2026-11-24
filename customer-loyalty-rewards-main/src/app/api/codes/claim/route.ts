import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeCode, normalizeContact } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON request payload' },
        { status: 400 }
      )
    }

    const { code, name, contact } = body

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: "Field 'code' is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: "Field 'name' is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    if (!contact || typeof contact !== 'string' || !contact.trim()) {
      return NextResponse.json(
        { error: "Field 'contact' is required and must be a valid email or phone" },
        { status: 400 }
      )
    }

    const normalizedCode = normalizeCode(code)
    const normalizedContact = normalizeContact(contact)
    const trimmedName = name.trim()

    // 1. Rate-limit check: >= 5 failed attempts in FraudLog within last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const failedAttemptsCount = await prisma.fraudLog.count({
      where: {
        contact: normalizedContact,
        createdAt: { gte: tenMinutesAgo },
      },
    })

    if (failedAttemptsCount >= 5) {
      await prisma.fraudLog.create({
        data: {
          attemptedCode: normalizedCode,
          contact: normalizedContact,
          reason: 'RATE_LIMITED',
        },
      })

      return NextResponse.json(
        {
          error: 'Rate limit exceeded: 5 or more failed claim attempts in the last 10 minutes. Please try again later.',
          reason: 'RATE_LIMITED',
        },
        { status: 429 }
      )
    }

    // 2. Atomic fraud-safe redemption inside a Prisma $transaction
    const redemptionResult = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.boxCode.updateMany({
        where: {
          code: normalizedCode,
          status: 'UNCLAIMED',
        },
        data: {
          status: 'REDEEMED',
          redeemedAt: new Date(),
        },
      })

      // If count === 0, inspect why and write FraudLog entry
      if (updateResult.count === 0) {
        const existing = await tx.boxCode.findUnique({
          where: { code: normalizedCode },
        })

        let reason: 'INVALID_CODE' | 'ALREADY_REDEEMED' | 'REVOKED_CODE' = 'INVALID_CODE'
        let statusCode = 400
        let errorMessage = 'Invalid code: This box code does not exist in our system.'

        if (!existing) {
          reason = 'INVALID_CODE'
          statusCode = 400
          errorMessage = 'Invalid code: This box code does not exist.'
        } else if (existing.status === 'REDEEMED') {
          reason = 'ALREADY_REDEEMED'
          statusCode = 409
          errorMessage = 'Fraud prevention: This box code has already been redeemed.'
        } else if (existing.status === 'REVOKED') {
          reason = 'REVOKED_CODE'
          statusCode = 400
          errorMessage = 'Fraud prevention: This box code has been revoked by the factory.'
        }

        await tx.fraudLog.create({
          data: {
            attemptedCode: normalizedCode,
            contact: normalizedContact,
            reason,
          },
        })

        return {
          success: false,
          statusCode,
          errorMessage,
          reason,
        }
      }

      // If count === 1: fetch batch details, upsert customer, link redeemedById
      const boxCode = await tx.boxCode.findUnique({
        where: { code: normalizedCode },
        include: { batch: true },
      })

      if (!boxCode || !boxCode.batch) {
        throw new Error('Claimed box code or batch details could not be found')
      }

      const pointsEarned = boxCode.batch.pointsPerCode

      // Upsert customer by contact and increment balances
      const customer = await tx.customer.upsert({
        where: { contact: normalizedContact },
        create: {
          name: trimmedName,
          contact: normalizedContact,
          pointsBalance: pointsEarned,
          totalEarned: pointsEarned,
        },
        update: {
          name: trimmedName,
          pointsBalance: { increment: pointsEarned },
          totalEarned: { increment: pointsEarned },
        },
      })

      // Link redeemedById
      await tx.boxCode.update({
        where: { id: boxCode.id },
        data: { redeemedById: customer.id },
      })

      // Get available rewards catalog
      const availableRewards = await tx.rewardItem.findMany({
        where: { active: true },
        orderBy: { pointsCost: 'asc' },
      })

      return {
        success: true,
        data: {
          message: `Congratulations! Code verified successfully. Added ${pointsEarned} points to your account.`,
          boxCode: {
            code: boxCode.code,
            productName: boxCode.batch.productName,
            pointsEarned,
            redeemedAt: boxCode.redeemedAt,
          },
          customer: {
            id: customer.id,
            name: customer.name,
            contact: customer.contact,
            pointsBalance: customer.pointsBalance,
            totalEarned: customer.totalEarned,
          },
          availableRewards,
        },
      }
    })

    if (!redemptionResult.success) {
      return NextResponse.json(
        { error: redemptionResult.errorMessage, reason: redemptionResult.reason },
        { status: redemptionResult.statusCode }
      )
    }

    return NextResponse.json(redemptionResult.data, { status: 200 })
  } catch (error: any) {
    console.error('Error claiming box code:', error)
    return NextResponse.json(
      { error: 'An unexpected server error occurred while processing claim', details: error.message },
      { status: 500 }
    )
  }
}
