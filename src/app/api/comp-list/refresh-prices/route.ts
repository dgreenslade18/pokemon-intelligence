import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { getCompList, saveToCompList } from '../../../../lib/db'
import { analyzeCard } from '../../script7/route'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { streamProgress = false } = await request.json()

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

            // Process cards in batches of 3 for better performance
            const batchSize = 3
            const updatedItems = []
            
            for (let i = 0; i < compList.length; i += batchSize) {
              const batch = compList.slice(i, i + batchSize)
              
              sendProgress('analyzing', `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(compList.length / batchSize)}`, i, compList.length)
              
              // Process batch in parallel
              const batchPromises = batch.map(async (item, batchIndex) => {
                const currentIndex = i + batchIndex
                sendProgress('analyzing', `Analyzing ${item.card_name}...`, currentIndex, compList.length)
                
                try {
                  // Use analyzeCard to get latest prices
                  const analysis = await analyzeCard(item.card_name, {
                    trade_percentage: 80,
                    cash_percentage: 70,
                    show_buy_value: true,
                    show_trade_value: false,
                    show_cash_value: false,
                    whatnot_fees: 12.5,
                    user_id: session.user.id,
                    updated_at: new Date()
                  })
                  
                  // Save updated prices - use null instead of 0 for missing prices
                  const updated = await saveToCompList(
                    session.user.id,
                    item.card_name,
                    item.card_number,
                    analysis.analysis.recommendation || '',
                    analysis.analysis.cardmarket_price > 0 ? analysis.analysis.cardmarket_price : null,
                    analysis.analysis.ebay_average > 0 ? analysis.analysis.ebay_average : null,
                    item.card_image_url,
                    item.set_name
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
      
      for (const item of compList) {
        // Use analyzeCard to get latest prices
        const analysis = await analyzeCard(item.card_name, {
          trade_percentage: 80,
          cash_percentage: 70,
          show_buy_value: true,
          show_trade_value: false,
          show_cash_value: false,
          whatnot_fees: 12.5,
          user_id: session.user.id,
          updated_at: new Date()
        })
        // Save updated prices - use null instead of 0 for missing prices
        const updated = await saveToCompList(
          session.user.id,
          item.card_name,
          item.card_number,
          analysis.analysis.recommendation || '',
          analysis.analysis.cardmarket_price > 0 ? analysis.analysis.cardmarket_price : null,
          analysis.analysis.ebay_average > 0 ? analysis.analysis.ebay_average : null,
          item.card_image_url,
          item.set_name
        )
        updatedItems.push(updated)
      }
      return NextResponse.json({ success: true, items: updatedItems })
    }
  } catch (error) {
    console.error('Error refreshing comp list prices:', error)
    return NextResponse.json({ error: 'Failed to refresh prices' }, { status: 500 })
  }
} 