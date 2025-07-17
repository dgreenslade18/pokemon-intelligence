import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { 
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
    const listId = searchParams.get('id')

    if (listId) {
      // Get specific list
      const list = await getUserList(listId, session.user.id)
      if (!list) {
        return NextResponse.json({ error: 'List not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true, list })
    } else {
      // Get all lists for user
      const lists = await getUserLists(session.user.id)
      return NextResponse.json({ success: true, lists })
    }
  } catch (error) {
    console.error('Error fetching lists:', error)
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, isDefault } = body

    if (!name) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 })
    }

    const newList = await createUserList(session.user.id, name, description, isDefault)
    
    return NextResponse.json({ 
      success: true, 
      list: newList,
      message: 'List created successfully' 
    })
  } catch (error) {
    console.error('Error creating list:', error)
    
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json({ 
        success: false, 
        message: 'A list with this name already exists' 
      }, { status: 409 })
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create list' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { listId, updates } = body

    if (!listId) {
      return NextResponse.json({ error: 'List ID is required' }, { status: 400 })
    }

    const updatedList = await updateUserList(listId, session.user.id, updates)
    
    return NextResponse.json({ 
      success: true, 
      list: updatedList,
      message: 'List updated successfully' 
    })
  } catch (error) {
    console.error('Error updating list:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update list' 
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
    const listId = searchParams.get('id')

    if (!listId) {
      return NextResponse.json({ error: 'List ID is required' }, { status: 400 })
    }

    await deleteUserList(listId, session.user.id)
    
    return NextResponse.json({ 
      success: true,
      message: 'List deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting list:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to delete list' 
    }, { status: 500 })
  }
} 