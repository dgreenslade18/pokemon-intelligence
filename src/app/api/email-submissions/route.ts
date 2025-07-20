import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../lib/auth'
import { getEmailSubmissions } from '../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is super admin
    const { getUserByEmail } = await import('../../../lib/db')
    const user = await getUserByEmail(session.user.email)
    
    if (!user || user.user_level !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const submissions = await getEmailSubmissions()

    return NextResponse.json({
      submissions
    })

  } catch (error) {
    console.error('Error getting email submissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 