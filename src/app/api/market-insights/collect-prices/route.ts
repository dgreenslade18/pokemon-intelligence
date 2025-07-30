import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { analyzeCard } from '../../script7/route'

// Popular cards to track for market insights
const POPULAR_CARDS = [
  // Base Set
  { name: 'Charizard', number: '4/102', set: 'Base Set' },
  { name: 'Blastoise', number: '2/102', set: 'Base Set' },
  { name: 'Venusaur', number: '15/102', set: 'Base Set' },
  { name: 'Pikachu', number: '58/102', set: 'Base Set' },
  
  // Neo Genesis
  { name: 'Lugia', number: '9/111', set: 'Neo Genesis' },
  { name: 'Ho-Oh', number: '7/111', set: 'Neo Genesis' },
  
  // Expedition
  { name: 'Charizard', number: '6/165', set: 'Expedition' },
  
  // EX Series
  { name: 'Rayquaza ex', number: '97/107', set: 'Dragon' },
  { name: 'Gardevoir ex', number: '96/109', set: 'Sandstorm' },
  
  // Diamond & Pearl
  { name: 'Dialga', number: '1/130', set: 'Diamond & Pearl' },
  { name: 'Palkia', number: '11/130', set: 'Diamond & Pearl' },
  
  // Modern Era
  { name: 'Charizard VMAX', number: '20/189', set: 'Darkness Ablaze' },
  { name: 'Pikachu VMAX', number: '44/185', set: 'Vivid Voltage' },
  { name: 'Umbreon VMAX', number: '95/203', set: 'Evolving Skies' },
  
  // Japanese Promos
  { name: 'Pikachu', number: 'PROMO', set: 'Japanese Promo' },
  { name: 'Mew', number: 'PROMO', set: 'Japanese Promo' },
]

// Default user preferences for market analysis
const DEFAULT_PREFERENCES = {
  user_id: 'market-insights-system',
  show_buy_value: true,
  show_trade_value: false,
  show_cash_value: false,
  trade_percentage: 80.00,
  cash_percentage: 70.00,
  whatnot_fees: 12.50,
  updated_at: new Date()
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting daily price collection for market insights...')
    
    // Check if we already collected prices today
    const today = new Date().toISOString().split('T')[0]
    const existingData = await sql`
      SELECT COUNT(*) as count 
      FROM market_insights 
      WHERE price_date = ${today}
    `
    
    if (existingData.rows && existingData.rows.length > 0 && existingData.rows[0].count > 0) {
      console.log('⚠️ Prices already collected today')
      return NextResponse.json({
        success: true,
        message: 'Prices already collected today',
        date: today,
        existingRecords: parseInt(existingData.rows[0].count)
      })
    }

    console.log(`📊 Collecting prices for ${POPULAR_CARDS.length} popular cards...`)
    
    const results = []
    const errors = []
    
    // Process cards in batches to avoid overwhelming the APIs
    const batchSize = 3
    for (let i = 0; i < POPULAR_CARDS.length; i += batchSize) {
      const batch = POPULAR_CARDS.slice(i, i + batchSize)
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(POPULAR_CARDS.length / batchSize)}`)
      
      const batchPromises = batch.map(async (card) => {
        try {
          console.log(`🎯 Analyzing: ${card.name} ${card.number}`)
          
          // Use existing analyzeCard function with market-friendly search term
          const searchTerm = `${card.name} ${card.number} ${card.set} pokemon card`
          const analysis = await analyzeCard(searchTerm, DEFAULT_PREFERENCES)
          
          // Extract pricing data
          const ebayAverage = analysis.analysis.ebay_average || null
          const tcgPrice = analysis.analysis.cardmarket_price || null
          const ebayListingCount = analysis.ebay_prices?.length || 0
          
          // Calculate price volatility from eBay data
          let priceVolatility = null
          if (analysis.ebay_prices && analysis.ebay_prices.length > 1) {
            const prices = analysis.ebay_prices.map(p => p.price)
            const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
            const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
            priceVolatility = Math.sqrt(variance)
          }
          
          // Calculate confidence score
          let confidenceScore = 0
          if (ebayListingCount >= 5) confidenceScore += 4
          else if (ebayListingCount >= 3) confidenceScore += 3
          else if (ebayListingCount >= 1) confidenceScore += 2
          
          if (tcgPrice && tcgPrice > 0) confidenceScore += 3
          if (priceVolatility !== null && priceVolatility < 10) confidenceScore += 2
          else if (priceVolatility !== null) confidenceScore += 1
          
          confidenceScore = Math.min(10, confidenceScore)
          
          // Only store if we have meaningful price data
          if (ebayAverage > 0 || tcgPrice > 0) {
            await sql`
              INSERT INTO market_insights (
                card_name, card_number, set_name, ebay_average_price, 
                tcg_price, ebay_listing_count, price_volatility, confidence_score
              ) VALUES (
                ${card.name}, ${card.number}, ${card.set}, ${ebayAverage},
                ${tcgPrice}, ${ebayListingCount}, ${priceVolatility}, ${confidenceScore}
              )
              ON CONFLICT (card_name, card_number, price_date) 
              DO UPDATE SET
                ebay_average_price = EXCLUDED.ebay_average_price,
                tcg_price = EXCLUDED.tcg_price,
                ebay_listing_count = EXCLUDED.ebay_listing_count,
                price_volatility = EXCLUDED.price_volatility,
                confidence_score = EXCLUDED.confidence_score
            `
            
            results.push({
              card: `${card.name} ${card.number}`,
              ebayAverage,
              tcgPrice,
              listings: ebayListingCount,
              confidence: confidenceScore
            })
            
            console.log(`✅ Stored: ${card.name} - eBay: £${ebayAverage}, TCG: £${tcgPrice}`)
          } else {
            console.log(`⚠️ No price data found for: ${card.name}`)
          }
          
          // Rate limiting - wait between requests
          await new Promise(resolve => setTimeout(resolve, 2000))
          
        } catch (error) {
          console.error(`❌ Error analyzing ${card.name}:`, error)
          errors.push({
            card: `${card.name} ${card.number}`,
            error: error.message
          })
        }
      })
      
      await Promise.all(batchPromises)
    }
    
    console.log(`✅ Price collection completed: ${results.length} cards processed, ${errors.length} errors`)
    
    return NextResponse.json({
      success: true,
      message: 'Daily price collection completed',
      date: today,
      processed: results.length,
      errors: errors.length,
      results: results.slice(0, 5), // Show first 5 results
      errorDetails: errors
    })
    
  } catch (error) {
    console.error('❌ Error in daily price collection:', error)
    return NextResponse.json({
      success: false,
      error: `Price collection failed: ${error}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Return recent collection stats
    const stats = await sql`
      SELECT 
        price_date,
        COUNT(*) as cards_tracked,
        AVG(confidence_score) as avg_confidence,
        COUNT(CASE WHEN ebay_average_price > 0 THEN 1 END) as ebay_data_count,
        COUNT(CASE WHEN tcg_price > 0 THEN 1 END) as tcg_data_count
      FROM market_insights 
      WHERE price_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY price_date 
      ORDER BY price_date DESC
    `
    
    return NextResponse.json({
      success: true,
      collectionStats: stats.rows || []
    })
    
  } catch (error) {
    console.error('❌ Error getting collection stats:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
} 