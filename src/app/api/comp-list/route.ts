import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { 
  saveToCompList, 
  getCompList, 
  removeFromCompList,
  createUserList,
  getUserLists,
  getUserList,
  updateUserList,
  deleteUserList,
  getDefaultUserList
} from '../../../lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const listId = searchParams.get('listId')
    const includeLists = searchParams.get('includeLists') === 'true'

    // Get comp list items
    const items = await getCompList(session.user.id, listId || undefined)
    
    // Convert DECIMAL values to numbers and handle nulls
    const convertedItems = items.map(item => ({
      ...item,
      tcg_price: item.tcg_price ? Number(item.tcg_price) : null,
      ebay_average: item.ebay_average ? Number(item.ebay_average) : null
    }))

    const response: any = {
      success: true,
      items: convertedItems
    }

    // Include lists if requested
    if (includeLists) {
      const lists = await getUserLists(session.user.id)
      response.lists = lists
    }

    return NextResponse.json(response)
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
      listId,
      action,
      listName,
      listDescription,
      isDefault
    } = body

    // Handle list management actions
    if (action === 'createList') {
      if (!listName) {
        return NextResponse.json({ error: 'List name is required' }, { status: 400 })
      }

      const newList = await createUserList(session.user.id, listName, listDescription, isDefault)
      return NextResponse.json({ 
        success: true, 
        list: newList,
        message: 'List created successfully' 
      })
    }

    if (action === 'updateList') {
      const { listId: updateListId, updates } = body
      if (!updateListId) {
        return NextResponse.json({ error: 'List ID is required' }, { status: 400 })
      }

      const updatedList = await updateUserList(updateListId, session.user.id, updates)
      return NextResponse.json({ 
        success: true, 
        list: updatedList,
        message: 'List updated successfully' 
      })
    }

    if (action === 'deleteList') {
      const { listId: deleteListId } = body
      if (!deleteListId) {
        return NextResponse.json({ error: 'List ID is required' }, { status: 400 })
      }

      await deleteUserList(deleteListId, session.user.id)
      return NextResponse.json({ 
        success: true,
        message: 'List deleted successfully' 
      })
    }

    // Handle saving card to comp list (existing functionality)
    if (!cardName) {
      return NextResponse.json({ error: 'Card name is required' }, { status: 400 })
    }

    const savedItem = await saveToCompList(
      session.user.id,
      cardName,
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
          message: 'Card already exists in this list' 
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

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

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