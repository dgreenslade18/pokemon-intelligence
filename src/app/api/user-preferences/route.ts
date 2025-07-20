import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../lib/auth'
import { getUserPreferences, updateUserPreferences } from '../../../lib/db'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await getUserPreferences(session.user.id)
    
    return NextResponse.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    console.error('Failed to fetch user preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      show_buy_value,
      show_trade_value,
      show_cash_value,
      trade_percentage,
      cash_percentage,
      whatnot_fees
    } = body

    // Validate percentages
    if (trade_percentage !== undefined && (trade_percentage < 0 || trade_percentage > 100)) {
      return NextResponse.json(
        { error: 'Trade percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (cash_percentage !== undefined && (cash_percentage < 0 || cash_percentage > 100)) {
      return NextResponse.json(
        { error: 'Cash percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (whatnot_fees !== undefined && (whatnot_fees < 0 || whatnot_fees > 100)) {
      return NextResponse.json(
        { error: 'Whatnot fees must be between 0 and 100' },
        { status: 400 }
      )
    }

    const updatedPreferences = await updateUserPreferences(session.user.id, {
      show_buy_value,
      show_trade_value, 
      show_cash_value,
      trade_percentage,
      cash_percentage,
      whatnot_fees
    })
    
    return NextResponse.json({
      success: true,
      data: updatedPreferences,
      message: 'Preferences updated successfully'
    })
  } catch (error) {
    console.error('Failed to update user preferences:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update user preferences',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 