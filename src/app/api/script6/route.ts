import { NextResponse } from 'next/server'

interface VintagePackData {
  name: string
  set: string
  edition: string
  condition: string
  prices: {
    loosePacks: number | null
    ebayAverage: number | null
    tcgPlayer: number | null
  }
  priceHistory: {
    date: string
    price: number
    source: string
  }[]
  availability: {
    loosePacks: boolean
    ebayRecent: number
    tcgPlayerStock: number
  }
  marketTrend: 'up' | 'down' | 'stable'
  lastUpdated: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sets = searchParams.get('sets')?.split(',') || []
  
  try {
    // Mock data representing scraped prices from multiple sources
    const mockVintageData: VintagePackData[] = [
      {
        name: "Base Set Shadowless",
        set: "Base Set",
        edition: "Shadowless",
        condition: "Light Play",
        prices: {
          loosePacks: 825.00, // Converted from LoosePacks $1,100 USD
          ebayAverage: 750.00, // Average from recent eBay sales
          tcgPlayer: 799.99    // TCGPlayer market price
        },
        priceHistory: [
          { date: "2025-01-15", price: 720.00, source: "eBay" },
          { date: "2025-01-10", price: 799.99, source: "TCGPlayer" },
          { date: "2025-01-05", price: 825.00, source: "LoosePacks" }
        ],
        availability: {
          loosePacks: true,
          ebayRecent: 12,
          tcgPlayerStock: 3
        },
        marketTrend: 'up',
        lastUpdated: new Date().toISOString()
      },
      {
        name: "Base Set Unlimited",
        set: "Base Set",
        edition: "Unlimited",
        condition: "Near Mint",
        prices: {
          loosePacks: 337.50, // Converted from LoosePacks $449 USD
          ebayAverage: 315.00,
          tcgPlayer: 349.99
        },
        priceHistory: [
          { date: "2025-01-15", price: 315.00, source: "eBay" },
          { date: "2025-01-10", price: 349.99, source: "TCGPlayer" },
          { date: "2025-01-05", price: 337.50, source: "LoosePacks" }
        ],
        availability: {
          loosePacks: true,
          ebayRecent: 28,
          tcgPlayerStock: 7
        },
        marketTrend: 'stable',
        lastUpdated: new Date().toISOString()
      },
      {
        name: "Jungle 1st Edition",
        set: "Jungle",
        edition: "1st Edition",
        condition: "Near Mint",
        prices: {
          loosePacks: 281.25, // Converted from LoosePacks $375 USD
          ebayAverage: 265.00,
          tcgPlayer: 289.99
        },
        priceHistory: [
          { date: "2025-01-15", price: 265.00, source: "eBay" },
          { date: "2025-01-10", price: 289.99, source: "TCGPlayer" },
          { date: "2025-01-05", price: 281.25, source: "LoosePacks" }
        ],
        availability: {
          loosePacks: true,
          ebayRecent: 15,
          tcgPlayerStock: 4
        },
        marketTrend: 'up',
        lastUpdated: new Date().toISOString()
      },
      {
        name: "Fossil 1st Edition",
        set: "Fossil",
        edition: "1st Edition",
        condition: "Near Mint",
        prices: {
          loosePacks: 243.75, // Converted from LoosePacks $325 USD
          ebayAverage: 225.00,
          tcgPlayer: 249.99
        },
        priceHistory: [
          { date: "2025-01-15", price: 225.00, source: "eBay" },
          { date: "2025-01-10", price: 249.99, source: "TCGPlayer" },
          { date: "2025-01-05", price: 243.75, source: "LoosePacks" }
        ],
        availability: {
          loosePacks: true,
          ebayRecent: 22,
          tcgPlayerStock: 6
        },
        marketTrend: 'stable',
        lastUpdated: new Date().toISOString()
      },
      {
        name: "Team Rocket 1st Edition",
        set: "Team Rocket",
        edition: "1st Edition",
        condition: "Near Mint",
        prices: {
          loosePacks: 449.25, // Converted from LoosePacks $599 USD
          ebayAverage: 420.00,
          tcgPlayer: 459.99
        },
        priceHistory: [
          { date: "2025-01-15", price: 420.00, source: "eBay" },
          { date: "2025-01-10", price: 459.99, source: "TCGPlayer" },
          { date: "2025-01-05", price: 449.25, source: "LoosePacks" }
        ],
        availability: {
          loosePacks: true,
          ebayRecent: 8,
          tcgPlayerStock: 2
        },
        marketTrend: 'up',
        lastUpdated: new Date().toISOString()
      },
      {
        name: "Fossil Unlimited",
        set: "Fossil",
        edition: "Unlimited",
        condition: "Near Mint",
        prices: {
          loosePacks: 171.75, // Converted from LoosePacks $229 USD
          ebayAverage: 155.00,
          tcgPlayer: 179.99
        },
        priceHistory: [
          { date: "2025-01-15", price: 155.00, source: "eBay" },
          { date: "2025-01-10", price: 179.99, source: "TCGPlayer" },
          { date: "2025-01-05", price: 171.75, source: "LoosePacks" }
        ],
        availability: {
          loosePacks: true,
          ebayRecent: 35,
          tcgPlayerStock: 12
        },
        marketTrend: 'down',
        lastUpdated: new Date().toISOString()
      },
      {
        name: "Gym Heroes 1st Edition",
        set: "Gym Heroes",
        edition: "1st Edition",
        condition: "Near Mint",
        prices: {
          loosePacks: 321.75, // Converted from LoosePacks $429 USD
          ebayAverage: 295.00,
          tcgPlayer: 329.99
        },
        priceHistory: [
          { date: "2025-01-15", price: 295.00, source: "eBay" },
          { date: "2025-01-10", price: 329.99, source: "TCGPlayer" },
          { date: "2025-01-05", price: 321.75, source: "LoosePacks" }
        ],
        availability: {
          loosePacks: true,
          ebayRecent: 6,
          tcgPlayerStock: 1
        },
        marketTrend: 'up',
        lastUpdated: new Date().toISOString()
      },
      {
        name: "Neo Genesis 1st Edition",
        set: "Neo Genesis",
        edition: "1st Edition",
        condition: "Near Mint",
        prices: {
          loosePacks: 411.75, // Converted from LoosePacks $549 USD
          ebayAverage: 380.00,
          tcgPlayer: 419.99
        },
        priceHistory: [
          { date: "2025-01-15", price: 380.00, source: "eBay" },
          { date: "2025-01-10", price: 419.99, source: "TCGPlayer" },
          { date: "2025-01-05", price: 411.75, source: "LoosePacks" }
        ],
        availability: {
          loosePacks: true,
          ebayRecent: 4,
          tcgPlayerStock: 2
        },
        marketTrend: 'stable',
        lastUpdated: new Date().toISOString()
      }
    ]

    // Filter by requested sets if provided
    let filteredData = mockVintageData
    if (sets.length > 0) {
      filteredData = mockVintageData.filter(pack => 
        sets.some(set => pack.set.toLowerCase().includes(set.toLowerCase()))
      )
    }

    // Calculate analytics
    const analytics = {
      totalPacks: filteredData.length,
      averagePrice: filteredData.reduce((sum, pack) => {
        const prices = [pack.prices.loosePacks, pack.prices.ebayAverage, pack.prices.tcgPlayer]
          .filter(p => p !== null) as number[]
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
        return sum + avgPrice
      }, 0) / filteredData.length,
      bestDeals: filteredData.map(pack => {
        const prices = [pack.prices.loosePacks, pack.prices.ebayAverage, pack.prices.tcgPlayer]
          .filter(p => p !== null) as number[]
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        return {
          name: pack.name,
          savings: maxPrice - minPrice,
          bestSource: pack.prices.loosePacks === minPrice ? 'LoosePacks' : 
                     pack.prices.ebayAverage === minPrice ? 'eBay' : 'TCGPlayer',
          bestPrice: minPrice
        }
      }).filter(deal => deal.savings > 20).sort((a, b) => b.savings - a.savings).slice(0, 5),
      marketTrends: {
        up: filteredData.filter(pack => pack.marketTrend === 'up').length,
        down: filteredData.filter(pack => pack.marketTrend === 'down').length,
        stable: filteredData.filter(pack => pack.marketTrend === 'stable').length
      },
      platformAvailability: {
        loosePacks: filteredData.filter(pack => pack.availability.loosePacks).length,
        ebayActive: filteredData.filter(pack => pack.availability.ebayRecent > 0).length,
        tcgPlayerStock: filteredData.filter(pack => pack.availability.tcgPlayerStock > 0).length
      }
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
      analytics,
      lastUpdated: new Date().toISOString(),
      sources: {
        loosePacks: "https://loosepacks.com/collections/wotc",
        ebay: "eBay sold listings (last 30 days)",
        tcgPlayer: "https://www.tcgplayer.com/search/pokemon"
      },
      disclaimer: "Prices converted to GBP using current exchange rates. eBay prices are averages from recent sold listings. Always verify current prices before purchasing."
    })

  } catch (error) {
    console.error('Error fetching vintage pack data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vintage pack data' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, sets } = body

    if (action === 'scrape') {
      // Simulate scraping process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real implementation, this would:
      // 1. Scrape LoosePacks.com for WOTC prices
      // 2. Query eBay API for recent sold listings
      // 3. Check TCGPlayer for current market prices
      // 4. Convert all prices to GBP
      // 5. Calculate trends and analytics

      return NextResponse.json({
        success: true,
        message: 'Scraping completed successfully',
        timestamp: new Date().toISOString(),
        scrapedSources: ['LoosePacks', 'eBay', 'TCGPlayer'],
        packsFound: 25,
        priceUpdates: 18
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in vintage pack scraping:', error)
    return NextResponse.json(
      { error: 'Failed to process vintage pack request' },
      { status: 500 }
    )
  }
} 