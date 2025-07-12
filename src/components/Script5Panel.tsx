'use client'

import React, { useState } from 'react'

interface GradingService {
  name: string
  logo: string
  basePrice: number
  express: number
  fastest: number
  turnaround: {
    standard: string
    express: string
    fastest: string
  }
  shipping: {
    uk: number
    insurance: number
    tracking: boolean
  }
  cardValue: {
    min: number
    max: number
  }
  specialty: string
}

interface Script5PanelProps {
  onBack: () => void
}

export default function Script5Panel({ onBack }: Script5PanelProps) {
  const [selectedCards, setSelectedCards] = useState(1)
  const [cardValue, setCardValue] = useState(100)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GradingService[]>([])

  const gradingServices: GradingService[] = [
    {
      name: "PSA (Professional Sports Authenticator)",
      logo: "🏆",
      basePrice: 20,
      express: 50,
      fastest: 150,
      turnaround: {
        standard: "45-60 days",
        express: "15-20 days",
        fastest: "3-5 days"
      },
      shipping: {
        uk: 25,
        insurance: 15,
        tracking: true
      },
      cardValue: {
        min: 10,
        max: 49999
      },
      specialty: "Most recognized brand"
    },
    {
      name: "BGS (Beckett Grading Services)",
      logo: "💎",
      basePrice: 18,
      express: 45,
      fastest: 120,
      turnaround: {
        standard: "30-45 days",
        express: "10-15 days",
        fastest: "2-3 days"
      },
      shipping: {
        uk: 22,
        insurance: 12,
        tracking: true
      },
      cardValue: {
        min: 10,
        max: 99999
      },
      specialty: "Subgrade system"
    },
    {
      name: "ACE Grading",
      logo: "🎯",
      basePrice: 8,
      express: 20,
      fastest: 60,
      turnaround: {
        standard: "21-30 days",
        express: "7-10 days",
        fastest: "1-2 days"
      },
      shipping: {
        uk: 15,
        insurance: 8,
        tracking: true
      },
      cardValue: {
        min: 5,
        max: 9999
      },
      specialty: "UK-based service"
    },
    {
      name: "GetGraded",
      logo: "⚡",
      basePrice: 12,
      express: 30,
      fastest: 80,
      turnaround: {
        standard: "28-35 days",
        express: "10-14 days",
        fastest: "2-4 days"
      },
      shipping: {
        uk: 18,
        insurance: 10,
        tracking: true
      },
      cardValue: {
        min: 10,
        max: 19999
      },
      specialty: "Fast turnaround"
    },
    {
      name: "TAG Grading",
      logo: "🏷️",
      basePrice: 15,
      express: 35,
      fastest: 90,
      turnaround: {
        standard: "35-45 days",
        express: "12-18 days",
        fastest: "3-5 days"
      },
      shipping: {
        uk: 20,
        insurance: 12,
        tracking: true
      },
      cardValue: {
        min: 10,
        max: 29999
      },
      specialty: "Competitive pricing"
    },
    {
      name: "PG Grading",
      logo: "🔍",
      basePrice: 10,
      express: 25,
      fastest: 70,
      turnaround: {
        standard: "30-40 days",
        express: "8-12 days",
        fastest: "1-3 days"
      },
      shipping: {
        uk: 16,
        insurance: 9,
        tracking: true
      },
      cardValue: {
        min: 5,
        max: 14999
      },
      specialty: "Budget-friendly"
    }
  ]

  const handleAnalyze = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setResults(gradingServices)
    setLoading(false)
  }

  const calculateTotalCost = (service: GradingService, serviceType: 'standard' | 'express' | 'fastest') => {
    const basePrice = serviceType === 'standard' ? service.basePrice : 
                     serviceType === 'express' ? service.express : service.fastest
    const gradingCost = basePrice * selectedCards
    const shippingCost = service.shipping.uk
    const insuranceCost = cardValue > 100 ? service.shipping.insurance : 0
    return gradingCost + shippingCost + insuranceCost
  }

  const getBestValue = () => {
    if (results.length === 0) return null
    return results.reduce((best, current) => 
      calculateTotalCost(current, 'standard') < calculateTotalCost(best, 'standard') ? current : best
    )
  }

  const getFastest = () => {
    if (results.length === 0) return null
    return results.reduce((fastest, current) => {
      const currentDays = parseInt(current.turnaround.fastest.split('-')[0])
      const fastestDays = parseInt(fastest.turnaround.fastest.split('-')[0])
      return currentDays < fastestDays ? current : fastest
    })
  }

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center text-blue-300 hover:text-white transition-colors duration-300 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Scripts
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">Grading Services Comparison</h1>
            <p className="text-white/70 text-lg">Compare costs, turnaround times, and UK shipping across major grading services</p>
          </div>
          <div className="text-6xl">🏆</div>
        </div>

        {/* Input Panel */}
        <div className="bento-card rounded-3xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Analysis Parameters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Number of Cards</label>
              <input
                type="number"
                value={selectedCards}
                onChange={(e) => setSelectedCards(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                placeholder="Enter number of cards"
                min="1"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Average Card Value (£)</label>
              <input
                type="number"
                value={cardValue}
                onChange={(e) => setCardValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                placeholder="Enter average card value"
                min="0"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-6 btn-primary px-8 py-4 rounded-xl font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing Services...' : 'Compare Grading Services'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bento-card rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">💰 Best Value</h3>
                {getBestValue() && (
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{getBestValue()?.logo}</div>
                    <div>
                      <div className="font-bold text-white">{getBestValue()?.name}</div>
                      <div className="text-green-300 text-sm">£{calculateTotalCost(getBestValue()!, 'standard')} total</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bento-card rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">⚡ Fastest Service</h3>
                {getFastest() && (
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{getFastest()?.logo}</div>
                    <div>
                      <div className="font-bold text-white">{getFastest()?.name}</div>
                      <div className="text-blue-300 text-sm">{getFastest()?.turnaround.fastest}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Service Comparison Table */}
            <div className="bento-card rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Service Comparison</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left text-white/80 pb-4 font-medium">Service</th>
                      <th className="text-center text-white/80 pb-4 font-medium">Standard</th>
                      <th className="text-center text-white/80 pb-4 font-medium">Express</th>
                      <th className="text-center text-white/80 pb-4 font-medium">Fastest</th>
                      <th className="text-center text-white/80 pb-4 font-medium">UK Shipping</th>
                      <th className="text-center text-white/80 pb-4 font-medium">Total (Standard)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((service, index) => (
                      <tr key={index} className="border-b border-white/10">
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{service.logo}</div>
                            <div>
                              <div className="font-semibold text-white">{service.name}</div>
                              <div className="text-sm text-white/60">{service.specialty}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-4">
                          <div className="text-white font-medium">£{service.basePrice}</div>
                          <div className="text-sm text-white/60">{service.turnaround.standard}</div>
                        </td>
                        <td className="text-center py-4">
                          <div className="text-white font-medium">£{service.express}</div>
                          <div className="text-sm text-white/60">{service.turnaround.express}</div>
                        </td>
                        <td className="text-center py-4">
                          <div className="text-white font-medium">£{service.fastest}</div>
                          <div className="text-sm text-white/60">{service.turnaround.fastest}</div>
                        </td>
                        <td className="text-center py-4">
                          <div className="text-white font-medium">£{service.shipping.uk}</div>
                          <div className="text-sm text-green-300">✓ Tracking</div>
                        </td>
                        <td className="text-center py-4">
                          <div className="text-white font-bold text-lg">£{calculateTotalCost(service, 'standard')}</div>
                          <div className="text-sm text-white/60">inc. shipping</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bento-card rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">📋 Important Notes</h3>
                <ul className="space-y-2 text-white/70">
                  <li>• Prices are in GBP and include VAT where applicable</li>
                  <li>• Turnaround times start from when cards are received</li>
                  <li>• Insurance is recommended for cards over £100</li>
                  <li>• All services include tracking to the UK</li>
                </ul>
              </div>

              <div className="bento-card rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">💡 Tips</h3>
                <ul className="space-y-2 text-white/70">
                  <li>• ACE Grading is UK-based (faster, cheaper shipping)</li>
                  <li>• PSA/BGS have highest market recognition</li>
                  <li>• Consider card value when choosing service level</li>
                  <li>• Group submissions can reduce per-card costs</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 