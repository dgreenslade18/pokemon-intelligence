'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from './Button'
import AddToListModal from './AddToListModal'
import { PriceShimmer, CardShimmer, ListingShimmer } from './LoadingShimmer'

interface Script7PanelProps {
  onBack: () => void
  hideBackButton?: boolean
}

interface ProgressUpdate {
  stage: string
  message: string
  timestamp: string
}

interface PromoInfo {
  isPromo: boolean
  promoType?: 'black_star' | 'cosmic_eclipse' | 'other'
  isSealed: boolean
  sealedKeywords: string[]
}

interface FilteredEbayResults {
  sealed: Array<{
    title: string
    price: number
    source: string
    url?: string
  }>
  unsealed: Array<{
    title: string
    price: number
    source: string
    url?: string
  }>
  promoInfo: PromoInfo
}

interface AnalysisResult {
  card_name: string
  timestamp: string
  ebay_prices: Array<{
    title: string
    price: number
    source: string
    url?: string
  }>
  cardmarket: CardMarketData | null
  card_details?: CardDetails
  analysis: {
    ebay_average?: number
    cardmarket_price?: number
    final_average?: number
    price_range?: string
    recommendation?: string
    // Multi-value pricing
    buy_value?: number
    trade_value?: number
    cash_value?: number
    pricing_strategy?: {
      show_buy_value: boolean
      show_trade_value: boolean
      show_cash_value: boolean
      buy_price?: string
      trade_price?: string
      cash_price?: string
    }
    // Whatnot pricing strategy
    whatnot_pricing?: {
      net_proceeds_at_market: string
      price_to_charge_for_market: string
      fees_percentage: number
    }
    // Promo and Sealed info
    promo_info?: PromoInfo
    filtered_ebay_results?: FilteredEbayResults
  }
}

interface TCGPlayerPricing {
  url: string
  updated_at: string
  prices: {
    [category: string]: {
      low?: number
      mid?: number
      high?: number
      market?: number
      directLow?: number
    }
  }
}

interface CardMarketPricing {
  url: string
  updated_at: string
  prices: {
    averageSellPrice?: number
    lowPrice?: number
    trendPrice?: number
    germanProLow?: number
    suggestedPrice?: number
    reverseHoloSell?: number
    reverseHoloLow?: number
    reverseHoloTrend?: number
    lowPriceExPlus?: number
    avg1?: number
    avg7?: number
    avg30?: number
    reverseHoloAvg1?: number
    reverseHoloAvg7?: number
    reverseHoloAvg30?: number
  }
}

interface CardDetails {
  images?: {
    small: string
    large: string
  }
  set?: {
    id: string
    name: string
    series: string
    releaseDate: string
    total: number
  }
  name: string
  number: string
  rarity: string
  artist: string
  hp?: string
  types: string[]
  supertype: string
  attacks?: Array<{
    name: string
    cost: string[]
    convertedEnergyCost: number
    damage: string
    text: string
  }>
  weaknesses?: Array<{
    type: string
    value: string
  }>
  resistances?: Array<{
    type: string
    value: string
  }>
  retreatCost?: string[]
  legalities?: {
    standard: string
    expanded: string
    unlimited: string
  }
  nationalPokedexNumbers?: number[]
  tcgplayer_pricing?: TCGPlayerPricing
  cardmarket_pricing?: CardMarketPricing
}

interface CardInfo {
  name: string
  set: string
  number: string
  rarity: string
  artist: string
  hp?: string
  types: string[]
  supertype: string
}

interface CardImages {
  small: string
  large: string
}

interface CardMarketData {
  title: string
  price: number
  source: string
  url: string
  card_info?: CardInfo
  images?: CardImages
  tcgplayer_pricing?: TCGPlayerPricing
  cardmarket_pricing?: CardMarketPricing
}

export default function Script7Panel({ onBack, hideBackButton = false }: Script7PanelProps) {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [showProgressOverlay, setShowProgressOverlay] = useState(false)
  const [progressStages, setProgressStages] = useState<Set<string>>(new Set())
  const [isEbayAccordionOpen, setIsEbayAccordionOpen] = useState(false)
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteLoading, setAutocompleteLoading] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below')
  const [maxDropdownHeight, setMaxDropdownHeight] = useState(320)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showAddToListModal, setShowAddToListModal] = useState(false)
  const [userLists, setUserLists] = useState<any[]>([])
  const resultsRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  // New state for multiple search results
  const [multipleSearchResults, setMultipleSearchResults] = useState<any[]>([])
  const [showMultipleResults, setShowMultipleResults] = useState(false)
  const [selectedCardForAnalysis, setSelectedCardForAnalysis] = useState<any>(null)
  
  // State for sealed/unsealed filtering
  const [showSealedOnly, setShowSealedOnly] = useState(false)
  const [showUnsealedOnly, setShowUnsealedOnly] = useState(false)

  // Function to format price with trailing zeros
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price
    return num.toFixed(2)
  }

  // Calculate optimal dropdown position based on available space
  const calculateDropdownPosition = () => {
    if (!searchInputRef.current) return

    const inputRect = searchInputRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - inputRect.bottom
    const spaceAbove = inputRect.top
    
    // Account for padding and margins
    const minSpaceNeeded = 200 // Minimum space needed for a reasonable dropdown
    const preferredDropdownHeight = 320 // Default max height
    
    if (spaceBelow >= minSpaceNeeded) {
      // Enough space below - use below position
      setDropdownPosition('below')
      setMaxDropdownHeight(Math.min(preferredDropdownHeight, spaceBelow - 20))
    } else if (spaceAbove >= minSpaceNeeded) {
      // Not enough space below, but enough above - use above position
      setDropdownPosition('above')
      setMaxDropdownHeight(Math.min(preferredDropdownHeight, spaceAbove - 20))
    } else {
      // Very little space in both directions - use the larger space
      if (spaceBelow >= spaceAbove) {
        setDropdownPosition('below')
        setMaxDropdownHeight(spaceBelow - 20)
      } else {
        setDropdownPosition('above')
        setMaxDropdownHeight(spaceAbove - 20)
      }
    }
  }

  // Auto-scroll to results after analysis completes
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 100)
    }
  }, [result])

  // Debounced autocomplete search
  useEffect(() => {
    if ((searchTerm || '').length < 2) {
      setAutocompleteResults([])
      setShowAutocomplete(false)
      setSelectedSuggestionIndex(-1)
      return
    }

    const debounceTimer = setTimeout(async () => {
      if ((searchTerm || '').length >= 2) {
        setAutocompleteLoading(true)
        setSelectedSuggestionIndex(-1)
        try {
          const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(searchTerm || '')}`)
          if (response.ok) {
            const data = await response.json()
            setAutocompleteResults(data.suggestions || [])
            // Calculate position before showing dropdown
            calculateDropdownPosition()
            setShowAutocomplete(true)
          }
        } catch (error) {
          console.error('Autocomplete error:', error)
        } finally {
          setAutocompleteLoading(false)
        }
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  // Handle click outside autocomplete and window resize/scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false)
      }
    }

    const handleWindowResize = () => {
      if (showAutocomplete) {
        calculateDropdownPosition()
      }
    }

    const handleScroll = () => {
      if (showAutocomplete) {
        calculateDropdownPosition()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('resize', handleWindowResize)
    window.addEventListener('scroll', handleScroll)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('resize', handleWindowResize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [showAutocomplete])



  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: any) => {
    // Create specific search term with card name and number
    let specificSearchTerm = suggestion.name || ''
    if (suggestion.number) {
      specificSearchTerm += ` ${suggestion.number}`
    }
    
    setSearchTerm(specificSearchTerm)
    setShowAutocomplete(false)
    setAutocompleteResults([])
    
    // Immediately start analysis of the specific card - bypass "Did You Mean" modal
    console.log(`🎯 Autocomplete selected: ${specificSearchTerm}`)
    setTimeout(() => {
      performAnalysis(specificSearchTerm)
    }, 100) // Small delay to let state update
  }

  const handleMultipleResultsFound = (results: any[]) => {
    setMultipleSearchResults(results)
    setShowMultipleResults(true)
    setLoading(false)
    setShowProgressOverlay(false)
  }

  const handleCardSelection = (selectedCard: any) => {
    setSelectedCardForAnalysis(selectedCard)
    setShowMultipleResults(false)
    setMultipleSearchResults([])
    
    // Create a specific search term using the card ID or detailed name
    let specificSearchTerm = selectedCard.name
    
    // If we have set and number info, create a more specific search
    if (selectedCard.set && selectedCard.number) {
      specificSearchTerm = `${selectedCard.name} ${selectedCard.set} ${selectedCard.number}`
    } else if (selectedCard.id) {
      // Use the card ID as it's the most specific identifier
      specificSearchTerm = selectedCard.id
    }
    
    console.log(`🎯 Selected specific card: ${specificSearchTerm}`)
    
    // Proceed with analysis using the specific card identifier
    performAnalysis(specificSearchTerm)
  }

  const performAnalysis = async (cardName: string, refresh: boolean = false) => {
    setLoading(true)
    setError(null)
    // Don't clear the result - we'll update it progressively
    setProgress(null)
    setProgressStages(new Set())
    // Show empty result structure immediately
    setResult({
      card_name: cardName,
      timestamp: new Date().toISOString(),
      ebay_prices: [],
      cardmarket: null,
      card_details: undefined,
      analysis: {}
    })

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        setError('Request timed out. Please try again.')
        setLoading(false)
      }
    }, 120000) // 2 minute timeout (longer since TCG API is slow)

    try {
      // Use EventSource for real-time progress updates
      const response = await fetch('/api/script7', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searchTerm: cardName.trim(),
          streamProgress: true,
          refresh: refresh
        }),
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
              const data = JSON.parse(line.slice(6))
                
                if (data.type === 'progress') {
                setProgress(data)
                setProgressStages(prev => new Set([...prev, data.stage]))
                } else if (data.type === 'partial') {
                  // Update result with partial data
                  setResult(prevResult => ({
                    ...prevResult,
                    ...data.data
                  }))
                } else if (data.type === 'complete') {
                  setResult(data.data)
                setLoading(false)
                clearTimeout(timeoutId)
                return
                } else if (data.type === 'error') {
                  setError(data.message)
                setLoading(false)
                clearTimeout(timeoutId)
                return
                }
              } catch (e) {
              console.error('Error parsing SSE data:', e)
              }
            }
          }
        }
    } catch (error) {
      console.error('Analysis error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred during analysis')
      setLoading(false)
      clearTimeout(timeoutId)
    }
  }

  const getProgressIcon = (stage: string) => {
    switch (stage) {
      case 'starting':
      case 'analysis':
        return '🚀'
      case 'ebay':
        return '🏪'
      case 'cardmarket':
        return '🎮'
      default:
        return '⚡'
    }
  }

  const getProgressColor = (stage: string) => {
    switch (stage) {
      case 'ebay':
        return 'from-blue-500 to-blue-600'
      case 'cardmarket':
        return 'from-purple-500 to-purple-600'
      case 'analysis':
        return 'from-orange-500 to-orange-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getProgressPercentage = (stage: string) => {
    // Calculate progress based on completed stages
    const completedStages = Array.from(progressStages)
    const totalStages = ['starting', 'ebay', 'cardmarket', 'analysis']
    const completedCount = totalStages.filter(s => completedStages.includes(s)).length
    
    // Base progress on completed stages rather than current stage
    const baseProgress = Math.min(90, (completedCount / totalStages.length) * 90)
    
    // Add some progress for the current stage to make it feel more responsive
    if (progress && progress.stage === stage) {
      return Math.min(baseProgress + 10, 90)
    }
    
    return baseProgress
  }

  const handleAnalyze = async () => {
    if (!(searchTerm || '').trim()) {
      setError('Please enter a Pokemon card name')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setProgress(null)
    setProgressStages(new Set())
    setShowProgressOverlay(true)

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        setError('Request timed out. Please try again.')
        setLoading(false)
        setShowProgressOverlay(false)
      }
    }, 30000) // 30 second timeout

    try {
      // First, check if we have multiple search results
      const searchResponse = await fetch(`/api/autocomplete?q=${encodeURIComponent((searchTerm || '').trim())}`)
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        
        // If we have multiple results (more than 1), show the "Did You Mean" interface
        if (searchData.suggestions && searchData.suggestions.length > 1) {
      clearTimeout(timeoutId)
          handleMultipleResultsFound(searchData.suggestions)
          return
        }
      }

      // If no multiple results or only one result, proceed with normal analysis
      performAnalysis((searchTerm || '').trim())
    } catch (error) {
      console.error('Analysis error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred during analysis')
      setLoading(false)
      setShowProgressOverlay(false)
      clearTimeout(timeoutId)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showAutocomplete && autocompleteResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < autocompleteResults.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < autocompleteResults.length) {
          handleSuggestionClick(autocompleteResults[selectedSuggestionIndex])
        } else if (!loading) {
          handleAnalyze()
        }
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false)
        setSelectedSuggestionIndex(-1)
      }
    } else if (e.key === 'Enter' && !loading) {
      handleAnalyze()
    }
  }

  // Save to comp list function
  const handleSaveToCompList = async () => {
    if (!result || !session?.user?.id) {
      setSaveMessage('Please sign in to save cards to your comp list')
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    // Check if user has multiple lists
    try {
      const listsResponse = await fetch('/api/lists')
      const listsData = await listsResponse.json()
      
      if (listsData.success && listsData.lists.length > 1) {
        // User has multiple lists - show selection modal
        setShowAddToListModal(true)
        return
      }
    } catch (error) {
      console.error('Error checking user lists:', error)
    }

    // Single list or error - save directly to default list
    await saveCardToList()
  }

  // Save card to specific list
  const saveCardToList = async (listId?: string) => {
    if (!result || !session?.user?.id) return

    setSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch('/api/comp-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardName: result.card_name,
          cardNumber: result.card_details?.number || '',
          recommendedPrice: result.analysis.recommendation || result.analysis.price_range || '',
          tcgPrice: result.analysis.cardmarket_price > 0 ? result.analysis.cardmarket_price : null,
          ebayAverage: result.analysis.ebay_average > 0 ? result.analysis.ebay_average : null,
          cardImageUrl: result.card_details?.images?.large || result.card_details?.images?.small || '',
          setName: result.card_details?.set?.name || '',
          listId: listId
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (data.isUpdate) {
          setSaveMessage('🔄 Card updated in your comp list!')
        } else {
          setSaveMessage('✅ Card saved to your comp list!')
        }
      } else {
        setSaveMessage('❌ Failed to save card. Please try again.')
      }
    } catch (error) {
      console.error('Error saving card:', error)
      setSaveMessage('❌ Failed to save card. Please try again.')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  // Handle list selection from modal
  const handleListSelect = (listId: string) => {
    saveCardToList(listId)
  }

  const handleRefresh = async () => {
    if (!(searchTerm || '').trim()) {
      setError('Please enter a Pokemon card name')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setProgress(null)
    setProgressStages(new Set())
    setShowProgressOverlay(true)

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        setError('Request timed out. Please try again.')
        setLoading(false)
        setShowProgressOverlay(false)
      }
    }, 30000) // 30 second timeout

    try {
      // Force fresh analysis bypassing cache
      performAnalysis((searchTerm || '').trim(), true)
    } catch (error) {
      console.error('Refresh analysis error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred during refresh analysis')
      setLoading(false)
      setShowProgressOverlay(false)
      clearTimeout(timeoutId)
    }
  }


  return (
    <div className="min-h-screen relative">


      <div className="container mx-auto md:px-6 py-6 md:py-12 relative z-10 overflow-visible">
        {/* Header */}
        <div className="mb-12 mx-auto w-full max-w-[700px] text-center">
          {!hideBackButton && (
            <button
              onClick={onBack}
              className="flex items-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white mb-8 group transition-all duration-300 font-medium"
            >
              <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Scripts
            </button>
          )}
          <h1 className="text-[34px] md:text-[68px] font-medium leading-[1.05] text-center max-w-[882px] mx-auto tracking-[-0.63px] gradient-text mb-4">
          Made for sellers. Updated for today. </h1>
          <p className="text-black/60 dark:text-white/60 block text-l md:text-xl font-regular md:mx-0 mx-auto">Analyse English raw card prices across eBay and Pokemon TCG API</p>
        </div>

        <div className="max-w-5xl mx-auto overflow-visible">
          {/* Search Section */}
          <div className="bento-card rounded-3xl p-6 md:p-10 mb-8 relative z-10 !overflow-visible">
            <h2 className="text-xl md:text-2xl font-regular text-black dark:text-white mb-8 text-center md:text-left">Enter Pokemon Card Name</h2>
            
            <div className="flex gap-4 mb-6 flex-col md:flex-row items-center">
              <div className="flex-1 relative" ref={autocompleteRef}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., Charizard V, Special Delivery Charizard"
                  className="w-full px-4 md:px-6 py-4 relative z-10 bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 rounded-2xl text-black dark:text-white dark:placeholder-white/50 placeholder-black/50 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all duration-300"
                  disabled={loading}
                />
                
                {/* Autocomplete Dropdown */}
                {showAutocomplete && (autocompleteResults.length > 0 || autocompleteLoading) && (
                  <div 
                    className={`absolute left-0 right-0 bg-black/50 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl z-[9999] overflow-y-auto overflow-x-hidden ${
                      dropdownPosition === 'below' 
                        ? 'top-full mt-2' 
                        : 'bottom-full mb-2'
                    }`}
                    style={{
                      maxHeight: `${maxDropdownHeight}px`
                    }}
                  >
                    {autocompleteLoading && (
                      <div className="p-3 md:p-4 text-center text-white/50">
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Searching cards...
                        </div>
                      </div>
                    )}
                    
                    {!autocompleteLoading && autocompleteResults.map((suggestion, index) => (
                      <div
                        key={suggestion.id || index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`flex items-center p-3 md:p-4 cursor-pointer transition-colors duration-200 border-b border-white/10 last:border-b-0 ${
                          selectedSuggestionIndex === index 
                            ? 'bg-white/20 border-blue-400/30' 
                            : 'hover:bg-white/10'
                        }`}
                      >
                        {suggestion.image && (
                          <img 
                            src={suggestion.image} 
                            alt={suggestion.name}
                            className="w-9 h-13 md:w-12 md:h-16 object-cover rounded-lg mr-4 bg-white/5 flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-white font-medium truncate">
                            {suggestion.name}
                          </div>
                          {suggestion.set && suggestion.set !== 'Unknown Set' ? (
                            <div className="text-white/60 text-sm truncate">
                              {suggestion.set} {suggestion.number && `• ${suggestion.number}`}
                            </div>
                          ) : suggestion.number ? (
                            <div className="text-white/60 text-sm truncate">
                              Card #{suggestion.number}
                            </div>
                          ) : null}
                          {suggestion.rarity && suggestion.rarity !== 'Unknown' && (
                            <div className="text-white/40 text-xs truncate">
                              {suggestion.rarity}
                            </div>
                          )}
                        </div>
                        <div className="text-white/30 ml-2 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                    
                    {!autocompleteLoading && autocompleteResults.length === 0 && (
                      <div className="p-4 text-center text-white/50">
                        No cards found matching "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 flex-col md:flex-row w-full md:w-auto">
              <Button
                onClick={handleAnalyze}
                disabled={loading || !(searchTerm || '').trim()}
                color="primary"
                size="large"
                className="px-4 md:px-8 py-4"
              >
                {loading ? (
                  <div className="flex items-center justify-center md:justify-start">
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Analysing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center md:justify-start">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Analyse Card
                  </div>
                )}
              </Button>
                
                <Button
                  onClick={handleRefresh}
                  disabled={loading || !(searchTerm || '').trim()}
                  color="secondary"
                  size="large"
                  className="px-4 md:px-8 py-4"
                >
                  <div className="flex items-center justify-center md:justify-start">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Force Refresh
                  </div>
                </Button>
              </div>
            </div>


          </div>

          {/* Multiple Results - "Did You Mean" Interface */}
          {showMultipleResults && multipleSearchResults.length > 0 && (
            <div className="bento-card rounded-3xl p-6 md:p-10 mb-8">
              <div className="text-center mb-8">
                <h2 className="text-xl md:text-2xl font-semibold text-black dark:text-white mb-4">
                  🎯 Did You Mean?
                </h2>
                <p className="text-black/60 dark:text-white/60">
                  Multiple cards found for "{searchTerm}". Please select the one you want to analyze:
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {multipleSearchResults.map((card, index) => (
                  <div
                    key={card.id || index}
                    onClick={() => handleCardSelection(card)}
                    className="group cursor-pointer bg-black/10 dark:bg-white/10 rounded-2xl p-4 md:p-6 border border-white/20 hover:border-blue-400/50 hover:bg-white/15 dark:hover:bg-black/15 transition-all duration-300 transform hover:scale-105"
                  >
                    {/* Card Image */}
                    {card.image && (
                      <div className="mb-4 flex justify-center">
                        <img 
                          src={card.image} 
                          alt={card.name}
                          className="w-20 h-28 md:w-24 md:h-32 object-cover rounded-xl shadow-lg group-hover:shadow-xl transition-shadow"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Card Info */}
                    <div className="text-center">
                      <h3 className="font-semibold text-black dark:text-white text-sm md:text-base mb-2 group-hover:text-blue-400 transition-colors">
                        {card.name}
                      </h3>
                      
                      {/* Set Information - Made more prominent */}
                      {card.set && card.set !== 'Unknown Set' ? (
                        <div className="mb-2">
                          <p className="text-black/80 dark:text-white/80 text-xs md:text-sm font-medium bg-black/10 dark:bg-white/10 px-2 py-1 rounded-lg inline-block">
                            {card.set}
                          </p>
                        </div>
                      ) : card.set?.id ? (
                        <div className="mb-2">
                          <p className="text-black/70 dark:text-white/70 text-xs md:text-sm bg-black/10 dark:bg-white/10 px-2 py-1 rounded-lg inline-block">
                            Set: {card.set.id}
                          </p>
                        </div>
                      ) : null}
                      
                      {/* Card Number */}
                      {card.number && (
                        <p className="text-black/50 dark:text-white/50 text-xs mb-1">
                          #{card.number}
                        </p>
                      )}
                      
                      {/* Rarity */}
                      {card.rarity && card.rarity !== 'Unknown' && (
                        <p className="text-black/40 dark:text-white/40 text-xs">
                          {card.rarity}
                        </p>
                      )}
                    </div>
                    
                    {/* Selection Indicator */}
                    <div className="mt-4 flex justify-center">
                      <div className="w-2 h-2 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Back Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setShowMultipleResults(false)
                    setMultipleSearchResults([])
                  }}
                  className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors font-medium"
                >
                  ← Back to search
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bento-card rounded-3xl p-8 mb-8 border-red-500/30 bg-red-500/10">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div ref={resultsRef} className="space-y-8">
              {/* Summary Card */}
              <div className="bento-card rounded-3xl p-6 md:p-10">
                <div className="mb-8">
                  <h2 className="text-xl md:text-3xl font-semibold dark:text-white text-black">Analysis Results: {result.card_name}</h2>
                </div>
                
                {result.analysis.final_average ? (
                  <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl p-4 md:p-8 mb-8">
                    <div className="text-center">
                      <h3 className="text-lg md:text-2xl font-bold dark:text-white text-black mb-4">💰 Recommended Price Range</h3>
                      <div className="text-xl md:text-4xl font-bold dark:text-green-300 text-green-700 mb-2">{result.analysis.recommendation}</div>
                      <p className="text-sm md:text-base dark:text-white/60 text-black/60">Based on current market average of £{formatPrice(result.analysis.final_average || 0)}</p>
                    </div>
                  </div>
                ) : result.ebay_prices?.length > 0 ? (
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-4 md:p-8 mb-8">
                    <div className="text-center">
                      <h3 className="text-lg md:text-2xl font-bold dark:text-white text-black mb-4">⚡ Preliminary Analysis</h3>
                      <div className="text-xl md:text-3xl font-bold dark:text-blue-300 text-blue-700 mb-2">
                        £{formatPrice(result.analysis.ebay_average || result.ebay_prices.reduce((sum, item) => sum + item.price, 0) / result.ebay_prices.length)}
                      </div>
                      <p className="text-sm md:text-base dark:text-white/60 text-black/60">
                        Based on {result.ebay_prices.length} eBay sales • Pending market data...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-4 md:p-8 mb-8">
                    <div className="text-center">
                      <h3 className="text-xl font-bold dark:text-white text-black mb-4">⚠️ Insufficient Data</h3>
                      <p className="dark:text-white/60 text-black/60">Not enough price data found to make a recommendation</p>
                    </div>
                  </div>
                )}

                {/* Save to Comp List Button */}
                <div className="mb-8 flex justify-center">
                  <Button
                    onClick={handleSaveToCompList}
                    disabled={saving}
                    color="secondary"
                    size="large"
                  >
                    {saving ? (
                      <>
                        <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Save to Comp List
                      </>
                    )}
                  </Button>
                </div>

                {/* Save message */}
                {saveMessage && (
                  <div className="mb-6 text-center">
                    <div className={`inline-block px-4 py-2 rounded-lg ${
                      saveMessage.includes('✅') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {saveMessage}
                    </div>
                  </div>
                )}

                {/* Price Sources */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* eBay UK */}
                  <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 dark:bg-blue-100 bg-blue-300 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-xl">🏪</span>
                      </div>
                      <h4 className="text-lg font-semibold dark:text-white text-black">eBay UK</h4>
                    </div>
                    
                    {loading && (!result.ebay_prices || result.ebay_prices.length === 0) ? (
                      <div className="space-y-4">
                        <div className="flex items-center mb-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                          <span className="text-sm dark:text-white/70 text-black/70">Loading eBay prices...</span>
                        </div>
                        <ListingShimmer />
                      </div>
                    ) : result.ebay_prices.length > 0 ? (
                      <div>
                        {/* Promo and Sealed Filtering */}
                        {result.analysis.promo_info?.isPromo && (
                          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <span className="text-yellow-600 dark:text-yellow-400 mr-2">🎁</span>
                                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                  Promo Card Detected
                                </span>
                              </div>
                              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                {result.analysis.promo_info.promoType?.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            
                            {/* Sealed/Unsealed Filter Buttons */}
                            {result.analysis.filtered_ebay_results && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    setShowSealedOnly(!showSealedOnly)
                                    setShowUnsealedOnly(false)
                                  }}
                                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                    showSealedOnly 
                                      ? 'bg-yellow-500 text-white' 
                                      : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300'
                                  }`}
                                >
                                  Sealed ({result.analysis.filtered_ebay_results.sealed.length})
                                </button>
                                <button
                                  onClick={() => {
                                    setShowUnsealedOnly(!showUnsealedOnly)
                                    setShowSealedOnly(false)
                                  }}
                                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                    showUnsealedOnly 
                                      ? 'bg-yellow-500 text-white' 
                                      : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300'
                                  }`}
                                >
                                  Unsealed ({result.analysis.filtered_ebay_results.unsealed.length})
                                </button>
                                <button
                                  onClick={() => {
                                    setShowSealedOnly(false)
                                    setShowUnsealedOnly(false)
                                  }}
                                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                    !showSealedOnly && !showUnsealedOnly
                                      ? 'bg-yellow-500 text-white' 
                                      : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300'
                                  }`}
                                >
                                  All ({result.ebay_prices.length})
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Dynamic price display based on filtering */}
                        <div className="text-2xl font-bold dark:text-blue-300 text-blue-700 mb-3">
                          £{(() => {
                            if (result.analysis.filtered_ebay_results) {
                              if (showSealedOnly && result.analysis.filtered_ebay_results.sealed.length > 0) {
                                const sealedAvg = result.analysis.filtered_ebay_results.sealed.reduce((sum, item) => sum + item.price, 0) / result.analysis.filtered_ebay_results.sealed.length
                                return formatPrice(sealedAvg)
                              } else if (showUnsealedOnly && result.analysis.filtered_ebay_results.unsealed.length > 0) {
                                const unsealedAvg = result.analysis.filtered_ebay_results.unsealed.reduce((sum, item) => sum + item.price, 0) / result.analysis.filtered_ebay_results.unsealed.length
                                return formatPrice(unsealedAvg)
                              }
                            }
                            return formatPrice(result.analysis.ebay_average || 0)
                          })()}
                        </div>
                        
                        <p className="dark:text-white/50 text-black/50 text-sm mb-4">
                          {(() => {
                            if (result.analysis.filtered_ebay_results) {
                              if (showSealedOnly) {
                                return `Average of ${result.analysis.filtered_ebay_results.sealed.length} sealed sales`
                              } else if (showUnsealedOnly) {
                                return `Average of ${result.analysis.filtered_ebay_results.unsealed.length} unsealed sales`
                              }
                            }
                            return `Average of ${result.ebay_prices.length} recent sales`
                          })()}
                        </p>
                        
                        {/* Accordion for eBay listings */}
                        <div className="border border-black/10 dark:border-white/10 rounded-lg">
                          <button
                            onClick={() => setIsEbayAccordionOpen(!isEbayAccordionOpen)}
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                          >
                            <span className="dark:text-white/70 text-black/70 text-sm">View Individual Listings</span>
                            <svg 
                              className={`w-4 h-4 dark:text-white/50 text-black/50 transition-transform duration-200 ${isEbayAccordionOpen ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {isEbayAccordionOpen && (
                            <div className="border-t border-black/10 dark:border-white/10 p-3">
                              <div className="space-y-2">
                                {(() => {
                                  // Determine which items to show based on filtering
                                  let itemsToShow = result.ebay_prices
                                  
                                  if (result.analysis.filtered_ebay_results) {
                                    if (showSealedOnly) {
                                      itemsToShow = result.analysis.filtered_ebay_results.sealed
                                    } else if (showUnsealedOnly) {
                                      itemsToShow = result.analysis.filtered_ebay_results.unsealed
                                    }
                                  }
                                  
                                                                     return itemsToShow.map((item, index) => (
                                    <div key={index} className="text-xs dark:text-white/40 text-black/40 bg-black/5 dark:bg-white/5 rounded p-2">
                                      <div className="font-medium">£{formatPrice(item.price)}</div>
                                      <div className="mb-1">{item.title}</div>
                                      {item.url && (
                                        <a 
                                          href={item.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center text-blue-400 hover:text-blue-300 text-xs transition-colors duration-200"
                                        >
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                          View Listing
                                        </a>
                                      )}
                                    </div>
                                  ))
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="dark:text-white/50 text-black/50">No recent sales found</div>
                    )}
                  </div>

                  {/* Pokemon TCG API */}
                  <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 dark:bg-purple-100 bg-purple-300 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-xl">🎮</span>
                      </div>
                      <h4 className="text-lg font-semibold dark:text-white text-black">Market data</h4>
                    </div>
                    
                    {loading && !result.cardmarket ? (
                      <div className="space-y-4">
                        <div className="flex items-center mb-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
                          <span className="text-sm dark:text-white/70 text-black/70">Loading TCG data...</span>
                        </div>
                        <PriceShimmer />
                      </div>
                    ) : result.cardmarket ? (
                      <div>
                        <div className="text-2xl font-bold dark:text-purple-300 text-purple-700 mb-3">
                          £{formatPrice(result.cardmarket.price)}
                        </div>
                        <p className="dark:text-white/50 text-black/50 text-sm mb-2">Best available market price</p>
                        {result.cardmarket.url && (
                          <a 
                            href={result.cardmarket.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-purple-400 hover:text-purple-300 text-sm transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Listing
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="dark:text-white/50 text-black/50">No pricing data found</div>
                    )}
                  </div>
                </div>

                {/* Whatnot Pricing Strategy */}
                {result?.analysis?.whatnot_pricing && (
                  <div className="mt-8 bg-black/5 dark:bg-white/5 rounded-2xl p-6">
                    <h4 className="text-lg font-semibold dark:text-white text-black mb-4">📱 Whatnot Pricing Strategy</h4>
                    
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        {/* Price to charge to receive market average - NOW FIRST */}
                        <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4">
                          <div className="flex text-center md:text-left items-center justify-between flex-col md:flex-row">
                            <div>
                              <h5 className="dark:text-cyan-300 text-cyan-700 font-medium">🎯 Price to Charge for Market Value</h5>
                              <p className="dark:text-cyan-200 text-cyan-700 text-sm">List price to receive £{(result?.analysis?.final_average || 0).toFixed(2)} after {result?.analysis?.whatnot_pricing?.fees_percentage}% fees</p>
                            </div>
                            <p className="text-2xl font-bold dark:text-cyan-300 text-cyan-700 mt-4 md:mt-0">{result?.analysis?.whatnot_pricing?.price_to_charge_for_market}</p>
                          </div>
                        </div>

                        {/* Net proceeds if selling at market average - NOW SECOND */}
                        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex text-center md:text-left items-center justify-between flex-col md:flex-row">
                        <div>
                              <h5 className="dark:text-purple-300 text-purple-700 font-medium">💰 Net Proceeds at Market Price</h5>
                              <p className="dark:text-purple-200 text-purple-700 text-sm">What you'll receive selling at £{(result?.analysis?.final_average || 0).toFixed(2)} (after {result?.analysis?.whatnot_pricing?.fees_percentage}% fees)</p>
                            </div>
                            <p className="text-2xl font-bold dark:text-purple-300 text-purple-700 mt-4 md:mt-0">{result?.analysis?.whatnot_pricing?.net_proceeds_at_market}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Whatnot fee info */}
                      <div className="pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="dark:text-white/50 text-black/50">Whatnot Fee Rate:</span>
                          <span className="dark:text-white font-medium">{result?.analysis?.whatnot_pricing?.fees_percentage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trade Pricing Strategy */}
                {(result.analysis.pricing_strategy || result.analysis.price_range) && (
                  <div className="mt-8 bg-black/5 dark:bg-white/5 rounded-2xl p-6">
                    <h4 className="text-lg font-semibold dark:text-white text-black mb-4">💰 Trade Pricing Strategy</h4>
                    
                    {result.analysis.pricing_strategy ? (
                      <div className="space-y-4">
                        {/* Multi-value pricing grid */}
                        <div className="grid gap-4">
                          {result.analysis.pricing_strategy.show_buy_value && result.analysis.pricing_strategy.buy_price && (
                            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="dark:text-green-300 text-green-700 font-medium">💵 Buy Value</h5>
                                  <p className="dark:text-green-200 text-green-700 text-sm">Market price for buying/selling</p>
                                </div>
                                <p className="text-lg md:text-2xl text-right font-bold dark:text-green-300 text-green-700">{result.analysis.pricing_strategy.buy_price}</p>
                              </div>
                            </div>
                          )}
                          
                          {result.analysis.pricing_strategy.show_trade_value && result.analysis.pricing_strategy.trade_price && (
                            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="dark:text-blue-300 text-blue-700 font-medium">🔄 Trade Value</h5>
                                  <p className="dark:text-blue-200 text-blue-700 text-sm">Price to pay for store credit/trade</p>
                                </div>
                                <p className="text-lg md:text-2xl text-right font-bold dark:text-blue-300 text-blue-700">{result.analysis.pricing_strategy.trade_price}</p>
                              </div>
                            </div>
                          )}
                          
                          {result.analysis.pricing_strategy.show_cash_value && result.analysis.pricing_strategy.cash_price && (
                            <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="dark:text-orange-300 text-orange-700 font-medium">💸 Cash Value</h5>
                                  <p className="dark:text-orange-200 text-orange-700 text-sm">Price to pay with cash</p>
                                </div>
                                <p className="text-lg md:text-2xl text-right font-bold dark:text-orange-300 text-orange-700">{result.analysis.pricing_strategy.cash_price}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Market info */}
                        <div className="pt-4 border-t border-white/10">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="dark:text-white/50 text-black/50 text-sm mb-1">Price Range</p>
                              <p className="dark:text-white font-medium">{result.analysis.price_range}</p>
                            </div>
                            <div>
                              <p className="dark:text-white/50 text-black/50 text-sm mb-1">Market Average</p>
                              <p className="dark:text-white font-medium">£{formatPrice(result.analysis.final_average || 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Fallback for legacy format */
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="dark:text-white/50 text-black/50 mb-2">Price Range</p>
                          <p className="text-xl font-semibold dark:text-white text-black">{result.analysis.price_range}</p>
                        </div>
                        <div>
                          <p className="text-white/50 mb-2">Market Average</p>
                          <p className="text-xl font-semibold text-white">£{formatPrice(result.analysis.final_average || 0)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Comprehensive Card Details */}
                {loading && !result.card_details ? (
                  <div className="mt-8 bg-black/5 dark:bg-white/5 rounded-2xl p-6">
                    <h4 className="text-lg font-semibold dark:text-white text-black mb-6">🎴 Complete Card Information</h4>
                    <div className="flex items-center mb-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-2"></div>
                      <span className="text-sm dark:text-white/70 text-black/70">Loading card details...</span>
                    </div>
                    <CardShimmer />
                  </div>
                ) : result.card_details && (result.card_details.images || result.card_details.tcgplayer_pricing || result.card_details.cardmarket_pricing || result.card_details.name) && (
                  <div className="mt-8 bg-black/5 dark:bg-white/5 rounded-2xl p-6">
                    <h4 className="text-lg font-semibold dark:text-white text-black mb-6">🎴 Complete Card Information</h4>
                    
                    <div className="grid lg:grid-cols-3 gap-8">
                      {/* Card Image & Basic Info */}
                      
                        {result.card_details.images?.large && (
                          <div className="bg-black/10 dark:bg-white/10 rounded-xl p-4">
                            <img 
                              src={result.card_details.images.large} 
                              alt={result.card_details.name || 'Pokemon Card'}
                              className="w-full max-w-xs mx-auto rounded-lg shadow-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                        
                        {result.card_details.name && (
                          <div className="space-y-3">
                            <h5 className="text-md font-semibold dark:text-white text-black">Card Details</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Name:</span>
                                <span className="dark:text-white text-black">{result.card_details.name}</span>
                              </div>
                              {result.card_details.set?.name && (
                                <div className="flex justify-between">
                                  <span className="dark:text-white/50 text-black/50">Set:</span>
                                  <span className="dark:text-white text-black">{result.card_details.set.name}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Number:</span>
                                <span className="dark:text-white text-black">{result.card_details.number}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Rarity:</span>
                                <span className="dark:text-white text-black">{result.card_details.rarity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Artist:</span>
                                <span className="dark:text-white text-black">{result.card_details.artist}</span>
                              </div>
                              {result.card_details.hp && (
                                <div className="flex justify-between">
                                  <span className="dark:text-white/50 text-black/50">HP:</span>
                                  <span className="dark:text-white text-black">{result.card_details.hp}</span>
                                </div>
                              )}
                              {result.card_details.types && result.card_details.types.length > 0 && (
                                <div className="flex justify-between">
                                  <span className="dark:text-white/50 text-black/50">Types:</span>
                                  <span className="dark:text-white text-black">{result.card_details.types.join(', ')}</span>
                                </div>
                              )}
                              {result.card_details.supertype && (
                                <div className="flex justify-between">
                                  <span className="dark:text-white/50 text-black/50">Supertype:</span>
                                  <span className="dark:text-white text-black">{result.card_details.supertype}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Game Statistics */}
                        {(result.card_details.attacks || result.card_details.weaknesses || result.card_details.resistances || result.card_details.retreatCost) && (
                          <div className="space-y-3">
                            <h5 className="text-md font-semibold dark:text-white text-black">Game Statistics</h5>
                            
                            {/* Attacks */}
                            {result.card_details.attacks && result.card_details.attacks.length > 0 && (
                              <div className="space-y-2">
                                <h6 className="text-sm font-medium dark:text-white/70 text-black/70">Attacks</h6>
                                {result.card_details.attacks.map((attack, index) => (
                                  <div key={index} className="bg-black/5 dark:bg-white/5 rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="dark:text-white text-black font-medium">{attack.name}</span>
                                      <span className="dark:text-orange-300 text-orange-700 font-bold">{attack.damage}</span>
                                    </div>
                                    <div className="text-xs dark:text-white/50 text-black/50 mb-1">
                                      Energy Cost: {attack.cost.length > 0 ? attack.cost.join(', ') : 'None'}
                                    </div>
                                    {attack.text && (
                                      <div className="text-xs dark:text-white/70 text-black/70">{attack.text}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Weaknesses */}
                            {result.card_details.weaknesses && result.card_details.weaknesses.length > 0 && (
                              <div>
                                <h6 className="text-sm font-medium dark:text-white/70 text-black/70 mb-2">Weaknesses</h6>
                                <div className="flex flex-wrap gap-2">
                                  {result.card_details.weaknesses.map((weakness, index) => (
                                    <div key={index} className="bg-red-500/20 dark:bg-red-300 text-red-700   px-2 py-1 rounded text-xs">
                                      {weakness.type} {weakness.value}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Resistances */}
                            {result.card_details.resistances && result.card_details.resistances.length > 0 && (
                              <div>
                                <h6 className="text-sm font-medium dark:text-white/70 text-black/70 mb-2">Resistances</h6>
                                <div className="flex flex-wrap gap-2">
                                  {result.card_details.resistances.map((resistance, index) => (
                                    <div key={index} className="bg-blue-500/20 dark:bg-blue-300 text-blue-300 px-2 py-1 rounded text-xs">
                                      {resistance.type} {resistance.value}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Retreat Cost */}
                            {result.card_details.retreatCost && result.card_details.retreatCost.length > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="dark:text-white/50 text-black/50">Retreat Cost:</span>
                                <span className="dark:text-white text-black">{result.card_details.retreatCost.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Legalities */}
                        {result.card_details.legalities && (
                          <div className="space-y-3">
                            <h5 className="text-md font-semibold dark:text-white text-black">Format Legalities</h5>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Standard:</span>
                                <span className={`${result.card_details.legalities?.standard === 'Legal' ? 'dark:text-green-300 text-green-700' : result.card_details.legalities?.standard ? 'dark:text-red-300 text-red-700' : 'dark:text-white/40 text-black/40'}`}>
                                  {result.card_details.legalities?.standard || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Expanded:</span>
                                <span className={`${result.card_details.legalities?.expanded === 'Legal' ? 'dark:text-green-300 text-green-700' : result.card_details.legalities?.expanded ? 'dark:text-red-300 text-red-700' : 'dark:text-white/40 text-black/40'}`}>
                                  {result.card_details.legalities?.expanded || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Unlimited:</span>
                                <span className={`${result.card_details.legalities?.unlimited === 'Legal' ? 'dark:text-green-300 text-green-700' : result.card_details.legalities?.unlimited ? 'dark:text-red-300 text-red-700' : 'dark:text-white/40 text-black/40'}`}>
                                  {result.card_details.legalities?.unlimited || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Set Information */}
                        {result.card_details.set && (
                          <div className="space-y-3">
                            <h5 className="text-md font-semibold dark:text-white text-black">Set Information</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Series:</span>
                                <span className="dark:text-white text-black">{result.card_details.set.series}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Release Date:</span>
                                <span className="dark:text-white text-black">{result.card_details.set.releaseDate}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="dark:text-white/50 text-black/50">Total Cards:</span>
                                <span className="dark:text-white text-black">{result.card_details.set.total}</span>
                              </div>
                            </div>
                          </div>
                        )}
                     

                      {/* TCGPlayer Pricing */}
                      {result.card_details.tcgplayer_pricing?.prices && Object.keys(result.card_details.tcgplayer_pricing.prices).length > 0 && (
                        <div>
                          <h5 className="text-md font-semibold dark:text-white text-black mb-4 flex items-center">
                            <span className="mr-2">🇺🇸</span>
                            TCGPlayer Pricing (USD)
                          </h5>
                          <div className="space-y-3">
                            {Object.entries(result.card_details.tcgplayer_pricing.prices).map(([category, prices]) => (
                              <div key={category} className="bg-black/5 dark:bg-white/5 rounded-lg p-3">
                                <div className="font-medium dark:text-white text-black capitalize mb-2">{category.replace(/([A-Z])/g, ' $1').trim()}</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {prices.market && (
                                    <div className="flex justify-between">
                                      <span className="dark:text-white/50 text-black/50">Market:</span>
                                      <span className="dark:text-green-300 text-green-700 font-medium">${formatPrice(prices.market)}</span>
                                    </div>
                                  )}
                                  {prices.low && (
                                    <div className="flex justify-between">
                                      <span className="dark:text-white/50 text-black/50">Low:</span>
                                      <span className="dark:text-white text-black">${formatPrice(prices.low)}</span>
                                    </div>
                                  )}
                                  {prices.mid && (
                                    <div className="flex justify-between">
                                      <span className="dark:text-white/50 text-black/50">Mid:</span>
                                      <span className="dark:text-white text-black">${formatPrice(prices.mid)}</span>
                                    </div>
                                  )}
                                  {prices.high && (
                                    <div className="flex justify-between">
                                      <span className="dark:text-white/50 text-black/50">High:</span>
                                      <span className="dark:text-white text-black">${formatPrice(prices.high)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {result.card_details.tcgplayer_pricing.url && (
                            <a 
                              href={result.card_details.tcgplayer_pricing.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center dark:text-blue-400 text-blue-700 hover:text-blue-300 text-sm mt-3 transition-colors duration-200"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View on TCGPlayer
                            </a>
                          )}
                        </div>
                      )}

                      {/* CardMarket Pricing */}
                      {result.card_details.cardmarket_pricing?.prices && (
                        <div>
                          <h5 className="text-md font-semibold dark:text-white text-black mb-4 flex items-center">
                            <span className="mr-2">🇪🇺</span>
                            CardMarket Pricing (EUR)
                          </h5>
                          <div className="space-y-3">
                            {/* Current Market Prices */}
                            <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3">
                              <div className="font-medium dark:text-white text-black mb-2">Current Market</div>
                              <div className="space-y-1 text-xs">
                                {result.card_details.cardmarket_pricing.prices.trendPrice && (
                                  <div className="flex justify-between">
                                    <span className="dark:text-white/50 text-black/50">Trend Price:</span>
                                    <span className="dark:text-green-300 text-green-700 font-medium">€{formatPrice(result.card_details.cardmarket_pricing.prices.trendPrice)}</span>
                                  </div>
                                )}
                                {result.card_details.cardmarket_pricing.prices.averageSellPrice && (
                                  <div className="flex justify-between">
                                    <span className="dark:text-white/50 text-black/50">Avg Sell:</span>
                                    <span className="dark:text-white text-black">€{formatPrice(result.card_details.cardmarket_pricing.prices.averageSellPrice)}</span>
                                  </div>
                                )}
                                {result.card_details.cardmarket_pricing.prices.lowPrice && (
                                  <div className="flex justify-between">
                                    <span className="dark:text-white/50 text-black/50">Low Price:</span>
                                    <span className="dark:text-white text-black">€{formatPrice(result.card_details.cardmarket_pricing.prices.lowPrice)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Recent Averages */}
                            {(result.card_details.cardmarket_pricing.prices.avg1 || result.card_details.cardmarket_pricing.prices.avg7 || result.card_details.cardmarket_pricing.prices.avg30) && (
                              <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3">
                                <div className="font-medium dark:text-white text-black mb-2">Recent Averages</div>
                                <div className="space-y-1 text-xs">
                                  {result.card_details.cardmarket_pricing.prices.avg1 && (
                                    <div className="flex justify-between">
                                      <span className="dark:text-white/50 text-black/50">1-day:</span>
                                      <span className="dark:text-white text-black">€{formatPrice(result.card_details.cardmarket_pricing.prices.avg1)}</span>
                                    </div>
                                  )}
                                  {result.card_details.cardmarket_pricing.prices.avg7 && (
                                    <div className="flex justify-between">
                                      <span className="dark:text-white/50 text-black/50">7-day:</span>
                                      <span className="dark:text-white text-black">€{formatPrice(result.card_details.cardmarket_pricing.prices.avg7)}</span>
                                    </div>
                                  )}
                                  {result.card_details.cardmarket_pricing.prices.avg30 && (
                                    <div className="flex justify-between">
                                      <span className="dark:text-white/50 text-black/50">30-day:</span>
                                      <span className="dark:text-white text-black">€{formatPrice(result.card_details.cardmarket_pricing.prices.avg30)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {result.card_details.cardmarket_pricing.url && (
                            <a 
                              href={result.card_details.cardmarket_pricing.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center dark:text-blue-400 text-blue-700 hover:text-blue-300 text-sm mt-3 transition-colors duration-200"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View on CardMarket
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        onSelectList={handleListSelect}
        cardName={result?.card_name || ''}
      />
    </div>
  )
} 