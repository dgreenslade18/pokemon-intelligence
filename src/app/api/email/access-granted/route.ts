import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getUserByEmail, createInvite } from '../../../../lib/db'
import { sendInviteEmail } from '../../../../lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is super admin
    const user = await getUserByEmail(session.user.email)
    
    if (!user || user.user_level !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Create invite
    const invite = await createInvite(email, user.id)

    // Send invite email
    try {
      await sendInviteEmail(email, invite.token)
      console.log('Invite email sent successfully to:', email)
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError)
      // Don't fail the whole request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Invite created and email sent',
      invite: {
        id: invite.id,
        email: invite.email,
        expires_at: invite.expires_at
      }
    })

  } catch (error) {
    console.error('Error granting access:', error)
    return NextResponse.json(
      { error: 'Failed to grant access' },
      { status: 500 }
    )
  }
} 