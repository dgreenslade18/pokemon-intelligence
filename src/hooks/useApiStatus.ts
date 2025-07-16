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

export function useApiStatus() {
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