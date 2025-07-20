import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, createPasswordResetToken } from '../../../../lib/db'
import { sendPasswordResetEmail } from '../../../../lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await getUserByEmail(email)
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      })
    }

    // Create password reset token
    const resetToken = await createPasswordResetToken(email)
    
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Failed to create reset token' },
        { status: 500 }
      )
    }

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken)
      console.log('Password reset email sent successfully to:', email)
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent'
    })

  } catch (error) {
    console.error('Error requesting password reset:', error)
    return NextResponse.json(
      { error: 'Failed to request password reset' },
      { status: 500 }
    )
  }
} 