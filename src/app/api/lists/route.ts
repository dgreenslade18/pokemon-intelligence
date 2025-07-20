import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../lib/auth'
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
    const session = await auth()
    
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
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 })
    }

    const list = await createUserList(session.user.id, name.trim(), description?.trim())

    return NextResponse.json({
      success: true,
      list,
      message: 'List created successfully'
    })
  } catch (error) {
    console.error('Error creating list:', error)
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { listId, name, description } = await request.json()

    if (!listId) {
      return NextResponse.json({ error: 'List ID is required' }, { status: 400 })
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 })
    }

    const list = await updateUserList(listId, session.user.id, {
      name: name.trim(),
      description: description?.trim()
    })

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      list,
      message: 'List updated successfully'
    })
  } catch (error) {
    console.error('Error updating list:', error)
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
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
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
  }
} 