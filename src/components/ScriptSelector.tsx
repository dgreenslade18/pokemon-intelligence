'use client'

import React from 'react'

interface ScriptSelectorProps {
  onSelectScript: (script: 'script1' | 'script2' | 'script3' | 'script4' | 'script5' | 'script6' | 'script7') => void
}

export default function ScriptSelector({ onSelectScript }: ScriptSelectorProps) {
  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-6 py-20 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-6xl font-bold gradient-text mb-6 tracking-tight">
            Pokemon Arbitrage
          </h1>
          <h2 className="text-4xl font-light text-white/90 mb-8">
            Intelligence
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto font-light">
            Advanced market analysis tools for profitable trading opportunities
          </p>
        </div>

        {/* Bento Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Script 7 - Card Comp (Full Width) */}
            <div 
              onClick={() => onSelectScript('script7')}
              className="xl:col-span-4 bento-card rounded-3xl p-8 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl group-hover:scale-110 transition-transform duration-500">
                  💰
                </div>
                <div className="px-4 py-2 glass rounded-full">
                  <span className="text-cyan-300 text-sm font-medium">PRICING</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-cyan-300 transition-colors duration-300">
                Card Comp
              </h3>
              <p className="text-white/70 text-lg leading-relaxed mb-8 font-light">
                Analyze raw card prices across eBay UK, Price Charting, and Pokemon TCG API. Get smart purchase recommendations based on recent sales and market averages with intelligent autocomplete.
              </p>
              <div className="flex items-center text-cyan-300 font-medium group-hover:translate-x-2 transition-transform duration-300">
                <span>Analyze Prices</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>



            {/* Script 1 - Japanese Singles */}
            <div 
              onClick={() => onSelectScript('script1')}
              className="xl:col-span-2 bento-card rounded-3xl p-8 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-3xl shadow-xl group-hover:scale-110 transition-transform duration-500">
                  🇯🇵
                </div>
                <div className="px-4 py-2 glass rounded-full">
                  <span className="text-orange-300 text-sm font-medium">ARBITRAGE</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-orange-300 transition-colors duration-300">
                Japanese Market
              </h3>
              <p className="text-white/70 text-lg leading-relaxed mb-8 font-light">
                Discover cross-market arbitrage opportunities with real-time price comparison across Japanese and international markets.
              </p>
              <div className="flex items-center text-orange-300 font-medium group-hover:translate-x-2 transition-transform duration-300">
                <span>Analyze Japanese Cards</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>

            {/* Script 2 - Grading Analysis */}
            <div 
              onClick={() => onSelectScript('script2')}
              className="bento-card rounded-3xl p-8 cursor-pointer group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500">
                ⭐
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-yellow-300 transition-colors duration-300">
                Grading Intelligence
              </h3>
              <p className="text-white/70 text-base leading-relaxed mb-8 font-light">
                Raw to graded profit analysis across PSA and ACE grading services.
              </p>
              <div className="flex items-center text-yellow-300 font-medium group-hover:translate-x-2 transition-transform duration-300">
                <span>Analyze Grading</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>

            {/* Script 3 - Market Intelligence */}
            <div 
              onClick={() => onSelectScript('script3')}
              className="bento-card rounded-3xl p-8 cursor-pointer group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500">
                📈
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-green-300 transition-colors duration-300">
                Market Trends
              </h3>
              <p className="text-white/70 text-base leading-relaxed mb-8 font-light">
                Real-time trending analysis and undervalued opportunity detection.
              </p>
              <div className="flex items-center text-green-300 font-medium group-hover:translate-x-2 transition-transform duration-300">
                <span>View Trends</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>

            {/* Script 4 - ETB Analysis */}
            <div 
              onClick={() => onSelectScript('script4')}
              className="bento-card rounded-3xl p-8 cursor-pointer group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500">
                📦
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors duration-300">
                ETB Intelligence
              </h3>
              <p className="text-white/70 text-base leading-relaxed mb-8 font-light">
                Comprehensive Elite Trainer Box analysis with historical pricing and availability tracking.
              </p>
              <div className="flex items-center text-purple-300 font-medium group-hover:translate-x-2 transition-transform duration-300">
                <span>Analyze ETBs</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>

            {/* Script 5 - Grading Services Comparison */}
            <div 
              onClick={() => onSelectScript('script5')}
              className="bento-card rounded-3xl p-8 cursor-pointer group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500">
                🏆
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-300 transition-colors duration-300">
                Grading Services
              </h3>
              <p className="text-white/70 text-base leading-relaxed mb-8 font-light">
                Compare grading costs, turnaround times, and UK shipping across major services.
              </p>
              <div className="flex items-center text-blue-300 font-medium group-hover:translate-x-2 transition-transform duration-300">
                <span>Compare Services</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>

            {/* Script 6 - Vintage Pack Tracker */}
            <div 
              onClick={() => onSelectScript('script6')}
              className="xl:col-span-2 bento-card rounded-3xl p-8 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl group-hover:scale-110 transition-transform duration-500">
                  🎴
                </div>
                <div className="px-4 py-2 glass rounded-full">
                  <span className="text-amber-300 text-sm font-medium">VINTAGE</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-amber-300 transition-colors duration-300">
                Vintage Pack Tracker
              </h3>
              <p className="text-white/70 text-lg leading-relaxed mb-8 font-light">
                Track and compare vintage WOTC booster pack prices across LoosePacks, eBay, and TCGPlayer. Find the cheapest Base Set, Jungle, Fossil, and Team Rocket packs with real-time market data.
              </p>
              <div className="flex items-center text-amber-300 font-medium group-hover:translate-x-2 transition-transform duration-300">
                <span>Track Vintage Packs</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
} 