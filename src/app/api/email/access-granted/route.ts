import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../lib/auth'
import { getUserByEmail, createUser, generateTempPassword } from '../../../../lib/db'
import { sendAccessGrantedEmail } from '../../../../lib/email'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
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

    // Generate temporary password
    const tempPassword = await generateTempPassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    // Create user account
    const newUser = await createUser(email, hashedPassword)

    // Send access granted email
    try {
      await sendAccessGrantedEmail(email, tempPassword)
      console.log('Access granted email sent successfully to:', email)
    } catch (emailError) {
      console.error('Failed to send access granted email:', emailError)
      // Don't fail the whole request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'User created and access granted email sent',
      user: {
        id: newUser.id,
        email: newUser.email
      }
    })

  } catch (error) {
    console.error('Error granting access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 