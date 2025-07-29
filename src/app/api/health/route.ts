import { NextResponse } from 'next/server'

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

async function checkPokemonTCGAPI(): Promise<HealthStatus['pokemon_tcg_api']> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000) // 3 second timeout
    
    const response = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=1', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        status: responseTime > 2000 ? 'degraded' : 'up',
        response_time: responseTime,
        last_checked: new Date().toISOString()
      }
    } else {
      return {
        status: 'down',
        response_time: responseTime,
        last_checked: new Date().toISOString(),
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      status: 'down',
      response_time: responseTime,
      last_checked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkTCGDxAPI(): Promise<HealthStatus['tcgdx_api']> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000) // 3 second timeout
    
    // Only fetch a single card to test API health - prevents 2MB+ response
    const response = await fetch('https://api.tcgdx.net/v2/en/cards?pagination=1&page=1', {
      signal: controller.signal,
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache' // Prevent caching of health check responses
      }
    })
    
    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return {
        status: responseTime > 2000 ? 'degraded' : 'up',
        response_time: responseTime,
        last_checked: new Date().toISOString()
      }
    } else {
      return {
        status: 'down',
        response_time: responseTime,
        last_checked: new Date().toISOString(),
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      status: 'down',
      response_time: responseTime,
      last_checked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkEbayAPI(): Promise<HealthStatus['ebay_api']> {
  try {
    // Check if eBay API credentials are available
    const hasEbayToken = !!process.env.EBAY_ACCESS_TOKEN
    const hasRapidApiKey = !!process.env.RAPID_API_KEY
    
    if (!hasEbayToken && !hasRapidApiKey) {
      return {
        status: 'down',
        last_checked: new Date().toISOString(),
        error: 'No API credentials configured'
      }
    }
    
    return {
      status: 'up',
      last_checked: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'down',
      last_checked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// In-memory cache for health check results
let cachedHealthResult: any = null
let cachedHealthTimestamp: number = 0
const HEALTH_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in ms

export async function GET() {
  const now = Date.now()
  if (cachedHealthResult && (now - cachedHealthTimestamp < HEALTH_CACHE_DURATION)) {
    // Return cached result
    return NextResponse.json(cachedHealthResult)
  }

  console.log('🏥 Running API health checks...')
  const results = await Promise.allSettled([
    checkPokemonTCGAPI(),
    checkTCGDxAPI(),
    checkEbayAPI()
  ])

  const [pokemonResult, tcgdxResult, ebayResult] = results

  // Fix the error handling in the response object
  const response = {
    pokemon_tcg_api: pokemonResult.status === 'fulfilled' ? pokemonResult.value : {
      status: 'down' as const,
      response_time: null,
      last_checked: new Date().toISOString(),
      error: pokemonResult.status === 'rejected' ? 
        (pokemonResult.reason instanceof Error ? pokemonResult.reason.message : String(pokemonResult.reason)) : 'Unknown error'
    },
    tcgdx_api: tcgdxResult.status === 'fulfilled' ? tcgdxResult.value : {
      status: 'down' as const,
      response_time: null,
      last_checked: new Date().toISOString(),
      error: tcgdxResult.status === 'rejected' ? 
        (tcgdxResult.reason instanceof Error ? tcgdxResult.reason.message : String(tcgdxResult.reason)) : 'Unknown error'
    },
    ebay_api: ebayResult.status === 'fulfilled' ? ebayResult.value : {
      status: 'down' as const,
      last_checked: new Date().toISOString(),
      error: ebayResult.status === 'rejected' ? 
        (ebayResult.reason instanceof Error ? ebayResult.reason.message : String(ebayResult.reason)) : 'Unknown error'
    },
    overall_status: calculateOverallStatus(
      pokemonResult.status === 'fulfilled' ? pokemonResult.value.status : ('down' as const),
      tcgdxResult.status === 'fulfilled' ? tcgdxResult.value.status : ('down' as const),
      ebayResult.status === 'fulfilled' ? ebayResult.value.status : ('down' as const)
    )
  }

  cachedHealthResult = response
  cachedHealthTimestamp = now

  console.log('🏥 Health check results:', {
    pokemon_tcg: response.pokemon_tcg_api.status,
    tcgdx: response.tcgdx_api.status,
    ebay: response.ebay_api.status,
    overall: response.overall_status
  })

  return NextResponse.json(response)
}

// Calculate overall status based on Pokemon TCG, TCGDx, and eBay APIs
function calculateOverallStatus(
  pokemonStatus: 'up' | 'down' | 'degraded',
  tcgdxStatus: 'up' | 'down' | 'degraded',
  ebayStatus: 'up' | 'down' | 'degraded'
): 'up' | 'down' | 'degraded' {
  const statuses = [pokemonStatus, tcgdxStatus, ebayStatus];
  
  // If all are up, overall is up
  if (statuses.every(status => status === 'up')) {
    return 'up';
  }
  
  // If all are down, overall is down
  if (statuses.every(status => status === 'down')) {
    return 'down';
  }
  
  // If at least one core API (Pokemon TCG or TCGDx) is working, it's degraded
  if (pokemonStatus === 'up' || tcgdxStatus === 'up') {
    return 'degraded';
  }
  
  // Otherwise, it's degraded (fallbacks available)
  return 'degraded';
} 