import { NextRequest, NextResponse } from 'next/server'

// Vercel-compatible version - no Python child processes
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

    // For now, return the Pokemon TCG API data directly
    // This is the only part that was working properly in production
    const cardmarketData = await searchPokemonTCG(searchTerm.trim())

    // Mock eBay and Price Charting data for initial deployment
    // TODO: Implement proper TypeScript scrapers
    const mockEbayPrices = [
      { title: `${searchTerm} - Raw Card`, price: 15.99, source: 'eBay UK', url: 'https://ebay.co.uk' },
      { title: `${searchTerm} - Mint Condition`, price: 18.50, source: 'eBay UK', url: 'https://ebay.co.uk' },
      { title: `${searchTerm} - Near Mint`, price: 12.75, source: 'eBay UK', url: 'https://ebay.co.uk' }
    ]

    const mockPriceCharting = {
      title: `${searchTerm} (Price Charting)`,
      price: 16.25,
      source: 'Price Charting',
      url: 'https://pricecharting.com'
    }

    // Calculate analysis
    const ebayAverage = mockEbayPrices.reduce((sum, item) => sum + item.price, 0) / mockEbayPrices.length
    const finalAverage = cardmarketData?.price 
      ? (ebayAverage + mockPriceCharting.price + cardmarketData.price) / 3
      : (ebayAverage + mockPriceCharting.price) / 2

    const recommendation = `£${(finalAverage * 0.8).toFixed(2)} - £${(finalAverage * 0.9).toFixed(2)}`

    const results = {
      card_name: searchTerm,
      timestamp: new Date().toISOString(),
      ebay_prices: mockEbayPrices,
      price_charting: mockPriceCharting,
      cardmarket: cardmarketData,
      analysis: {
        ebay_average: parseFloat(ebayAverage.toFixed(2)),
        price_charting_price: mockPriceCharting.price,
        cardmarket_price: cardmarketData?.price || null,
        final_average: parseFloat(finalAverage.toFixed(2)),
        price_range: `£${Math.min(ebayAverage, mockPriceCharting.price, cardmarketData?.price || Infinity).toFixed(2)} - £${Math.max(ebayAverage, mockPriceCharting.price, cardmarketData?.price || 0).toFixed(2)}`,
        recommendation: recommendation
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    })

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
      const cardTerms = cardNameLower.split()
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