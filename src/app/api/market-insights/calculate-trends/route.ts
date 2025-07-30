import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('📈 Starting trending cards calculation...')
    
    const body = await request.json().catch(() => ({}))
    const { period = '7_days', minPercentageIncrease = 5.0 } = body
    
    const today = new Date().toISOString().split('T')[0]
    
    // Delete existing calculations for today
    await sql`
      DELETE FROM trending_cards 
      WHERE calculation_date = ${today} AND trend_period = ${period}
    `
    
    console.log(`🔍 Calculating trends for ${period} with min ${minPercentageIncrease}% increase...`)
    
    // Calculate price changes based on the specified period
    let daysBack = 7
    if (period === '24_hours') daysBack = 1
    else if (period === '3_days') daysBack = 3
    else if (period === '14_days') daysBack = 14
    else if (period === '30_days') daysBack = 30
    
    // Calculate the target date for comparison
    const comparisonDate = new Date()
    comparisonDate.setDate(comparisonDate.getDate() - daysBack)
    const comparisonDateString = comparisonDate.toISOString().split('T')[0]
    
    // Find cards with price increases in the specified period
    const trendingCards = await sql`
      WITH price_comparison AS (
        SELECT 
          current_data.card_name,
          current_data.card_number,
          current_data.set_name,
          current_data.ebay_average_price as current_price,
          current_data.confidence_score,
          current_data.ebay_listing_count,
          previous_data.ebay_average_price as previous_price,
          CASE 
            WHEN previous_data.ebay_average_price > 0 THEN
              ((current_data.ebay_average_price - previous_data.ebay_average_price) / previous_data.ebay_average_price) * 100
            ELSE NULL
          END as price_change_percentage,
          current_data.ebay_average_price - previous_data.ebay_average_price as price_change_amount
        FROM market_insights current_data
        LEFT JOIN market_insights previous_data ON (
          current_data.card_name = previous_data.card_name AND
          current_data.card_number = previous_data.card_number AND
          previous_data.price_date = ${comparisonDateString}
        )
        WHERE current_data.price_date = CURRENT_DATE
          AND current_data.ebay_average_price > 0
          AND previous_data.ebay_average_price > 0
          AND current_data.confidence_score >= 5.0
      )
      SELECT *
      FROM price_comparison
      WHERE price_change_percentage >= ${minPercentageIncrease}
        AND current_price >= 5.0
      ORDER BY price_change_percentage DESC
      LIMIT 20
    `
    
    console.log(`📊 Found ${trendingCards.rows.length} trending cards for ${period}`)
    
    // Store the results in trending_cards table
    const insertedCards = []
    for (const card of trendingCards.rows) {
      try {
        await sql`
          INSERT INTO trending_cards (
            card_name, card_number, set_name, current_price, previous_price,
            price_change_amount, price_change_percentage, trend_period,
            confidence_score, ebay_listing_count
          ) VALUES (
            ${card.card_name}, ${card.card_number}, ${card.set_name},
            ${card.current_price}, ${card.previous_price}, ${card.price_change_amount},
            ${card.price_change_percentage}, ${period}, ${card.confidence_score},
            ${card.ebay_listing_count}
          )
        `
        
        insertedCards.push({
          card: `${card.card_name} ${card.card_number}`,
          currentPrice: parseFloat(card.current_price),
          previousPrice: parseFloat(card.previous_price),
          changeAmount: parseFloat(card.price_change_amount),
          changePercentage: parseFloat(card.price_change_percentage),
          confidence: parseFloat(card.confidence_score)
        })
        
        console.log(`✅ ${card.card_name}: £${card.previous_price} → £${card.current_price} (+${card.price_change_percentage}%)`)
        
      } catch (error) {
        console.error(`❌ Error inserting trend data for ${card.card_name}:`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Trending cards calculated for ${period}`,
      period,
      minPercentageIncrease,
      trendingCardsFound: insertedCards.length,
      topTrends: insertedCards.slice(0, 10),
      calculationDate: today
    })
    
  } catch (error) {
    console.error('❌ Error calculating trending cards:', error)
    return NextResponse.json({
      success: false,
      error: `Trend calculation failed: ${error}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7_days'
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Get the latest trending cards
    const trendingCards = await sql`
      SELECT 
        card_name,
        card_number,
        set_name,
        current_price,
        previous_price,
        price_change_amount,
        price_change_percentage,
        confidence_score,
        ebay_listing_count,
        calculation_date
      FROM trending_cards
      WHERE trend_period = ${period}
        AND calculation_date = (
          SELECT MAX(calculation_date) 
          FROM trending_cards 
          WHERE trend_period = ${period}
        )
      ORDER BY price_change_percentage DESC
      LIMIT ${limit}
    `
    
    // Get calculation metadata
    const metadata = await sql`
      SELECT 
        calculation_date,
        COUNT(*) as total_trending_cards,
        AVG(price_change_percentage) as avg_increase,
        MAX(price_change_percentage) as max_increase
      FROM trending_cards
      WHERE trend_period = ${period}
        AND calculation_date = (
          SELECT MAX(calculation_date) 
          FROM trending_cards 
          WHERE trend_period = ${period}
        )
      GROUP BY calculation_date
    `
    
    return NextResponse.json({
      success: true,
      period,
      trendingCards: trendingCards.rows.map(card => ({
        id: `${card.card_name}-${card.card_number}`,
        name: card.card_name,
        number: card.card_number,
        set: card.set_name,
        currentPrice: parseFloat(card.current_price),
        previousPrice: parseFloat(card.previous_price),
        changeAmount: parseFloat(card.price_change_amount),
        changePercentage: parseFloat(card.price_change_percentage),
        confidence: parseFloat(card.confidence_score),
        listingCount: parseInt(card.ebay_listing_count),
        calculationDate: card.calculation_date
      })),
      metadata: metadata.rows && metadata.rows.length > 0 ? {
        calculationDate: metadata.rows[0].calculation_date,
        totalTrendingCards: parseInt(metadata.rows[0].total_trending_cards),
        averageIncrease: parseFloat(metadata.rows[0].avg_increase),
        maxIncrease: parseFloat(metadata.rows[0].max_increase)
      } : null
    })
    
  } catch (error) {
    console.error('❌ Error getting trending cards:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 