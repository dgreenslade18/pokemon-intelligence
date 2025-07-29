import { NextRequest, NextResponse } from 'next/server'
import { sql, insertPopulationData, type PopulationEntry } from '@/lib/db'

interface GradedMetricsCard {
  i: string // ID
  n: string // Name
  ps: number // PSA 10 count
  to: number // Total population
  s: string // Set ID
  w: number // Weight/score
  x?: string[] // Attributes
  e?: string | number // Card number
  ra: number // Rank
  z: number // Some modifier
}

interface GradedMetricsData {
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

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting GradedMetrics data sync...')

    // Download their cards-by-fewest-10s.json (contains card data with population info)
    console.log('📥 Downloading GradedMetrics card data...')
    const cardsResponse = await fetch('https://raw.githubusercontent.com/GradedMetrics/api/master/docs/cards-by-fewest-10s.json')
    const cardsData: GradedMetricsCard[] = await cardsResponse.json()

    console.log(`📊 Found ${cardsData.length} cards in GradedMetrics data`)

    // Download their historical data for grade breakdowns
    console.log('📥 Downloading GradedMetrics historical data...')
    const historyResponse = await fetch('https://raw.githubusercontent.com/GradedMetrics/api/master/docs/history.json')
    const historyData: GradedMetricsData[] = await historyResponse.json()

    // Get the latest historical entry for grade breakdowns
    const latestHistory = historyData[historyData.length - 1]
    console.log(`📅 Using latest data from: ${new Date(parseInt(latestHistory.k)).toISOString()}`)

    let syncedCount = 0
    let errors: string[] = []

    // Process each card
    for (const card of cardsData.slice(0, 100)) { // Start with first 100 for testing
      try {
        // Calculate gem rate
        const gemRate = card.to > 0 ? (card.ps / card.to) * 100 : 0

        // For now, we'll estimate grade distribution based on their data structure
        // In a full implementation, we'd need to map their IDs to detailed breakdowns
        const estimatedGrades = estimateGradeDistribution(card.ps, card.to)

        const populationData = {
          card_name: card.n,
          card_number: card.e?.toString() || 'Unknown',
          set_name: 'Unknown', // We'd need to map their set IDs
          set_slug: card.s,
          grading_service: 'PSA',
          grade_10: card.ps,
          grade_9: estimatedGrades.grade9,
          grade_8: estimatedGrades.grade8,
          grade_7: estimatedGrades.grade7,
          grade_6: estimatedGrades.grade6,
          total_population: card.to,
          gem_rate: gemRate,
          source: 'gradedmetrics',
          last_updated: new Date().toISOString()
        }

        // Insert into our database using the existing function
        const populationEntry: PopulationEntry = {
          card_name: populationData.card_name,
          card_number: populationData.card_number,
          set_name: populationData.set_name,
          set_slug: populationData.set_slug,
          grading_service: 'PSA',
          grade_10: populationData.grade_10,
          grade_9: populationData.grade_9,
          grade_8: populationData.grade_8,
          grade_7: populationData.grade_7,
          grade_6: populationData.grade_6,
          total_population: populationData.total_population,
          gem_rate: populationData.gem_rate,
          source: populationData.source,
          last_updated: populationData.last_updated
        }

        await insertPopulationData(populationEntry)

        syncedCount++

        if (syncedCount % 10 === 0) {
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
      errors: errors.slice(0, 5), // Return first 5 errors
      timestamp: new Date().toISOString(),
      latestDataFrom: new Date(parseInt(latestHistory.k)).toISOString()
    })

  } catch (error) {
    console.error('❌ GradedMetrics sync failed:', error)
    return NextResponse.json({
      success: false,
      error: `Sync failed: ${error}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function to estimate grade distribution
function estimateGradeDistribution(psa10Count: number, totalCount: number) {
  // Based on typical PSA grading patterns, estimate other grades
  const remaining = totalCount - psa10Count
  
  // Rough estimates based on typical grading curves
  const grade9 = Math.round(remaining * 0.25) // ~25% of remaining are 9s
  const grade8 = Math.round(remaining * 0.35) // ~35% of remaining are 8s  
  const grade7 = Math.round(remaining * 0.25) // ~25% of remaining are 7s
  const grade6 = Math.round(remaining * 0.15) // ~15% of remaining are 6s or lower

  return {
    grade9,
    grade8,
    grade7,
    grade6
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