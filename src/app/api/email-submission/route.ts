import { NextRequest, NextResponse } from 'next/server'
import { submitEmail } from '../../../lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Submit email to database
    const submission = await submitEmail(email)

    return NextResponse.json(
      { 
        success: true, 
        message: 'Email submitted successfully',
        submission 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Email submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit email' },
      { status: 500 }
    )
  }
} 