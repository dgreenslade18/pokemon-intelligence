import { NextRequest, NextResponse } from 'next/server'
import { sql, insertPopulationData, type PopulationEntry } from '@/lib/db'

interface GradedMetricsCard {
  i: string // ID
  n: string // Name
  ps?: number // PSA 10 count (from fewest-10s)
  to?: number // Total population (from fewest-10s)
  u?: number // Usage score (from cards-by-score)
  r?: number // Rank
  p?: number // Some percentage
  w?: number // Weight/score
  s: string // Set ID
  vo?: number // Volume
  x?: string[] // Attributes like "Holofoil"
  e?: string | number // Card number
  ra?: number // Rank within category
  z?: number // Some modifier
}

interface GradedMetricsHistoricalData {
  c: number // Card count
  k: string // Timestamp
  f: {
    [grade: string]: {
      g: number // Total graded
      h?: number // Some count
      q?: number // Some count
    }
  }
  t: number // Some total
}

// Add mapping for set slugs
const SET_ID_MAPPING: { [key: string]: string } = {
  '2zrf': 'fossil',
  '18ll': 'base-set', 
  '18gh': 'jungle',
  '19i9': 'base-set-2',
  '1bha': 'team-rocket',
  '1qkk': 'promo',
  '18lt': 'base-set-shadowless',
  '4bvp': 'xy-promos',
  '1uwk': 'neo-genesis',
  '1reh': 'neo-revelation',
  '18zs': 'gym-heroes',
  '18zr': 'gym-challenge',
  // Add more mappings as needed
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '1000')
    
    console.log('🔄 Starting GradedMetrics data sync...')

    // Download their cards-by-score.json (much larger dataset)
    console.log('📥 Downloading GradedMetrics card data (by-score)...')
    const cardsResponse = await fetch('https://raw.githubusercontent.com/GradedMetrics/api/master/docs/cards-by-score.json')
    const cardsData: GradedMetricsCard[] = await cardsResponse.json()
    console.log(`📊 Found ${Math.min(cardsData.length, limit)} cards to process (${cardsData.length} total available)`)

    // Also download fewest-10s for population data
    console.log('📥 Downloading GradedMetrics population data (fewest-10s)...')
    const populationResponse = await fetch('https://raw.githubusercontent.com/GradedMetrics/api/master/docs/cards-by-fewest-10s.json')
    const populationData: GradedMetricsCard[] = await populationResponse.json()
    
    // Create a lookup map for population data
    const populationMap = new Map<string, GradedMetricsCard>()
    populationData.forEach(card => {
      const key = `${card.n.toLowerCase()}-${card.s}`
      populationMap.set(key, card)
    })

    // Download historical data for grade breakdowns
    console.log('📥 Downloading GradedMetrics historical data...')
    const historyResponse = await fetch('https://raw.githubusercontent.com/GradedMetrics/api/master/docs/history.json')
    const historyDataArray: GradedMetricsHistoricalData[] = await historyResponse.json()
    
    // Get the latest entry (last item in the array)
    const latestHistoryData = historyDataArray[historyDataArray.length - 1]
    const latestTimestamp = new Date(parseInt(latestHistoryData.k)).toISOString()
    console.log(`📅 Using latest data from: ${latestTimestamp} (${latestHistoryData.c} cards tracked)`)

    let syncedCount = 0
    const errors: string[] = []

    // Process cards (limited by the limit parameter)
    const cardsToProcess = cardsData.slice(0, limit)
    
    for (const card of cardsToProcess) {
      try {
        // Get population data for this card
        const popKey = `${card.n.toLowerCase()}-${card.s}`
        const popData = populationMap.get(popKey)
        
        // Map set ID to readable name
        const setSlug = SET_ID_MAPPING[card.s] || card.s
        const setName = setSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        
        // Calculate gem rate and population data
        const psa10Count = popData?.ps || 0
        const totalPop = popData?.to || 0
        const gemRate = totalPop > 0 ? (psa10Count / totalPop) * 100 : 0
        
        // Estimate other grades based on typical distribution
        const estimateGrades = (total: number, psa10: number) => {
          if (total === 0) return { psa9: 0, psa8: 0, psa7: 0, psa6: 0 }
          
          const remaining = total - psa10
          return {
            psa9: Math.round(remaining * 0.15), // ~15% PSA 9
            psa8: Math.round(remaining * 0.25), // ~25% PSA 8  
            psa7: Math.round(remaining * 0.30), // ~30% PSA 7
            psa6: Math.round(remaining * 0.30)  // ~30% PSA 6 and below
          }
        }
        
        const grades = estimateGrades(totalPop, psa10Count)
        
        const populationEntry: PopulationEntry = {
          card_name: card.n,
          card_number: String(card.e || ''),
          set_name: setName,
          set_slug: setSlug,
          grading_service: 'PSA' as const,
          grade_10: psa10Count,
          grade_9: grades.psa9,
          grade_8: grades.psa8,
          grade_7: grades.psa7,
          grade_6: grades.psa6,
          total_population: totalPop,
          gem_rate: parseFloat(gemRate.toFixed(2)),
          source: 'gradedmetrics',
          last_updated: latestTimestamp
        }

        await insertPopulationData(populationEntry)
        syncedCount++
        
        // Log progress every 100 cards
        if (syncedCount % 100 === 0) {
          console.log(`✅ Synced ${syncedCount} cards...`)
        }
        
      } catch (error) {
        const errorMsg = `Failed to sync card ${card.n}: ${error}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    console.log('🎉 GradedMetrics sync completed!')

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} cards from GradedMetrics`,
      syncedCount,
      totalAvailable: cardsData.length,
      errors: errors.slice(0, 10), // Limit error list
      timestamp: new Date().toISOString(),
      latestDataFrom: latestTimestamp
    })

  } catch (error) {
    console.error('❌ GradedMetrics sync failed:', error)
    return NextResponse.json({
      success: false,
      error: `Failed to sync GradedMetrics data: ${error}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Return sync status
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_cards,
        COUNT(CASE WHEN source = 'gradedmetrics' THEN 1 END) as gradedmetrics_cards,
        MAX(last_updated) as last_sync
      FROM population_data
    `
    
    return NextResponse.json({
      success: true,
      stats: result[0],
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Failed to get sync stats: ${error}`
    }, { status: 500 })
  }
} 