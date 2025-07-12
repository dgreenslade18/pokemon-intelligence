'use client'

import { useState } from 'react'

interface Script2PanelProps {
  onBack: () => void
}

const pokemonSets = [
  'Scarlet & Violet Base Set',
  'Paldea Evolved',
  'Obsidian Flames',
  'Paradox Rift',
  'Paldean Fates',
  'Temporal Forces',
  'Twilight Masquerade',
  'Shrouded Fable',
  'Stellar Crown',
  'Prismatic Evolutions'
]

export default function Script2Panel({ onBack }: Script2PanelProps) {
  const [selectedSets, setSelectedSets] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const handleSetToggle = (set: string) => {
    setSelectedSets(prev => 
      prev.includes(set) 
        ? prev.filter(s => s !== set)
        : [...prev, set]
    )
  }

  const handleSelectAll = () => {
    setSelectedSets(pokemonSets)
  }

  const handleDeselectAll = () => {
    setSelectedSets([])
  }

  const handleRun = async () => {
    if (selectedSets.length === 0) {
      setError('Please select at least one Pokemon set')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setDownloadUrl(null)

    try {
      const response = await fetch('/api/script2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sets: selectedSets }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        if (data.downloadPath) {
          setDownloadUrl(`/api/download?file=${encodeURIComponent(data.downloadPath)}`)
        }
      } else {
        setError(data.message || 'Analysis failed')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'grading_arbitrage_results.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="mb-12">
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
            Grading Intelligence
          </h1>
          <p className="text-white/60 text-xl font-light">Raw to graded profit opportunities across PSA and ACE</p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Set Selection */}
          <div className="bento-card rounded-3xl p-10 mb-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-semibold text-white">Select Pokemon Sets</h2>
              <div className="flex items-center space-x-4">
                <div className="px-4 py-2 glass rounded-full">
                  <span className="text-yellow-300 font-medium">
                    {selectedSets.length} selected
                  </span>
                </div>
                <button
                  onClick={handleSelectAll}
                  className="px-6 py-3 glass rounded-2xl text-yellow-300 hover:bg-yellow-500/10 transition-all duration-300"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-6 py-3 glass rounded-2xl text-white/60 hover:bg-white/10 transition-all duration-300"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Grid of Sets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pokemonSets.map((set) => (
                <label
                  key={set}
                  className={`relative flex items-center p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                    selectedSets.includes(set)
                      ? 'glass-strong border-yellow-500/40 scale-105'
                      : 'glass hover:border-yellow-500/30 hover:bg-yellow-500/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSets.includes(set)}
                    onChange={() => handleSetToggle(set)}
                    className="hidden"
                  />
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mr-4 transition-all duration-300 ${
                    selectedSets.includes(set)
                      ? 'border-yellow-400 bg-yellow-500 scale-110'
                      : 'border-white/40'
                  }`}>
                    {selectedSets.includes(set) && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className={`font-medium text-lg transition-colors ${
                      selectedSets.includes(set) ? 'text-yellow-200' : 'text-white'
                    }`}>
                      {set}
                    </h3>
                    <p className="text-white/60 text-sm font-light">
                      English market analysis
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Run Button */}
            <div className="flex justify-center mt-10">
              <button
                onClick={handleRun}
                disabled={selectedSets.length === 0 || loading}
                className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 shadow-2xl hover:shadow-yellow-500/30"
              >
                <div className="flex items-center">
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 mr-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Analyzing Grading Opportunities...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0121 12a11.955 11.955 0 01-2.382 7.016M15.982 6.182A8.97 8.97 0 0119 12a8.97 8.97 0 01-3.018 5.818M12 14a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      Analyze Grading Potential
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bento-card rounded-3xl p-8 mb-8 border-red-500/20">
              <div className="flex items-center text-red-300">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-lg">Analysis Error</span>
              </div>
              <p className="text-red-200/80 mt-2 ml-9 text-base">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="bento-card rounded-3xl p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-semibold text-white">Analysis Complete</h2>
                {downloadUrl && (
                  <button
                    onClick={handleDownload}
                    className="px-8 py-4 glass rounded-2xl text-green-300 hover:bg-green-500/10 transition-all duration-300 group"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium">Download Results</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-2">{result.summary?.totalCards || 0}</div>
                  <div className="text-sm text-white/60 font-light">Cards Analyzed</div>
                </div>
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-2">{result.summary?.gradingCandidates || 0}</div>
                  <div className="text-sm text-white/60 font-light">Grading Candidates</div>
                </div>
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {result.summary?.totalProfit ? `$${result.summary.totalProfit.toFixed(0)}` : '$0'}
                  </div>
                  <div className="text-sm text-white/60 font-light">Potential Profit</div>
                </div>
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {result.summary?.avgROI ? `${result.summary.avgROI.toFixed(1)}%` : '0%'}
                  </div>
                  <div className="text-sm text-white/60 font-light">Avg ROI</div>
                </div>
              </div>

              {/* Detailed Grading Opportunities */}
              {result.gradingOpportunities && result.gradingOpportunities.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-2xl font-semibold text-white mb-6">Grading Opportunities</h3>
                  <div className="grid gap-6">
                    {result.gradingOpportunities.map((card: any, index: number) => (
                      <div 
                        key={index} 
                        className={`glass rounded-2xl p-6 ${card.isProfitable ? 'border-green-500/20' : 'border-red-500/20'}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-white mb-1">{card.name}</h4>
                            <p className="text-white/60 text-sm">
                              {card.cardNumber} • {card.type}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">£{card.rawPrice}</div>
                            <div className="text-sm text-white/60">Raw Price</div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                          {/* ACE Analysis */}
                          <div className="glass rounded-xl p-5">
                            <div className="flex items-center mb-3">
                              <span className="text-lg">💎</span>
                              <h5 className="text-lg font-semibold text-white ml-2">ACE 10</h5>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-white/70">Graded Price:</span>
                                <span className="text-white font-medium">£{card.ace.gradedPrice}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Total Investment:</span>
                                <span className="text-white font-medium">£{card.ace.totalInvestment}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Net Profit:</span>
                                <span className={card.ace.netProfit > 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                  £{card.ace.netProfit}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">ROI:</span>
                                <span className={card.ace.roi > 100 ? 'text-green-400 font-bold' : 'text-yellow-400 font-medium'}>
                                  {card.ace.roi.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Multiple:</span>
                                <span className="text-blue-400 font-medium">{card.ace.multiple.toFixed(1)}x</span>
                              </div>
                            </div>
                          </div>

                          {/* PSA Analysis */}
                          <div className="glass rounded-xl p-5">
                            <div className="flex items-center mb-3">
                              <span className="text-lg">🏆</span>
                              <h5 className="text-lg font-semibold text-white ml-2">PSA 10</h5>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-white/70">Graded Price:</span>
                                <span className="text-white font-medium">£{card.psa.gradedPrice}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Total Investment:</span>
                                <span className="text-white font-medium">£{card.psa.totalInvestment}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Net Profit:</span>
                                <span className={card.psa.netProfit > 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                  £{card.psa.netProfit}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">ROI:</span>
                                <span className={card.psa.roi > 100 ? 'text-green-400 font-bold' : 'text-yellow-400 font-medium'}>
                                  {card.psa.roi.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Multiple:</span>
                                <span className="text-blue-400 font-medium">{card.psa.multiple.toFixed(1)}x</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className={`glass rounded-xl p-4 ${card.isProfitable ? 'border-green-500/30' : 'border-red-500/30'}`}>
                          <div className="flex items-center">
                            <span className="text-lg mr-3">🎯</span>
                            <span className={`font-medium ${card.isProfitable ? 'text-green-300' : 'text-red-300'}`}>
                              RECOMMENDATION:
                            </span>
                          </div>
                          <p className={`mt-2 ml-8 ${card.isProfitable ? 'text-green-200' : 'text-red-200'}`}>
                            {card.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              <div className="glass rounded-2xl p-6 border-green-500/20">
                <div className="flex items-center text-green-300">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Your grading analysis is ready!</span>
                </div>
                <p className="text-green-200/80 mt-2 ml-8">
                  {result.message || 'Download the CSV file to view detailed grading opportunities with PSA and ACE profit calculations.'}
                </p>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-12 bento-card rounded-3xl p-8">
            <h3 className="text-2xl font-semibold text-white mb-6">How This Works</h3>
            <div className="grid md:grid-cols-2 gap-8 text-white/70">
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-4"></span>
                  <span>Analyzes raw card prices vs graded equivalents</span>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-4"></span>
                  <span>Calculates grading costs and potential profits</span>
                </li>
              </ul>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-4"></span>
                  <span>Compares PSA and ACE grading services</span>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mr-4"></span>
                  <span>Identifies highest ROI grading opportunities</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 