import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../lib/auth'
import { getUserByEmail, manualPasswordReset, getUserById } from '../../../../../lib/db'
import { sendManualPasswordResetEmail } from '../../../../../lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is super admin
    const adminUser = await getUserByEmail(session.user.email)
    
    if (!adminUser || adminUser.user_level !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the user to send email to
    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate new password and update user
    const newPassword = await manualPasswordReset(userId)

    // Send password reset email
    try {
      await sendManualPasswordResetEmail(user.email, newPassword)
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      // Still return the new password even if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      newPassword: newPassword // Include for admin reference
    })

  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
} 