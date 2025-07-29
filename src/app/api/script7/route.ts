import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/auth'
import { getUserPreferences, UserPreferences } from '../../../lib/db'
import { capitalizeCardName } from '../../../lib/utils'
import pokemonDB from '../../../../lib/pokemon-database'
import smartPriceCache from '../../../../lib/smart-price-cache'
import * as cheerio from 'cheerio'
import fs from 'fs'
import path from 'path'

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
  population_data?: any
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
    // Add metadata about the analysis dataset
    total_ebay_items_analyzed?: number
    displayed_ebay_items?: number
    // Extended chart data for time period filtering
    chart_data?: {
      all_sales: EbayItem[]
      available_periods: string[]
    }
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

function determineAvailablePeriods(ebayData: EbayItem[]): string[] {
  const now = new Date()
  const periods = ['7days', '30days', '90days', '6months', '1year', 'alltime']
  const availablePeriods: string[] = []

  // Always include 'alltime' if we have any data
  if (ebayData.length > 0) {
    availablePeriods.push('alltime')
  }

  // Check for data in each period
  const periodDays = {
    '7days': 7,
    '30days': 30,
    '90days': 90,
    '6months': 180,
    '1year': 365
  }

  for (const [period, days] of Object.entries(periodDays)) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const hasDataInPeriod = ebayData.some(item => {
      if (!item.soldDate) return false

      // Parse different date formats (same logic as in MarketChart)
      let itemDate = new Date()
      const dateStr = item.soldDate

      if (dateStr?.includes('Jul 2025')) {
        const day = dateStr.match(/\d+/)?.[0]
        itemDate = new Date(2025, 6, parseInt(day || '1'))
      } else if (dateStr?.includes('ago')) {
        const daysAgo = parseInt(dateStr.match(/\d+/)?.[0] || '0')
        itemDate = new Date()
        itemDate.setDate(itemDate.getDate() - daysAgo)
      } else {
        const parsed = new Date(dateStr)
        if (!isNaN(parsed.getTime())) {
          itemDate = parsed
        }
      }

      return itemDate >= cutoffDate
    })

    if (hasDataInPeriod) {
      availablePeriods.unshift(period) // Add to beginning to maintain order
    }
  }

  return availablePeriods
}

function calculateStringSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity for string comparison
  const set1 = new Set(str1.toLowerCase().split(' ').filter(word => word.length > 2))
  const set2 = new Set(str2.toLowerCase().split(' ').filter(word => word.length > 2))
  
  const intersection = new Set([...set1].filter(word => set2.has(word)))
  const union = new Set([...set1, ...set2])
  
  if (union.size === 0) return 0
  return intersection.size / union.size
}

export async function POST(request: NextRequest) {
  try {
    let searchTerm, refresh = false
    
    try {
      const body = await request.json()
      searchTerm = body.searchTerm
      refresh = body.refresh || false
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }
    
    console.log(`🔍 Script7 Request - searchTerm: "${searchTerm}", refresh: ${refresh}`)
    
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

    // **SIMPLE REQUEST/RESPONSE** - No more streaming!
    console.log(`🚀 Starting analysis for: ${searchTerm}`)
    
    try {
      // Run the analysis (this is the core function that does all the work)
      const result = await analyzeCard(searchTerm, userPreferences)
      
      // Cache the result
      setCachedResult(searchTerm, result)
      console.log(`✅ Analysis completed and cached for: ${searchTerm}`)
      
      // Return simple JSON response
      return NextResponse.json({
        success: true,
        data: result,
        message: `Analysis completed for ${searchTerm}`,
        timestamp: new Date().toISOString()
      })
      
    } catch (analysisError) {
      console.error('❌ Analysis failed:', analysisError)
      
      const errorMessage = analysisError instanceof Error 
        ? analysisError.message 
        : 'Analysis failed due to an unexpected error'
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        message: `Failed to analyze ${searchTerm}`,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Request handler error:', error)
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred'
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function analyzeCard(
  cardName: string,
  userPreferences: UserPreferences
): Promise<AnalysisResult> {
  
  console.log(`🎯 Starting analysis for: "${cardName}"`)
  
  try {
  
  // Initialize base result structure
  let partialResult = {
    card_name: cardName,
    timestamp: new Date().toISOString(),
    ebay_prices: [],
    cardmarket: null,
    card_details: undefined,
    analysis: {}
  }
  
  // Note: Progress updates removed - using simple response
  
  // SECTION 1: Local Database Search
  let localCardDetails: CardDetails | null = null
  let cardId: string | null = null
  let specificCardName = cardName
  
  try {
    console.log(`📚 SECTION 1: Starting local database search...`)
    
    // Initialize local database for card details FIRST
    await pokemonDB.initialize()
    
    // Search local database for card details FIRST
    const localResults = await pokemonDB.search(cardName, 5)
    
    if (localResults.length > 0) {
      // Log all found cards for debugging
      console.log(`🔍 Local search found ${localResults.length} cards:`)
      localResults.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.card.name} (${result.card.number}) from ${result.card.set?.name || 'Unknown Set'}`)
      })
      
      // Try to find exact match by card number if search term contains a specific number
      let card = localResults[0].card
      const searchTermUpper = cardName.toUpperCase()
      
      // Extract potential card numbers from search term (SWSH284, TG20, SV123, 117, etc.)
      const cardNumberMatch = searchTermUpper.match(/(SWSH\d+|TG\d+|SV\d+\w*|[A-Z]{2,}\d+\w*|\b\d{1,3}\b)/g)
      
      if (cardNumberMatch && cardNumberMatch.length > 0) {
        const targetNumber = cardNumberMatch[cardNumberMatch.length - 1] // Take the last match (most likely the card number)
        console.log(`🎯 Looking for card number: ${targetNumber}`)
        console.log(`🔍 All number matches found: ${cardNumberMatch.join(', ')}`)
        
        const exactMatch = localResults.find(result => 
          result.card.number.toUpperCase() === targetNumber ||
          result.card.number === targetNumber
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
      specificCardName = `${card.name} ${card.number}` // Use specific card name + number for eBay
      
      console.log(`🔍 DEBUGGING - Selected card details:`)
      console.log(`   Card Name: "${card.name}"`)
      console.log(`   Card Number: "${card.number}"`)
      console.log(`   Set Name: "${card.set?.name || 'Unknown'}"`)
      console.log(`   Constructed eBay search term: "${specificCardName}"`)
      
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
      }
      
      // Store card details 
      partialResult.card_details = localCardDetails
      console.log(`✅ SECTION 1: Local database search completed successfully`)
    } else {
      console.log(`⚠️ No local cards found for: ${cardName}`)
      console.log(`✅ SECTION 1: Local database search completed (no results)`)
    }
  } catch (error) {
    console.error(`❌ SECTION 1: Local database search failed:`, error)
    // Continue with original search term
    specificCardName = cardName
    console.log(`🔄 SECTION 1: Continuing with original search term: "${specificCardName}"`)
  }

  // SECTION 2: eBay Data Collection
  let ebayPrices: EbayItem[] = []
  let extendedEbayData: EbayItem[] = []
  
  try {
    console.log(`🛒 SECTION 2: Starting eBay data collection...`)
    
    // Run eBay search with specific card name (if found) or user's search term
    console.log(`🎯 eBay searching for: "${specificCardName}"`)
    
    try {
      ebayPrices = await searchEbaySoldItems(specificCardName, localCardDetails)
      console.log(`📊 eBay search returned ${ebayPrices.length} items`)
      
      // Send eBay results as soon as they're available
      const ebayAveragePrice = ebayPrices.length > 0 
        ? ebayPrices.reduce((sum, item) => sum + item.price, 0) / ebayPrices.length 
        : 0
      
      partialResult.ebay_prices = ebayPrices
      partialResult.analysis = {
        ...partialResult.analysis,
        ebay_average: ebayAveragePrice
      }
      console.log(`✅ SECTION 2A: eBay search completed successfully`)
      
    } catch (error) {
      console.error(`❌ SECTION 2A: eBay search failed:`, error)
      ebayPrices = []
      console.log(`🔄 SECTION 2A: Continuing with empty eBay results`)
    }
    
    try {
      // Get extended data for chart functionality (independent fetch)
      extendedEbayData = await searchEbaySoldItems(specificCardName, localCardDetails, true)
      console.log(`📊 Extended eBay search returned ${extendedEbayData.length} items`)
      console.log(`✅ SECTION 2B: Extended eBay search completed successfully`)
      
    } catch (error) {
      console.error(`❌ SECTION 2B: Extended eBay search failed:`, error)
      extendedEbayData = ebayPrices // Fallback to main results
      console.log(`🔄 SECTION 2B: Using main eBay results as fallback`)
    }
    
    console.log(`✅ SECTION 2: eBay data collection completed successfully`)
    
  } catch (error) {
    console.error(`❌ SECTION 2: eBay data collection failed:`, error)
    ebayPrices = []
    extendedEbayData = []
    console.log(`🔄 SECTION 2: Continuing with empty eBay data`)
  }

  // SECTION 3: Pricing API (Skipped)
  console.log(`💰 SECTION 3: Skipping Pokemon TCG API pricing lookup - using eBay data for analysis`)
  let priceSource: PriceSource | null = null

  // Pokemon TCG API disabled - eBay data provides more reliable pricing

      // Send final pricing results
  partialResult.cardmarket = priceSource
  if (!partialResult.card_details) {
    partialResult.card_details = localCardDetails
  }
  console.log(`📤 Pricing data ${priceSource ? 'available' : 'not available'}`)
  console.log(`✅ SECTION 3: Pricing section completed successfully`)

  // SECTION 4: Final Analysis
  try {
    console.log(`🧮 SECTION 4: Starting final analysis calculation...`)

    // Using eBay data as primary source (Pokemon TCG API disabled)
    const pokemonTcgData = null // Disabled for reliability
    const finalCardDetails = localCardDetails

    // Detect promo and sealed status
    const promoInfo = detectPromoCard(finalCardDetails, cardName)
    const filteredEbayResults = filterEbayResultsBySealed(ebayPrices, promoInfo)

    // SECTION 4.1: Fetch Population Data
    console.log(`📊 Fetching population data for: ${cardName}`)
    let populationData = null
    try {
      const populationParams = new URLSearchParams()
      populationParams.set('cardName', cardName)
      if (finalCardDetails?.set?.name) {
        populationParams.set('setName', finalCardDetails.set.name)
      }
      if (finalCardDetails?.number) {
        populationParams.set('cardNumber', finalCardDetails.number)
      }

      const populationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/population-data?${populationParams.toString()}`

      const populationResponse = await fetch(populationUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (populationResponse.ok) {
        const populationResult = await populationResponse.json()
        if (populationResult.success) {
          populationData = populationResult.data
          console.log(`✅ Population data fetched successfully`)
        } else {
          console.log(`⚠️ Population data API returned error: ${populationResult.error}`)
        }
      } else {
        console.log(`⚠️ Population data fetch failed with status: ${populationResponse.status}`)
      }
    } catch (populationError) {
      console.error('❌ Error fetching population data:', populationError)
    }

    // Add population data to card details if available
    if (finalCardDetails && populationData) {
      finalCardDetails.population_data = populationData
    }

    // Separate eBay data: Use ALL for analysis, show only 10 most recent for UI
    const allEbayPricesForAnalysis = ebayPrices // Use all scraped data for calculations
    const recentEbayPricesForDisplay = ebayPrices
      .sort((a, b) => {
        // Sort by sold date (most recent first) for display
        if (!a.soldDate || !b.soldDate) return 0
        return new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime()
      })
      .slice(0, 10) // Only show 10 most recent in UI

    console.log(`📊 Using ${allEbayPricesForAnalysis.length} eBay items for analysis, displaying ${recentEbayPricesForDisplay.length} most recent`)

    // Calculate analysis using ALL eBay data
    const ebayOnlyPrices: number[] = []
    
    // Add all eBay prices (both sealed and unsealed) for buy_value calculation
    allEbayPricesForAnalysis.forEach(item => {
      if (typeof item.price === 'number' && !isNaN(item.price)) {
        ebayOnlyPrices.push(item.price)
      }
    })
    
    console.log(`📊 Analysis Summary: ${ebayOnlyPrices.length} valid prices for calculations`)

    // Calculate eBay average from all results (not just unsealed)
    const ebayAverage = allEbayPricesForAnalysis.length > 0 
      ? allEbayPricesForAnalysis.reduce((sum, item) => {
          const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0
          return sum + price
        }, 0) / allEbayPricesForAnalysis.length
      : 0
        
    console.log(`💰 Final eBay Average: £${ebayAverage.toFixed(2)} (based on ${allEbayPricesForAnalysis.length} items)`)

    // Calculate final average based only on eBay prices (excludes TCG API for buy_value)
    const finalAverage = ebayOnlyPrices.length > 0 
      ? ebayOnlyPrices.reduce((sum, price) => sum + price, 0) / ebayOnlyPrices.length
      : 0

    const minPrice = ebayOnlyPrices.length > 0 ? Math.min(...ebayOnlyPrices) : 0
    const maxPrice = ebayOnlyPrices.length > 0 ? Math.max(...ebayOnlyPrices) : 0
    
    console.log(`🧮 Price calculations: avg=£${finalAverage.toFixed(2)}, range=£${minPrice.toFixed(2)}-£${maxPrice.toFixed(2)} (${ebayOnlyPrices.length} eBay prices)`)

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
      ebay_prices: recentEbayPricesForDisplay, // Only send 10 most recent for UI display
      cardmarket: pokemonTcgData,
      card_details: finalCardDetails,
      analysis: {
        ebay_average: parseFloat(ebayAverage.toFixed(2)),
        cardmarket_price: pokemonTcgData?.price || 0,
        final_average: parseFloat(finalAverage.toFixed(2)),
        price_range: ebayOnlyPrices.length > 0 ? `£${minPrice.toFixed(2)} - £${maxPrice.toFixed(2)}` : '£0.00 - £0.00',
        // Multi-value pricing (calculated from ALL eBay data)
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
        filtered_ebay_results: filteredEbayResults,
        // Add metadata about the analysis dataset
        total_ebay_items_analyzed: allEbayPricesForAnalysis.length,
        displayed_ebay_items: recentEbayPricesForDisplay.length,
        // Extended chart data for time period filtering
        chart_data: {
          all_sales: extendedEbayData,
          available_periods: determineAvailablePeriods(extendedEbayData)
        }
      }
    }

    console.log(`🧮 Final analysis calculation completed successfully`)
    console.log(`🎯 Analysis completed successfully for: "${cardName}"`)
    console.log(`📋 Final result summary:`)
    console.log(`   - eBay prices: ${result.ebay_prices?.length || 0}`)
    console.log(`   - Analysis: ${result.analysis ? 'present' : 'missing'}`)
    console.log(`   - Card details: ${result.card_details ? 'present' : 'missing'}`)
    console.log(`✅ About to return result from analyzeCard function`)
    return result
    
  } catch (analysisError) {
    console.error(`❌ SECTION 4: Final analysis calculation failed:`, analysisError)
    console.error('Analysis error stack:', analysisError.stack)
    // Return a minimal result to prevent stream failure
    return {
      card_name: cardName,
      timestamp: new Date().toISOString(),
      ebay_prices: ebayPrices || [],
      cardmarket: priceSource,
      card_details: localCardDetails,
      analysis: {
        ebay_average: 0,
        cardmarket_price: 0,
        final_average: 0,
        price_range: '£0.00 - £0.00',
        recommendation: 'Analysis calculation failed - please try again',
        pricing_strategy: {
          show_buy_value: false,
          show_trade_value: false,
          show_cash_value: false
        }
      }
    }
  }
  
  } catch (error) {
    console.error(`❌ analyzeCard function error for "${cardName}":`, error)
    console.error('Main error stack:', error.stack)
    
    // Return a basic error result instead of throwing
    return {
      card_name: cardName,
      timestamp: new Date().toISOString(),
      ebay_prices: [],
      cardmarket: null,
      card_details: null,
      analysis: {
        ebay_average: 0,
        cardmarket_price: 0,
        final_average: 0,
        price_range: '£0.00 - £0.00',
        recommendation: 'Analysis failed - please try again',
        pricing_strategy: {
          show_buy_value: false,
          show_trade_value: false,
          show_cash_value: false
        }
      }
    }
  }
}

async function searchEbaySoldItems(
  cardName: string,
  cardDetails: CardDetails | null,
  extendedTimeRange: boolean = false
): Promise<EbayItem[]> {
  
  try {
    // Add delay between searches to avoid bot detection
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    await delay(1000) // 1 second delay between searches
    
    // Force use of enhanced web scraping (more accurate than API)
    console.log('🎯 Using enhanced web scraper (SINGLE REQUEST - avoiding bot detection)')
    return await searchEbayWithScraping(cardName, cardDetails, extendedTimeRange)
    
    // Disabled: Old API approach (less accurate, gets wrong cards)
    // const rapidApiKey = process.env.RAPID_API_KEY
    // if (rapidApiKey) {
    //   const apiResults = await searchEbayWithApi(cardName, '', rapidApiKey)
    //   if (apiResults.length === 0) {
    //     console.log('⚠️  No results from RapidAPI, falling back to web scraping')
    //     return await searchEbayWithScraping(cardName)
    //   }
    //   return apiResults
    // }
  } catch (error) {
    console.error('eBay search failed:', error)
    // If enhanced scraping fails, return empty array
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
      // Enhanced search terms (name + number + set) are already specific enough
      const hasCardInfo = searchTerm.toLowerCase().includes('pokemon') || 
                         searchTerm.includes('/165') || 
                         searchTerm.includes('/191') ||
                         searchTerm.includes('151') ||
                         searchTerm.includes('scarlet violet') ||
                         // Check if it's an enhanced search term (contains card number patterns)
                         /\b\d+\b/.test(searchTerm) ||
                         // Check if it contains set names (BREAKpoint, Evolutions, etc.)
                         /\b(BREAKpoint|Evolutions|Base Set|Jungle|Fossil|Team Rocket|Gym|Neo|eCard|EX|Diamond|Pearl|Platinum|HeartGold|SoulSilver|Black|White|XY|Sun|Moon|Sword|Shield|Brilliant|Shining|Legends|Arceus|Battle|Styles|Fusion|Strike|Chilling|Reign|Evolving|Skies|Celebrations|Star|Birth|Astral|Radiance|Pokémon|GO|Lost|Origin|Silver|Tempest|Crown|Zenith|Brilliant|Stars|Fusion|Strike|Vivid|Voltage|Darkness|Ablaze|Rebel|Clash|Battle|Styles|Scarlet|Violet|Paldea|Evolved|Obsidian|Flames|Surging|Sparks|Shrouded|Fable|Stellar|Miracle|Twilight|Masquerade|Paradox|Rift)\b/i.test(searchTerm)
      
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

async function searchEbayWithScraping(cardName: string, cardDetails: CardDetails | null, extendedTimeRange: boolean = false): Promise<EbayItem[]> {
  try {
    console.log('🕷️  [V4] eBay Extended Scraper: Starting for:', cardName, extendedTimeRange ? '(Extended Range)' : '(Standard Range)')
    
    // Enhanced search strategy: CARD NAME + CARD NUMBER/SET TOTAL format
    let preciseSearchTerm = cardName.trim()
    
    // Check if this is a TG (Trainer Gallery) card and handle it specially
    const isTGCard = /TG\d+/i.test(cardName)
    if (isTGCard) {
      // For TG cards, use just the name + TG number without the "/30" format
      // as most sellers list them as "Pokemon TG04" not "Pokemon TG04/30"
      const tgMatch = cardName.match(/(.*?)\s+(TG\d+)/i)
      if (tgMatch) {
        preciseSearchTerm = `${tgMatch[1].trim()} ${tgMatch[2].toUpperCase()}`
        console.log(`📋 Using TG card format: ${preciseSearchTerm}`)
      }
    } else {
      // Check if the search term already has the complete format (e.g., "Charizard 4/102")
      const hasCompleteFormat = /\d+\/\d+/.test(cardName)
      
      if (hasCompleteFormat) {
        // Use the search term as-is since it already has the number/total format
        console.log(`📋 Using complete card format from search: ${preciseSearchTerm}`)
      } else if (cardDetails && cardDetails.number && cardDetails.set?.total) {
        // For TG cards, don't use the /total format as it doesn't match eBay listings
        if (cardDetails.number.toUpperCase().startsWith('TG')) {
          preciseSearchTerm = `${cardDetails.name} ${cardDetails.number}`
          console.log(`📋 Using TG database format: ${preciseSearchTerm}`)
        } else {
          // NEW FORMAT: Use CARD NAME + CARD NUMBER/SET TOTAL
          preciseSearchTerm = `${cardDetails.name} ${cardDetails.number}/${cardDetails.set.total}`
          console.log(`📋 Using enhanced format with /total: ${preciseSearchTerm}`)
        }
      } else {
        // Extract card name and number for basic targeting as fallback
        const cardParts = cardName.trim().split(' ')
        const cardNumber = cardParts[cardParts.length - 1]
        const cardNamePart = cardParts.slice(0, -1).join(' ')
        
        if (cardNumber && !isNaN(Number(cardNumber))) {
          preciseSearchTerm = `${cardNamePart} ${cardNumber}`
          console.log(`📋 Using basic card format: ${preciseSearchTerm}`)
        } else {
          console.log(`📋 Using search term as-is: ${preciseSearchTerm}`)
        }
      }
    }
    
    // Exact exclusion filters as specified
    const exclusions = '-(vertical, line, sequin, cosmos, sheen, confetti, glitter, mirror, reverse, non-holo, non, jumbo, oversized, large, choose, cards, multibuy, fake, replica, proxy, custom, ooak, singles, bundle, japanese, jpn, korean, chinese)'
    
    // For TG cards, also prepare alternative search terms since they can be listed various ways
    let searchTerms = [preciseSearchTerm]
    if (isTGCard) {
      const tgMatch = preciseSearchTerm.match(/(.*?)\s+(TG\d+)/i)
      if (tgMatch) {
        const pokemonName = tgMatch[1].trim()
        const tgNumber = tgMatch[2].toUpperCase()
        
        // Add alternative search formats commonly used for TG cards
        searchTerms.push(`${pokemonName} trainer gallery`)
        searchTerms.push(`${pokemonName} brilliant stars trainer gallery`)
        searchTerms.push(`${pokemonName} ${tgNumber.replace('TG', 'TG ')}`) // "TG 04" format
        
        console.log(`📋 TG card alternative search terms: ${searchTerms.join(', ')}`)
      }
    }
    
    const fullSearchTerm = `${preciseSearchTerm} ${exclusions}`
    console.log(`🎯 Final eBay search term: "${fullSearchTerm}"`)
    const encodedSearch = encodeURIComponent(fullSearchTerm)
    
    // Calculate date ranges based on requirements
    const now = new Date()
    const dates = {
      fifteenDaysAgo: new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)),
      thirtyDaysAgo: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)),
      ninetyDaysAgo: new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)),
      oneYearAgo: new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000))
    }
    
    // Format dates for eBay (MM/DD/YYYY format)
    const formatDate = (date: Date) => {
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${month}/${day}/${year}`
    }
    
    const todayStr = formatDate(now)
    const fifteenDaysAgoStr = formatDate(dates.fifteenDaysAgo)
    const thirtyDaysAgoStr = formatDate(dates.thirtyDaysAgo)
    const ninetyDaysAgoStr = formatDate(dates.ninetyDaysAgo)
    const oneYearAgoStr = formatDate(dates.oneYearAgo)
    
    // SINGLE REQUEST STRATEGY - Conservative approach to avoid bot detection
    const singleSearchUrl = extendedTimeRange 
      ? `https://www.ebay.co.uk/sch/i.html?_nkw=${encodedSearch}&_sacat=0&LH_Sold=1&LH_Complete=1&LH_PrefLoc=1&_sop=12&_ipg=100`
      : `https://www.ebay.co.uk/sch/i.html?_nkw=${encodedSearch}&_sacat=0&LH_Sold=1&LH_Complete=1&LH_PrefLoc=1&_sop=12&_ipg=60&LH_SoldDate=1&rt=nc&LH_SoldDateStart=${thirtyDaysAgoStr}&LH_SoldDateEnd=${todayStr}`
    
    console.log('🔗 CONSERVATIVE eBay search (Single Request):')
    console.log(`   URL: ${singleSearchUrl}`)
    console.log(`   Strategy: One request only to avoid bot detection`)
    
    // SINGLE REQUEST ONLY - No parallel processing
    const searchResult = await (async (url) => {
      const periodName = 'Single-Search'
      
      console.log(`🚀 [${periodName}] Starting search for URL: ${url}`)
      
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout per search
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)

        if (!response.ok) {
          console.log(`❌ [${periodName}] Search failed with status: ${response.status}`)
          return { periodName, items: [] }
        }

        const html = await response.text()
        const $ = cheerio.load(html)
        const items: EbayItem[] = []

        // DEBUG: Check what we actually received
        console.log(`🔍 [${periodName}] HTML length: ${html.length} characters`)
        console.log(`🔍 [${periodName}] HTML preview: ${html.substring(0, 500)}...`)
        
        // Check for bot detection
        if (html.includes('Pardon our interruption') || html.includes('Checking your browser') || html.length < 1000) {
          console.log(`🚫 [${periodName}] Bot detection detected or empty page`)
          return { periodName, items: [] }
        }
        
        // Check how many s-item elements exist
        const sItemCount = $('.s-item').length
        console.log(`🔍 [${periodName}] Found ${sItemCount} .s-item elements`)
        
        // If no s-item elements, try alternative selectors
        if (sItemCount === 0) {
          const itemCards = $('.item-card, .srp-item, [data-testid*="item"], .search-item').length
          console.log(`🔍 [${periodName}] Alternative selectors found: ${itemCards} items`)
        }

        $('.s-item').each((itemIndex, element) => {
          const itemElement = $(element)

          const titleElement = itemElement.find('.s-item__title')
          const title = titleElement.text().trim()
          const link = itemElement.find('.s-item__link').attr('href')

          const priceStr = itemElement.find('.s-item__price').text().trim()
          const priceMatch = priceStr.match(/£([\d,]+\.\d{2})/)
          const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0

          // Skip items with USD prices or no GBP price
          if (!priceMatch || priceStr.includes('$')) {
            return
          }

          // Try multiple selectors for sold date
          let soldDate = ''
          
          const soldDateSelectors = [
            '.s-item__caption .s-item__caption--signal.POSITIVE',
            '.s-item__caption--signal.POSITIVE span',
            '.s-item__title--tagblock .POSITIVE',
            '.s-item__title--tagblock span[class*="POSITIVE"]',
            '.s-item__detail--primary .POSITIVE', 
            '.s-item__ended-date',
            '.s-item__subtitle .POSITIVE',
            '.s-item__dynamic .POSITIVE',
            '.s-item__detail .POSITIVE',
            '.s-item__title-tag .POSITIVE'
          ]
          
          for (const selector of soldDateSelectors) {
            const dateElement = itemElement.find(selector)
            if (dateElement.length > 0) {
              const dateText = dateElement.text().trim()
              if (dateText.toLowerCase().includes('sold') || 
                  dateText.match(/\d+\s+(day|week|month|hour)s?\s+ago/i) ||
                  dateText.match(/\d{1,2}\s+\w+\s+\d{4}/i) ||
                  dateText.match(/\w+\s+\d+/)) {
                soldDate = dateText.replace(/sold\s*/i, '').trim()
                break
              }
            }
          }
          
          const imageElement = itemElement.find('.s-item__image-wrapper img')
          const imageUrl = imageElement.attr('src')

          // Enhanced graded card filter
          const isGradedCard = title.toLowerCase().match(/\b(psa|bgs|cgc|sgc|ace|graded|gem mint|grade|mint \d+|psa \d+|bgs \d+|cgc \d+|sgc \d+)\b/)

          if (title && link && price > 0.50 && !isGradedCard) {
            items.push({
              title: title,
              price: price,
              url: link,
              source: 'eBay (Scraped)',
              image: imageUrl,
              condition: 'Ungraded',
              soldDate: soldDate
            })
          }
        })

        console.log(`✅ [${periodName}] Found ${items.length} valid items`)
        
        // Debug: Show date range of items found in this search
        if (items.length > 0) {
          const dates = items.filter(item => item.soldDate).map(item => item.soldDate)
          console.log(`🔍 [${periodName}] Date range found: ${dates.slice(0, 3).join(', ')}${dates.length > 3 ? ` ... +${dates.length - 3} more` : ''}`)
          
          // Show unique dates
          const uniqueDates = [...new Set(dates)].sort()
          console.log(`🔍 [${periodName}] Unique dates: ${uniqueDates.slice(0, 5).join(', ')}${uniqueDates.length > 5 ? ` ... +${uniqueDates.length - 5} more` : ''}`)
        }
        
        return { periodName, items }

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`⏱️ [${periodName}] Search timed out`)
        } else {
          console.error(`❌ [${periodName}] Search error:`, error)
        }
        return { periodName, items: [] }
      }
    })(singleSearchUrl)
    
    // Get items from single search result
    const allItems = searchResult.items
    
    // Enhanced deduplication based on multiple criteria
    const uniqueItems = allItems.filter((item, index, self) => {
      return index === self.findIndex(other => {
        // Primary: Same URL (exact match)
        if (item.url === other.url) {
          return true
        }
        
        // Secondary: Same title, price, and sold date (handles URL variations)
        const titleMatch = item.title.toLowerCase().trim() === other.title.toLowerCase().trim()
        const priceMatch = Math.abs(item.price - other.price) < 0.01 // Allow small price differences due to rounding
        const dateMatch = item.soldDate === other.soldDate
        
        // Tertiary: Very similar titles with same price and date (handles minor title variations)
        const similarTitle = titleMatch || (
          item.title.length > 10 && other.title.length > 10 &&
          calculateStringSimilarity(item.title.toLowerCase(), other.title.toLowerCase()) > 0.85
        )
        
        return similarTitle && priceMatch && dateMatch
      })
    })
    
    console.log(`🧹 Deduplication results:`)
    console.log(`   Before: ${allItems.length} items`)
    console.log(`   After: ${uniqueItems.length} items`) 
    console.log(`   Removed: ${allItems.length - uniqueItems.length} duplicates`)
    
    // Add comprehensive date range analysis
    if (uniqueItems.length > 0) {
      const itemsWithDates = uniqueItems.filter(item => item.soldDate)
      if (itemsWithDates.length > 0) {
        const sortedDates = itemsWithDates.map(item => item.soldDate).sort()
        const oldestDate = sortedDates[0]
        const newestDate = sortedDates[sortedDates.length - 1]
        
        console.log(`📅 ACTUAL DATE RANGE FROM EBAY:`)
        console.log(`   Oldest sale: ${oldestDate}`)
        console.log(`   Newest sale: ${newestDate}`)
        console.log(`   Total with dates: ${itemsWithDates.length}/${uniqueItems.length}`)
        
        // Check how far back we actually got
        const now = new Date()
        const expectedCutoffFor6Months = new Date()
        expectedCutoffFor6Months.setDate(expectedCutoffFor6Months.getDate() - 180)
        
        console.log(`📊 COVERAGE ANALYSIS:`)
        console.log(`   Expected 6-month cutoff: ${expectedCutoffFor6Months.toISOString().split('T')[0]}`)
        console.log(`   Actual oldest data: ${oldestDate}`)
        console.log(`   Gap from expected: ${extendedTimeRange ? 'This is why "Last 6 Months" only shows recent data!' : 'Standard search'}`)
      }
    }

    console.log(`🎯 [V4] ${extendedTimeRange ? 'Extended' : 'Standard'} scraper completed:`)
    console.log(`   Total items found: ${allItems.length}`)
    console.log(`   Unique items: ${uniqueItems.length}`)
    console.log(`   Date coverage: ${extendedTimeRange ? '1 year' : '30 days'}`)
    
    // DISABLED: TG card fallback removed to prevent additional requests that trigger bot detection
    if (isTGCard && uniqueItems.length < 10) {
      console.log(`⚠️ TG card: Only ${uniqueItems.length} results found (fallback disabled to avoid bot detection)`)
    }
    
    return uniqueItems

  } catch (error) {
    console.error('❌ [V3] Multi-date scraping error:', error)
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
  cardName: string
): Promise<{ priceSource: PriceSource | null, cardDetails: CardDetails | null }> {
  
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