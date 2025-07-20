import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../lib/auth'
import { 
  saveToCompList, 
  getCompList, 
  removeFromCompList
} from '../../../lib/db'
import { capitalizeCardName } from '../../../lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const listId = searchParams.get('listId')

    // Get comp list items (with optional list filtering)
    const items = await getCompList(session.user.id, listId || undefined)
    
    // Convert DECIMAL values to numbers and handle nulls
    const convertedItems = items.map(item => ({
      ...item,
      tcg_price: item.tcg_price ? Number(item.tcg_price) : null,
      ebay_average: item.ebay_average ? Number(item.ebay_average) : null,
      saved_tcg_price: item.saved_tcg_price ? Number(item.saved_tcg_price) : null,
      saved_ebay_average: item.saved_ebay_average ? Number(item.saved_ebay_average) : null,
      price_change_percentage: item.price_change_percentage ? Number(item.price_change_percentage) : null,
      price_volatility: item.price_volatility ? Number(item.price_volatility) : null,
      confidence_score: item.confidence_score ? Number(item.confidence_score) : null
    }))

    return NextResponse.json({
      success: true,
      compList: convertedItems
    })
  } catch (error) {
    console.error('Error fetching comp list:', error)
    return NextResponse.json({ error: 'Failed to fetch comp list' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
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
      setName,
      listId
    } = body

    if (!cardName) {
      return NextResponse.json({ error: 'Card name is required' }, { status: 400 })
    }

    // Capitalize card name
    const capitalizedCardName = capitalizeCardName(cardName)

    // Save to comp list
    const compListItem = await saveToCompList(
      session.user.id,
      capitalizedCardName,
      cardNumber || '',
      recommendedPrice || '',
      tcgPrice ? Number(tcgPrice) : null,
      ebayAverage ? Number(ebayAverage) : null,
      cardImageUrl,
      setName,
      listId
    )

    return NextResponse.json({
      success: true,
      compListItem,
      message: `${capitalizedCardName} saved to comp list!`
    })
  } catch (error) {
    console.error('Error saving to comp list:', error)
    
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: 'This card is already in your comp list' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to save to comp list' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Remove from comp list
    await removeFromCompList(itemId, session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Item removed from comp list'
    })
  } catch (error) {
    console.error('Error removing from comp list:', error)
    return NextResponse.json({ error: 'Failed to remove from comp list' }, { status: 500 })
  }
} 