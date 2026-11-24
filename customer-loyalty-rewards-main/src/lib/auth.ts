import { NextRequest, NextResponse } from 'next/server'

export function verifyAdminPasscode(request: NextRequest): { authorized: boolean; response?: NextResponse } {
  const passcode = request.headers.get('x-admin-passcode')
  const expectedPasscode = process.env.ADMIN_PASSCODE || 'factory2026'

  if (!passcode || passcode !== expectedPasscode) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Missing or invalid x-admin-passcode header' },
        { status: 401 }
      ),
    }
  }

  return { authorized: true }
}
