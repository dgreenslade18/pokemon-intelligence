import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { 
  saveToCompList, 
  getCompList, 
  removeFromCompList
} from '../../../lib/db'
import { capitalizeCardName } from '../../../lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
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
      setName,
      listId
    } = body

    // Handle saving card to comp list
    if (!cardName) {
      return NextResponse.json({ error: 'Card name is required' }, { status: 400 })
    }

    const savedItem = await saveToCompList(
      session.user.id,
      capitalizeCardName(cardName),
      cardNumber || '',
      recommendedPrice || '',
      tcgPrice,
      ebayAverage,
      cardImageUrl,
      setName,
      listId
    )

    // Check if this was an update to an existing card
    const existingItems = await getCompList(session.user.id)
    const isUpdate = existingItems.some(item => 
      item.card_name === cardName && 
      item.card_number === (cardNumber || '') &&
      item.id !== savedItem.id
    )

    return NextResponse.json({
      success: true,
      item: savedItem,
      isUpdate,
      message: isUpdate ? 'Card updated in your comp list!' : 'Card saved to your comp list!'
    })

  } catch (error) {
    console.error('Error saving to comp list:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({ 
          success: false, 
          message: 'Card already exists in your comp list' 
        }, { status: 409 })
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to save card' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId } = body

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    await removeFromCompList(session.user.id, itemId)

    return NextResponse.json({
      success: true,
      message: 'Item removed from comp list'
    })

  } catch (error) {
    console.error('Error removing from comp list:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to remove item' 
    }, { status: 500 })
  }
} 