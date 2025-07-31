import { NextRequest, NextResponse } from 'next/server'
import { verifyInviteToken } from '../../../../../lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const verification = await verifyInviteToken(token)

    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      email: verification.email
    })

  } catch (error) {
    console.error('Error verifying invite token:', error)
    return NextResponse.json(
      { error: 'Failed to verify invite token' },
      { status: 500 }
    )
  }
} 