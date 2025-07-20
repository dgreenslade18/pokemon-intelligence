import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../lib/auth'
import { updateUserLevel } from '../../../../../lib/db'

export async function PUT(
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
    const { getUserByEmail } = await import('../../../../../lib/db')
    const user = await getUserByEmail(session.user.email)
    
    if (!user || user.user_level !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { userLevel } = await request.json()
    const { userId } = await params

    if (!userLevel || !['tester', 'super_admin'].includes(userLevel)) {
      return NextResponse.json(
        { error: 'Invalid user level' },
        { status: 400 }
      )
    }

    const updatedUser = await updateUserLevel(userId, userLevel)

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating user level:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 