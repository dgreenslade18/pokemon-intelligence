'use client'

import { useState } from 'react'

type ETBCard = {
  id: string
  name: string
  releaseYear: number
  currentPrice: number
  historicalHigh: number
  priceDropPercent: number
  trend: 'up' | 'down' | 'stable'
  priceChange: number
  availability: string
  salesVolume: number
  isUndervalued: boolean
  potentialUpside: number
  purchaseLinks?: {
    tcgplayer?: string
    ebay?: string
    amazon?: string
    trollandtoad?: string
    dacardworld?: string
  }
  recommendedSource?: string
  buyNowUrl?: string
}

interface Script4PanelProps {
  onBack: () => void
}

export default function Script4Panel({ onBack }: Script4PanelProps) {
  const [trendingETBs, setTrendingETBs] = useState<ETBCard[]>([])
  const [undervaluedETBs, setUndervaluedETBs] = useState<ETBCard[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'trending' | 'undervalued'>('trending')

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/script4')
      const data = await response.json()
      
      if (data.success) {
        setTrendingETBs(data.trendingETBs || [])
        setUndervaluedETBs(data.undervaluedETBs || [])
        setLastUpdated(data.lastUpdated)
        setDataSource('live')
      } else {
        setError(data.message || 'Failed to load ETB market data')
        setDataSource('error')
        setTrendingETBs([])
        setUndervaluedETBs([])
      }
    } catch (err) {
      setError('Network error - could not fetch ETB market data')
      setDataSource('error')
      setTrendingETBs([])
      setUndervaluedETBs([])
    } finally {
      setLoading(false)
    }
  }

  const DataSourceBanner = () => {
    if (!dataSource) return null
    
    if (dataSource === 'live') {
      return (
        <div className="bg-green-500/10 backdrop-blur border border-green-500/20 rounded-2xl p-4 mb-8">
          <div className="flex items-center text-green-300">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
            <span className="font-medium">🔴 LIVE ETB Market Data</span>
          </div>
          <p className="text-sm text-green-200/80 mt-1 ml-5">
            Real-time marketplace analysis from TCGPlayer, eBay, and other sources • Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Unknown'}
          </p>
        </div>
      )
    }
    
    if (dataSource === 'demo') {
      return (
        <div className="bg-blue-500/10 backdrop-blur border border-blue-500/20 rounded-2xl p-4 mb-8">
          <div className="flex items-center text-blue-300">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
            <span className="font-medium">📊 Demo ETB Data</span>
          </div>
          <p className="text-sm text-blue-200/80 mt-1 ml-5">
            Showing sample market data for demonstration • Real analysis available with live data
          </p>
        </div>
      )
    }
    
    if (dataSource === 'error') {
      return (
        <div className="bg-red-500/10 backdrop-blur border border-red-500/20 rounded-2xl p-4 mb-8">
          <div className="flex items-center text-red-300">
            <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
            <span className="font-medium">Real-Time Data Unavailable</span>
          </div>
          <p className="text-sm text-red-200/80 mt-1 ml-5">
            {error || 'Could not fetch ETB market data. This script only shows authentic market intelligence.'}
          </p>
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <button
              onClick={onBack}
              className="flex items-center text-white/60 hover:text-white mb-8 group transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Scripts
            </button>
            <h1 className="text-5xl font-bold gradient-text mb-4">
              ETB Intelligence
            </h1>
            <p className="text-white/60 text-xl font-light">Sealed product arbitrage opportunities</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-8 py-4 glass rounded-2xl text-purple-300 hover:bg-purple-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center">
              <svg className={`w-5 h-5 mr-3 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-medium">{loading ? 'Analyzing...' : 'Refresh Data'}</span>
            </div>
          </button>
        </div>

        <DataSourceBanner />

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-8">
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
              activeTab === 'trending'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30 backdrop-blur'
                : 'bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center">
              📈
              <span className="ml-2">Trending ETBs</span>
              <span className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                {trendingETBs.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('undervalued')}
            className={`px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
              activeTab === 'undervalued'
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30 backdrop-blur'
                : 'bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center">
              💎
              <span className="ml-2">Arbitrage Opportunities</span>
              <span className="ml-2 px-2 py-1 bg-violet-500/20 text-violet-300 text-xs rounded-full">
                {undervaluedETBs.length}
              </span>
            </div>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold text-white mb-2">Analyzing ETB Market</h3>
              <p className="text-slate-400">Scanning sealed product opportunities</p>
            </div>
          </div>
        ) : activeTab === 'trending' ? (
          <TrendingETBsTable etbs={trendingETBs} />
        ) : (
          <UndervaluedETBsTable etbs={undervaluedETBs} />
        )}

        {/* Info Section */}
        <div className="mt-12 bg-slate-800/30 backdrop-blur border border-slate-700/30 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">How This Works</h3>
          {activeTab === 'trending' ? (
            <div className="grid md:grid-cols-2 gap-6 text-slate-300">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                  ETB market momentum analysis based on sales volume
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                  Price trends across multiple marketplace sources
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                  Availability status: In Print, Limited, Out of Print
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                  Sealed product condition and authenticity verified
                </li>
              </ul>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 text-slate-300">
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-violet-400 rounded-full mr-3"></span>
                  ETBs trading 20%+ below their historical highs
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-violet-400 rounded-full mr-3"></span>
                  Sealed product scarcity and appreciation potential
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-violet-400 rounded-full mr-3"></span>
                  Long-term investment opportunities in sealed products
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-violet-400 rounded-full mr-3"></span>
                  Market timing for optimal buy/sell decisions
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TrendingETBsTable({ etbs }: { etbs: ETBCard[] }) {
  if (etbs.length === 0) {
    return (
      <div className="bg-slate-800/30 backdrop-blur border border-slate-700/30 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📦</span>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No trending ETB data available</h3>
        <p className="text-slate-400">Click "Refresh Data" to load real-time market analysis</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/30 backdrop-blur border border-slate-700/30 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Elite Trainer Box</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Year</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Availability</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Trend</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Shop</th>
            </tr>
          </thead>
          <tbody>
            {etbs.map((etb, index) => (
              <tr key={etb.id} className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${index % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                <td className="px-6 py-4">
                  <div className="text-white font-medium">{etb.name}</div>
                  <div className="text-slate-400 text-sm">{etb.salesVolume || 0} market activity</div>
                </td>
                <td className="px-6 py-4 text-slate-300">{etb.releaseYear}</td>
                <td className="px-6 py-4">
                  <div className="text-white font-semibold">${(etb.currentPrice || 0).toFixed(2)}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    etb.availability === 'Out of Print' 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : etb.availability === 'Limited'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {etb.availability}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="text-lg mr-3">
                      {etb.trend === 'up' ? '📈' : etb.trend === 'down' ? '📉' : '➡️'}
                    </span>
                    <span className={`font-medium ${
                      (etb.priceChange || 0) > 0 ? 'text-green-400' : (etb.priceChange || 0) < 0 ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {(etb.priceChange || 0) > 0 ? '+' : ''}{(etb.priceChange || 0).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {etb.purchaseLinks?.tcgplayer && (
                      <a 
                        href={etb.purchaseLinks.tcgplayer} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs py-1.5 px-3 rounded border border-blue-600/30 transition-colors"
                        title="View on TCGPlayer"
                      >
                        TCG
                      </a>
                    )}
                    {etb.purchaseLinks?.ebay && (
                      <a 
                        href={etb.purchaseLinks.ebay} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 text-xs py-1.5 px-3 rounded border border-yellow-600/30 transition-colors"
                        title="View on eBay"
                      >
                        eBay
                      </a>
                    )}
                    {etb.purchaseLinks?.amazon && (
                      <a 
                        href={etb.purchaseLinks.amazon} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 text-xs py-1.5 px-3 rounded border border-orange-600/30 transition-colors"
                        title="View on Amazon"
                      >
                        AMZ
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UndervaluedETBsTable({ etbs }: { etbs: ETBCard[] }) {
  if (etbs.length === 0) {
    return (
      <div className="bg-slate-800/30 backdrop-blur border border-slate-700/30 rounded-2xl p-12 text-center">
        <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">💎</span>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No undervalued ETBs found</h3>
        <p className="text-slate-400">Check back later for new sealed product opportunities</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/30 backdrop-blur border border-slate-700/30 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Elite Trainer Box</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Current Price</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Historical High</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Drop</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Upside</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300 uppercase tracking-wider">Buy Now</th>
            </tr>
          </thead>
          <tbody>
            {etbs.map((etb, index) => (
              <tr key={etb.id} className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${index % 2 === 0 ? 'bg-slate-800/20' : ''}`}>
                <td className="px-6 py-4">
                  <div className="text-white font-medium">{etb.name}</div>
                  <div className="text-slate-400 text-sm">{etb.releaseYear} • {etb.availability}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-white font-semibold">${(etb.currentPrice || 0).toFixed(2)}</div>
                  <div className="text-slate-400 text-sm">{etb.salesVolume || 0} activity</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-300 font-medium">${(etb.historicalHigh || 0).toFixed(2)}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                    -{etb.priceDropPercent || 0}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    +{etb.potentialUpside || 0}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-2">
                    {etb.buyNowUrl && (
                      <a 
                        href={etb.buyNowUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200 text-center"
                      >
                        <span className="mr-2">🛒</span>
                        {etb.recommendedSource?.toUpperCase() || 'SHOP'}
                      </a>
                    )}
                    <div className="flex gap-1">
                      {etb.purchaseLinks?.tcgplayer && (
                        <a 
                          href={etb.purchaseLinks.tcgplayer} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 text-xs py-1.5 px-2 rounded transition-colors text-center"
                          title="View on TCGPlayer"
                        >
                          TCG
                        </a>
                      )}
                      {etb.purchaseLinks?.ebay && (
                        <a 
                          href={etb.purchaseLinks.ebay} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 text-xs py-1.5 px-2 rounded transition-colors text-center"
                          title="View on eBay"
                        >
                          eBay
                        </a>
                      )}
                      {etb.purchaseLinks?.amazon && (
                        <a 
                          href={etb.purchaseLinks.amazon} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 text-xs py-1.5 px-2 rounded transition-colors text-center"
                          title="View on Amazon"
                        >
                          AMZ
                        </a>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 