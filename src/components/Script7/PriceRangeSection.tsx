import React from 'react'
import { formatPrice } from './utils'
import { EbayItem } from './types'

interface PriceRangeSectionProps {
  ebayPrices?: EbayItem[]
  analysis?: {
    ebay_average?: number
    cardmarket_price?: number
    final_average?: number
    price_range?: string
    recommendation?: string
    buy_value?: number
    trade_value?: number
    cash_value?: number
    total_ebay_items_analyzed?: number
    displayed_ebay_items?: number
  }
  loading?: boolean
}

export default function PriceRangeSection({ ebayPrices, analysis, loading = false }: PriceRangeSectionProps) {
  if (loading || !ebayPrices || ebayPrices.length === 0) {
    return null
  }

  // Calculate price statistics from displayed items
  const prices = ebayPrices.map(item => item.price).sort((a, b) => a - b)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length

  // Find dates for specific prices
  const getDateForPrice = (targetPrice: number): string => {
    const item = ebayPrices.find(item => item.price === targetPrice)
    if (item?.soldDate) {
      try {
        const date = new Date(item.soldDate)
        return date.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: '2-digit' 
        })
      } catch {
        return ''
      }
    }
    return ''
  }

  // Find date for average price (closest to average)
  const getAveragePriceDate = (): string => {
    const closestItem = ebayPrices.reduce((closest, current) => {
      const currentDiff = Math.abs(current.price - avgPrice)
      const closestDiff = Math.abs(closest.price - avgPrice)
      return currentDiff < closestDiff ? current : closest
    })
    
    if (closestItem?.soldDate) {
      try {
        const date = new Date(closestItem.soldDate)
        return date.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit', 
          year: '2-digit' 
        })
      } catch {
        return ''
      }
    }
    return ''
  }

  const minPriceDate = getDateForPrice(minPrice)
  const maxPriceDate = getDateForPrice(maxPrice)
  const avgPriceDate = getAveragePriceDate()

  // Calculate 30-day trend using displayed items (note: this is a limitation - ideally we'd use all data)
  const calculateTrend = () => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
    
    console.log('🔍 TREND DEBUG: Date thresholds:')
    console.log(`   Now: ${now.toDateString()}`)
    console.log(`   7 days ago: ${sevenDaysAgo.toDateString()}`)
    console.log(`   Total eBay items to analyze: ${ebayPrices.length}`)
    
    // Debug: Check all soldDate values
    ebayPrices.forEach((item, index) => {
      console.log(`🔍 TREND DEBUG: Item ${index}: soldDate="${item.soldDate}", title="${item.title.substring(0, 50)}..."`)
    })
    
    // If we have items but no soldDates, try to split by price chronology as fallback
    const itemsWithDates = ebayPrices.filter(item => item.soldDate && item.soldDate.trim())
    
    if (itemsWithDates.length === 0) {
      console.log('🔍 TREND DEBUG: No soldDate data available, using price-based analysis')
      
      // Fallback: Split items in half (assuming they're roughly chronological)
      const midPoint = Math.floor(ebayPrices.length / 2)
      const firstHalf = ebayPrices.slice(0, midPoint)
      const secondHalf = ebayPrices.slice(midPoint)
      
      if (firstHalf.length === 0 || secondHalf.length === 0) {
        return { 
          trend: 'insufficient', 
          change: 0, 
          icon: '📊', 
          color: 'gray',
          note: `Need more sales data. Found ${ebayPrices.length} items but no chronological data.`
        }
      }
      
      const firstAvg = firstHalf.reduce((sum, item) => sum + item.price, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, item) => sum + item.price, 0) / secondHalf.length
      const percentageChange = ((secondAvg - firstAvg) / firstAvg) * 100
      
      console.log(`🔍 TREND DEBUG: Fallback analysis - First half: £${firstAvg.toFixed(2)}, Second half: £${secondAvg.toFixed(2)}, Change: ${percentageChange.toFixed(2)}%`)
      
      if (percentageChange > 5) {
        return { 
          trend: 'up', 
          change: percentageChange, 
          icon: '📈', 
          color: 'green',
          recentCount: secondHalf.length,
          olderCount: firstHalf.length
        }
      } else if (percentageChange < -5) {
        return { 
          trend: 'down', 
          change: Math.abs(percentageChange), 
          icon: '📉', 
          color: 'red',
          recentCount: secondHalf.length,
          olderCount: firstHalf.length
        }
      } else {
        return { 
          trend: 'stable', 
          change: Math.abs(percentageChange), 
          icon: '➡️', 
          color: 'blue',
          recentCount: secondHalf.length,
          olderCount: firstHalf.length
        }
      }
    }
    
    // Original date-based logic for when we have soldDates
    const recentSales = itemsWithDates.filter(item => {
      const soldDate = new Date(item.soldDate!)
      const isRecent = soldDate >= sevenDaysAgo
      console.log(`🔍 TREND DEBUG: ${item.soldDate} -> ${soldDate.toDateString()} -> Recent: ${isRecent}`)
      return isRecent
    })
    
    const olderSales = itemsWithDates.filter(item => {
      const soldDate = new Date(item.soldDate!)
      const isOlder = soldDate < sevenDaysAgo
      console.log(`🔍 TREND DEBUG: ${item.soldDate} -> ${soldDate.toDateString()} -> Older: ${isOlder}`)
      return isOlder
    })
    
    console.log(`🔍 TREND DEBUG: Split results:`)
    console.log(`   Recent sales (last 7 days): ${recentSales.length}`)
    console.log(`   Older sales (7+ days ago): ${olderSales.length}`)
    
    if (recentSales.length === 0 || olderSales.length === 0) {
      console.log(`🔍 TREND DEBUG: Insufficient date-based data - Recent: ${recentSales.length}, Older: ${olderSales.length}`)
      return { 
        trend: 'insufficient', 
        change: 0, 
        icon: '📊', 
        color: 'gray',
        note: `Need more recent sales. Found ${itemsWithDates.length} items with dates.`
      }
    }
    
    const recentAvg = recentSales.reduce((sum, item) => sum + item.price, 0) / recentSales.length
    const olderAvg = olderSales.reduce((sum, item) => sum + item.price, 0) / olderSales.length
    
    console.log(`🔍 TREND DEBUG: Averages - Recent: £${recentAvg.toFixed(2)}, Older: £${olderAvg.toFixed(2)}`)
    
    const percentageChange = ((recentAvg - olderAvg) / olderAvg) * 100
    
    console.log(`🔍 TREND DEBUG: Percentage change: ${percentageChange.toFixed(2)}%`)
    
    if (percentageChange > 5) {
      return { 
        trend: 'up', 
        change: percentageChange, 
        icon: '📈', 
        color: 'green',
        recentCount: recentSales.length,
        olderCount: olderSales.length
      }
    } else if (percentageChange < -5) {
      return { 
        trend: 'down', 
        change: Math.abs(percentageChange), 
        icon: '📉', 
        color: 'red',
        recentCount: recentSales.length,
        olderCount: olderSales.length
      }
    } else {
      return { 
        trend: 'stable', 
        change: Math.abs(percentageChange), 
        icon: '➡️', 
        color: 'blue',
        recentCount: recentSales.length,
        olderCount: olderSales.length
      }
    }
  }
  
  const trendData = calculateTrend()

  // Calculate quartiles for price range insights
  const q1Index = Math.floor(prices.length * 0.25)
  const q3Index = Math.floor(prices.length * 0.75)
  const q1Price = prices[q1Index]
  const q3Price = prices[q3Index]

  return (
    <div className="bento-card rounded-3xl p-6 md:p-8">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        <span className="mr-3">📊</span>
        Price Range Analysis
        {analysis?.total_ebay_items_analyzed && analysis.total_ebay_items_analyzed > ebayPrices.length && (
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            (Based on {analysis.total_ebay_items_analyzed} total sales)
          </span>
        )}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <div className="text-sm text-red-600 dark:text-red-400 mb-1">Lowest</div>
          <div className="text-xl font-bold text-red-800 dark:text-red-200">
            £{formatPrice(minPrice)}
          </div>
          {minPriceDate && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ({minPriceDate})
            </div>
          )}
        </div>
        
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Average</div>
          <div className="text-xl font-bold text-blue-800 dark:text-blue-200">
            £{formatPrice(avgPrice)}
          </div>
          {avgPriceDate && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ({avgPriceDate})
            </div>
          )}
        </div>
        
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="text-sm text-green-600 dark:text-green-400 mb-1">Highest</div>
          <div className="text-xl font-bold text-green-800 dark:text-green-200">
            £{formatPrice(maxPrice)}
          </div>
          {maxPriceDate && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ({maxPriceDate})
            </div>
          )}
        </div>

        <div className={`text-center p-4 rounded-xl ${
          trendData.color === 'green' ? 'bg-green-50 dark:bg-green-900/20' :
          trendData.color === 'red' ? 'bg-red-50 dark:bg-red-900/20' :
          trendData.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' :
          'bg-gray-50 dark:bg-gray-900/20'
        }`}>
          <div className={`text-sm mb-1 ${
            trendData.color === 'green' ? 'text-green-600 dark:text-green-400' :
            trendData.color === 'red' ? 'text-red-600 dark:text-red-400' :
            trendData.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            30-Day Trend
          </div>
          <div className={`text-xl font-bold ${
            trendData.color === 'green' ? 'text-green-800 dark:text-green-200' :
            trendData.color === 'red' ? 'text-red-800 dark:text-red-200' :
            trendData.color === 'blue' ? 'text-blue-800 dark:text-blue-200' :
            'text-gray-800 dark:text-gray-200'
          }`}>
            <span className="mr-1">{trendData.icon}</span>
            {trendData.trend === 'insufficient' ? 'N/A' : 
             trendData.trend === 'up' ? `+${trendData.change.toFixed(1)}%` :
             trendData.trend === 'down' ? `-${trendData.change.toFixed(1)}%` :
             `±${trendData.change.toFixed(1)}%`}
          </div>
          {trendData.trend !== 'insufficient' && trendData.recentCount && trendData.olderCount && (
            <div className={`text-xs mt-1 ${
              trendData.color === 'green' ? 'text-green-500 dark:text-green-400' :
              trendData.color === 'red' ? 'text-red-500 dark:text-red-400' :
              trendData.color === 'blue' ? 'text-blue-500 dark:text-blue-400' :
              'text-gray-500 dark:text-gray-400'
            }`}>
              {trendData.recentCount} recent vs {trendData.olderCount} older
            </div>
          )}
          {trendData.trend === 'insufficient' && trendData.note && (
            <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
              {trendData.note}
            </div>
          )}
        </div>
      </div>

      {/* Price Range Visualization */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Price Distribution</span>
          <span>{prices.length} sales</span>
        </div>
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="absolute h-full bg-gradient-to-r from-red-400 via-orange-400 via-blue-400 to-green-400 rounded-full"
            style={{ width: '100%' }}
          />
          {/* Average marker */}
          <div 
            className="absolute top-0 h-full w-1 bg-purple-600 dark:bg-purple-400"
            style={{ 
              left: `${((avgPrice - minPrice) / (maxPrice - minPrice)) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{formatPrice(minPrice)}</span>
          <span className="text-purple-600 dark:text-purple-400 font-medium">
            Avg: {formatPrice(avgPrice)}
          </span>
          <span>{formatPrice(maxPrice)}</span>
        </div>
      </div>

      {/* Analysis & Recommendations */}
      {analysis && (
        <div className="space-y-4">
          {/* {analysis.price_range && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price Range
              </div>
              <div className="text-gray-900 dark:text-white">
                {analysis.price_range}
              </div>
            </div>
          )} */}

          {/* {analysis.recommendation && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                Recommendation
              </div>
              <div className="text-blue-900 dark:text-blue-100">
                {analysis.recommendation}
              </div>
            </div>
          )} */}

          {/* Multi-value pricing if available */}
          {(analysis.buy_value || analysis.trade_value || analysis.cash_value) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {analysis.buy_value && (
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-xs text-green-600 dark:text-green-400 mb-1">Buy at</div>
                  <div className="text-lg font-bold text-green-800 dark:text-green-200">
                    £{formatPrice(analysis.buy_value)}
                  </div>
                </div>
              )}
              {analysis.trade_value && (
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Trade Value</div>
                  <div className="text-lg font-bold text-orange-800 dark:text-orange-200">
                    £{formatPrice(analysis.trade_value)}
                  </div>
                </div>
              )}
              {analysis.cash_value && (
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Cash Value</div>
                  <div className="text-lg font-bold text-purple-800 dark:text-purple-200">
                    £{formatPrice(analysis.cash_value)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 