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

export function useApiStatus() {
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
        console.log('Health check aborted (this is normal during development)')
        return
      }
      
      console.warn('Health check failed:', error.message || error)
      
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
    const abortController = new AbortController()
    
    // Initial check with abort signal
    checkApiHealth(abortController.signal)
    
    // Check every 5 minutes
    const interval = setInterval(() => {
      checkApiHealth() // Don't pass abort signal for interval checks
    }, 5 * 60 * 1000)
    
    return () => {
      abortController.abort() // Cancel initial request if component unmounts
      clearInterval(interval)
    }
  }, [checkApiHealth])

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

  return {
    healthStatus,
    isLoading,
    lastChecked,
    getStatusIcon,
    getStatusText,
    refresh: checkApiHealth
  }
} 