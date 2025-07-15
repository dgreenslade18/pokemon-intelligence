'use client'

import { useState, useEffect } from 'react'

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

export default function ApiStatus() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkApiHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthStatus(data)
      setLastChecked(new Date())
    } catch (error) {
      console.error('Failed to check API health:', error)
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
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial check
    checkApiHealth()
    
    // Check every 5 minutes
    const interval = setInterval(checkApiHealth, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: 'up' | 'down' | 'degraded') => {
    switch (status) {
      case 'up': return 'text-green-800 bg-green-100'
      case 'degraded': return 'text-yellow-800 bg-yellow-100'
      case 'down': return 'text-red-800 bg-red-100'
      default: return 'text-gray-800 bg-gray-100'
    }
  }

  const getTextColor = (status: 'up' | 'down' | 'degraded') => {
    switch (status) {
      case 'up': return 'text-green-700'
      case 'degraded': return 'text-yellow-700'
      case 'down': return 'text-red-700'
      default: return 'text-gray-700'
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

  if (isLoading) {
    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Checking API status...</span>
        </div>
      </div>
    )
  }

  if (!healthStatus) {
    return null
  }

  const showDetailedStatus = healthStatus.overall_status !== 'up'

  return (
    <div className="mb-6">
      {/* Main Status Bar */}
      <div className={`p-3 rounded-lg border bg-white ${getTextColor(healthStatus.overall_status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getStatusIcon(healthStatus.overall_status)}</span>
            <span className="font-semibold text-base">{getStatusText(healthStatus.overall_status)}</span>
          </div>
          {lastChecked && (
            <span className="text-xs text-gray-600">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Detailed Status (only show when there are issues) */}
      {showDetailedStatus && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Service Status Details:</h4>
          
          {/* Pokemon TCG API Status */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span>{getStatusIcon(healthStatus.pokemon_tcg_api.status)}</span>
              <span className="text-sm font-medium text-gray-800">Pokemon TCG API</span>
              {healthStatus.pokemon_tcg_api.response_time && (
                <span className="text-xs text-gray-600">
                  ({healthStatus.pokemon_tcg_api.response_time}ms)
                </span>
              )}
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(healthStatus.pokemon_tcg_api.status)}`}>
              {healthStatus.pokemon_tcg_api.status}
            </span>
          </div>

          {/* TCGDx API Status */}
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span>{getStatusIcon(healthStatus.tcgdx_api.status)}</span>
              <span className="text-sm font-medium text-gray-800">TCGDx API</span>
              {healthStatus.tcgdx_api.response_time && (
                <span className="text-xs text-gray-600">
                  ({healthStatus.tcgdx_api.response_time}ms)
                </span>
              )}
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(healthStatus.tcgdx_api.status)}`}>
              {healthStatus.tcgdx_api.status}
            </span>
          </div>

          {/* eBay API Status */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2">
              <span>{getStatusIcon(healthStatus.ebay_api.status)}</span>
              <span className="text-sm font-medium text-gray-800">eBay API</span>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(healthStatus.ebay_api.status)}`}>
              {healthStatus.ebay_api.status}
            </span>
          </div>

          {/* Error Messages */}
          {(healthStatus.pokemon_tcg_api.error || healthStatus.tcgdx_api.error || healthStatus.ebay_api.error) && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {healthStatus.pokemon_tcg_api.error && (
                <div className="font-medium">Pokemon TCG API: {healthStatus.pokemon_tcg_api.error}</div>
              )}
              {healthStatus.tcgdx_api.error && (
                <div className="font-medium">TCGDx API: {healthStatus.tcgdx_api.error}</div>
              )}
              {healthStatus.ebay_api.error && (
                <div className="font-medium">eBay API: {healthStatus.ebay_api.error}</div>
              )}
            </div>
          )}

          {/* Fallback Notice */}
          {healthStatus.pokemon_tcg_api.status === 'down' && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              💡 <strong className="font-semibold">Note:</strong> Autocomplete is currently using offline card data. Some recent cards may not be available.
            </div>
          )}
        </div>
      )}
    </div>
  )
} 