import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { useState, useMemo } from 'react'
import { EbayItem, TimePeriod } from './types'
import { formatPrice } from './utils'
import TimePeriodSelector from './TimePeriodSelector'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface MarketChartProps {
  ebayPrices: EbayItem[]
  allSalesData?: EbayItem[]  // Extended data for time period filtering
}

// Helper function to create time period buckets
function createTimePeriodBuckets(selectedPeriod: TimePeriod) {
  const now = new Date()
  const buckets = []
  
  let bucketSize: number // days per bucket
  let totalDays: number
  
  switch (selectedPeriod) {
    case '7days':
      bucketSize = 1 // Daily buckets
      totalDays = 7
      break
    case '30days':
      bucketSize = 3 // 3-day buckets
      totalDays = 30
      break
    case '90days':
      bucketSize = 7 // Weekly buckets
      totalDays = 90
      break
    case '6months':
      bucketSize = 14 // Bi-weekly buckets
      totalDays = 180
      break
    default: // alltime
      bucketSize = 30 // Monthly buckets
      totalDays = 365
      break
  }
  
  // Create buckets going backwards from now
  for (let i = 0; i < Math.ceil(totalDays / bucketSize); i++) {
    const endDate = new Date(now)
    endDate.setDate(now.getDate() - (i * bucketSize))
    
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - bucketSize + 1)
    
    // Format bucket label
    let label: string
    if (bucketSize === 1) {
      // Daily: "5 Jul"
      label = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    } else if (bucketSize <= 7) {
      // 3-day periods: "3 Jul - 5 Jul"
      label = `${startDate.getDate()} ${startDate.toLocaleDateString('en-GB', { month: 'short' })} - ${endDate.getDate()} ${endDate.toLocaleDateString('en-GB', { month: 'short' })}`
    } else if (bucketSize <= 14) {
      // Weekly: "3 Jul - 9 Jul"
      label = `${startDate.getDate()} ${startDate.toLocaleDateString('en-GB', { month: 'short' })} - ${endDate.getDate()} ${endDate.toLocaleDateString('en-GB', { month: 'short' })}`
    } else {
      // Monthly: "Jul 2024"
      label = endDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    }
    
    buckets.unshift({ // Add to beginning to maintain chronological order
      label,
      startDate,
      endDate,
      sales: [],
      count: 0,
      totalValue: 0,
      averagePrice: 0
    })
  }
  
  return buckets
}

// Helper function to parse eBay date formats more reliably
function parseEbayDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date() // Default to now for invalid dates
  }

  const trimmedStr = dateStr.trim()
  const now = new Date()

  // Handle "X days ago", "X weeks ago", "X months ago" format
  if (trimmedStr.includes('ago')) {
    const daysMatch = trimmedStr.match(/(\d+)\s*days?\s+ago/i)
    const weeksMatch = trimmedStr.match(/(\d+)\s*weeks?\s+ago/i)
    const monthsMatch = trimmedStr.match(/(\d+)\s*months?\s+ago/i)
    const yearsMatch = trimmedStr.match(/(\d+)\s*years?\s+ago/i)
    
    if (daysMatch) {
      const result = new Date(now)
      result.setDate(result.getDate() - parseInt(daysMatch[1]))
      return result
    } else if (weeksMatch) {
      const result = new Date(now)
      result.setDate(result.getDate() - (parseInt(weeksMatch[1]) * 7))
      return result
    } else if (monthsMatch) {
      const result = new Date(now)
      result.setMonth(result.getMonth() - parseInt(monthsMatch[1]))
      return result
    } else if (yearsMatch) {
      const result = new Date(now)
      result.setFullYear(result.getFullYear() - parseInt(yearsMatch[1]))
      return result
    }
  }

  // Handle standard date formats (DD MMM YYYY, DD-MM-YYYY, etc.)
  // Try direct parsing first
  const directParse = new Date(trimmedStr)
  if (!isNaN(directParse.getTime())) {
    // Set to noon to avoid timezone issues
    directParse.setHours(12, 0, 0, 0)
    return directParse
  }

  // Handle UK format "DD MMM YYYY" (e.g., "27 Jul 2024", "5 Jan 2025")
  const ukDateMatch = trimmedStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/i)
  if (ukDateMatch) {
    const day = parseInt(ukDateMatch[1])
    const monthStr = ukDateMatch[2].toLowerCase()
    const year = parseInt(ukDateMatch[3])
    
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    }
    
    const month = monthMap[monthStr]
    if (month !== undefined) {
      return new Date(year, month, day, 12, 0, 0) // Set to noon to avoid timezone issues
    }
  }

  // Handle UK format without year "DD MMM" (e.g., "27 Jul")
  const ukDateNoYearMatch = trimmedStr.match(/(\d{1,2})\s+(\w{3})/i)
  if (ukDateNoYearMatch) {
    const day = parseInt(ukDateNoYearMatch[1])
    const monthStr = ukDateNoYearMatch[2].toLowerCase()
    
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    }
    
    const month = monthMap[monthStr]
    if (month !== undefined) {
      // Smart year detection - if the date would be in the future, use previous year
      let year = now.getFullYear()
      const testDate = new Date(year, month, day)
      
      // If this date would be more than 30 days in the future, it's probably from last year
      if (testDate.getTime() > now.getTime() + (30 * 24 * 60 * 60 * 1000)) {
        year = year - 1
      }
      
      return new Date(year, month, day, 12, 0, 0)
    }
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY format
  const ddmmyyyyMatch = trimmedStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1])
    const month = parseInt(ddmmyyyyMatch[2]) - 1 // JavaScript months are 0-indexed
    const year = parseInt(ddmmyyyyMatch[3])
    return new Date(year, month, day, 12, 0, 0)
  }

  // Fallback to current date if all parsing fails
  console.warn(`⚠️ Could not parse date: "${trimmedStr}", using current date`)
  return new Date()
}

// Helper function to group sales into time period buckets
function groupSalesIntoBuckets(salesData: EbayItem[], selectedPeriod: TimePeriod) {
  const buckets = createTimePeriodBuckets(selectedPeriod)
  

  
  salesData.forEach((item, itemIndex) => {
    if (!item.soldDate) return

    // Use improved date parsing function
    const saleDate = parseEbayDate(item.soldDate)



    // Find the appropriate bucket for this sale
    // Normalize all dates to start of day for comparison
    const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate())
    const bucket = buckets.find(bucket => {
      const bucketStartOnly = new Date(bucket.startDate.getFullYear(), bucket.startDate.getMonth(), bucket.startDate.getDate())
      const bucketEndOnly = new Date(bucket.endDate.getFullYear(), bucket.endDate.getMonth(), bucket.endDate.getDate())
      return saleDateOnly >= bucketStartOnly && saleDateOnly <= bucketEndOnly
    })
    
    // Debug bucket matching for 7-day period (only if no matches found)
    if (selectedPeriod === '7days' && itemIndex < 3 && !bucket) {
      console.log(`   ❌ NO MATCH for sale "${item.soldDate}" - parsed as ${saleDate.toISOString().split('T')[0]}`)
    }
    
    if (bucket) {
      bucket.sales.push(item)
      bucket.count++
      bucket.totalValue += item.price
      bucket.averagePrice = bucket.totalValue / bucket.count
    }
  })
  
  return buckets.filter(bucket => bucket.count > 0)
}

export default function MarketChart({ ebayPrices, allSalesData }: MarketChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7days')

  // Use allSalesData if available, otherwise fall back to ebayPrices
  const salesData = allSalesData || ebayPrices

  // Filter sales data based on selected time period
  const filteredData = useMemo(() => {
    if (!salesData?.length) return []

    const periodDays = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
      '6months': 180
    }

    const days = periodDays[selectedPeriod]
    if (!days) return salesData

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    // Set cutoff to start of day to be more inclusive
    cutoffDate.setHours(0, 0, 0, 0)



    const filtered = salesData.filter((item, index) => {
      if (!item.soldDate) return true

      // Use the improved date parsing function
      const itemDate = parseEbayDate(item.soldDate)
      const isIncluded = itemDate >= cutoffDate



      return isIncluded
    })


    
    // If we don't have enough historical data for the selected period,
    // fall back to showing all available data
    // For 7-day period, be more lenient with the threshold
    const minThreshold = selectedPeriod === '7days' ? 1 : 5
    if (filtered.length < minThreshold && salesData.length > filtered.length) {
      console.log(`   📈 Using fallback: showing all ${salesData.length} sales instead of ${filtered.length} filtered`)
      return salesData
    }

    return filtered
  }, [salesData, selectedPeriod])

  // Group sales into time period buckets
  const groupedData = useMemo(() => {
    const buckets = groupSalesIntoBuckets(filteredData, selectedPeriod)
    return buckets
  }, [filteredData, selectedPeriod])

  if (groupedData.length === 0) {
    return (
      <div className="h-full bg-transparent rounded-lg p-0 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-purple-500 rounded-full"></div>
              <span className="dark:text-white/70 text-black/70 font-medium">Market Price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-blue-300/60 rounded-sm"></div>
              <span className="dark:text-white/70 text-black/70 font-medium">Sales Volume</span>
            </div>
          </div>
          <TimePeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </div>
        
        {/* Data availability note */}
        {filteredData.length === salesData.length && selectedPeriod !== 'alltime' && (() => {
          // Calculate actual date range from data
          const datesWithData = filteredData.filter(item => item.soldDate).map(item => {
            return parseEbayDate(item.soldDate || '')
          })
          
          if (datesWithData.length > 0) {
            const oldestDate = new Date(Math.min(...datesWithData.map(d => d.getTime())))
            const newestDate = new Date(Math.max(...datesWithData.map(d => d.getTime())))
            const oldestStr = oldestDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            const newestStr = newestDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            
            return (
              <div className="mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  📊 <strong>Data available from {oldestStr} to {newestStr}</strong> - Showing all {filteredData.length} available sales
                </div>
              </div>
            )
          }
          return null
        })()}
        
        <div className="flex items-center justify-center h-64 text-black/50 dark:text-white/50">
          No pricing data available for selected time period
        </div>
      </div>
    )
  }

  // Prepare labels and datasets for Chart.js
  const labels = groupedData.map(bucket => bucket.label)
  
  const data = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Sales Volume',
        data: groupedData.map(bucket => bucket.count),
        backgroundColor: 'rgba(147, 197, 253, 0.6)',
        borderColor: 'rgba(147, 197, 253, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
        yAxisID: 'y1',
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Market Price',
        data: groupedData.map(bucket => bucket.averagePrice),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'white',
        pointBorderColor: 'rgb(168, 85, 247)',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        yAxisID: 'y',
        order: 1,
      },
    ],
  }
  
  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.98)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(71, 85, 105, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        padding: 16,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          title: function(context) {
            return groupedData[context[0].dataIndex].label
          },
          label: function(context) {
            const bucket = groupedData[context.dataIndex]
            if (context.dataset.label === 'Market Price') {
              return `Market Price: £${context.parsed.y.toFixed(2)}`
            } else {
              return `Sales Volume: ${bucket.count}`
            }
          },
          afterBody: function(context) {
            const bucket = groupedData[context[0].dataIndex]
            return [
              '',
              `Total Value: £${bucket.totalValue.toFixed(2)}`,
              bucket.sales.length > 1 ? `Price Range: £${Math.min(...bucket.sales.map(s => s.price)).toFixed(2)} - £${Math.max(...bucket.sales.map(s => s.price)).toFixed(2)}` : ''
            ].filter(Boolean)
          }
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.7)',
          font: {
            size: 11,
          },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.7)',
          font: {
            size: 12,
          },
          callback: function(value) {
            return '£' + value
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.7)',
          font: {
            size: 12,
          },
          stepSize: 1,
          callback: function(value) {
            return value
          },
        },
      },
    },
  }

  const totalSales = groupedData.reduce((sum, bucket) => sum + bucket.count, 0)
  const averagePrice = filteredData.reduce((sum, item) => sum + item.price, 0) / filteredData.length

  return (
    <div className="h-full bg-transparent rounded-lg p-0 relative">
      <div className="w-full h-full relative">
        {/* Custom Legend and Time Period Selector */}
        <div className="flex items-center justify-between mb-6 flex-col md:flex-row">
          <div className="flex items-center gap-6 text-sm mb-2 md:mb-0">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-purple-500 rounded-full"></div>
              <span className="dark:text-white/70 text-black/70 font-medium">Market Price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-blue-300/60 rounded-sm"></div>
              <span className="dark:text-white/70 text-black/70 font-medium">Sales Volume</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm dark:text-white/50 text-black/50">
              {totalSales} sales
            </div>
            <TimePeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />
          </div>
        </div>
        
        {/* Chart.js Chart */}
        <div className="h-64">
          <Chart type="bar" data={data} options={options} />
        </div>
        
        {/* Enhanced summary stats */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="dark:text-white/70 text-black/70 text-sm">Average:</span>
            <span className="font-semibold text-lg dark:text-white text-black">£{formatPrice(averagePrice)}</span>
          </div>
          <div className="text-xs dark:text-white/50 text-black/50">
            Based on {filteredData.length} sales in selected period
          </div>
        </div>
      </div>
    </div>
  )
} 