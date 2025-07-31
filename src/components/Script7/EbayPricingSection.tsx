import React, { useState } from 'react'
import Link from 'next/link'
import { EbayItem, PromoInfo } from './types'
import { formatPrice, formatUKDate } from './utils'
import { ListingShimmer } from '../LoadingShimmer'
import MarketChart from './MarketChart'

interface EbayPricingSectionProps {
  ebayPrices?: EbayItem[]
  allSalesData?: EbayItem[]  // Extended data for chart
  loading?: boolean
  promoInfo?: PromoInfo
}

export default function EbayPricingSection({ ebayPrices, allSalesData, loading = false, promoInfo }: EbayPricingSectionProps) {
  const [showSealedOnly, setShowSealedOnly] = useState(false)
  const [showUnsealedOnly, setShowUnsealedOnly] = useState(false)



  // Filtered eBay results
  const filteredEbayResults = ebayPrices?.filter(item => {
    if (showSealedOnly && showUnsealedOnly) return true
    if (showSealedOnly) return item.title.toLowerCase().includes('sealed')
    if (showUnsealedOnly) return !item.title.toLowerCase().includes('sealed')
    return true
  }) || []

  return (
    <div className="bento-card rounded-3xl p-5 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center">
          eBay Recent Sales
        </h3>
        
        {/* Filter Controls - Only show for promo cards */}
        {ebayPrices && ebayPrices.length > 0 && promoInfo?.isPromo && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSealedOnly(!showSealedOnly)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                showSealedOnly 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Sealed Only
            </button>
            <button
              onClick={() => setShowUnsealedOnly(!showUnsealedOnly)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                showUnsealedOnly 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Unsealed Only
            </button>
          </div>
        )}
      </div>

      {!ebayPrices && loading ? (
        <ListingShimmer />
      ) : ebayPrices && filteredEbayResults.length > 0 ? (
        <div className="space-y-4">
          {/* Average Price */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Average Sale Price</div>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              £{formatPrice(filteredEbayResults.reduce((sum, item) => sum + item.price, 0) / filteredEbayResults.length)}
            </div>
            <div className="text-xs text-blue-500 dark:text-blue-400">
              Based on {filteredEbayResults.length} recent sale{filteredEbayResults.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Market Chart */}
          <MarketChart ebayPrices={filteredEbayResults} allSalesData={allSalesData} />

          {/* Individual Listings */}
          <div className="block md:grid md:gap-4 space-y-4 md:space-y-0">
            {filteredEbayResults.map((item, index) => (
              <Link
                key={index}
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-10 h-12 object-cover rounded-md flex-shrink-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  )}
                  <div className="block md:flex items-center justify-between w-full min-w-0 gap-4">
                    <h4 className="font-medium text-gray-900 text-sm dark:text-white truncate flex-1 min-w-0 max-w-full">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        £{formatPrice(item.price)}
                      </div>
                      {item.soldDate && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatUKDate(item.soldDate)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {loading ? 'Loading eBay data...' : 'No eBay sales data available'}
        </div>
      )}
    </div>
  )
} 