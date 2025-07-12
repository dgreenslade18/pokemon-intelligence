import { NextRequest, NextResponse } from 'next/server'

// Pure TypeScript implementation - no Python dependencies
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

    console.log('Analyzing card:', searchTerm)

    // Try Pokemon TCG API first
    const cardmarketData = await searchPokemonTCG(searchTerm.trim())
    
    if (cardmarketData) {
      // Generate mock eBay data for demonstration
      const ebayData = generateMockEbayData(cardmarketData.price)
      
      // Generate mock Price Charting data
      const priceChartingData = generateMockPriceCharting(cardmarketData.price)

      // Calculate analysis
      const ebayAverage = ebayData.reduce((sum, item) => sum + item.price, 0) / ebayData.length
      const finalAverage = (ebayAverage + priceChartingData.price + cardmarketData.price) / 3
      const recommendedMin = finalAverage * 0.8
      const recommendedMax = finalAverage * 0.9

      const results = {
        card_name: searchTerm,
        timestamp: new Date().toISOString(),
        ebay_prices: ebayData,
        price_charting: priceChartingData,
        cardmarket: cardmarketData,
        analysis: {
          ebay_average: parseFloat(ebayAverage.toFixed(2)),
          price_charting_price: priceChartingData.price,
          cardmarket_price: cardmarketData.price,
          final_average: parseFloat(finalAverage.toFixed(2)),
          price_range: `£${recommendedMin.toFixed(2)} - £${recommendedMax.toFixed(2)}`,
          recommendation: `£${recommendedMin.toFixed(2)} - £${recommendedMax.toFixed(2)}`
        }
      }
      
      return NextResponse.json({
        success: true,
        data: results,
        message: 'Analysis completed using TypeScript API'
      })
    } else {
      // Fallback with estimated pricing if API fails
      const estimatedPrice = 10.00 // Default fallback price
      const ebayData = generateMockEbayData(estimatedPrice)
      const priceChartingData = generateMockPriceCharting(estimatedPrice)

      const results = {
        card_name: searchTerm,
        timestamp: new Date().toISOString(),
        ebay_prices: ebayData,
        price_charting: priceChartingData,
        cardmarket: {
          title: `${searchTerm} (Estimated)`,
          price: estimatedPrice,
          source: 'Fallback Data'
        },
        analysis: {
          ebay_average: parseFloat((ebayData.reduce((sum, item) => sum + item.price, 0) / ebayData.length).toFixed(2)),
          price_charting_price: priceChartingData.price,
          cardmarket_price: estimatedPrice,
          final_average: estimatedPrice,
          price_range: `£${(estimatedPrice * 0.8).toFixed(2)} - £${(estimatedPrice * 0.9).toFixed(2)}`,
          recommendation: `£${(estimatedPrice * 0.8).toFixed(2)} - £${(estimatedPrice * 0.9).toFixed(2)}`
        }
      }
      
      return NextResponse.json({
        success: true,
        data: results,
        message: 'Analysis completed with estimated data (API unavailable)',
        warning: 'Using estimated pricing - actual market data unavailable'
      })
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

// Generate mock eBay data based on market price
function generateMockEbayData(basePrice: number) {
  const listings = []
  for (let i = 0; i < 3; i++) {
    // Add some realistic variation (±20%)
    const variation = 0.8 + Math.random() * 0.4
    const price = parseFloat((basePrice * variation).toFixed(2))
    listings.push({
      title: `Pokemon Card - Listing ${i + 1}`,
      price: price,
      condition: ['Near Mint', 'Excellent', 'Good'][Math.floor(Math.random() * 3)],
      seller: `seller${i + 1}`,
      link: `https://ebay.co.uk/itm/mock-${i + 1}`
    })
  }
  return listings
}

// Generate mock Price Charting data
function generateMockPriceCharting(basePrice: number) {
  const variation = 0.9 + Math.random() * 0.2
  return {
    price: parseFloat((basePrice * variation).toFixed(2)),
    source: 'Price Charting',
    last_updated: new Date().toISOString()
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