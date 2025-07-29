import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🗄️ Initializing population data database table...')

    // Create the population_data table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS population_data (
        id SERIAL PRIMARY KEY,
        card_name VARCHAR(255) NOT NULL,
        card_number VARCHAR(50) NOT NULL,
        set_name VARCHAR(255) NOT NULL,
        set_slug VARCHAR(255) NOT NULL,
        grading_service VARCHAR(10) NOT NULL CHECK (grading_service IN ('PSA', 'CGC', 'ACE')),
        grade_10 INTEGER DEFAULT 0,
        grade_9 INTEGER DEFAULT 0,
        grade_8 INTEGER DEFAULT 0,
        grade_7 INTEGER DEFAULT 0,
        grade_6 INTEGER DEFAULT 0,
        total_population INTEGER DEFAULT 0,
        gem_rate DECIMAL(5,2) DEFAULT 0.00,
        source VARCHAR(50) NOT NULL,
        last_updated TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        
        -- Create unique constraint to prevent duplicates
        UNIQUE(card_name, card_number, set_slug, grading_service)
      )
    `

    await executeQuery(createTableQuery)

    // Create indices for better performance
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_population_card_name ON population_data(card_name)',
      'CREATE INDEX IF NOT EXISTS idx_population_set_slug ON population_data(set_slug)',
      'CREATE INDEX IF NOT EXISTS idx_population_service ON population_data(grading_service)',
      'CREATE INDEX IF NOT EXISTS idx_population_updated ON population_data(last_updated)'
    ]

    for (const indexQuery of indices) {
      await executeQuery(indexQuery)
    }

    console.log('✅ Population data database initialized successfully')

    return NextResponse.json({
      success: true,
      message: 'Population data database initialized successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error initializing population database:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if the table exists and return info about it
    const tableInfoQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT set_slug) as total_sets,
        COUNT(DISTINCT grading_service) as total_services,
        MAX(last_updated) as last_update
      FROM population_data
    `

    const result = await executeQuery(tableInfoQuery)
    const info = result.rows[0]

    return NextResponse.json({
      success: true,
      tableExists: true,
      stats: {
        totalRecords: parseInt(info.total_records),
        totalSets: parseInt(info.total_sets),
        totalServices: parseInt(info.total_services),
        lastUpdate: info.last_update
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      tableExists: false,
      error: error instanceof Error ? error.message : 'Table may not exist',
      timestamp: new Date().toISOString()
    })
  }
} 