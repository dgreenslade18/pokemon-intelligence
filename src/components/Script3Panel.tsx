'use client'

import { useState } from 'react'

type TrendingCard = {
  id: string
  name: string
  set: string
  cardNumber: string
  salePrice: number
  saleTime: string
  condition: string
  saleCount: number
  priceChange: number
  trend: 'up' | 'down' | 'stable'
}

type UndervaluedCard = {
  id: string
  name: string
  set: string
  cardNumber: string
  salePrice: number
  historicalHigh: number
  priceDropPercent: number
  saleTime: string
  condition: string
  saleCount: number
  priceChange: number
  trend: 'up' | 'down' | 'stable'
  isUndervalued: boolean
  potentialUpside: number
}

interface Script3PanelProps {
  onBack: () => void
}

export default function Script3Panel({ onBack }: Script3PanelProps) {
  const [trendingCards, setTrendingCards] = useState<TrendingCard[]>([])
  const [undervaluedCards, setUndervaluedCards] = useState<UndervaluedCard[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'trending' | 'undervalued'>('trending')

  const handleRefresh = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/script3')
      const data = await response.json()
      
      if (data.success) {
        setTrendingCards(data.trendingCards || [])
        setUndervaluedCards(data.undervaluedCards || [])
        setLastUpdated(data.lastUpdated)
        setDataSource('live')
      } else {
        setError(data.message || 'Failed to load market data')
        setDataSource('error')
        setTrendingCards([])
        setUndervaluedCards([])
      }
    } catch (err) {
      setError('Network error - could not fetch market data')
      setDataSource('error')
      setTrendingCards([])
      setUndervaluedCards([])
    } finally {
      setLoading(false)
    }
  }

  const DataSourceBanner = () => {
    if (!dataSource) return null
    
    if (dataSource === 'live') {
      return (
        <div className="glass rounded-2xl p-6 mb-8 border-green-500/20">
          <div className="flex items-center text-green-300">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
            <span className="font-medium">Live Pokemon TCG API Data</span>
          </div>
          <p className="text-sm text-green-200/80 mt-2 ml-5">
            Real TCGPlayer marketplace prices • Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Unknown'}
          </p>
        </div>
      )
    }
    
    if (dataSource === 'error') {
      return (
        <div className="glass rounded-2xl p-6 mb-8 border-red-500/20">
          <div className="flex items-center text-red-300">
            <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
            <span className="font-medium">Real-Time Data Unavailable</span>
          </div>
          <p className="text-sm text-red-200/80 mt-2 ml-5">
            {error || 'Could not connect to Pokemon TCG API. This script only shows authentic market data.'}
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
              Market Intelligence
            </h1>
            <p className="text-white/60 text-xl font-light">Real-time analysis and arbitrage opportunities</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-8 py-4 glass rounded-2xl text-green-300 hover:bg-green-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
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
        <div className="flex space-x-6 mb-12">
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-8 py-4 rounded-2xl font-medium transition-all duration-300 ${
              activeTab === 'trending'
                ? 'glass-strong text-green-300 border-green-500/30'
                : 'glass text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">📈</span>
              <div>
                <div className="font-semibold">Trending Cards</div>
                <div className="text-sm opacity-80">
                  {trendingCards.length} cards
                </div>
              </div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('undervalued')}
            className={`px-8 py-4 rounded-2xl font-medium transition-all duration-300 ${
              activeTab === 'undervalued'
                ? 'glass-strong text-emerald-300 border-emerald-500/30'
                : 'glass text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">💎</span>
              <div>
                <div className="font-semibold">Arbitrage Opportunities</div>
                <div className="text-sm opacity-80">
                  {undervaluedCards.length} opportunities
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-400 rounded-full animate-spin mx-auto mb-8"></div>
              <h3 className="text-2xl font-semibold text-white mb-4">Analyzing Pokemon TCG Market</h3>
              <p className="text-white/60 text-lg">This may take up to 30 seconds</p>
            </div>
          </div>
        ) : activeTab === 'trending' ? (
          <TrendingCardsTable cards={trendingCards} />
        ) : (
          <UndervaluedCardsTable cards={undervaluedCards} />
        )}

        {/* Info Section */}
        <div className="mt-16 bento-card rounded-3xl p-8">
          <h3 className="text-2xl font-semibold text-white mb-6">How This Works</h3>
          {activeTab === 'trending' ? (
            <div className="grid md:grid-cols-2 gap-8 text-white/70">
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-4"></span>
                  <span>Real-time trending analysis based on sales volume</span>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-4"></span>
                  <span>Price momentum tracking across multiple sources</span>
                </li>
              </ul>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-4"></span>
                  <span>Market sentiment analysis for trending cards</span>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-4"></span>
                  <span>Identifies cards with increasing demand</span>
                </li>
              </ul>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 text-white/70">
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-4"></span>
                  <span>Identifies undervalued cards with high potential</span>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-4"></span>
                  <span>Historical price analysis for profit calculation</span>
                </li>
              </ul>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-4"></span>
                  <span>Market correction opportunities detection</span>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-4"></span>
                  <span>ROI calculations for arbitrage decisions</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TrendingCardsTable({ cards }: { cards: TrendingCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="bento-card rounded-3xl p-12 text-center">
        <div className="text-6xl mb-6">📈</div>
        <h3 className="text-2xl font-semibold text-white mb-4">No Trending Cards</h3>
        <p className="text-white/60 text-lg">Click "Refresh Data" to analyze current market trends</p>
      </div>
    )
  }

  return (
    <div className="bento-card rounded-3xl p-8">
      <h2 className="text-2xl font-semibold text-white mb-6">Trending Cards</h2>
      <div className="space-y-4">
        {cards.map((card) => (
          <div key={card.id} className="glass rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg">{card.name}</h3>
                <p className="text-white/60">{card.set} • #{card.cardNumber}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">${card.salePrice.toFixed(2)}</div>
                <div className={`text-sm font-medium ${
                  card.trend === 'up' ? 'text-green-400' : 
                  card.trend === 'down' ? 'text-red-400' : 'text-white/60'
                }`}>
                  {card.trend === 'up' ? '+' : ''}{card.priceChange.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UndervaluedCardsTable({ cards }: { cards: UndervaluedCard[] }) {
  if (cards.length === 0) {
    return (
      <div className="bento-card rounded-3xl p-12 text-center">
        <div className="text-6xl mb-6">💎</div>
        <h3 className="text-2xl font-semibold text-white mb-4">No Arbitrage Opportunities</h3>
        <p className="text-white/60 text-lg">Click "Refresh Data" to discover undervalued cards</p>
      </div>
    )
  }

  return (
    <div className="bento-card rounded-3xl p-8">
      <h2 className="text-2xl font-semibold text-white mb-6">Arbitrage Opportunities</h2>
      <div className="space-y-4">
        {cards.map((card) => (
          <div key={card.id} className="glass rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg">{card.name}</h3>
                <p className="text-white/60">{card.set} • #{card.cardNumber}</p>
                <p className="text-emerald-300 text-sm font-medium">
                  {card.potentialUpside.toFixed(0)}% potential upside
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">${card.salePrice.toFixed(2)}</div>
                <div className="text-sm text-white/60">
                  High: ${card.historicalHigh.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 