import { useState, useCallback, useRef, useEffect } from 'react'
import { AnalysisResult, ProgressUpdate, AutocompleteItem } from './types'
import { createSpecificSearchTerm } from './utils'

export const useAnalysis = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressUpdate | null>(null)
  const [progressStages, setProgressStages] = useState<Set<string>>(new Set())
  
  // Use refs to track current request
  const currentRequestRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const cleanup = useCallback(() => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    // Cancel current request
    if (currentRequestRef.current) {
      try {
        currentRequestRef.current.abort()
      } catch {
        // Ignore abort errors
      }
      currentRequestRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const resetLoadingState = useCallback((errorMessage?: string) => {
    setLoading(false)
    if (errorMessage) {
      setError(errorMessage)
    }
    cleanup()
  }, [cleanup])

  const performAnalysis = useCallback(async (
    cardName: string, 
    refresh: boolean = false,
    searchType: 'raw' | 'graded' = 'raw',
    gradingCompany?: string,
    grade?: string
  ) => {
    // Cancel any existing request
    cleanup()
    
    setLoading(true)
    setError(null)
    setProgress({ stage: 'starting', message: 'Analyzing card...', timestamp: new Date().toISOString() })
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

    // Create abort controller for this request
    const controller = new AbortController()
    currentRequestRef.current = controller

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      console.warn('Request timeout reached, aborting...')
      resetLoadingState('Request timed out. Please try again.')
    }, 120000) // 2 minute timeout

    try {
      console.log(`🚀 Starting analysis for: ${cardName} (${searchType})`)
      
      // **SIMPLE FETCH REQUEST** - No more SSE!
      const response = await fetch('/api/script7', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searchTerm: cardName.trim(),
          refresh: refresh,
          searchType: searchType,
          gradingCompany: gradingCompany,
          grade: grade
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        console.log(`✅ Analysis completed for: ${cardName}`)
        setResult(data.data)
        setProgress({ stage: 'complete', message: 'Analysis complete!', timestamp: new Date().toISOString() })
        setLoading(false)
        cleanup()
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted')
        // Don't show error for aborted requests unless we're still loading
        if (loading) {
          resetLoadingState('Request was cancelled')
        }
      } else {
        console.error('Analysis error:', error)
        const errorMessage = error instanceof Error ? error.message : 'An error occurred during analysis'
        resetLoadingState(errorMessage)
      }
    }
  }, [resetLoadingState, cleanup, loading])

  const analyzeFromAutocomplete = useCallback((suggestion: AutocompleteItem) => {
    const specificSearchTerm = createSpecificSearchTerm(suggestion)
    console.log(`🎯 Analyzing: ${specificSearchTerm}`)
    performAnalysis(specificSearchTerm)
  }, [performAnalysis])

  const analyzeFromMultipleResults = useCallback((selectedCard: AutocompleteItem) => {
    const specificSearchTerm = createSpecificSearchTerm(selectedCard)
    console.log(`🎯 Selected specific card: ${specificSearchTerm}`)
    performAnalysis(specificSearchTerm)
  }, [performAnalysis])

  const checkForMultipleResults = useCallback(async (searchTerm: string) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(searchTerm)}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        return Array.isArray(data) ? data : []
      }
    } catch (error) {
      console.warn('Failed to check for multiple results:', error)
    }
    return []
  }, [])

  return {
    loading,
    result,
    error,
    progress,
    progressStages,
    performAnalysis,
    analyzeFromAutocomplete,
    analyzeFromMultipleResults,
    checkForMultipleResults,
    resetError: () => setError(null)
  }
} 