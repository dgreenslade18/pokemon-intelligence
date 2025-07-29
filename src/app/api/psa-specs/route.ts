import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Simple in-memory storage for known PSA specIDs (in production, use a database)
const knownSpecIds = new Map<string, string>([
  // Format: "cardName|setName|cardNumber" -> specID
  // Example entries (replace with real ones):
  // "Charizard|Base Set|4" -> "12345",
  // "Pikachu|Base Set|25" -> "54321",
])

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const cardName = searchParams.get('cardName')
    const setName = searchParams.get('setName')
    const cardNumber = searchParams.get('cardNumber')

    if (action === 'list') {
      // Return all known specIDs
      const specList = Array.from(knownSpecIds.entries()).map(([key, specId]) => {
        const [name, set, number] = key.split('|')
        return { cardName: name, setName: set, cardNumber: number, specId }
      })

      return NextResponse.json({
        action: 'list',
        count: specList.length,
        specs: specList,
        message: 'Known PSA specIDs. Add more using ?action=add&cardName=...&setName=...&cardNumber=...&specId=...'
      })
    }

    if (action === 'search' && cardName) {
      // Search for a specific card's specID
      const key = `${cardName}|${setName || ''}|${cardNumber || ''}`
      const exactMatch = knownSpecIds.get(key)
      
      if (exactMatch) {
        return NextResponse.json({
          action: 'search',
          found: true,
          cardName,
          setName,
          cardNumber,
          specId: exactMatch
        })
      }

      // Try partial matches
      const partialMatches = Array.from(knownSpecIds.entries())
        .filter(([k]) => k.toLowerCase().includes(cardName.toLowerCase()))
        .map(([key, specId]) => {
          const [name, set, number] = key.split('|')
          return { cardName: name, setName: set, cardNumber: number, specId }
        })

      return NextResponse.json({
        action: 'search',
        found: partialMatches.length > 0,
        cardName,
        exactMatch: null,
        partialMatches
      })
    }

    if (action === 'scrape' && cardName) {
      // Attempt to scrape PSA website for specID
      return await scrapePSAForSpecId(cardName, setName, cardNumber)
    }

    if (action === 'add') {
      const specId = searchParams.get('specId')
      if (!cardName || !specId) {
        return NextResponse.json({
          error: 'cardName and specId are required for add action'
        }, { status: 400 })
      }

      const key = `${cardName}|${setName || ''}|${cardNumber || ''}`
      knownSpecIds.set(key, specId)

      return NextResponse.json({
        action: 'add',
        success: true,
        message: `Added PSA specID ${specId} for ${cardName}`,
        key
      })
    }

    return NextResponse.json({
      message: 'PSA SpecID Helper',
      availableActions: {
        list: 'List all known specIDs',
        search: 'Search for a card: ?action=search&cardName=Charizard&setName=Base%20Set&cardNumber=4',
        scrape: 'Scrape PSA website: ?action=scrape&cardName=Charizard&setName=Base%20Set&cardNumber=4',
        add: 'Add a known specID: ?action=add&cardName=Charizard&setName=Base%20Set&cardNumber=4&specId=12345'
      },
      knownSpecsCount: knownSpecIds.size
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cardName, setName, cardNumber, specId } = body

    if (!cardName || !specId) {
      return NextResponse.json({
        error: 'cardName and specId are required'
      }, { status: 400 })
    }

    const key = `${cardName}|${setName || ''}|${cardNumber || ''}`
    knownSpecIds.set(key, specId)

    return NextResponse.json({
      success: true,
      message: `Added PSA specID ${specId} for ${cardName}`,
      key,
      total: knownSpecIds.size
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function scrapePSAForSpecId(cardName: string, setName?: string, cardNumber?: string): Promise<NextResponse> {
  try {
    console.log(`🕷️ Attempting to scrape PSA for: ${cardName}`)

    // Step 1: Navigate to PSA population search
    const searchUrl = 'https://www.psacard.com/pop/playersearch'
    
    // For now, return instructions on how to find specIDs manually
    // In a full implementation, you'd use puppeteer/playwright here
    
    return NextResponse.json({
      action: 'scrape',
      status: 'manual_instructions',
      message: 'Automated scraping not yet implemented. Here\'s how to find PSA specIDs manually:',
      instructions: {
        step1: 'Go to https://www.psacard.com/pop/playersearch',
        step2: `Search for "${cardName}"${setName ? ` in "${setName}"` : ''}${cardNumber ? ` number "${cardNumber}"` : ''}`,
        step3: 'Click on the card in the results',
        step4: 'Look at the URL or page source for the specID (usually a number)',
        step5: 'Add the specID using: POST /api/psa-specs with {cardName, setName, cardNumber, specId}'
      },
      searchUrl,
      cardName,
      setName,
      cardNumber
    })

  } catch (error) {
    return NextResponse.json({
      action: 'scrape',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 