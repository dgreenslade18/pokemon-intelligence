import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { getUserPreferences, UserPreferences } from '../../../lib/db'
import { capitalizeCardName } from '../../../lib/utils'

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
  }
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
    const { searchTerm, streamProgress = false } = await request.json()
    
    if (!searchTerm) {
      return NextResponse.json({ error: 'Search term is required' }, { status: 400 })
    }

    // Get user session and preferences
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPreferences = await getUserPreferences(session.user.id)

    // Check cache first
    const cachedResult = getCachedResult(searchTerm)
    if (cachedResult) {
      return NextResponse.json({
        success: true,
        data: cachedResult,
        message: `Analysis completed for ${searchTerm} (cached)`,
        timestamp: new Date().toISOString()
      })
    }

    if (streamProgress) {
      // Check cache first for streaming too
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
          analyzeCard(searchTerm, userPreferences, sendProgress)
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
    card_details: cardDetails,
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
      whatnot_pricing: whatnotPricing
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
    console.log('⚠️  RapidAPI failed, falling back to web scraping')
    return await searchEbayWithScraping(cardName)
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
    
    // Optimized search strategy - try most likely variations first
    variations.push(`${cardName} pokemon card`) // Most common format
    variations.push(`${pokemonName} ${cardNumber} stellar crown`) // Current popular set
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
      max_search_results: 15, // Increased to get more results for better average
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
    
    if (!data.success || !data.products || data.products.length === 0) {
      return [] // Return empty array if no results
    }
    
    // Sort by date sold (most recent first) and take top 4
    const sortedProducts = data.products
      .sort((a: any, b: any) => new Date(b.date_sold).getTime() - new Date(a.date_sold).getTime())
      .slice(0, 4)
    
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
    throw error // Re-throw to trigger fallback in calling function
  }
}

async function searchEbayWithScraping(cardName: string): Promise<EbayItem[]> {
  try {
    console.log('🕷️  eBay Web Scraping: Starting scraping for:', cardName)
    
    // Try multiple search variations
    const searchVariations = [
      `${cardName} pokemon card`,
      `${cardName} pokemon`,
      cardName
    ]
    
    for (const searchTerm of searchVariations) {
      const encodedSearch = encodeURIComponent(searchTerm)
      
      // UK eBay sold items search
      const url = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodedSearch}&_sacat=0&LH_Sold=1&LH_Complete=1&rt=nc&_ipg=25&_sop=13` // Sort by ended recently
      
      console.log(`🌐 Scraping eBay URL: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      })

      if (!response.ok) {
        console.log(`❌ Scraping failed for ${searchTerm}: ${response.status}`)
        continue
      }

      const html = await response.text()
      
      // More robust patterns for modern eBay structure
      const pricePatterns = [
        /(?:£|GBP\s?)([0-9,]+\.?[0-9]*)/gi,
        /(?:Price|Sold for|Final bid)[^£]*£([0-9,]+\.?[0-9]*)/gi,
        /([0-9,]+\.?[0-9]*)\s*(?:GBP|£)/gi
      ]
      
      const titlePatterns = [
        /<h3[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([^<]+)/gi,
        /<span[^>]*class="[^"]*clipped[^"]*"[^>]*>([^<]+)/gi,
        /<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*title="([^"]+)"/gi
      ]
      
      const prices: number[] = []
      const titles: string[] = []
      
      // Extract prices using multiple patterns
      for (const pattern of pricePatterns) {
        let match
        while ((match = pattern.exec(html)) !== null && prices.length < 10) {
          const price = parseFloat(match[1].replace(/,/g, ''))
          if (price > 0 && price < 10000) {
            prices.push(price)
          }
        }
        if (prices.length > 0) break
      }
      
      // Extract titles using multiple patterns
      for (const pattern of titlePatterns) {
        let match
        while ((match = pattern.exec(html)) !== null && titles.length < 10) {
          const title = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .trim()
          
          if (title && title.length > 5) {
            titles.push(title)
          }
        }
        if (titles.length > 0) break
      }
      
      console.log(`📊 Scraping results for "${searchTerm}": ${prices.length} prices, ${titles.length} titles`)
      
      if (prices.length > 0) {
        const items: EbayItem[] = []
        
        // Create items from scraped data
        for (let i = 0; i < Math.min(prices.length, 4); i++) {
          const title = titles[i] || `${cardName} - eBay Sold Item`
          const price = prices[i]
          
          items.push({
            title,
            price,
            url: 'https://www.ebay.co.uk',
            source: 'eBay UK (Sold Items - Scraped)',
            condition: 'Various'
          })
        }
        
        console.log(`✅ Web scraping found ${items.length} items for "${searchTerm}"`)
        return items
      }
    }
    
    console.log('❌ No items found through web scraping')
    return []
    
  } catch (error) {
    console.error('❌ eBay scraping failed:', error)
    return []
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

// Build search strategies (same as autocomplete)
function buildSearchStrategies(query: string): string[] {
  const strategies: string[] = []
  
  // "pokemon number" format (e.g., "charizard 223")
  const numberMatch = query.match(/^(.+?)\s+(\d+)$/)
  if (numberMatch) {
    const [, name, number] = numberMatch
    // Handle multi-word names properly
    if (name.includes(' ')) {
      // For multi-word names like "mew ex", use proper wildcard syntax
      const words = name.split(' ')
      const nameQueries = words.map(word => `name:*${word}*`).join(' AND ')
      strategies.push(`(${nameQueries}) AND number:${number}`)
    } else {
      strategies.push(`name:*${name}* AND number:${number}`)
    }
    return strategies // Return early for number searches
  }
  
  // "pokemon type" format (e.g., "charizard ex", "rayquaza v")  
  const words = query.split(' ')
  const cardTypes = ['ex', 'gx', 'v', 'vmax', 'vstar']
  if (words.length === 2) {
    const [name, type] = words
    if (cardTypes.includes(type.toLowerCase())) {
      if (type.toLowerCase() === 'ex') {
        strategies.push(`name:*${name}*EX*`)
      } else if (type.toLowerCase() === 'gx') {
        strategies.push(`name:*${name}*GX*`)
      } else {
        strategies.push(`name:*${name}* AND name:*${type.toUpperCase()}*`)
      }
      return strategies // Return early for type searches
    }
  }
  
  // Simple wildcard search for everything else
  strategies.push(`name:*${query}*`)
  
  return strategies
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
    for (const strategy of strategies) {
      try {
        const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(strategy)}&pageSize=10`
        console.log(`📡 Pokemon TCG API URL: ${url}`)
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'PokemonIntelligence/1.0'
          }
        })

        console.log(`🌐 Pokemon TCG API Response Status: ${response.status}`)

        if (!response.ok) {
          console.log(`❌ Pokemon TCG API returned ${response.status} for strategy: "${strategy}"`)
          continue // Try next strategy
        }

        const data = await response.json()
        console.log(`📦 Pokemon TCG API Response: ${data.data?.length || 0} cards found`)
        
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
            console.log(`🔍 Full TCGPlayer prices object:`, JSON.stringify(prices, null, 2))
            
            // Try different price types with better debugging
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
            
            // If no market price, try other price fields
            if (!usdPrice) {
              for (const type of priceTypes) {
                if (prices[type.key]) {
                  const priceData = prices[type.key]
                  if (priceData.mid) {
                    usdPrice = priceData.mid
                    priceType = `${type.name} Mid`
                    console.log(`💵 ${type.name} mid price: $${usdPrice}`)
                    break
                  } else if (priceData.low) {
                    usdPrice = priceData.low
                    priceType = `${type.name} Low`
                    console.log(`💵 ${type.name} low price: $${usdPrice}`)
                    break
                  } else if (priceData.high) {
                    usdPrice = priceData.high
                    priceType = `${type.name} High`
                    console.log(`💵 ${type.name} high price: $${usdPrice}`)
                    break
                  }
                }
              }
            }
            
            if (usdPrice) {
              const gbpPrice = usdPrice * 0.79 // Convert USD to GBP
              console.log(`✅ Pokemon TCG API price: $${usdPrice} USD = £${gbpPrice.toFixed(2)} GBP (${priceType})`)
              
              priceSource = {
                title: `${card.name || cardName} (Pokemon TCG API - ${priceType})`,
                price: parseFloat(gbpPrice.toFixed(2)),
                source: 'Pokemon TCG API',
                url: card.tcgplayer?.url || 'https://pokemontcg.io'
              }
            } else {
              console.log(`❌ No valid price found in TCGPlayer data`)
            }
          } else {
            console.log(`❌ No TCGPlayer data available for card`)
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
          
          return { priceSource, cardDetails }
        }
      } catch (error) {
        console.log(`⚠️ Pokemon TCG API strategy failed: "${strategy}"`)
        continue // Try next strategy
      }
    }
    
    // If all strategies failed
    console.log(`❌ All Pokemon TCG API strategies failed for: "${cardName}"`)
    return { priceSource: null, cardDetails: null }
    
  } catch (error) {
    console.error('❌ Pokemon TCG API search failed:', error)
    return { priceSource: null, cardDetails: null }
  }
}