'use client'

import React, { useState, useEffect } from 'react'

interface VintagePackData {
  name: string
  set: string
  edition: string
  condition: string
  prices: {
    loosePacks: number | null
    ebayAverage: number | null
    tcgPlayer: number | null
  }
  priceHistory: {
    date: string
    price: number
    source: string
  }[]
  availability: {
    loosePacks: boolean
    ebayRecent: number
    tcgPlayerStock: number
  }
  marketTrend: 'up' | 'down' | 'stable'
  lastUpdated: string
}

interface Script6PanelProps {
  onBack: () => void
}

export default function Script6Panel({ onBack }: Script6PanelProps) {
  const [loading, setLoading] = useState(false)
  const [selectedSets, setSelectedSets] = useState<string[]>(['Base Set', 'Jungle', 'Fossil', 'Team Rocket'])
  const [priceData, setPriceData] = useState<VintagePackData[]>([])
  const [sortBy, setSortBy] = useState<'price' | 'trend' | 'availability'>('price')
  const [filterPlatform, setFilterPlatform] = useState<'all' | 'loosePacks' | 'ebay' | 'tcgPlayer'>('all')

  const vintagePackets: VintagePackData[] = [
    {
      name: "Base Set Shadowless",
      set: "Base Set",
      edition: "Shadowless",
      condition: "Light Play",
      prices: {
        loosePacks: 825.00, // £825 (converted from $1,100)
        ebayAverage: 750.00,
        tcgPlayer: 799.99
      },
      priceHistory: [
        { date: "2024-01-15", price: 720.00, source: "eBay" },
        { date: "2024-01-10", price: 799.99, source: "TCGPlayer" },
        { date: "2024-01-05", price: 825.00, source: "LoosePacks" }
      ],
      availability: {
        loosePacks: true,
        ebayRecent: 12,
        tcgPlayerStock: 3
      },
      marketTrend: 'up',
      lastUpdated: new Date().toISOString()
    },
    {
      name: "Base Set Unlimited",
      set: "Base Set",
      edition: "Unlimited",
      condition: "Near Mint",
      prices: {
        loosePacks: 337.50, // £337.50 (converted from $449)
        ebayAverage: 315.00,
        tcgPlayer: 349.99
      },
      priceHistory: [
        { date: "2024-01-15", price: 315.00, source: "eBay" },
        { date: "2024-01-10", price: 349.99, source: "TCGPlayer" },
        { date: "2024-01-05", price: 337.50, source: "LoosePacks" }
      ],
      availability: {
        loosePacks: true,
        ebayRecent: 28,
        tcgPlayerStock: 7
      },
      marketTrend: 'stable',
      lastUpdated: new Date().toISOString()
    },
    {
      name: "Jungle 1st Edition",
      set: "Jungle",
      edition: "1st Edition",
      condition: "Near Mint",
      prices: {
        loosePacks: 281.25, // £281.25 (converted from $375)
        ebayAverage: 265.00,
        tcgPlayer: 289.99
      },
      priceHistory: [
        { date: "2024-01-15", price: 265.00, source: "eBay" },
        { date: "2024-01-10", price: 289.99, source: "TCGPlayer" },
        { date: "2024-01-05", price: 281.25, source: "LoosePacks" }
      ],
      availability: {
        loosePacks: true,
        ebayRecent: 15,
        tcgPlayerStock: 4
      },
      marketTrend: 'up',
      lastUpdated: new Date().toISOString()
    },
    {
      name: "Fossil 1st Edition",
      set: "Fossil",
      edition: "1st Edition",
      condition: "Near Mint",
      prices: {
        loosePacks: 243.75, // £243.75 (converted from $325)
        ebayAverage: 225.00,
        tcgPlayer: 249.99
      },
      priceHistory: [
        { date: "2024-01-15", price: 225.00, source: "eBay" },
        { date: "2024-01-10", price: 249.99, source: "TCGPlayer" },
        { date: "2024-01-05", price: 243.75, source: "LoosePacks" }
      ],
      availability: {
        loosePacks: true,
        ebayRecent: 22,
        tcgPlayerStock: 6
      },
      marketTrend: 'stable',
      lastUpdated: new Date().toISOString()
    },
    {
      name: "Team Rocket 1st Edition",
      set: "Team Rocket",
      edition: "1st Edition",
      condition: "Near Mint",
      prices: {
        loosePacks: 449.25, // £449.25 (converted from $599)
        ebayAverage: 420.00,
        tcgPlayer: 459.99
      },
      priceHistory: [
        { date: "2024-01-15", price: 420.00, source: "eBay" },
        { date: "2024-01-10", price: 459.99, source: "TCGPlayer" },
        { date: "2024-01-05", price: 449.25, source: "LoosePacks" }
      ],
      availability: {
        loosePacks: true,
        ebayRecent: 8,
        tcgPlayerStock: 2
      },
      marketTrend: 'up',
      lastUpdated: new Date().toISOString()
    },
    {
      name: "Fossil Unlimited",
      set: "Fossil",
      edition: "Unlimited",
      condition: "Near Mint",
      prices: {
        loosePacks: 171.75, // £171.75 (converted from $229)
        ebayAverage: 155.00,
        tcgPlayer: 179.99
      },
      priceHistory: [
        { date: "2024-01-15", price: 155.00, source: "eBay" },
        { date: "2024-01-10", price: 179.99, source: "TCGPlayer" },
        { date: "2024-01-05", price: 171.75, source: "LoosePacks" }
      ],
      availability: {
        loosePacks: true,
        ebayRecent: 35,
        tcgPlayerStock: 12
      },
      marketTrend: 'down',
      lastUpdated: new Date().toISOString()
    }
  ]

  const handleScan = async () => {
    setLoading(true)
    try {
      // Simulate API call to scrape data
      await new Promise(resolve => setTimeout(resolve, 3000))
      setPriceData(vintagePackets)
    } catch (error) {
      console.error('Error scanning vintage packs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLowestPrice = (pack: VintagePackData) => {
    const prices = [pack.prices.loosePacks, pack.prices.ebayAverage, pack.prices.tcgPlayer]
      .filter(price => price !== null) as number[]
    return Math.min(...prices)
  }

  const getLowestPriceSource = (pack: VintagePackData) => {
    const lowestPrice = getLowestPrice(pack)
    if (pack.prices.loosePacks === lowestPrice) return 'LoosePacks'
    if (pack.prices.ebayAverage === lowestPrice) return 'eBay'
    if (pack.prices.tcgPlayer === lowestPrice) return 'TCGPlayer'
    return 'Unknown'
  }

  const getBestDeals = () => {
    return priceData
      .map(pack => ({
        ...pack,
        priceDiff: Math.max(
          (pack.prices.loosePacks || 0) - getLowestPrice(pack),
          (pack.prices.tcgPlayer || 0) - getLowestPrice(pack)
        )
      }))
      .filter(pack => pack.priceDiff > 20)
      .sort((a, b) => b.priceDiff - a.priceDiff)
      .slice(0, 3)
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈'
      case 'down': return '📉'
      case 'stable': return '➡️'
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-400'
      case 'down': return 'text-red-400'
      case 'stable': return 'text-yellow-400'
    }
  }

  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      if (priceData.length > 0) {
        handleScan()
      }
    }, 300000)

    return () => clearInterval(interval)
  }, [priceData])

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center text-amber-300 hover:text-white transition-colors duration-300 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Scripts
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">Vintage Pack Tracker</h1>
            <p className="text-white/70 text-lg">Monitor WOTC booster pack prices across LoosePacks, eBay, and TCGPlayer</p>
          </div>
          <div className="text-6xl">🎴</div>
        </div>

        {/* Control Panel */}
        <div className="bento-card rounded-3xl p-8 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-white">Price Scanner</h2>
            <div className="flex gap-4">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as 'price' | 'trend' | 'availability')}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
              >
                <option value="price">Sort by Price</option>
                <option value="trend">Sort by Trend</option>
                <option value="availability">Sort by Availability</option>
              </select>
              
              <select 
                value={filterPlatform} 
                onChange={(e) => setFilterPlatform(e.target.value as 'all' | 'loosePacks' | 'ebay' | 'tcgPlayer')}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
              >
                <option value="all">All Platforms</option>
                <option value="loosePacks">LoosePacks Only</option>
                <option value="ebay">eBay Only</option>
                <option value="tcgPlayer">TCGPlayer Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Select Sets to Track</label>
              <div className="flex flex-wrap gap-2">
                {['Base Set', 'Jungle', 'Fossil', 'Team Rocket', 'Gym Heroes', 'Neo Genesis'].map(set => (
                  <button
                    key={set}
                    onClick={() => {
                      if (selectedSets.includes(set)) {
                        setSelectedSets(selectedSets.filter(s => s !== set))
                      } else {
                        setSelectedSets([...selectedSets, set])
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      selectedSets.includes(set)
                        ? 'bg-amber-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {set}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleScan}
                disabled={loading}
                className="btn-primary px-8 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Scanning Markets...' : 'Scan Vintage Packs'}
              </button>
            </div>
          </div>

          {priceData.length > 0 && (
            <div className="text-sm text-white/60">
              Last updated: {new Date(priceData[0].lastUpdated).toLocaleString()} • 
              Auto-refresh every 5 minutes • 
              Prices in GBP (£)
            </div>
          )}
        </div>

        {/* Best Deals Alert */}
        {priceData.length > 0 && getBestDeals().length > 0 && (
          <div className="bento-card rounded-3xl p-6 mb-8 border-l-4 border-amber-400">
            <h3 className="text-lg font-bold text-white mb-4">🔥 Best Arbitrage Opportunities</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getBestDeals().map((deal, index) => (
                <div key={index} className="glass rounded-2xl p-4">
                  <div className="font-semibold text-white mb-1">{deal.name}</div>
                  <div className="text-sm text-white/60 mb-2">{deal.edition}</div>
                  <div className="text-green-400 font-bold">
                    Save £{deal.priceDiff.toFixed(2)}
                  </div>
                  <div className="text-xs text-white/60">
                    Best: {getLowestPriceSource(deal)} - £{getLowestPrice(deal).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Comparison Table */}
        {priceData.length > 0 && (
          <div className="bento-card rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Price Comparison</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-white/80 pb-4 font-medium">Pack</th>
                    <th className="text-center text-white/80 pb-4 font-medium">LoosePacks</th>
                    <th className="text-center text-white/80 pb-4 font-medium">eBay Avg</th>
                    <th className="text-center text-white/80 pb-4 font-medium">TCGPlayer</th>
                    <th className="text-center text-white/80 pb-4 font-medium">Best Price</th>
                    <th className="text-center text-white/80 pb-4 font-medium">Trend</th>
                    <th className="text-center text-white/80 pb-4 font-medium">Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {priceData.map((pack, index) => (
                    <tr key={index} className="border-b border-white/10">
                      <td className="py-4">
                        <div>
                          <div className="font-semibold text-white">{pack.name}</div>
                          <div className="text-sm text-white/60">{pack.edition} • {pack.condition}</div>
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="text-white font-medium">
                          {pack.prices.loosePacks ? `£${pack.prices.loosePacks.toFixed(2)}` : 'N/A'}
                        </div>
                        <div className="text-xs text-white/60">
                          {pack.availability.loosePacks ? '✓ Available' : '✗ OOS'}
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="text-white font-medium">
                          {pack.prices.ebayAverage ? `£${pack.prices.ebayAverage.toFixed(2)}` : 'N/A'}
                        </div>
                        <div className="text-xs text-white/60">
                          {pack.availability.ebayRecent} recent sales
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="text-white font-medium">
                          {pack.prices.tcgPlayer ? `£${pack.prices.tcgPlayer.toFixed(2)}` : 'N/A'}
                        </div>
                        <div className="text-xs text-white/60">
                          {pack.availability.tcgPlayerStock} in stock
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="text-green-400 font-bold text-lg">
                          £{getLowestPrice(pack).toFixed(2)}
                        </div>
                        <div className="text-xs text-white/60">
                          {getLowestPriceSource(pack)}
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-lg">{getTrendIcon(pack.marketTrend)}</span>
                          <span className={`text-sm font-medium ${getTrendColor(pack.marketTrend)}`}>
                            {pack.marketTrend.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="text-white font-medium">
                          {pack.availability.loosePacks ? '✓' : '✗'} LP
                        </div>
                        <div className="text-white font-medium">
                          {pack.availability.ebayRecent > 0 ? '✓' : '✗'} eBay
                        </div>
                        <div className="text-white font-medium">
                          {pack.availability.tcgPlayerStock > 0 ? '✓' : '✗'} TCG
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Market Insights */}
        {priceData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bento-card rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">📊 Market Insights</h3>
              <ul className="space-y-2 text-white/70">
                <li>• eBay typically has the lowest average prices</li>
                <li>• LoosePacks offers guaranteed authenticity</li>
                <li>• TCGPlayer has the most consistent stock</li>
                <li>• 1st Edition packs trending upward</li>
                <li>• Unlimited editions showing price stability</li>
              </ul>
            </div>

            <div className="bento-card rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">💡 Trading Tips</h3>
              <ul className="space-y-2 text-white/70">
                <li>• Monitor eBay auctions ending at odd hours</li>
                <li>• Check condition descriptions carefully</li>
                <li>• Factor in shipping costs from US sellers</li>
                <li>• Consider authentication services for expensive packs</li>
                <li>• Track price history before making offers</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 