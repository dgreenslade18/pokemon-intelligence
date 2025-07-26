import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { getUserPreferences, UserPreferences } from '../../../lib/db'
import { capitalizeCardName } from '../../../lib/utils'
import pokemonDB from '../../../../lib/pokemon-database'
import smartPriceCache from '../../../../lib/smart-price-cache'

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
    // Multi-value pricing
    buy_value?: number
    trade_value?: number
    cash_value?: number
    // Legacy recommendation for backward compatibility
    recommendation: string
    // New multi-value recommendations
    pricing_strategy?: {
      show_buy_value: boolean
      show_trade_value: boolean
      show_cash_value: boolean
      buy_price?: string
      trade_price?: string
      cash_price?: string
    }
    // Whatnot pricing strategy
    whatnot_pricing?: {
      net_proceeds_at_market: string
      price_to_charge_for_market: string
      fees_percentage: number
    }
    // Promo and Sealed info
    promo_info?: PromoInfo
    filtered_ebay_results?: FilteredEbayResults
  }
}

// Add new interfaces for promo detection and filtering
interface PromoInfo {
  isPromo: boolean
  promoType?: 'black_star' | 'cosmic_eclipse' | 'other'
  isSealed: boolean
  sealedKeywords: string[]
}

interface FilteredEbayResults {
  sealed: EbayItem[]
  unsealed: EbayItem[]
  promoInfo: PromoInfo
}

// Simple in-memory cache (resets when server restarts)
const cache = new Map<string, { data: AnalysisResult; timestamp: number }>()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

function getCachedResult(cardName: string): AnalysisResult | null {
  const key = cardName.toLowerCase().trim()
  const cached = cache.get(key)
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`📋 Cache hit for: ${cardName}`)
    return cached.data
  }
  
  return null
}

function setCachedResult(cardName: string, data: AnalysisResult): void {
  const key = cardName.toLowerCase().trim()
  cache.set(key, { data, timestamp: Date.now() })
  console.log(`💾 Cached result for: ${cardName}`)
}

export async function POST(request: NextRequest) {
  try {
    let searchTerm, streamProgress = false, refresh = false
    
    try {
      const body = await request.json()
      searchTerm = body.searchTerm
      streamProgress = body.streamProgress || false
      refresh = body.refresh || false
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }
    
    console.log(`🔍 Script7 Request - searchTerm: "${searchTerm}", streamProgress: ${streamProgress}, refresh: ${refresh}`)
    
    if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
      console.error('❌ Invalid search term:', searchTerm)
      return NextResponse.json({ error: 'Search term is required and must be a non-empty string' }, { status: 400 })
    }

    // Get user session and preferences
    const session = await getServerSession(authOptions)
    
    console.log(`🔐 Session check - User ID: ${session?.user?.id || 'None'}`)
    
    if (!session?.user?.id) {
      console.error('❌ Authentication failed - no valid session')
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 })
    }

    const userPreferences = await getUserPreferences(session.user.id)

    // Check cache first (unless refresh is requested)
    if (!refresh) {
    const cachedResult = getCachedResult(searchTerm)
    if (cachedResult) {
      return NextResponse.json({
        success: true,
        data: cachedResult,
        message: `Analysis completed for ${searchTerm} (cached)`,
        timestamp: new Date().toISOString()
      })
      }
    } else {
      // Clear cache for this search term if refresh is requested
      const key = searchTerm.toLowerCase().trim()
      cache.delete(key)
      console.log(`🗑️  Cache cleared for: ${searchTerm}`)
    }

    if (streamProgress) {
      // Check cache first for streaming too (unless refresh is requested)
      if (!refresh) {
      const cachedResult = getCachedResult(searchTerm)
      if (cachedResult) {
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder()
            
            const completeData = {
              type: 'complete',
              data: cachedResult
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`))
            controller.close()
          }
        })
        
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        })
        }
      } else {
        // Clear cache for this search term if refresh is requested
        const key = searchTerm.toLowerCase().trim()
        cache.delete(key)
        console.log(`🗑️  Cache cleared for streaming: ${searchTerm}`)
      }

      // Streaming response
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

          const sendPartial = (partialData: Partial<AnalysisResult>) => {
            const partialUpdate = {
              type: 'partial',
              data: partialData,
              timestamp: new Date().toISOString()
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(partialUpdate)}\n\n`))
          }

          const sendComplete = (data: AnalysisResult) => {
            // Cache the result
            setCachedResult(searchTerm, data)
            
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
          analyzeCard(searchTerm, userPreferences, sendProgress, sendPartial)
            .then(sendComplete)
            .catch(error => sendError(error.message))
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    } else {
      // Non-streaming response
      const result = await analyzeCard(searchTerm, userPreferences)
      
      // Cache the result
      setCachedResult(searchTerm, result)
      
      return NextResponse.json({
        success: true,
        data: result,
        message: `Analysis completed for ${searchTerm}`,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error in script7 API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function analyzeCard(
  cardName: string,
  userPreferences: UserPreferences,
  sendProgress?: (stage: string, message: string) => void,
  sendPartial?: (partialData: Partial<AnalysisResult>) => void
): Promise<AnalysisResult> {
  
  const progress = sendProgress || (() => {})
  const sendPartialUpdate = sendPartial || (() => {})
  
  progress('starting', 'Initializing price analysis...')
  
  // Initialize base result structure
  let partialResult = {
    card_name: cardName,
    timestamp: new Date().toISOString(),
    ebay_prices: [],
    cardmarket: null,
    card_details: undefined,
    analysis: {}
  }
  
  // Send initial empty structure
  sendPartialUpdate(partialResult as Partial<AnalysisResult>)
  
  // Run eBay search first (faster)
  progress('ebay', 'Searching eBay sold items...')
  const ebayPrices = await searchEbaySoldItems(cardName, progress)
  
  // Calculate eBay average immediately
  const ebayAveragePrice = ebayPrices.length > 0 
    ? ebayPrices.reduce((sum, item) => sum + item.price, 0) / ebayPrices.length 
    : 0
  
  // Send eBay results as soon as they're available with calculated average
  partialResult.ebay_prices = ebayPrices
  partialResult.analysis = {
    ...partialResult.analysis,
    ebay_average: ebayAveragePrice
  }
  sendPartialUpdate(partialResult as Partial<AnalysisResult>)
  
  // Initialize local database
  await pokemonDB.initialize()
  
  // Search local database for card details (lightning fast)
  progress('cardmarket', 'Searching local card database...')
  const localResults = pokemonDB.search(cardName, 5) // Get more results to find exact match
  let localCardDetails: CardDetails | null = null
  let cardId: string | null = null
  
  if (localResults.length > 0) {
    // Log all found cards for debugging
    console.log(`🔍 Local search found ${localResults.length} cards:`)
    localResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.card.name} (${result.card.number}) from ${result.card.set?.name || 'Unknown Set'}`)
    })
    
    // Try to find exact match by card number if search term contains a specific number
    let card = localResults[0].card
    const searchTermUpper = cardName.toUpperCase()
    
    // Extract potential card numbers from search term (SWSH284, TG20, SV123, etc.)
    const cardNumberMatch = searchTermUpper.match(/(SWSH\d+|TG\d+|SV\d+\w*|[A-Z]{2,}\d+\w*)/g)
    
    if (cardNumberMatch && cardNumberMatch.length > 0) {
      const targetNumber = cardNumberMatch[0]
      console.log(`🎯 Looking for card number: ${targetNumber}`)
      
      const exactMatch = localResults.find(result => 
        result.card.number.toUpperCase() === targetNumber
      )
      
      if (exactMatch) {
        card = exactMatch.card
        console.log(`✅ Found exact card match: ${card.name} (${card.number}) from ${card.set?.name}`)
      } else {
        console.log(`⚠️ No exact match found for ${targetNumber}, using first result: ${card.name} (${card.number})`)
      }
    } else {
      console.log(`📝 No specific card number detected, using first result: ${card.name} (${card.number})`)
    }
    
    cardId = card.id
    
    // Convert local card to CardDetails format
    localCardDetails = {
      id: card.id,
      name: card.name,
      number: card.number,
      set: card.set ? {
        id: card.set.id || '',
        name: card.set.name,
        series: card.set.series || '',
        releaseDate: card.set.releaseDate,
        total: Number(card.set.total) || 0
      } : undefined,
      images: card.images,
      rarity: card.rarity,
      artist: card.artist,
      types: card.types,
      hp: card.hp ? Number(card.hp) : undefined,
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
    
    console.log(`⚡ Found card in local database: ${card.name} (${card.set?.name})`)
    
    // Send card details immediately
    partialResult.card_details = localCardDetails
    sendPartialUpdate(partialResult as Partial<AnalysisResult>)
  }

  // Get pricing using smart cache system
  progress('cardmarket', 'Fetching pricing data...')
  let priceSource: PriceSource | null = null
  
  if (cardId) {
    try {
      const smartPrice = await smartPriceCache.getPricing(cardId, cardName)
      if (smartPrice) {
        priceSource = {
          title: localCardDetails?.name || cardName,
          price: smartPrice.price,
          source: smartPrice.source,
          url: smartPrice.url
        }
        console.log(`💰 Smart cache provided price: £${smartPrice.price.toFixed(2)} from ${smartPrice.source}`)
      }
    } catch (error) {
      console.log(`⚠️ Smart cache failed, falling back to API: ${error}`)
    }
  }
  
  // Fallback to original API if smart cache fails
  if (!priceSource) {
    progress('cardmarket', 'Fetching Pokemon TCG API pricing...')
    const pokemonTcgResult = await searchPokemonTcgApi(cardName, progress)
    priceSource = pokemonTcgResult.priceSource
    
    // Update card details if we didn't get them locally
    if (!localCardDetails) {
      localCardDetails = pokemonTcgResult.cardDetails
    }
  }

  // Send final pricing results
  partialResult.cardmarket = priceSource
  if (!partialResult.card_details) {
    partialResult.card_details = localCardDetails
  }
  sendPartialUpdate(partialResult as Partial<AnalysisResult>)

  progress('analysis', 'Calculating final analysis...')

  // Extract price source and card details
  const pokemonTcgData = priceSource
  const finalCardDetails = localCardDetails

  // Detect promo and sealed status
  const promoInfo = detectPromoCard(finalCardDetails, cardName)
  const filteredEbayResults = filterEbayResultsBySealed(ebayPrices, promoInfo)

  // Calculate analysis
  const allPrices: number[] = []
  
  // Debug eBay prices
  console.log(`🔍 DEBUG - eBay Prices Array:`, JSON.stringify(ebayPrices, null, 2))
  console.log(`🔍 DEBUG - eBay Prices Count: ${ebayPrices.length}`)
  ebayPrices.forEach((item, index) => {
    console.log(`🔍 DEBUG - eBay Item ${index}: price=${item.price}, title="${item.title}"`)
  })
  
  // Add all eBay prices (both sealed and unsealed) for base calculation
  ebayPrices.forEach(item => {
    if (typeof item.price === 'number' && !isNaN(item.price)) {
      allPrices.push(item.price)
      console.log(`✅ Added price to allPrices: £${item.price}`)
    } else {
      console.log(`❌ Invalid price: ${item.price} (type: ${typeof item.price})`)
    }
  })
  
  // Add Pokemon TCG API price
  if (pokemonTcgData) {
    allPrices.push(pokemonTcgData.price)
    console.log(`✅ Added TCG price to allPrices: £${pokemonTcgData.price}`)
  }
  
  console.log(`🔍 DEBUG - All Prices Array: [${allPrices.join(', ')}]`)

  // Calculate eBay average from all results (not just unsealed)
  const ebayAverage = ebayPrices.length > 0 
    ? ebayPrices.reduce((sum, item) => {
        const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0
        console.log(`🔍 DEBUG - Adding to eBay average: ${price}`)
        return sum + price
      }, 0) / ebayPrices.length
    : 0
    
  console.log(`🔍 DEBUG - eBay Average Calculation: ${ebayAverage}`)

  const finalAverage = allPrices.length > 0 
    ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length
    : 0

  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0

  // Calculate multi-value pricing based on user preferences
  const buyValue = finalAverage
  const tradeValue = finalAverage * (userPreferences.trade_percentage / 100)
  const cashValue = finalAverage * (userPreferences.cash_percentage / 100)

  // Create pricing strategy display
  const pricingStrategy = {
    show_buy_value: userPreferences.show_buy_value,
    show_trade_value: userPreferences.show_trade_value,
    show_cash_value: userPreferences.show_cash_value,
    buy_price: buyValue > 0 ? `£${buyValue.toFixed(2)}` : undefined,
    trade_price: tradeValue > 0 ? `£${tradeValue.toFixed(2)} (${userPreferences.trade_percentage}%)` : undefined,
    cash_price: cashValue > 0 ? `£${cashValue.toFixed(2)} (${userPreferences.cash_percentage}%)` : undefined
  }

  // Calculate Whatnot pricing strategy
  const whatnotPricing = finalAverage > 0 ? {
    // Net proceeds after Whatnot fees if selling at market average
    net_proceeds_at_market: (() => {
      const exactAmount = finalAverage * (1 - userPreferences.whatnot_fees / 100)
      const roundedUp = Math.ceil(exactAmount)
      return `£${roundedUp} (£${exactAmount.toFixed(2)})`
    })(),
    // Price to charge to receive market average after fees
    price_to_charge_for_market: (() => {
      const exactAmount = finalAverage / (1 - userPreferences.whatnot_fees / 100)
      const roundedUp = Math.ceil(exactAmount)
      return `£${roundedUp} (£${exactAmount.toFixed(2)})`
    })(),
    fees_percentage: userPreferences.whatnot_fees
  } : undefined

  const result: AnalysisResult = {
    card_name: capitalizeCardName(cardName),
    timestamp: new Date().toISOString(),
    ebay_prices: ebayPrices,
    cardmarket: pokemonTcgData,
    card_details: finalCardDetails,
    analysis: {
      ebay_average: parseFloat(ebayAverage.toFixed(2)),
      cardmarket_price: pokemonTcgData?.price || 0,
      final_average: parseFloat(finalAverage.toFixed(2)),
      price_range: allPrices.length > 0 ? `£${minPrice.toFixed(2)} - £${maxPrice.toFixed(2)}` : '£0.00 - £0.00',
      // Multi-value pricing
      buy_value: buyValue > 0 ? parseFloat(buyValue.toFixed(2)) : undefined,
      trade_value: tradeValue > 0 ? parseFloat(tradeValue.toFixed(2)) : undefined,
      cash_value: cashValue > 0 ? parseFloat(cashValue.toFixed(2)) : undefined,
      // Legacy recommendation for backward compatibility
      recommendation: finalAverage > 0 ? `£${(finalAverage * 0.8).toFixed(2)} - £${(finalAverage * 0.9).toFixed(2)}` : 'No data available',
      // New pricing strategy
      pricing_strategy: pricingStrategy,
      // Whatnot pricing strategy
      whatnot_pricing: whatnotPricing,
      // Promo and Sealed info
      promo_info: promoInfo,
      filtered_ebay_results: filteredEbayResults
    }
  }

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
      const apiResults = await searchEbayWithApi(cardName, '', rapidApiKey)
      // If API returns empty results, try web scraping as fallback
      if (apiResults.length === 0) {
        console.log('⚠️  No results from RapidAPI, falling back to web scraping')
        return await searchEbayWithScraping(cardName)
      }
      return apiResults
    } else {
      console.log('⚠️  No RAPID_API_KEY found, falling back to web scraping')
      // Fallback to web scraping as before
      return await searchEbayWithScraping(cardName)
    }
  } catch (error) {
    console.error('eBay search failed:', error)
    // If RapidAPI fails, try web scraping as fallback
    const rapidApiKey = process.env.RAPID_API_KEY
    if (rapidApiKey) {
    console.log('⚠️  RapidAPI failed, falling back to web scraping')
      return await searchEbayWithApi(cardName, '', rapidApiKey)
    }
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
    
    // Try variations that match actual eBay listing formats
    variations.push(`${pokemonName} ${cardNumber}/191`) // Surging Sparks set format
    variations.push(`${pokemonName} ${cardNumber}/165`) // 151 set format
    variations.push(`${pokemonName} ${cardNumber} pokemon card`) // Generic format
    variations.push(`${pokemonName} ${cardNumber} scarlet violet`) // Set-specific
    variations.push(`${pokemonName} ${cardNumber} 151`) // Set number
    variations.push(cardName.trim()) // Exact match
    variations.push(pokemonName) // Fallback
  } else {
    // For complex names, use existing logic
    let simplified = cardName
      .replace(/\s+#?\d+$/, '') // Remove card numbers like "#85" or "85" at end
      .replace(/\([^)]*\)/g, '') // Remove anything in parentheses
      .trim()
    
    // Create optimized search variations
    const words = simplified.split(' ')
    
    // 1. Most specific: key descriptive words
    const keyWords = words.filter(word => 
      !fillerWords.includes(word.toLowerCase()) && word.length > 2
    )
    if (keyWords.length > 1) {
      variations.push(keyWords.join(' '))
    }
    
    // 2. Just the Pokemon name (most common)
    variations.push(words[0])
    
    // 3. First + Last word if different
    if (words.length >= 2 && words[0] !== words[words.length - 1]) {
      variations.push(`${words[0]} ${words[words.length - 1]}`)
    }
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
      // Don't add "pokemon card" if the search term already contains specific card info
      const hasCardInfo = searchTerm.toLowerCase().includes('pokemon') || 
                         searchTerm.includes('/165') || 
                         searchTerm.includes('/191') ||
                         searchTerm.includes('151') ||
                         searchTerm.includes('scarlet violet')
      
      const searchQuery = hasCardInfo ? searchTerm : `${searchTerm} pokemon card`
      
      console.log(`🔍 Trying eBay search: "${searchQuery}"`)
      
      const results = await performEbaySearch(searchQuery)
      console.log(`📊 Search "${searchQuery}" returned ${results.length} results`)
      
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
      max_search_results: 15,
      excluded_keywords: "graded psa bgs cgc ace sgc hga gma gem mint 10 mint 9 pristine perfect",
      site_id: "3", // UK site
      remove_outliers: true,
      aspects: [
        { name: "LH_Auction", value: "1" },
        { name: "LH_Sold", value: "1" },
        { name: "LH_Complete", value: "1" },
        { name: "LH_PrefLoc", value: "1" } // UK location only
      ]
    }
    
    console.log('🔍 DEBUG - API Request Filters:')
    console.log('Keywords:', searchQuery)
    console.log('Excluded keywords:', requestBody.excluded_keywords)
    console.log('Site ID:', requestBody.site_id)
    console.log('Aspects:', JSON.stringify(requestBody.aspects, null, 2))
    
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
      
      // Check if it's a quota exceeded error
      if (errorText.includes('exceeded the MONTHLY quota') || errorText.includes('exceeded the quota')) {
        console.log('⚠️  RapidAPI quota exceeded, throwing error to trigger fallback')
        throw new Error('RapidAPI quota exceeded')
      }
      
      return [] // Return empty array for other errors
    }
    
    const data = await response.json()
    console.log(`📦 eBay Sold Items API Response: ${data.results || 0} sold items found`)
    console.log(`💰 Average sold price: £${data.average_price || 0}`)
    
    // Debug: Log the raw API response
    console.log('🔍 DEBUG - Raw API Response:')
    console.log(JSON.stringify(data, null, 2))
    
    if (!data.success || !data.products || data.products.length === 0) {
      return [] // Return empty array if no results
    }
    
    // Debug: Log each product with details (sorted)
    console.log('🔍 DEBUG - Individual Products (Sorted by Date):')
    const sortedForDebug = data.products
      .sort((a: any, b: any) => new Date(b.date_sold).getTime() - new Date(a.date_sold).getTime())
      .slice(0, 15)
    
    sortedForDebug.forEach((item: any, index: number) => {
      console.log(`${index + 1}. Title: "${item.title}"`)
      console.log(`   Price: £${item.sale_price}`)
      console.log(`   Date: ${item.date_sold}`)
      console.log(`   URL: ${item.link}`)
      console.log(`   Full item data:`, JSON.stringify(item, null, 2))
      console.log('---')
    })
    
    // Debug: Log the sorting process
    console.log('🔍 DEBUG - Sorting Process:')
    console.log('Raw items before sorting:')
    data.products.slice(0, 5).forEach((item: any, index: number) => {
      console.log(`${index + 1}. Date: "${item.date_sold}" -> Timestamp: ${new Date(item.date_sold).getTime()}`)
    })
    
    // Sort by date sold (most recent first) and take top 4
    const sortedProducts = data.products
      .sort((a: any, b: any) => new Date(b.date_sold).getTime() - new Date(a.date_sold).getTime())
      .slice(0, 4)
    
    // Additional filtering to remove graded items and non-UK items that the API didn't filter
    const filteredProducts = sortedProducts.filter((item: any) => {
      const title = item.title.toLowerCase()
      const url = item.link.toLowerCase()
      
      // Check for graded keywords in title
      const gradedKeywords = ['graded', 'psa', 'bgs', 'cgc', 'ace', 'sgc', 'hga', 'gma', 'gem', 'mint 10', 'mint 9', 'pristine', 'perfect']
      const hasGradedKeywords = gradedKeywords.some(keyword => title.includes(keyword))
      
      // Check if it's a UK listing (should contain ebay.co.uk)
      const isUKListing = url.includes('ebay.co.uk')
      
      // Check if it's an auction (should contain LH_Auction=1)
      const isAuction = url.includes('lh_auction=1')
      
      // Check if URL is malformed (contains search parameters that redirect to product pages)
      const hasSearchParams = url.includes('_skw=') || url.includes('epid=')
      const isMalformedUrl = hasSearchParams
      
      // Check for suspiciously low prices (likely errors or different market)
      const price = parseFloat(item.sale_price)
      const isSuspiciouslyLow = price < 0.50 // Only filter out truly suspicious prices like £0.01
      
      console.log(`🔍 Filtering item: "${item.title}"`)
      console.log(`   Price: £${item.sale_price} (suspiciously low: ${isSuspiciouslyLow})`)
      console.log(`   Has graded keywords: ${hasGradedKeywords}`)
      console.log(`   Is UK listing: ${isUKListing}`)
      console.log(`   Is auction: ${isAuction}`)
      console.log(`   Is malformed URL: ${isMalformedUrl}`)
      
      // Filter out suspiciously low-priced items that are likely graded or from different markets
      return !hasGradedKeywords && isUKListing && isAuction && !isSuspiciouslyLow
    })
    
    console.log(`🔍 Filtered ${sortedProducts.length} items down to ${filteredProducts.length} valid items`)
    
    // Debug: Log the final results being returned
    console.log('🔍 DEBUG - Final Results Being Returned:')
    filteredProducts.forEach((item: any, index: number) => {
      console.log(`${index + 1}. Title: "${item.title}"`)
      console.log(`   Price: £${item.sale_price}`)
      console.log(`   Date: ${item.date_sold}`)
      console.log(`   Link: ${item.link}`)
      console.log('---')
    })
    
    const results = filteredProducts.map((item: any) => {
      const price = parseFloat(item.sale_price)
      console.log(`🔍 Converting eBay item: "${item.title}" sale_price=${item.sale_price} -> price=${price}`)
      
      return {
        title: item.title,
        price: price,
        url: `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(item.title)}&LH_Sold=1&LH_Complete=1&LH_Auction=1&Graded=No&LH_PrefLoc=1`,
        source: 'eBay (Sold)',
        condition: 'Used/Ungraded',
        soldDate: item.date_sold
      }
    })
    
    console.log(`✅ eBay Search Found: ${results.length} recent sold items`)
    if (results.length > 0) {
      console.log(`🎯 Price range: £${Math.min(...results.map(r => r.price))} - £${Math.max(...results.map(r => r.price))}`)
    }
    
    return results
    
  } catch (error) {
    console.error('❌ eBay API search error:', error)
    throw error // Re-throw to trigger fallback in calling function
  }
}

async function searchEbayWithScraping(cardName: string): Promise<EbayItem[]> {
  try {
    console.log('🕷️  eBay Web Scraping: Starting scraping for:', cardName)
    
    // Use the exact same search URL as the user's manual search
    const encodedSearch = encodeURIComponent(cardName)
    const url = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodedSearch}&_sacat=0&_from=R40&LH_Auction=1&LH_PrefLoc=1&LH_Complete=1&LH_Sold=1&rt=nc&Graded=No&_dcat=183454&_sop=13`
      
    console.log('🔗 Scraping URL:', url)
      
      const response = await fetch(url, {
        headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-GB,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
        }
      })

      if (!response.ok) {
      console.log(`❌ Scraping failed: ${response.status}`)
      throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()
    console.log(`📄 HTML length: ${html.length} characters`)
    
    if (html.length < 1000 || !html.includes('ebay')) {
      console.log('❌ Invalid HTML response')
      throw new Error('Invalid HTML response')
    }
    
    // Extract sold items using modern eBay selectors
    const results: EbayItem[] = []
    
    // Pattern to match sold item containers
    const itemPattern = /<li[^>]*class="[^"]*s-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi
    const pricePattern = /(?:£|GBP\s?)([0-9,]+\.?[0-9]*)/gi
    const titlePattern = /<span[^>]*class="[^"]*clipped[^"]*"[^>]*>([^<]+)/gi
    const linkPattern = /<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]+)"/gi
    
    let itemMatch
    let count = 0
    
    while ((itemMatch = itemPattern.exec(html)) !== null && count < 10) {
      const itemHtml = itemMatch[1]
      
      // Extract price
      const priceMatch = pricePattern.exec(itemHtml)
      if (!priceMatch) continue
      
      const price = parseFloat(priceMatch[1].replace(/,/g, ''))
      if (price <= 0 || price > 10000) continue
      
      // Extract title
      const titleMatch = titlePattern.exec(itemHtml)
      if (!titleMatch) continue
      
      const title = titleMatch[1].trim()
      if (!title.toLowerCase().includes(cardName.toLowerCase())) continue
      
      // Extract link
      const linkMatch = linkPattern.exec(itemHtml)
      const link = linkMatch ? linkMatch[1] : `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(title)}&LH_Sold=1&LH_Complete=1&LH_Auction=1&Graded=No`
      
      results.push({
        title: title,
        price: price,
        url: link,
        source: 'eBay (Sold)',
        condition: 'Used/Ungraded',
        soldDate: new Date().toISOString().split('T')[0] // Approximate date
          })
      
      count++
      console.log(`✅ Found item: "${title}" - £${price}`)
    }
    
    console.log(`🎯 Web scraping found ${results.length} items`)
    return results.slice(0, 4) // Return top 4 like the API
    
  } catch (error) {
    console.error('❌ Web scraping error:', error)
    throw error
  }
}

// Spelling corrections for common misspellings (same as autocomplete)
const SPELLING_CORRECTIONS: Record<string, string> = {
  'ninetails': 'ninetales',
  'gyrados': 'gyarados', 
  'dragonight': 'dragonite',
  'morty': 'morty',
  'mortys': 'morty\'s',
}

function correctSpelling(term: string): string {
  const words = term.toLowerCase().split(' ')
  return words.map(word => SPELLING_CORRECTIONS[word] || word).join(' ')
}

function buildSearchStrategies(query: string): string[] {
  const strategies = new Set<string>()
  const cleanedQuery = query.toLowerCase().trim()
  const words = cleanedQuery.split(' ').filter(w => w)

  if (words.length === 0) {
    return []
  }

  // 1. Exact phrase match (highest priority)
  strategies.add(`name:"${cleanedQuery}"`)

  // 2. For queries with numbers, try name + number
  // This helps with things like "Charizard ex 105"
  const numberMatch = cleanedQuery.match(/(.+) (\w*\d+\w*)$/)
  if (numberMatch) {
      const namePart = numberMatch[1].trim()
      const numberPart = numberMatch[2]
      strategies.add(`name:"${namePart}" AND number:"${numberPart}"`)
  }

  // 3. All significant keywords match using AND logic
  const stopWords = ['with', 'the', 'of', 'and', 'in', 'on', 'at', 'for', 'to', 'from', 'ex', 'gx', 'v', 'vmax', 'vstar']
  const keyWords = words.filter(word => !stopWords.includes(word))
  if (keyWords.length > 1 && keyWords.join(' ') !== cleanedQuery) {
    strategies.add(keyWords.map(word => `name:*${word}*`).join(' AND '))
  }

  // 4. Fallback to just the name part if there was a number
  if (numberMatch) {
    strategies.add(`name:"${numberMatch[1].trim()}"`)
  }

  // 5. Fallback for common types like 'charizard ex', 'mew v'
  if (words.length === 2 && ['ex', 'gx', 'v', 'vmax', 'vstar'].includes(words[1])) {
    strategies.add(`name:"${words[0]}" AND subtypes:"${words[1]}"`)
  }

  // 6. Broadest fallback: just the first word (the Pokemon name)
  if (words.length > 1) {
    strategies.add(`name:"${words[0]}"`)
  }

  // 7. Last resort: wildcard search on the whole query
  strategies.add(`name:*${cleanedQuery}*`)

  // Remove the initial query if it's the same as the wildcard one
  strategies.delete(cleanedQuery)

  return Array.from(strategies)
}

async function searchPokemonTcgApi(
  cardName: string,
  progress: (stage: string, message: string) => void
): Promise<{ priceSource: PriceSource | null, cardDetails: CardDetails | null }> {
  progress('cardmarket', 'Searching Pokemon TCG API...')
  
  try {
    // Use the same optimized search logic as autocomplete
    let searchTerm = cardName.trim()
    
    const correctedQuery = correctSpelling(searchTerm)
    if (correctedQuery !== searchTerm) {
      console.log(`📝 Spelling corrected: "${searchTerm}" → "${correctedQuery}"`)
      searchTerm = correctedQuery
    }
    
    const strategies = buildSearchStrategies(searchTerm)
    console.log(`🔍 Pokemon TCG API Search: "${cardName}" -> strategies: [${strategies.join(', ')}]`)
    
    // Try each strategy until one succeeds
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i]
      
      // Add delay between attempts to avoid overwhelming the API
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * i)) // Progressive delay
      }
      
      try {
        const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(strategy)}&pageSize=10`
        console.log(`📡 Pokemon TCG API URL: ${url}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'PokemonIntelligence/1.0'
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)

        console.log(`🌐 Pokemon TCG API Response Status: ${response.status}`)

        if (!response.ok) {
          console.log(`❌ Pokemon TCG API returned ${response.status} for strategy: "${strategy}"`)
          if (response.status >= 500) {
            console.log(`🚨 Server error detected (${response.status}), API may be down`)
          }
          continue // Try next strategy
        }

        const data = await response.json()
        console.log(`📦 Pokemon TCG API Response: ${data.data?.length || 0} cards found`)
        
        // Log all found cards for debugging
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log(`🔍 Found cards for strategy "${strategy}":`)
          data.data.forEach((card: any, index: number) => {
            console.log(`  ${index + 1}. ${card.name} (${card.set?.name || 'Unknown Set'}) - ${card.number || 'No Number'}`)
          })
        }
        
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const card = data.data[0]
          console.log(`🎯 First card: ${card.name}${card.set?.name ? ` (${card.set.name})` : ''}`)
          
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
            let priceType = null
            
            // Check all possible price types
            const priceTypes = [
              { key: 'normal', name: 'Normal' },
              { key: 'holofoil', name: 'Holofoil' },
              { key: 'reverseHolofoil', name: 'Reverse Holofoil' },
              { key: '1stEditionNormal', name: '1st Edition Normal' },
              { key: '1stEditionHolofoil', name: '1st Edition Holofoil' },
              { key: 'unlimitedHolofoil', name: 'Unlimited Holofoil' },
              { key: 'unlimitedNormal', name: 'Unlimited Normal' }
            ]
            
            for (const type of priceTypes) {
              if (prices[type.key] && prices[type.key].market) {
                usdPrice = prices[type.key].market
                priceType = type.name
                console.log(`💵 ${type.name} market price: $${usdPrice}`)
                break
              }
            }
            
            if (usdPrice) {
              const gbpPrice = usdPrice * 0.79 // Convert USD to GBP
              priceSource = {
                title: `${card.name} (${card.set?.name || 'Unknown Set'})`,
                price: gbpPrice,
                source: `TCGPlayer ${priceType}`,
                url: card.tcgplayer.url
              }
              console.log(`✅ Pokemon TCG API price: $${usdPrice} USD = £${gbpPrice.toFixed(2)} GBP (${priceType})`)
            }
          }
          
          return { priceSource, cardDetails }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`⏱️ Pokemon TCG API timeout for strategy: "${strategy}"`)
        } else {
          console.log(`⚠️ Pokemon TCG API strategy failed: "${strategy}" - ${error}`)
        }
        continue // Try next strategy
      }
    }
    
    // If all strategies failed, try a simple fallback search with just the first word
    console.log(`🔄 All strategies failed, trying fallback search for: "${searchTerm}"`)
    const firstWord = searchTerm.split(' ')[0]
    if (firstWord && firstWord !== searchTerm) {
      try {
        const fallbackUrl = `https://api.pokemontcg.io/v2/cards?q=name:*${firstWord}*&pageSize=5`
        console.log(`📡 Fallback Pokemon TCG API URL: ${fallbackUrl}`)
        
        const fallbackController = new AbortController()
        const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 10000) // 10 second timeout for fallback
        
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'PokemonIntelligence/1.0'
          },
          signal: fallbackController.signal
        })
        
        clearTimeout(fallbackTimeoutId)
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          console.log(`📦 Fallback Pokemon TCG API Response: ${fallbackData.data?.length || 0} cards found`)
          
          if (fallbackData.data && Array.isArray(fallbackData.data) && fallbackData.data.length > 0) {
            console.log(`🔍 Fallback found cards for "${firstWord}":`)
            fallbackData.data.forEach((card: any, index: number) => {
              console.log(`  ${index + 1}. ${card.name} (${card.set?.name || 'Unknown Set'}) - ${card.number || 'No Number'}`)
            })
            
            const card = fallbackData.data[0]
            console.log(`🎯 Fallback first card: ${card.name}${card.set?.name ? ` (${card.set.name})` : ''}`)
            
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
              console.log(`💰 Fallback TCGPlayer prices available:`, Object.keys(prices))
              
              // Try different price types
              let usdPrice = null
              let priceType = null
              
              const priceTypes = [
                { key: 'normal', name: 'Normal' },
                { key: 'holofoil', name: 'Holofoil' },
                { key: 'reverseHolofoil', name: 'Reverse Holofoil' },
                { key: '1stEditionNormal', name: '1st Edition Normal' },
                { key: '1stEditionHolofoil', name: '1st Edition Holofoil' },
                { key: 'unlimitedHolofoil', name: 'Unlimited Holofoil' },
                { key: 'unlimitedNormal', name: 'Unlimited Normal' }
              ]
              
              for (const type of priceTypes) {
                if (prices[type.key] && prices[type.key].market) {
                  usdPrice = prices[type.key].market
                  priceType = type.name
                  console.log(`💵 Fallback ${type.name} market price: $${usdPrice}`)
                  break
                }
              }
              
              if (usdPrice) {
                const gbpPrice = usdPrice * 0.79 // Convert USD to GBP
                priceSource = {
                  title: `${card.name} (${card.set?.name || 'Unknown Set'})`,
                  price: gbpPrice,
                  source: `TCGPlayer ${priceType}`,
                  url: card.tcgplayer.url
                }
                console.log(`✅ Fallback Pokemon TCG API price: $${usdPrice} USD = £${gbpPrice.toFixed(2)} GBP (${priceType})`)
              }
            }
            
            return { priceSource, cardDetails }
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`⏱️ Fallback Pokemon TCG API timeout`)
        } else {
          console.log(`⚠️ Fallback Pokemon TCG API search failed: ${error}`)
        }
      }
    }
    
    console.log(`❌ No Pokemon TCG API results found for: "${cardName}"`)
    return { priceSource: null, cardDetails: null }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('⏱️ Pokemon TCG API: Request timed out')
    } else {
      console.error('❌ Pokemon TCG API search failed:', error)
    }
    return { priceSource: null, cardDetails: null }
  }
}

// Function to detect if a card is a promo
function detectPromoCard(cardDetails: CardDetails | null, cardName: string): PromoInfo {
  const sealedKeywords = [
    'sealed', 'unopened', 'factory sealed', 'original sealed', 'mint sealed',
    'pack fresh', 'pack fresh sealed', 'never opened', 'brand new sealed'
  ]
  
  const promoKeywords = [
    'promo', 'promotional', 'black star', 'cosmic eclipse', 'swsh', 'sm', 'xy',
    'black star promo', 'cosmic eclipse promo'
  ]
  
  // Check card details from Pokemon TCG API
  if (cardDetails) {
    const set = cardDetails.set?.name?.toLowerCase() || ''
    const rarity = cardDetails.rarity?.toLowerCase() || ''
    const subtypes = cardDetails.subtypes || []
    const number = cardDetails.number || ''
    
    // Check if it's a promo based on set name
    const isPromoSet = set.includes('promo') || 
                      set.includes('black star') || 
                      set.includes('cosmic eclipse') ||
                      set.includes('swsh') ||
                      set.includes('sm') ||
                      set.includes('xy')
    
    // Check if it's a promo based on rarity
    const isPromoRarity = rarity.includes('promo')
    
    // Check if it's a promo based on subtypes
    const isPromoSubtype = subtypes.some(subtype => 
      subtype.toLowerCase().includes('promo')
    )
    
    // Check if it's a promo based on card number (promos often have special numbering)
    const isPromoNumber = /^[A-Z]+\d+$/.test(number) || // Like "SWSH284", "SM210"
                         /^[A-Z]+$/.test(number) || // Like "TG06", "TG07"
                         number.includes('promo')
    
    const isPromo = isPromoSet || isPromoRarity || isPromoSubtype || isPromoNumber
    
    // Determine promo type
    let promoType: 'black_star' | 'cosmic_eclipse' | 'other' | undefined
    if (isPromo) {
      if (set.includes('black star')) {
        promoType = 'black_star'
      } else if (set.includes('cosmic eclipse')) {
        promoType = 'cosmic_eclipse'
      } else {
        promoType = 'other'
      }
    }
    
    return {
      isPromo,
      promoType,
      isSealed: false, // Will be determined by eBay results
      sealedKeywords
    }
  }
  
  // Fallback: check card name for promo keywords
  const cardNameLower = cardName.toLowerCase()
  const isPromo = promoKeywords.some(keyword => cardNameLower.includes(keyword))
  
  return {
    isPromo,
    promoType: isPromo ? 'other' : undefined,
    isSealed: false,
    sealedKeywords
  }
}

// Function to filter eBay results into sealed and unsealed
function filterEbayResultsBySealed(items: EbayItem[], promoInfo: PromoInfo): FilteredEbayResults {
  const sealed: EbayItem[] = []
  const unsealed: EbayItem[] = []
  
  items.forEach(item => {
    const title = item.title.toLowerCase()
    const isSealed = promoInfo.sealedKeywords.some(keyword => 
      title.includes(keyword.toLowerCase())
    )
    
    if (isSealed) {
      sealed.push(item)
    } else {
      unsealed.push(item)
    }
  })
  
  return {
    sealed,
    unsealed,
    promoInfo: {
      ...promoInfo,
      isSealed: sealed.length > 0
    }
  }
}