import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminPasscode } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify admin authorization
    const auth = verifyAdminPasscode(request)
    if (!auth.authorized) {
      return auth.response!
    }

    const { id } = await params

    if (!id || !id.trim()) {
      return NextResponse.json(
        { error: 'Path parameter id is required' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON request payload' },
        { status: 400 }
      )
    }

    const { status, action } = body

    // Support both explicit status ('REVOKED', 'UNCLAIMED') and action ('REVOKE', 'UNREVOKE')
    let targetStatus: 'REVOKED' | 'UNCLAIMED' | 'REDEEMED' | null = null

    if (status) {
      const upper = String(status).trim().toUpperCase()
      if (['REVOKED', 'UNCLAIMED', 'REDEEMED'].includes(upper)) {
        targetStatus = upper as any
      }
    } else if (action) {
      const act = String(action).trim().toUpperCase()
      if (act === 'REVOKE') targetStatus = 'REVOKED'
      if (act === 'UNREVOKE') targetStatus = 'UNCLAIMED'
    }

    if (!targetStatus) {
      return NextResponse.json(
        {
          error: "A valid 'status' ('REVOKED' | 'UNCLAIMED') or 'action' ('REVOKE' | 'UNREVOKE') must be provided",
        },
        { status: 400 }
      )
    }

    // Look up by id (UUID) or by box code string (e.g. BOX-XXXX-XXXX)
    const boxCode = await prisma.boxCode.findFirst({
      where: {
        OR: [
          { id },
          { code: id.trim().toUpperCase() },
        ],
      },
      include: {
        batch: {
          select: {
            name: true,
            productName: true,
            pointsPerCode: true,
          },
        },
        redeemedBy: {
          select: {
            id: true,
            name: true,
            contact: true,
          },
        },
      },
    })

    if (!boxCode) {
      return NextResponse.json(
        { error: `Box code '${id}' not found` },
        { status: 404 }
      )
    }

    // Update status
    const updatedCode = await prisma.boxCode.update({
      where: { id: boxCode.id },
      data: {
        status: targetStatus,
      },
      include: {
        batch: {
          select: {
            name: true,
            productName: true,
            pointsPerCode: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: `Box code '${updatedCode.code}' status successfully updated to '${updatedCode.status}'.`,
        code: {
          id: updatedCode.id,
          code: updatedCode.code,
          status: updatedCode.status,
          batchName: updatedCode.batch.name,
          productName: updatedCode.batch.productName,
          redeemedAt: updatedCode.redeemedAt,
          createdAt: updatedCode.createdAt,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error updating code status:', error)
    return NextResponse.json(
      { error: 'Failed to update code status', details: error.message },
      { status: 500 }
    )
  }
}
