import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { saveToCompList, getCompList, removeFromCompList, sql } from '../../../lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      cardName, 
      cardNumber, 
      recommendedPrice, 
      tcgPrice, 
      ebayAverage, 
      cardImageUrl, 
      setName 
    } = body

    if (!cardName || !recommendedPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if card already exists
    const existingCard = await sql`
      SELECT id, saved_at, updated_at FROM comp_list 
      WHERE user_id = ${session.user.id} 
      AND card_name = ${cardName} 
      AND card_number = ${cardNumber || ''}
    `

    const compListItem = await saveToCompList(
      session.user.id,
      cardName,
      cardNumber || '',
      recommendedPrice,
      tcgPrice || 0,
      ebayAverage || 0,
      cardImageUrl,
      setName
    )

    const isUpdate = existingCard.rows.length > 0

    return NextResponse.json({ 
      success: true, 
      item: compListItem,
      isUpdate,
      message: isUpdate ? 'Card updated in your comp list!' : 'Card saved to your comp list!'
    })
  } catch (error) {
    console.error('Error saving to comp list:', error)
    
    // Handle specific errors
    if (error.message?.includes('Card already exists')) {
      return NextResponse.json(
        { error: 'This card is already in your comp list' },
        { status: 409 }
      )
    } else if (error.message?.includes('Invalid user ID')) {
      return NextResponse.json(
        { error: 'Invalid user session' },
        { status: 401 }
      )
    } else if (error.message?.includes('Card name is required')) {
      return NextResponse.json(
        { error: 'Card name is required' },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { error: 'Failed to save card to comp list' },
        { status: 500 }
      )
    }
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const compList = await getCompList(session.user.id)

    return NextResponse.json({ 
      success: true, 
      items: compList 
    })
  } catch (error) {
    console.error('Error fetching comp list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comp list' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 })
    }

    await removeFromCompList(session.user.id, itemId)

    return NextResponse.json({ 
      success: true, 
      message: 'Item removed from comp list' 
    })
  } catch (error) {
    console.error('Error removing from comp list:', error)
    return NextResponse.json(
      { error: 'Failed to remove item from comp list' },
      { status: 500 }
    )
  }
} 