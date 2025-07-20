import { NextRequest, NextResponse } from 'next/server'
import { submitEmail, markEmailSent } from '../../../lib/db'
import { sendWelcomeEmail } from '../../../lib/email'

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

    // Send welcome email
    try {
      await sendWelcomeEmail(email)
      await markEmailSent(submission.id)
      console.log('Welcome email sent successfully to:', email)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the whole request if email fails
    }

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