'use client'

import { useState, useEffect, useCallback } from 'react'

interface HealthStatus {
  pokemon_tcg_api: {
    status: 'up' | 'down' | 'degraded'
    response_time: number | null
    last_checked: string
    error?: string
  }
  tcgdx_api: {
    status: 'up' | 'down' | 'degraded'
    response_time: number | null
    last_checked: string
    error?: string
  }
  ebay_api: {
    status: 'up' | 'down' | 'degraded'
    last_checked: string
    error?: string
  }
  overall_status: 'up' | 'down' | 'degraded'
}

interface ApiStatusModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ApiStatusModal({ isOpen, onClose }: ApiStatusModalProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkApiHealth = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/health', {
        signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Only update state if request wasn't aborted
      if (!signal?.aborted) {
        setHealthStatus(data)
        setLastChecked(new Date())
      }
    } catch (error) {
      // Don't log errors for aborted requests (common during hot reload)
      if (error.name === 'AbortError') {
        console.log('ApiStatusModal health check aborted (this is normal during development)')
        return
      }
      
      console.warn('ApiStatusModal health check failed:', error.message || error)
      
      // Only update state if request wasn't aborted
      if (!signal?.aborted) {
        // Set fallback status
        setHealthStatus({
          pokemon_tcg_api: {
            status: 'down',
            response_time: null,
            last_checked: new Date().toISOString(),
            error: 'Health check failed'
          },
          tcgdx_api: {
            status: 'down',
            response_time: null,
            last_checked: new Date().toISOString(),
            error: 'Health check failed'
          },
          ebay_api: {
            status: 'down',
            last_checked: new Date().toISOString(),
            error: 'Health check failed'
          },
          overall_status: 'down'
        })
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      const abortController = new AbortController()
      checkApiHealth(abortController.signal)
      
      return () => {
        abortController.abort() // Cancel request if modal closes
      }
    }
  }, [isOpen, checkApiHealth])

  const getStatusColor = (status: 'up' | 'down' | 'degraded') => {
    switch (status) {
      case 'up': return 'text-green-800 bg-green-100 dark:text-green-200 dark:bg-green-900/20'
      case 'degraded': return 'text-yellow-800 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900/20'
      case 'down': return 'text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/20'
      default: return 'text-gray-800 bg-gray-100 dark:text-gray-200 dark:bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: 'up' | 'down' | 'degraded') => {
    switch (status) {
      case 'up': return '🟢'
      case 'degraded': return '🟡'
      case 'down': return '🔴'
      default: return '⚪'
    }
  }

  const getStatusText = (status: 'up' | 'down' | 'degraded') => {
    switch (status) {
      case 'up': return 'All systems operational'
      case 'degraded': return 'Some services experiencing issues'
      case 'down': return 'Service disruption detected'
      default: return 'Unknown status'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            API Status
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Checking API status...</span>
            </div>
          ) : healthStatus ? (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className={`p-4 rounded-lg border ${getStatusColor(healthStatus.overall_status)}`}>
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getStatusIcon(healthStatus.overall_status)}</span>
                  <div>
                    <div className="font-semibold">{getStatusText(healthStatus.overall_status)}</div>
                    {lastChecked && (
                      <div className="text-sm opacity-75">
                        Last checked: {lastChecked.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Service Details:</h3>
                
                {/* Pokemon TCG API */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span>{getStatusIcon(healthStatus.pokemon_tcg_api.status)}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Pokemon TCG API</div>
                      {healthStatus.pokemon_tcg_api.response_time && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {healthStatus.pokemon_tcg_api.response_time}ms
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(healthStatus.pokemon_tcg_api.status)}`}>
                    {healthStatus.pokemon_tcg_api.status}
                  </span>
                </div>

                {/* TCGDx API */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span>{getStatusIcon(healthStatus.tcgdx_api.status)}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">TCGDx API</div>
                      {healthStatus.tcgdx_api.response_time && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {healthStatus.tcgdx_api.response_time}ms
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(healthStatus.tcgdx_api.status)}`}>
                    {healthStatus.tcgdx_api.status}
                  </span>
                </div>

                {/* eBay API */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span>{getStatusIcon(healthStatus.ebay_api.status)}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">eBay API</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(healthStatus.ebay_api.status)}`}>
                    {healthStatus.ebay_api.status}
                  </span>
                </div>
              </div>

              {/* Error Messages */}
              {(healthStatus.pokemon_tcg_api.error || healthStatus.tcgdx_api.error || healthStatus.ebay_api.error) && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Error Details:</h4>
                  <div className="space-y-1 text-sm text-red-700 dark:text-red-300">
                    {healthStatus.pokemon_tcg_api.error && (
                      <div><strong>Pokemon TCG API:</strong> {healthStatus.pokemon_tcg_api.error}</div>
                    )}
                    {healthStatus.tcgdx_api.error && (
                      <div><strong>TCGDx API:</strong> {healthStatus.tcgdx_api.error}</div>
                    )}
                    {healthStatus.ebay_api.error && (
                      <div><strong>eBay API:</strong> {healthStatus.ebay_api.error}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Fallback Notice */}
              {healthStatus.pokemon_tcg_api.status === 'down' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600 dark:text-blue-400">💡</span>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> Autocomplete is currently using offline card data. Some recent cards may not be available.
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Failed to load API status
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 