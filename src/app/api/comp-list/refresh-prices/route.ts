import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getCompList, saveToCompList } from '../../../../lib/db'
import { analyzeCard } from '../../script7/route'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const compList = await getCompList(session.user.id)
    const updatedItems = []
    for (const item of compList) {
      // Use analyzeCard to get latest prices
      const analysis = await analyzeCard(item.card_name, {
        trade_percentage: 80,
        cash_percentage: 70,
        show_buy_value: true,
        show_trade_value: false,
        show_cash_value: false,
        whatnot_fees: 12.5,
        user_id: session.user.id,
        updated_at: new Date()
      })
      // Save updated prices
      const updated = await saveToCompList(
        session.user.id,
        item.card_name,
        item.card_number,
        analysis.analysis.recommendation || '',
        analysis.analysis.cardmarket_price || 0,
        analysis.analysis.ebay_average || 0,
        item.card_image_url,
        item.set_name
      )
      updatedItems.push(updated)
    }
    return NextResponse.json({ success: true, items: updatedItems })
  } catch (error) {
    console.error('Error refreshing comp list prices:', error)
    return NextResponse.json({ error: 'Failed to refresh prices' }, { status: 500 })
  }
} 