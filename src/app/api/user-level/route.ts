import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../lib/auth'
import { getUserByEmail } from '../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await getUserByEmail(session.user.email)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      userLevel: user.user_level || 'tester'
    })

  } catch (error) {
    console.error('Error getting user level:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 