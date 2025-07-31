import { NextRequest, NextResponse } from 'next/server'
import { verifyInviteToken, createUser, markInviteAsUsed, getUserByEmail } from '../../../../lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json()

    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Token, password, and confirm password are required' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Verify the invite token
    const verification = await verifyInviteToken(token)

    if (!verification.valid || !verification.email) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 400 }
      )
    }

    // Check if user already exists (shouldn't happen, but safety check)
    const existingUser = await getUserByEmail(verification.email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create the user account
    const newUser = await createUser(verification.email, hashedPassword)

    // Mark the invite as used
    await markInviteAsUsed(token)

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        user_level: newUser.user_level
      }
    })

  } catch (error) {
    console.error('Error completing invite:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
} 