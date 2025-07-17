import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getCompList, saveToCompList, getUserPreferences } from '../../../../lib/db'
import { analyzeCard } from '../../script7/route'
import { capitalizeCardName } from '../../../../lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let streamProgress = false
    try {
      const body = await request.json()
      streamProgress = body.streamProgress || false
    } catch (error) {
      console.log('No request body or invalid JSON, using default streamProgress = false')
    }

    if (streamProgress) {
      // Return streaming response for progress updates
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          
          const sendProgress = (stage: string, message: string, current?: number, total?: number) => {
            const progressData = {
              type: 'progress',
              stage,
              message,
              current,
              total,
              percentage: total ? Math.round((current / total) * 100) : 0
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`))
          }

          const sendComplete = (data: any) => {
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

          try {
            sendProgress('starting', 'Loading comp list...')
            
            const compList = await getCompList(session.user.id)
            
            if (compList.length === 0) {
              sendComplete({ success: true, items: [], message: 'No cards in comp list to refresh' })
              return
            }

            sendProgress('analyzing', `Found ${compList.length} cards to refresh`, 0, compList.length)

            // Get user preferences once for all cards
            const userPreferences = await getUserPreferences(session.user.id)
            
            // Create a cache to avoid re-analyzing the same cards
            const analysisCache = new Map()

            // Process cards in batches of 6 for better performance
            const batchSize = 6
            const updatedItems = []
            
            for (let i = 0; i < compList.length; i += batchSize) {
              const batch = compList.slice(i, i + batchSize)
              
              sendProgress('analyzing', `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(compList.length / batchSize)}`, i, compList.length)
              
              // Process batch in parallel
              const batchPromises = batch.map(async (item, batchIndex) => {
                const currentIndex = i + batchIndex
                sendProgress('analyzing', `Analyzing ${item.card_name}...`, currentIndex, compList.length)
                
                try {
                  // Check cache first
                  let analysis
                  if (analysisCache.has(item.card_name)) {
                    analysis = analysisCache.get(item.card_name)
                    sendProgress('analyzing', `Using cached data for ${item.card_name}`, currentIndex, compList.length)
                  } else {
                    // Use analyzeCard to get latest prices
                    analysis = await analyzeCard(item.card_name, userPreferences)
                    // Cache the result for potential reuse
                    analysisCache.set(item.card_name, analysis)
                  }
                  
                  // Calculate confidence metrics
                  const savedTcgPrice = item.saved_tcg_price
                  const savedEbayAverage = item.saved_ebay_average
                  const newTcgPrice = analysis.analysis.cardmarket_price > 0 ? analysis.analysis.cardmarket_price : null
                  const newEbayAverage = analysis.analysis.ebay_average > 0 ? analysis.analysis.ebay_average : null
                  
                  // Calculate price change percentage
                  let priceChangePercentage = null
                  if (savedTcgPrice && newTcgPrice) {
                    priceChangePercentage = ((newTcgPrice - savedTcgPrice) / savedTcgPrice) * 100
                  }
                  
                  // Calculate volatility (simplified - could be enhanced)
                  let priceVolatility = null
                  if (analysis.ebay_prices.length > 1) {
                    const prices = analysis.ebay_prices.map(p => p.price)
                    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
                    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
                    priceVolatility = Math.sqrt(variance)
                  }
                  
                  // Determine market trend
                  let marketTrend = null
                  if (priceChangePercentage !== null) {
                    if (priceChangePercentage > 5) marketTrend = 'increasing'
                    else if (priceChangePercentage < -5) marketTrend = 'decreasing'
                    else marketTrend = 'stable'
                  }
                  
                  // Calculate confidence score (0-10)
                  let confidenceScore = null
                  if (analysis.ebay_prices.length > 0 || newTcgPrice) {
                    let score = 0
                    if (analysis.ebay_prices.length >= 3) score += 4 // Good eBay data
                    else if (analysis.ebay_prices.length > 0) score += 2 // Some eBay data
                    if (newTcgPrice) score += 3 // TCG price available
                    if (priceVolatility !== null && priceVolatility < 5) score += 2 // Low volatility
                    else if (priceVolatility !== null) score += 1 // Some volatility data
                    if (marketTrend) score += 1 // Trend data available
                    confidenceScore = Math.min(10, score)
                  }
                  
                  // Save updated prices with confidence metrics
                  const updated = await saveToCompList(
                    session.user.id,
                    item.card_name,
                    item.card_number,
                    analysis.analysis.recommendation || '',
                    newTcgPrice,
                    newEbayAverage,
                    item.card_image_url,
                    item.set_name,
                    item.list_id,
                    {
                      savedTcgPrice: savedTcgPrice,
                      savedEbayAverage: savedEbayAverage,
                      priceChangePercentage: priceChangePercentage,
                      priceVolatility: priceVolatility,
                      marketTrend: marketTrend,
                      confidenceScore: confidenceScore
                    }
                  )
                  
                  sendProgress('analyzing', `Completed ${item.card_name}`, currentIndex + 1, compList.length)
                  return updated
                } catch (error) {
                  console.error(`Error analyzing ${item.card_name}:`, error)
                  sendProgress('analyzing', `Failed to analyze ${item.card_name}`, currentIndex + 1, compList.length)
                  return item // Return original item if analysis fails
                }
              })
              
              const batchResults = await Promise.all(batchPromises)
              updatedItems.push(...batchResults)
            }

            sendProgress('complete', 'All prices refreshed successfully!', compList.length, compList.length)
            sendComplete({ success: true, items: updatedItems })
            
          } catch (error) {
            console.error('Error refreshing comp list prices:', error)
            sendError('Failed to refresh prices')
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Synchronous response for backward compatibility
      const compList = await getCompList(session.user.id)
      const updatedItems = []
      
      if (compList.length === 0) {
        return NextResponse.json({ 
          success: true, 
          items: [], 
          message: 'No cards in comp list to refresh' 
        })
      }
      
      // Get user preferences for analysis
      const userPreferences = await getUserPreferences(session.user.id)
      
      // Create a cache to avoid re-analyzing the same cards
      const analysisCache = new Map()
      
      for (const item of compList) {
        try {
          // Check cache first
          let analysis
          if (analysisCache.has(item.card_name)) {
            analysis = analysisCache.get(item.card_name)
          } else {
            // Use analyzeCard to get latest prices
            analysis = await analyzeCard(item.card_name, userPreferences)
            // Cache the result for potential reuse
            analysisCache.set(item.card_name, analysis)
          }
          
          // Calculate confidence metrics for synchronous version
          const savedTcgPrice = item.saved_tcg_price
          const savedEbayAverage = item.saved_ebay_average
          const newTcgPrice = analysis.analysis.cardmarket_price > 0 ? analysis.analysis.cardmarket_price : null
          const newEbayAverage = analysis.analysis.ebay_average > 0 ? analysis.analysis.ebay_average : null
          
          // Calculate price change percentage
          let priceChangePercentage = null
          if (savedTcgPrice && newTcgPrice) {
            priceChangePercentage = ((newTcgPrice - savedTcgPrice) / savedTcgPrice) * 100
          }
          
          // Calculate volatility
          let priceVolatility = null
          if (analysis.ebay_prices.length > 1) {
            const prices = analysis.ebay_prices.map(p => p.price)
            const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
            const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
            priceVolatility = Math.sqrt(variance)
          }
          
          // Determine market trend
          let marketTrend = null
          if (priceChangePercentage !== null) {
            if (priceChangePercentage > 5) marketTrend = 'increasing'
            else if (priceChangePercentage < -5) marketTrend = 'decreasing'
            else marketTrend = 'stable'
          }
          
          // Calculate confidence score
          let confidenceScore = null
          if (analysis.ebay_prices.length > 0 || newTcgPrice) {
            let score = 0
            if (analysis.ebay_prices.length >= 3) score += 4
            else if (analysis.ebay_prices.length > 0) score += 2
            if (newTcgPrice) score += 3
            if (priceVolatility !== null && priceVolatility < 5) score += 2
            else if (priceVolatility !== null) score += 1
            if (marketTrend) score += 1
            confidenceScore = Math.min(10, score)
          }
          
          // Save updated prices with confidence metrics
          const updated = await saveToCompList(
            session.user.id,
            item.card_name,
            item.card_number,
            analysis.analysis.recommendation || '',
            newTcgPrice,
            newEbayAverage,
            item.card_image_url,
            item.set_name,
            item.list_id,
            {
              savedTcgPrice: savedTcgPrice,
              savedEbayAverage: savedEbayAverage,
              priceChangePercentage: priceChangePercentage,
              priceVolatility: priceVolatility,
              marketTrend: marketTrend,
              confidenceScore: confidenceScore
            }
          )
          updatedItems.push(updated)
        } catch (error) {
          console.error(`Error analyzing ${item.card_name}:`, error)
          updatedItems.push(item) // Keep original item if analysis fails
        }
      }
      
      return NextResponse.json({ success: true, items: updatedItems })
    }
  } catch (error) {
    console.error('Error refreshing comp list prices:', error)
    return NextResponse.json({ error: 'Failed to refresh prices' }, { status: 500 })
  }
} 