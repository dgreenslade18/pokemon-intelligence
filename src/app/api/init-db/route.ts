import { NextResponse } from 'next/server'
import { initDb } from '../../../lib/db'

export async function POST() {
  try {
    await initDb()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    })
  } catch (error) {
    console.error('Database initialization failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 