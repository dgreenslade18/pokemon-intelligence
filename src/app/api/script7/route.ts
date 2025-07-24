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
    const { searchTerm, streamProgress = false, refresh = false } = await request.json()
    
    if (!searchTerm) {
      return NextResponse.json({ error: 'Search term is required' }, { status: 400 })
    }

    // Get user session and preferences
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      
      // Check for suspiciously low prices (likely graded or different market)
      const price = parseFloat(item.sale_price)
      const isSuspiciouslyLow = price < 8.0 // Lowered from £12 to £8 to allow more legitimate listings
      
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
    
    const results = filteredProducts.map((item: any) => ({
      title: item.title,
      price: parseFloat(item.sale_price),
      url: `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(item.title)}&LH_Sold=1&LH_Complete=1&LH_Auction=1&Graded=No&LH_PrefLoc=1`,
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

// Build search strategies (same as autocomplete)
function buildSearchStrategies(query: string): string[] {
  const strategies: string[] = []
  
  // Handle complex multi-word card names (like "Pikachu with grey felt hat")
  const words = query.split(' ')
  if (words.length > 3) {
    // For very complex names, try multiple strategies
    strategies.push(`name:*${query}*`) // Exact phrase match
    
    // Try with just the first two words (usually the Pokemon name)
    if (words.length >= 2) {
      const pokemonName = `${words[0]} ${words[1]}`
      strategies.push(`name:*${pokemonName}*`)
    }
    
    // Try with just the first word (Pokemon name)
    strategies.push(`name:*${words[0]}*`)
    
    // Try with key descriptive words
    const keyWords = words.filter(word => 
      !['with', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'a', 'an'].includes(word.toLowerCase())
    )
    if (keyWords.length > 1) {
      strategies.push(`name:*${keyWords.join(' ')}*`)
    }
    
    return strategies
  }
  
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
  
  // Handle 3-word combinations (like "Pikachu with hat")
  if (words.length === 3) {
    // Try exact match first
    strategies.push(`name:*${query}*`)
    
    // Try with just the Pokemon name
    strategies.push(`name:*${words[0]}*`)
    
    // Try with Pokemon name + last word
    strategies.push(`name:*${words[0]}* AND name:*${words[2]}*`)
    
    return strategies
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
        console.log(`⚠️ Pokemon TCG API strategy failed: "${strategy}" - ${error}`)
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
        
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'PokemonIntelligence/1.0'
          }
        })
        
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
        console.log(`⚠️ Fallback Pokemon TCG API search failed: ${error}`)
      }
    }
    
    console.log(`❌ No Pokemon TCG API results found for: "${cardName}"`)
    return { priceSource: null, cardDetails: null }
  } catch (error) {
    console.error('❌ Pokemon TCG API search failed:', error)
    return { priceSource: null, cardDetails: null }
  }
}