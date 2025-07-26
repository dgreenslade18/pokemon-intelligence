export interface PriceData {
  price: number
  source: string
  url?: string
  timestamp: number
  confidence: 'high' | 'medium' | 'low'
}

export interface CacheEntry {
  data: PriceData
  lastUpdated: number
  fetchTime: number // How long the last fetch took
  successRate: number // Success rate for this card
  attempts: number
}

class SmartPriceCache {
  private cache = new Map<string, CacheEntry>()
  private requestQueue: Array<{
    cardId: string
    resolve: (data: PriceData | null) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }> = []
  
  private isProcessingQueue = false
  private apiHealthScore = 100 // 0-100, tracks API performance
  private maxCacheAge = 24 * 60 * 60 * 1000 // 24 hours
  private apiTimeoutThreshold = 5000 // 5 seconds

  constructor() {
    this.startQueueProcessor()
  }

  async getPricing(cardId: string, cardName: string): Promise<PriceData | null> {
    // Check if we have recent, reliable cache
    const cached = this.getCachedPrice(cardId)
    if (cached && this.shouldUseCache(cached)) {
      console.log(`💾 Using cached price for ${cardName} (${cached.fetchTime}ms fetch time)`)
      return cached.data
    }

    // Decide strategy based on API health and cache quality
    const strategy = this.chooseFetchStrategy(cached)
    console.log(`🧠 Strategy for ${cardName}: ${strategy}`)

    switch (strategy) {
      case 'api-first':
        return this.fetchWithApiFirst(cardId, cardName, cached)
      
      case 'cache-first':
        return this.fetchWithCacheFirst(cardId, cardName, cached)
      
      case 'parallel':
        return this.fetchWithParallel(cardId, cardName, cached)
      
      default:
        return cached?.data || null
    }
  }

  private getCachedPrice(cardId: string): CacheEntry | null {
    const entry = this.cache.get(cardId)
    if (!entry) return null

    const age = Date.now() - entry.lastUpdated
    if (age > this.maxCacheAge) {
      this.cache.delete(cardId)
      return null
    }

    return entry
  }

  private shouldUseCache(cached: CacheEntry): boolean {
    const age = Date.now() - cached.lastUpdated
    const hoursSinceUpdate = age / (60 * 60 * 1000)

    // Use cache if:
    // - Data is very recent (< 1 hour) and API was slow
    if (hoursSinceUpdate < 1 && cached.fetchTime > 3000) return true
    
    // - API health is poor and we have recent-ish data (< 6 hours)
    if (this.apiHealthScore < 50 && hoursSinceUpdate < 6) return true
    
    // - Cache has high success rate and data is recent (< 2 hours)
    if (cached.successRate > 0.8 && hoursSinceUpdate < 2) return true

    return false
  }

  private chooseFetchStrategy(cached: CacheEntry | null): 'api-first' | 'cache-first' | 'parallel' | 'cache-only' {
    // If no cache, must try API
    if (!cached) return 'api-first'

    const age = Date.now() - cached.lastUpdated
    const hoursSinceUpdate = age / (60 * 60 * 1000)

    // If API is healthy and cache is old, try API first
    if (this.apiHealthScore > 70 && hoursSinceUpdate > 4) {
      return 'api-first'
    }

    // If API is unhealthy, prefer cache
    if (this.apiHealthScore < 30) {
      return 'cache-first'
    }

    // If cache is moderately old but API performance is unknown, try parallel
    if (hoursSinceUpdate > 2 && hoursSinceUpdate < 8) {
      return 'parallel'
    }

    // Default to cache if relatively fresh
    return 'cache-first'
  }

  private async fetchWithApiFirst(cardId: string, cardName: string, cached: CacheEntry | null): Promise<PriceData | null> {
    try {
      const apiResult = await this.fetchFromAPI(cardId, cardName)
      if (apiResult) {
        this.updateCache(cardId, apiResult, true)
        return apiResult
      }
    } catch (error) {
      console.log(`⚠️ API failed for ${cardName}, falling back to cache`)
      this.updateApiHealth(-10)
    }

    return cached?.data || null
  }

  private async fetchWithCacheFirst(cardId: string, cardName: string, cached: CacheEntry | null): Promise<PriceData | null> {
    // Return cache immediately if available
    if (cached) {
      // Queue background API update for next time
      this.queueBackgroundUpdate(cardId, cardName)
      return cached.data
    }

    // No cache, must try API
    try {
      return await this.fetchFromAPI(cardId, cardName)
    } catch (error) {
      console.log(`❌ No cache and API failed for ${cardName}`)
      return null
    }
  }

  private async fetchWithParallel(cardId: string, cardName: string, cached: CacheEntry | null): Promise<PriceData | null> {
    // Start API request but don't wait
    const apiPromise = this.fetchFromAPI(cardId, cardName)
    
    // Wait briefly to see if API responds quickly
    const quickResult = await Promise.race([
      apiPromise,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 1000))
    ])

    if (quickResult) {
      this.updateCache(cardId, quickResult, true)
      return quickResult
    }

    console.log(`⚡ API slow for ${cardName}, using cache while API finishes in background`)
    
    // API is slow, use cache and let API finish in background
    apiPromise.then(result => {
      if (result) {
        this.updateCache(cardId, result, true)
      }
    }).catch(error => {
      this.updateApiHealth(-5)
    })

    return cached?.data || null
  }

  private async fetchFromAPI(cardId: string, cardName: string): Promise<PriceData | null> {
    const startTime = Date.now()
    
    try {
      // This is where you'd call the actual Pokemon TCG API
      // For now, simulate the API call
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.apiTimeoutThreshold)

      console.log(`🔗 Fetching pricing from API for ${cardName}...`)
      
      // Simulate API call (replace with actual TCG API call)
      const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${cardName}"&pageSize=1`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CardIntelligence/1.0' }
      })

      clearTimeout(timeoutId)
      const fetchTime = Date.now() - startTime

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const data = await response.json()
      if (data.data && data.data.length > 0) {
        const card = data.data[0]
        
        // Extract pricing from TCGPlayer data
        let price = null
        if (card.tcgplayer?.prices) {
          const prices = card.tcgplayer.prices
          // Try different price types
          price = prices.normal?.market || prices.holofoil?.market || prices.reverseHolofoil?.market
        }

        if (price) {
          const gbpPrice = price * 0.79 // Convert USD to GBP
          const priceData: PriceData = {
            price: gbpPrice,
            source: 'Pokemon TCG API',
            url: card.tcgplayer?.url,
            timestamp: Date.now(),
            confidence: 'high'
          }

          this.updateApiHealth(fetchTime < 2000 ? +5 : +2)
          console.log(`✅ API price fetched in ${fetchTime}ms: £${gbpPrice.toFixed(2)}`)
          return priceData
        }
      }

      this.updateApiHealth(-2)
      return null

    } catch (error) {
      const fetchTime = Date.now() - startTime
      
      if (error.name === 'AbortError') {
        console.log(`⏱️ API timeout for ${cardName} (>${this.apiTimeoutThreshold}ms)`)
        this.updateApiHealth(-15)
      } else {
        console.log(`❌ API error for ${cardName}: ${error}`)
        this.updateApiHealth(-10)
      }
      
      throw error
    }
  }

  private queueBackgroundUpdate(cardId: string, cardName: string) {
    // Add to queue for background processing
    setTimeout(() => {
      this.fetchFromAPI(cardId, cardName)
        .then(result => {
          if (result) {
            this.updateCache(cardId, result, true)
            console.log(`🔄 Background update completed for ${cardName}`)
          }
        })
        .catch(() => {
          // Silent failure for background updates
        })
    }, Math.random() * 5000) // Random delay to spread load
  }

  private updateCache(cardId: string, data: PriceData, wasSuccessful: boolean) {
    const existing = this.cache.get(cardId)
    const fetchTime = Date.now() - data.timestamp

    const entry: CacheEntry = {
      data,
      lastUpdated: Date.now(),
      fetchTime,
      successRate: existing 
        ? (existing.successRate * existing.attempts + (wasSuccessful ? 1 : 0)) / (existing.attempts + 1)
        : wasSuccessful ? 1 : 0,
      attempts: (existing?.attempts || 0) + 1
    }

    this.cache.set(cardId, entry)
  }

  private updateApiHealth(change: number) {
    this.apiHealthScore = Math.max(0, Math.min(100, this.apiHealthScore + change))
    
    if (change < 0) {
      console.log(`📉 API health decreased to ${this.apiHealthScore}%`)
    } else if (this.apiHealthScore > 80) {
      console.log(`📈 API health: ${this.apiHealthScore}% (Good)`)
    }
  }

  private startQueueProcessor() {
    // Process queue every 2 seconds
    setInterval(() => {
      if (!this.isProcessingQueue && this.requestQueue.length > 0) {
        this.processQueue()
      }
    }, 2000)
  }

  private async processQueue() {
    this.isProcessingQueue = true
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!
      
      try {
        // Process with rate limiting
        await new Promise(resolve => setTimeout(resolve, 500)) // 500ms between requests
      } catch (error) {
        request.reject(error)
      }
    }
    
    this.isProcessingQueue = false
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      apiHealthScore: this.apiHealthScore,
      queueLength: this.requestQueue.length,
      avgFetchTime: this.getAverageFetchTime()
    }
  }

  private getAverageFetchTime(): number {
    if (this.cache.size === 0) return 0
    
    const times = Array.from(this.cache.values()).map(entry => entry.fetchTime)
    return times.reduce((sum, time) => sum + time, 0) / times.length
  }

  clearCache() {
    this.cache.clear()
    console.log('🗑️ Price cache cleared')
  }
}

// Singleton instance
const smartPriceCache = new SmartPriceCache()

export default smartPriceCache 