import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Pikawiz.com Population Data Scraper
// DISABLED: Pikawiz scraping removed

interface PikawizPopulationData {
  cardName: string
  setName: string
  psaGrades: { [grade: string]: number }
  cgcGrades: { [grade: string]: number }
  aceGrades: { [grade: string]: number }
  totalPopulation: number
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cardName = searchParams.get('cardName')
    const setName = searchParams.get('setName')
    const action = searchParams.get('action') || 'scrape'

    if (!cardName || !setName) {
      return NextResponse.json({ 
        error: 'cardName and setName are required',
        example: '/api/population-data-collectors?cardName=Charizard&setName=base-set&action=scrape'
      }, { status: 400 })
    }

    console.log(`🎯 Pikawiz scraping request: ${cardName} from ${setName}`)

    if (action === 'scrape') {
      const populationData = await scrapePikawizData(cardName, setName)
      
      if (populationData) {
        return NextResponse.json({
          success: true,
          source: 'disabled-pikawiz.com',
          data: populationData,
          instructions: 'Pikawiz scraping has been disabled'
        })
      } else {
        return NextResponse.json({
          success: false,
          source: 'disabled-pikawiz.com',
          error: 'Pikawiz scraping disabled',
          instructions: 'Pikawiz scraping has been completely disabled'
        })
      }
    }

    // Other actions (analyze, test, etc.)
    return NextResponse.json({
      success: true,
      availableActions: ['scrape', 'analyze', 'test'],
      instructions: 'Pikawiz population data collector ready'
    })

  } catch (error) {
    console.error('Pikawiz scraping error:', error)
    return NextResponse.json({ 
      error: 'Failed to scrape Pikawiz data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DISABLED: Pikawiz scraping removed
async function scrapePikawizData(cardName: string, setName: string): Promise<PikawizPopulationData | null> {
  // Pikawiz scraping has been disabled
  return null
}

// DISABLED: Pikawiz parsing removed
function parsePikawizHTML($: cheerio.CheerioAPI, cardName: string, setName: string): PikawizPopulationData | null {
  // Pikawiz parsing has been disabled
  return null
}

// Helper function to convert common set names to Pikawiz format
function formatSetNameForPikawiz(setName: string): string {
  const setMappings: { [key: string]: string } = {
    'Base Set': 'base-set',
    'Base Set Shadowless': 'base-set-shadowless', 
    'Jungle': 'jungle',
    'Fossil': 'fossil',
    'Ancient Origins': 'ancient-origins',
    'Prismatic Evolutions': 'prismatic-evolutions',
    // Add more mappings as needed
  }
  
  return setMappings[setName] || setName.toLowerCase().replace(/\s+/g, '-')
} 