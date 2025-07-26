import { NextRequest, NextResponse } from 'next/server'
import pokemonDB from '../../../../lib/pokemon-database'
import smartPriceCache from '../../../../lib/smart-price-cache'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Pokemon database initialization...')
    
    const { force = false } = await request.json().catch(() => ({}))
    
    if (force) {
      await pokemonDB.forceRefresh()
      smartPriceCache.clearCache()
    } else {
      await pokemonDB.initialize()
    }
    
    const stats = pokemonDB.getStats()
    const cacheStats = smartPriceCache.getStats()
    
    return NextResponse.json({
      success: true,
      message: 'Pokemon database initialized successfully',
      stats: {
        database: stats,
        priceCache: cacheStats
      }
    })
    
  } catch (error) {
    console.error('❌ Failed to initialize Pokemon database:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to initialize Pokemon database'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const stats = pokemonDB.getStats()
    const cacheStats = smartPriceCache.getStats()
    
    return NextResponse.json({
      success: true,
      stats: {
        database: stats,
        priceCache: cacheStats
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get database stats'
    }, { status: 500 })
  }
} 