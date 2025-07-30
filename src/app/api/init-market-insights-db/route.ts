import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🗄️ Initializing market insights database table...')

    // Create the market_insights table for daily price tracking
    await sql`CREATE TABLE IF NOT EXISTS market_insights (
      id SERIAL PRIMARY KEY,
      card_name VARCHAR(255) NOT NULL,
      card_number VARCHAR(50),
      set_name VARCHAR(255),
      ebay_average_price DECIMAL(10,2),
      tcg_price DECIMAL(10,2),
      price_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      
      -- Store additional metadata for better insights
      ebay_listing_count INTEGER DEFAULT 0,
      price_volatility DECIMAL(5,2),
      confidence_score DECIMAL(3,1),
      
      -- Create unique constraint to prevent duplicate entries per day
      UNIQUE(card_name, card_number, price_date)
    )`

    // Create the trending_cards table for processed results
    await sql`CREATE TABLE IF NOT EXISTS trending_cards (
      id SERIAL PRIMARY KEY,
      card_name VARCHAR(255) NOT NULL,
      card_number VARCHAR(50),
      set_name VARCHAR(255),
      current_price DECIMAL(10,2),
      previous_price DECIMAL(10,2),
      price_change_amount DECIMAL(10,2),
      price_change_percentage DECIMAL(5,2),
      trend_period VARCHAR(20) DEFAULT '7_days',
      calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
      confidence_score DECIMAL(3,1),
      ebay_listing_count INTEGER DEFAULT 0,
      
      -- Unique constraint for daily calculations
      UNIQUE(card_name, card_number, trend_period, calculation_date)
    )`

    // Create indices for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_market_insights_card_name ON market_insights(card_name)`
    await sql`CREATE INDEX IF NOT EXISTS idx_market_insights_price_date ON market_insights(price_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_market_insights_card_date ON market_insights(card_name, price_date)`
    
    await sql`CREATE INDEX IF NOT EXISTS idx_trending_cards_percentage ON trending_cards(price_change_percentage DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_trending_cards_date ON trending_cards(calculation_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_trending_cards_period ON trending_cards(trend_period)`

    console.log('✅ Market insights database initialized successfully')

    return NextResponse.json({
      success: true,
      message: 'Market insights database initialized successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error initializing market insights database:', error)
    return NextResponse.json({
      success: false,
      error: `Database initialization failed: ${error}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 