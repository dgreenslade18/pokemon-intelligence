import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import * as path from 'path'

// Railway-optimized version using lightweight Python scraper
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchTerm, streamProgress } = body

    if (!searchTerm || searchTerm.trim() === '') {
      return NextResponse.json({
        success: false,
        message: 'Please provide a search term'
      }, { status: 400 })
    }

    // Use lightweight Python scraper (much lower memory usage)
    const scriptPath = path.join(process.cwd(), 'lightweight_scraper.py')
    const venvPythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')

    // Run lightweight Python script
    const pythonProcess = spawn(venvPythonPath, [scriptPath, searchTerm.trim()], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000, // 1 minute timeout
      env: {
        ...process.env,
        SEARCH_TERM: searchTerm.trim()
      }
    })

    let stdout = ''
    let stderr = ''
    let progressMessages: any[] = []

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString()
      stdout += output
      
      // Extract progress messages
      const lines = output.split('\n')
      for (const line of lines) {
        if (line.startsWith('PROGRESS:')) {
          try {
            const progressData = JSON.parse(line.substring(9))
            progressMessages.push(progressData)
          } catch (e) {
            // Ignore invalid JSON
          }
        }
      }
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    // Wait for script completion
    try {
      await new Promise<void>((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`Lightweight scraper failed with code ${code}: ${stderr}`))
          }
        })

        pythonProcess.on('error', (error) => {
          reject(error)
        })
      })

      // Parse results from stdout
      const lines = stdout.split('\n')
      const resultFileName = lines[lines.length - 2] // Second to last line should be the filename
      
      if (resultFileName && resultFileName.endsWith('.json')) {
        const resultPath = path.join(process.cwd(), resultFileName)
        
        try {
          const fs = require('fs')
          const resultsData = fs.readFileSync(resultPath, 'utf8')
          const results = JSON.parse(resultsData)
          
          // Clean up result file
          fs.unlinkSync(resultPath)
          
          return NextResponse.json({
            success: true,
            data: results,
            progress: progressMessages,
            message: 'Analysis completed using lightweight scraper'
          })
          
        } catch (fileError) {
          console.error('Error reading results file:', fileError)
          throw new Error('Failed to read analysis results')
        }
      } else {
        throw new Error('No valid result file generated')
      }

    } catch (pythonError) {
      console.error('Python script error:', pythonError)
      
      // Fallback to Pokemon TCG API only if Python fails
      console.log('Falling back to Pokemon TCG API only...')
      const cardmarketData = await searchPokemonTCG(searchTerm.trim())
      
      if (cardmarketData) {
        const results = {
          card_name: searchTerm,
          timestamp: new Date().toISOString(),
          ebay_prices: [],
          price_charting: null,
          cardmarket: cardmarketData,
          analysis: {
            ebay_average: null,
            price_charting_price: null,
            cardmarket_price: cardmarketData.price,
            final_average: cardmarketData.price,
            price_range: `£${cardmarketData.price}`,
            recommendation: `£${(cardmarketData.price * 0.8).toFixed(2)} - £${(cardmarketData.price * 0.9).toFixed(2)}`
          }
        }
        
        return NextResponse.json({
          success: true,
          data: results,
          message: 'Limited analysis - Pokemon TCG API only (scraping failed)',
          warning: 'eBay and Price Charting data unavailable'
        })
      } else {
        throw pythonError
      }
    }

  } catch (error) {
    console.error('Error in card analysis:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process card analysis',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

// Pokemon TCG API function (this was working in your Python script)
async function searchPokemonTCG(cardName: string) {
  try {
    const apiKey = process.env.RAPID_API_KEY
    if (!apiKey) {
      console.warn('RAPID_API_KEY not found, skipping Pokemon TCG API')
      return null
    }

    const headers = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'pokemon-tcg-api.p.rapidapi.com'
    }

    const searchUrl = 'https://pokemon-tcg-api.p.rapidapi.com/cards'
    const params = new URLSearchParams({
      'search': cardName,
      'pageSize': '10'
    })

    const response = await fetch(`${searchUrl}?${params}`, { 
      headers
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return null
    }

    // Find best match (using your existing logic)
    const cards = data.data
    const cardNameLower = cardName.toLowerCase()

    for (const card of cards) {
      const apiCardNameLower = (card.name || '').toLowerCase()
      const tcgid = (card.tcgid || '').toLowerCase()
      
      // Check for exact code match first
      if (cardNameLower.includes('swsh') || cardNameLower.includes('sv') || cardNameLower.includes('xy')) {
        if (tcgid.includes('swsh') || tcgid.includes('sv') || tcgid.includes('xy')) {
          return formatCardData(card, cardName)
        }
      }
      
      // Check for name match
      const cardTerms = cardNameLower.split(' ')
      const keyTerms = cardTerms.filter(term => term.length > 2 || ['v', 'x', 'ex'].includes(term))
      
      const nameMatches = keyTerms.filter(term => apiCardNameLower.includes(term)).length
      const idMatches = keyTerms.filter(term => tcgid.includes(term)).length
      
      if ((nameMatches + idMatches) >= 1) {
        return formatCardData(card, cardName)
      }
    }

    return null
  } catch (error) {
    console.error('Pokemon TCG API error:', error)
    return null
  }
}

function formatCardData(card: any, searchTerm: string) {
  const result = {
    title: `${card.name || searchTerm} (Pokemon TCG API)`,
    card_info: {
      name: card.name || searchTerm,
      set: card.episode?.name || 'Unknown Set',
      number: String(card.card_number || 'Unknown'),
      rarity: card.rarity || 'Unknown',
      artist: card.artist?.name || 'Unknown',
      hp: card.hp ? String(card.hp) : null,
      types: [],
      supertype: card.supertype || 'Unknown'
    },
    images: {} as any,
    tcgplayer_pricing: {} as any,
    cardmarket_pricing: {} as any,
    source: 'Pokemon TCG API',
    url: null as string | null,
    price: null as number | null
  }

  // Extract card images
  if (card.image) {
    result.images = {
      small: card.image,
      large: card.image
    }
  }

  // Extract pricing data
  if (card.prices) {
    const prices = card.prices

    // TCGPlayer pricing
    if (prices.tcg_player) {
      const tcgData = prices.tcg_player
      result.tcgplayer_pricing = {
        url: card.tcggo_url || '',
        updated_at: '',
        prices: {
          normal: {
            market: tcgData.market_price,
            mid: tcgData.mid_price,
            low: null,
            high: null,
            directLow: null
          }
        }
      }

      if (tcgData.market_price) {
        result.price = parseFloat((tcgData.market_price / 1.17).toFixed(2)) // EUR to GBP
        result.url = result.tcgplayer_pricing.url
      }
    }

    // CardMarket pricing
    if (prices.cardmarket) {
      const cmData = prices.cardmarket
      result.cardmarket_pricing = {
        url: card.tcggo_url || '',
        updated_at: '',
        prices: {
          trendPrice: cmData['30d_average'],
          averageSellPrice: cmData['30d_average'],
          lowPrice: cmData.lowest_near_mint,
          avg7: cmData['7d_average'],
          avg30: cmData['30d_average']
        }
      }

      if (!result.price && cmData['30d_average']) {
        result.price = parseFloat((cmData['30d_average'] / 1.17).toFixed(2)) // EUR to GBP
        result.url = result.cardmarket_pricing.url
      }
    }
  }

  return result
} 