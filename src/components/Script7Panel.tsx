'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import AddToListModal from './AddToListModal'
import SearchSection from './Script7/SearchSection'
import MultipleResultsModal from './Script7/MultipleResultsModal'
import CardDetailsSection from './Script7/CardDetailsSection'
import PriceRangeSection from './Script7/PriceRangeSection'
import EbayPricingSection from './Script7/EbayPricingSection'
import MarketDataSection from './Script7/MarketDataSection'
import ProgressDisplay from './Script7/ProgressDisplay'
import SaveToListSection from './Script7/SaveToListSection'
import PopulationDataSection from './Script7/PopulationDataSection'
import { useAnalysis } from './Script7/useAnalysis'
import { Script7PanelProps, AutocompleteItem } from './Script7/types'

export default function Script7Panel({ onBack, hideBackButton = false }: Script7PanelProps) {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showAddToListModal, setShowAddToListModal] = useState(false)
  const [showMultipleResults, setShowMultipleResults] = useState(false)
  const [multipleSearchResults, setMultipleSearchResults] = useState<AutocompleteItem[]>([])
  
  const resultsRef = useRef<HTMLDivElement>(null)

  // Use the analysis hook
  const {
    loading,
    result,
    error,
    progress,
    performAnalysis,
    analyzeFromAutocomplete,
    analyzeFromMultipleResults,
    checkForMultipleResults,
    resetError
  } = useAnalysis()

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

  const handleMultipleResultsFound = (results: AutocompleteItem[]) => {
    setMultipleSearchResults(results)
    setShowMultipleResults(true)
  }

  const handleCardSelection = (selectedCard: AutocompleteItem) => {
    setShowMultipleResults(false)
    setMultipleSearchResults([])
    analyzeFromMultipleResults(selectedCard)
  }

  const handleAnalyze = async () => {
    if (!searchTerm.trim()) {
      return
    }

    try {
      // First, check if we have multiple search results
      const multipleResults = await checkForMultipleResults(searchTerm)
      
      if (multipleResults && multipleResults.length > 1) {
        handleMultipleResultsFound(multipleResults)
        return
      }

      // If no multiple results or only one result, proceed with normal analysis
      performAnalysis(searchTerm.trim())
    } catch (error) {
      console.error('Analysis error:', error)
      // Error will be handled by the useAnalysis hook
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
      const cardData = {
        card_name: result.card_name,
        ebay_average_price: result.ebay_prices?.length > 0 
          ? result.ebay_prices.reduce((sum, item) => sum + item.price, 0) / result.ebay_prices.length 
          : 0,
        cardmarket_price: (result.cardmarket as any)?.market?.mid || 0,
        analysis: result.analysis,
        image_url: result.card_details?.images?.large || result.card_details?.images?.small || '',
        set_name: result.card_details?.set?.name || 'Unknown Set',
        number: result.card_details?.number || '',
        rarity: result.card_details?.rarity || 'Unknown',
        list_id: listId
      }

      const response = await fetch('/api/comp-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      })

      const data = await response.json()

      if (data.success) {
        setSaveMessage('Card saved to comp list successfully!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage(data.message || 'Failed to save card')
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error saving card:', error)
      setSaveMessage('Error saving card to comp list')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setSaving(false)
      setShowAddToListModal(false)
    }
  }

  // Handle list modal
  const handleSelectList = (listId: string) => {
    saveCardToList(listId)
  }

  return (
    <div className="container mx-auto bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800/30">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          {/* Search Section */}
          <SearchSection
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onAnalyze={handleAnalyze}
            onSuggestionClick={analyzeFromAutocomplete}
            loading={loading}
            hideBackButton={hideBackButton}
            onBack={onBack}
          />

          {/* Multiple Results Modal */}
          <MultipleResultsModal
            show={showMultipleResults}
            searchTerm={searchTerm}
            results={multipleSearchResults}
            onCardSelect={handleCardSelection}
            onClose={() => setShowMultipleResults(false)}
          />

            {/* Save to Comp List */}
            <SaveToListSection
                onSaveToCompList={handleSaveToCompList}
                saving={saving}
                saveMessage={saveMessage}
                isLoggedIn={!!session?.user}
                cardName={result?.card_name}
              />

            {/* Card Information */}
            {result?.card_details && (
                <CardDetailsSection cardDetails={result.card_details} />
              )}


              {/* Population Data Section */}
              <PopulationDataSection 
                populationData={result?.card_details?.population_data}
                loading={loading}
              />



          </div>
          <div className="col-span-2 space-y-6">

          {/* Results Section */}
          {(result || loading || error) && (
            <div ref={resultsRef} className="space-y-6">
              {/* Progress and Error Display */}
              <ProgressDisplay 
                error={error}
                loading={loading}
                progress={progress}
              />

              {/* Price Range Section */}
              <PriceRangeSection 
                ebayPrices={result?.ebay_prices}
                analysis={result?.analysis}
                loading={loading}
              />

              {/* eBay Pricing Section */}
              <EbayPricingSection 
                ebayPrices={result?.ebay_prices}
                allSalesData={result?.analysis?.chart_data?.all_sales}
                loading={loading}
              />

              {/* Market Data Section */}
              {/* <MarketDataSection 
                cardmarket={result?.cardmarket as any}
                loading={loading}
              /> */}

            
            </div>
          )}
        </div>
      </div>

      {/* Add to List Modal */}
      {showAddToListModal && (
        <AddToListModal
          isOpen={showAddToListModal}
          onClose={() => setShowAddToListModal(false)}
          onSelectList={handleSelectList}
          cardName={result?.card_name || ''}
        />
      )}
    </div>
  )
} 