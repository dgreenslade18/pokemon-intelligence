import { NextRequest, NextResponse } from 'next/server'

// Types for our API responses
interface EbayItem {
  title: string
  price: number
  url: string
  source: string
  image?: string
  condition?: string
  soldDate?: string // For active listings, this is the end date
}

interface PriceSource {
  title: string
  price: number
  source: string
  url: string
}

interface CardDetails {
  id: string
  name: string
  number?: string
  set?: {
    id: string
    name: string
    series: string
    releaseDate: string
    total: number
  }
  images?: {
    small: string
    large: string
  }
  rarity?: string
  artist?: string
  types?: string[]
  hp?: number
  attacks?: Array<{
    name: string
    cost: string[]
    damage: string
    text: string
  }>
  weaknesses?: Array<{
    type: string
    value: string
  }>
  resistances?: Array<{
    type: string
    value: string
  }>
  retreatCost?: string[]
  convertedRetreatCost?: number
  subtypes?: string[]
  supertype?: string
  nationalPokedexNumbers?: number[]
  legalities?: {
    standard?: string
    expanded?: string
    unlimited?: string
  }
  tcgplayer?: {
    url: string
    updatedAt: string
    prices?: {
      normal?: {
        low: number
        mid: number
        high: number
        market: number
        directLow: number
      }
      holofoil?: {
        low: number
        mid: number
        high: number
        market: number
        directLow: number
      }
      reverseHolofoil?: {
        low: number
        mid: number
        high: number
        market: number
        directLow: number
      }
    }
  }
}

interface AnalysisResult {
  card_name: string
  timestamp: string
  ebay_prices: EbayItem[]
  cardmarket: PriceSource | null
  card_details: CardDetails | null  // Add rich card details
  analysis: {
    ebay_average: number
    cardmarket_price: number
    final_average: number
    price_range: string
    recommendation: string
  }
}

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

    // If streaming is requested, use Server-Sent Events
    if (streamProgress) {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()
          
          const sendProgress = (stage: string, message: string) => {
            const progressData = {
              type: 'progress',
              stage,
              message,
              timestamp: new Date().toISOString()
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`))
          }

          const sendComplete = (data: AnalysisResult) => {
            const completeData = {
              type: 'complete',
              data
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`))
            controller.close()
          }

          const sendError = (message: string) => {
            const errorData = {
              type: 'error',
              message
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
            controller.close()
          }

          // Start the analysis
          analyzeCard(searchTerm.trim(), sendProgress)
            .then(sendComplete)
            .catch(error => sendError(error.message))
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming fallback
    const results = await analyzeCard(searchTerm.trim())
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `Analysis completed for ${searchTerm}`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Script7 API Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to analyze card prices'
    }, { status: 500 })
  }
}

async function analyzeCard(
  cardName: string,
  sendProgress?: (stage: string, message: string) => void
): Promise<AnalysisResult> {
  
  const progress = sendProgress || (() => {})
  
  progress('starting', 'Initializing price analysis...')
  
  // Run searches in parallel - removed Price Charting
  const [ebayPrices, pokemonTcgResult] = await Promise.all([
    searchEbaySoldItems(cardName, progress),
    searchPokemonTcgApi(cardName, progress)
  ])

  progress('analysis', 'Calculating final analysis...')

  // Extract price source and card details
  const pokemonTcgData = pokemonTcgResult.priceSource
  const cardDetails = pokemonTcgResult.cardDetails

  // Calculate analysis
  const allPrices: number[] = []
  
  // Add eBay prices
  ebayPrices.forEach(item => allPrices.push(item.price))
  
  // Add Pokemon TCG API price
  if (pokemonTcgData) allPrices.push(pokemonTcgData.price)

  const ebayAverage = ebayPrices.length > 0 
    ? ebayPrices.reduce((sum, item) => sum + item.price, 0) / ebayPrices.length
    : 0

  const finalAverage = allPrices.length > 0 
    ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length
    : 0

  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0

  const result: AnalysisResult = {
    card_name: cardName,
    timestamp: new Date().toISOString(),
    ebay_prices: ebayPrices,
    cardmarket: pokemonTcgData,
    card_details: cardDetails,
    analysis: {
      ebay_average: parseFloat(ebayAverage.toFixed(2)),
      cardmarket_price: pokemonTcgData?.price || 0,
      final_average: parseFloat(finalAverage.toFixed(2)),
      price_range: allPrices.length > 0 ? `£${minPrice.toFixed(2)} - £${maxPrice.toFixed(2)}` : '£0.00 - £0.00',
      recommendation: finalAverage > 0 ? `£${(finalAverage * 0.8).toFixed(2)} - £${(finalAverage * 0.9).toFixed(2)}` : 'No data available'
    }
  }

  progress('complete', 'Analysis complete!')
  return result
}

async function searchEbaySoldItems(
  cardName: string,
  progress: (stage: string, message: string) => void
): Promise<EbayItem[]> {
  progress('ebay', 'Searching eBay for sold items...')
  
  try {
    // Check if we have RapidAPI key for sold items API
    const rapidApiKey = process.env.RAPID_API_KEY
    
    if (rapidApiKey) {
      return await searchEbayWithApi(cardName, '', rapidApiKey)
    } else {
      console.log('⚠️  No RAPID_API_KEY found, falling back to web scraping')
      // Fallback to web scraping as before
      return await searchEbayWithScraping(cardName)
    }
  } catch (error) {
    console.error('eBay search failed:', error)
    return []
  }
}

// Function to simplify complex card names for eBay searching
function simplifyCardNameForEbay(cardName: string): string[] {
  // Remove common filler words and create multiple search variations
  const fillerWords = ['with', 'the', 'of', 'and', 'in', 'on', 'at', 'for', 'to', 'from']
  
  // Common recent Pokemon sets that sellers often include
  const popularSets = [
    'stellar crown', 'paldean fates', 'paradox rift', 'obsidian flames', 
    'silver tempest', 'lost origin', 'brilliant stars', 'fusion strike',
    'evolving skies', 'chilling reign', 'battle styles', 'vivid voltage',
    'darkness ablaze', 'rebel clash', 'sword shield', 'crown zenith',
    'scarlet violet', 'pokemon 151', 'twilight masquerade'
  ]
  
  // Check if this looks like a simple card name with number (like "Squirtle 148")
  const isSimpleNumberCard = /^[A-Za-z\s]+\s+\d+$/.test(cardName.trim())
  
  const variations = []
  
  // For simple number cards (like "Squirtle 148"), keep the number initially
  if (isSimpleNumberCard) {
    const pokemonName = cardName.replace(/\s+\d+$/, '').trim()
    const cardNumber = cardName.match(/\d+$/)?.[0] || ''
    
    // 1. Try with specific sets first (most likely to be accurate)
    variations.push(`${pokemonName} ${cardNumber} stellar crown`)
    variations.push(`${pokemonName} ${cardNumber} paldean fates`)
    variations.push(`${pokemonName} ${cardNumber} pokemon 151`)
    variations.push(`${pokemonName} ${cardNumber} sv`)
    
    // 2. Try with card number but generic terms
    variations.push(`${cardName} pokemon card`)
    variations.push(`${cardName} pokemon`)
    
    // 3. Try exact search as seller might list it
    variations.push(cardName.trim())
    
    // 4. Fallback to just Pokemon name (but less preferred)
    variations.push(pokemonName)
  } else {
    // For complex names, use existing logic
    let simplified = cardName
      .replace(/\s+#?\d+$/, '') // Remove card numbers like "#85" or "85" at end
      .replace(/\([^)]*\)/g, '') // Remove anything in parentheses
      .trim()
    
    // Create search variations in order of specificity
    
    // 1. Keep key descriptive words (remove common fillers)
    const keyWords = simplified.split(' ').filter(word => 
      !fillerWords.includes(word.toLowerCase()) && word.length > 2
    )
    if (keyWords.length > 1) {
      variations.push(keyWords.join(' '))
    }
    
    // 2. Just the Pokemon name + main descriptor
    const words = simplified.split(' ')
    if (words.length >= 2) {
      variations.push(`${words[0]} ${words[words.length - 1]}`) // First + Last word
    }
    
    // 3. Just the Pokemon name
    variations.push(words[0])
  }
  
  // Remove duplicates and return
  return Array.from(new Set(variations))
}

async function searchEbayWithApi(
  cardName: string,
  appId: string,
  token: string
): Promise<EbayItem[]> {
  try {
    console.log(`🔍 eBay Sold Items API: Searching for "${cardName}" sold items...`)
    
    // Get simplified search terms for eBay
    const simplifiedSearches = simplifyCardNameForEbay(cardName)
    console.log(`🎯 eBay search variations:`, simplifiedSearches)
    
    // Try each search variation until we find results
    for (const searchTerm of simplifiedSearches) {
      // Don't add "pokemon card" if the search term already contains "pokemon"
      const searchQuery = searchTerm.toLowerCase().includes('pokemon') 
        ? searchTerm 
        : `${searchTerm} pokemon card`
      
      console.log(`🔍 Trying eBay search: "${searchQuery}"`)
      
      const results = await performEbaySearch(searchQuery)
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} results with search: "${searchQuery}"`)
        return results
      }
    }
    
    console.log(`⚠️  No sold items found with any search variation for "${cardName}"`)
    return []
    
  } catch (error) {
    console.error('❌ eBay Sold Items API search failed:', error)
    return []
  }
}

async function performEbaySearch(searchQuery: string): Promise<EbayItem[]> {
  try {
    // Using the eBay Sold Items API via RapidAPI (ecommet version)
    const url = 'https://ebay-average-selling-price.p.rapidapi.com/findCompletedItems'
    
    const requestBody = {
      keywords: searchQuery,
      max_search_results: 25, // We'll filter to 3 most recent
      excluded_keywords: "graded psa bgs cgc ace sgc hga gma gem mint 10 mint 9 pristine perfect", // Exclude all graded items
      site_id: "3", // UK eBay site
      remove_outliers: true,
      aspects: [
        {
          name: "LH_Auction",
          value: "1" // Auction only
        }
      ]
    }
    
    console.log(`📡 eBay Sold Items API Request:`, JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Host': 'ebay-average-selling-price.p.rapidapi.com',
        'X-RapidAPI-Key': process.env.RAPID_API_KEY || ''
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log(`🌐 eBay Sold Items API Response Status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ eBay Sold Items API Error: ${response.status} - ${errorText}`)
      return [] // Return empty array instead of throwing
    }
    
    const data = await response.json()
    console.log(`📦 eBay Sold Items API Response: ${data.results || 0} sold items found`)
    console.log(`💰 Average sold price: £${data.average_price || 0}`)
    
    if (!data.success || !data.products || data.products.length === 0) {
      return [] // Return empty array if no results
    }
    
    // Sort by date sold (most recent first) and take top 3
    const sortedProducts = data.products
      .sort((a: any, b: any) => new Date(b.date_sold).getTime() - new Date(a.date_sold).getTime())
      .slice(0, 3)
    
    const results = sortedProducts.map((item: any) => ({
      title: item.title,
      price: parseFloat(item.sale_price),
      url: item.link,
      source: 'eBay (Sold)',
      condition: 'Used/Ungraded',
      soldDate: item.date_sold
    }))
    
    console.log(`✅ eBay Search Found: ${results.length} recent sold items`)
    if (results.length > 0) {
      console.log(`🎯 Price range: £${Math.min(...results.map(r => r.price))} - £${Math.max(...results.map(r => r.price))}`)
    }
    
    return results
    
  } catch (error) {
    console.error('❌ eBay API search error:', error)
    return []
  }
}

async function searchEbayWithScraping(cardName: string): Promise<EbayItem[]> {
  try {
    // Fallback to basic scraping - simplified version
    const searchQuery = encodeURIComponent(`${cardName} pokemon card`)
    const url = `https://www.ebay.co.uk/sch/i.html?_nkw=${searchQuery}&_sacat=0&LH_Sold=1&LH_Complete=1&rt=nc&_ipg=50`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`eBay scraping failed: ${response.status}`)
    }

    const html = await response.text()
    
    // Simple regex to extract prices - this is a basic fallback
    const priceRegex = /£([\d,]+\.?\d*)/g
    const titleRegex = /<h3[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([^<]+)</g
    
    const prices: RegExpExecArray[] = []
    const titles: RegExpExecArray[] = []
    
    let priceMatch: RegExpExecArray | null
    let titleMatch: RegExpExecArray | null
    
    // Extract prices
    while ((priceMatch = priceRegex.exec(html)) !== null && prices.length < 3) {
      prices.push(priceMatch)
    }
    
    // Extract titles
    while ((titleMatch = titleRegex.exec(html)) !== null && titles.length < 3) {
      titles.push(titleMatch)
    }
    
    const items: EbayItem[] = []
    
    for (let i = 0; i < Math.min(prices.length, titles.length); i++) {
      const price = parseFloat(prices[i][1].replace(',', ''))
      const title = titles[i][1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      
      if (price > 0 && price < 10000) {
        items.push({
          title: title || `${cardName} - eBay Listing`,
          price,
          url: 'https://www.ebay.co.uk',
          source: 'eBay UK (Sold Auctions)'
        })
      }
    }
    
    return items
    
  } catch (error) {
    console.error('eBay scraping failed:', error)
    return []
  }
}

async function searchPokemonTcgApi(
  cardName: string,
  progress: (stage: string, message: string) => void
): Promise<{ priceSource: PriceSource | null, cardDetails: CardDetails | null }> {
  progress('cardmarket', 'Searching Pokemon TCG API...')
  
  try {
    // Use the same successful logic as the autocomplete
    let searchTerm = cardName.trim()
    
    // Check if search term contains a number (card number) first
    const cardNumberMatch = searchTerm.match(/^(.+?)\s+(\d+)$/)
    // Check if search term contains alphanumeric promo codes
    const promoCodeMatch = searchTerm.match(/^(.+?)\s+([a-zA-Z]+\d+|[a-zA-Z]{2}\d+)$/i)
    let searchQuery: string
    
    if (cardNumberMatch) {
      // Search for card name AND card number - use original card name without transformations
      const baseCardName = cardNumberMatch[1].trim()
      const cardNumber = cardNumberMatch[2].trim()
      
      if (baseCardName.includes(' ')) {
        // Multi-word card name with number
        const words = baseCardName.split(' ')
        const nameQueries = words.map(word => `name:*${word}*`).join(' AND ')
        searchQuery = `(${nameQueries}) AND number:${cardNumber}`
      } else {
        // Single word card name with number
        searchQuery = `name:${baseCardName}* AND number:${cardNumber}`
      }
    } else if (promoCodeMatch) {
      // Handle promo codes like "gg10", "ex", "v", etc.
      const baseCardName = promoCodeMatch[1].trim()
      const promoCode = promoCodeMatch[2].trim()
      
      // For promo cards, try the exact search first, then fall back to base name
      // This handles cases like "mew gg10" which might not exist as exact matches
      searchQuery = `name:*${baseCardName}*`
    } else {
      // Apply transformations for general searches (no specific card number)
      if (searchTerm.toLowerCase().includes(' ex ') || searchTerm.toLowerCase().endsWith(' ex')) {
        // For EX cards, try both formats
        searchTerm = searchTerm.replace(/ ex$/i, '-EX').replace(/ ex /gi, '-EX ')
      }
      
      if (searchTerm.includes(' ')) {
        // Multi-word search without card number
        const words = searchTerm.split(' ')
        const nameQueries = words.map(word => `name:*${word}*`).join(' AND ')
        searchQuery = nameQueries
      } else {
        // Single word search
        searchQuery = `name:${searchTerm}*`
      }
    }
    
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(searchQuery)}&pageSize=10`
    
    console.log(`🔍 Pokemon TCG API Search: "${cardName}" -> "${searchQuery}"`)
    console.log(`📡 Pokemon TCG API URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PokemonIntelligence/1.0'
      }
    })

    console.log(`🌐 Pokemon TCG API Response Status: ${response.status}`)

    if (!response.ok) {
      console.error(`❌ Pokemon TCG API Error: ${response.status}`)
      throw new Error(`Pokemon TCG API returned ${response.status}`)
    }

    const data = await response.json()
    console.log(`📦 Pokemon TCG API Response: ${data.data?.length || 0} cards found`)
    
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const card = data.data[0]
      console.log(`🎯 First card: ${card.name} (${card.set?.name || 'Unknown Set'})`)
      
      // Extract card details
      const cardDetails: CardDetails = {
        id: card.id,
        name: card.name,
        number: card.number,
        set: card.set ? {
          id: card.set.id,
          name: card.set.name,
          series: card.set.series,
          releaseDate: card.set.releaseDate,
          total: card.set.total
        } : undefined,
        images: card.images ? {
          small: card.images.small,
          large: card.images.large
        } : undefined,
        rarity: card.rarity,
        artist: card.artist,
        types: card.types,
        hp: card.hp,
        attacks: card.attacks,
        weaknesses: card.weaknesses,
        resistances: card.resistances,
        retreatCost: card.retreatCost,
        convertedRetreatCost: card.convertedRetreatCost,
        subtypes: card.subtypes,
        supertype: card.supertype,
        nationalPokedexNumbers: card.nationalPokedexNumbers,
        legalities: card.legalities,
        tcgplayer: card.tcgplayer
      }
      
      // Extract pricing if available
      let priceSource: PriceSource | null = null
      if (card.tcgplayer && card.tcgplayer.prices) {
        const prices = card.tcgplayer.prices
        console.log(`💰 TCGPlayer prices available:`, Object.keys(prices))
        
        // Try different price types
        let usdPrice = null
        
        if (prices.normal && prices.normal.market) {
          usdPrice = prices.normal.market
          console.log(`💵 Normal market price: $${usdPrice}`)
        } else if (prices.holofoil && prices.holofoil.market) {
          usdPrice = prices.holofoil.market
          console.log(`✨ Holofoil market price: $${usdPrice}`)
        } else if (prices.reverseHolofoil && prices.reverseHolofoil.market) {
          usdPrice = prices.reverseHolofoil.market
          console.log(`🔄 Reverse holofoil market price: $${usdPrice}`)
        }
        
        if (usdPrice) {
          const gbpPrice = usdPrice * 0.79 // Convert USD to GBP
          console.log(`✅ Pokemon TCG API price: $${usdPrice} USD = £${gbpPrice.toFixed(2)} GBP`)
          
          priceSource = {
            title: `${card.name || cardName} (Pokemon TCG API)`,
            price: parseFloat(gbpPrice.toFixed(2)),
            source: 'Pokemon TCG API',
            url: card.tcgplayer?.url || 'https://pokemontcg.io'
          }
        }
      }
      
      if (!priceSource) {
        console.log(`📊 Card found but no TCGPlayer pricing available`)
        priceSource = {
          title: `${card.name || cardName} (Pokemon TCG API)`,
          price: 0,
          source: 'Pokemon TCG API',
          url: 'https://pokemontcg.io'
        }
      }
      
      return {
        priceSource,
        cardDetails
      }
    }
    
    console.log(`❌ No cards found for query: "${searchQuery}"`)
    return {
      priceSource: null,
      cardDetails: null
    }
    
  } catch (error) {
    console.error('Pokemon TCG API search failed:', error)
    return {
      priceSource: null,
      cardDetails: null
    }
  }
}