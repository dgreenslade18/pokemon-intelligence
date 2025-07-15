import { NextRequest, NextResponse } from 'next/server'

// Spelling corrections for common misspellings
const SPELLING_CORRECTIONS: Record<string, string> = {
  'ninetails': 'ninetales',
  'gyrados': 'gyarados', 
  'dragonight': 'dragonite',
}

function correctSpelling(term: string): string {
  const words = term.toLowerCase().split(' ')
  return words.map(word => SPELLING_CORRECTIONS[word] || word).join(' ')
}

// Cache for API results
const cache = new Map<string, any>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Test fallback data
const FALLBACK_DATA = [
  {
    id: 'charizard-base',
    name: 'Charizard',
    set: 'Base Set',
    number: '4',
    image: 'https://images.pokemontcg.io/base1/4.png',
    rarity: 'Rare Holo',
    display: 'Charizard (Base Set)',
    searchValue: 'Charizard 4'
  },
  {
    id: 'charizard-ex-223',
    name: 'Charizard ex',
    set: 'Obsidian Flames', 
    number: '223',
    image: 'https://images.pokemontcg.io/sv03/223.png',
    rarity: 'Double Rare',
    display: 'Charizard ex (Obsidian Flames)',
    searchValue: 'Charizard ex 223'
  },
  {
    id: 'pikachu-base',
    name: 'Pikachu',
    set: 'Base Set',
    number: '58', 
    image: 'https://images.pokemontcg.io/base1/58.png',
    rarity: 'Common',
    display: 'Pikachu (Base Set)',
    searchValue: 'Pikachu 58'
  },
  {
    id: 'rayquaza-v-110',
    name: 'Rayquaza V',
    set: 'Evolving Skies',
    number: '110',
    image: 'https://images.pokemontcg.io/swsh7/110.png',
    rarity: 'Rare Holo V',
    display: 'Rayquaza V (Evolving Skies)',
    searchValue: 'Rayquaza V 110'
  },
  {
    id: 'mew-ex-232',
    name: 'Mew ex',
    set: 'Paldean Fates',
    number: '232',
    image: 'https://images.pokemontcg.io/sv4pt5/232.png',
    rarity: 'Double Rare',
    display: 'Mew ex (Paldean Fates)',
    searchValue: 'Mew ex 232'
  },
  {
    id: 'oddish-base',
    name: 'Oddish',
    set: 'Base Set',
    number: '67',
    image: 'https://images.pokemontcg.io/base1/67.png',
    rarity: 'Common',
    display: 'Oddish (Base Set)',
    searchValue: 'Oddish 67'
  },
  {
    id: 'squirtle-base',
    name: 'Squirtle',
    set: 'Base Set',
    number: '63',
    image: 'https://images.pokemontcg.io/base1/63.png',
    rarity: 'Common',
    display: 'Squirtle (Base Set)',
    searchValue: 'Squirtle 63'
  },
  {
    id: 'bulbasaur-base',
    name: 'Bulbasaur',
    set: 'Base Set',
    number: '44',
    image: 'https://images.pokemontcg.io/base1/44.png',
    rarity: 'Common',
    display: 'Bulbasaur (Base Set)',
    searchValue: 'Bulbasaur 44'
  },
  {
    id: 'galarian-moltres-swsh284',
    name: 'Galarian Moltres',
    set: 'SWSH Black Star Promos',
    number: 'SWSH284',
    image: 'https://images.pokemontcg.io/swshp/SWSH284.png',
    rarity: 'Promo',
    display: 'Galarian Moltres (SWSH Black Star Promos)',
    searchValue: 'Galarian Moltres SWSH284'
  },
  // Add more common Pokemon
  {
    id: 'alakazam-base',
    name: 'Alakazam',
    set: 'Base Set',
    number: '1',
    image: 'https://images.pokemontcg.io/base1/1.png',
    rarity: 'Rare Holo',
    display: 'Alakazam (Base Set)',
    searchValue: 'Alakazam 1'
  },
  {
    id: 'blastoise-base',
    name: 'Blastoise',
    set: 'Base Set',
    number: '2',
    image: 'https://images.pokemontcg.io/base1/2.png',
    rarity: 'Rare Holo',
    display: 'Blastoise (Base Set)',
    searchValue: 'Blastoise 2'
  },
  {
    id: 'venusaur-base',
    name: 'Venusaur',
    set: 'Base Set',
    number: '15',
    image: 'https://images.pokemontcg.io/base1/15.png',
    rarity: 'Rare Holo',
    display: 'Venusaur (Base Set)',
    searchValue: 'Venusaur 15'
  },
  {
    id: 'gyarados-base',
    name: 'Gyarados',
    set: 'Base Set',
    number: '6',
    image: 'https://images.pokemontcg.io/base1/6.png',
    rarity: 'Rare Holo',
    display: 'Gyarados (Base Set)',
    searchValue: 'Gyarados 6'
  },
  {
    id: 'dragonite-fossil',
    name: 'Dragonite',
    set: 'Fossil',
    number: '4',
    image: 'https://images.pokemontcg.io/fossil/4.png',
    rarity: 'Rare Holo',
    display: 'Dragonite (Fossil)',
    searchValue: 'Dragonite 4'
  },
  {
    id: 'ninetales-base',
    name: 'Ninetales',
    set: 'Base Set', 
    number: '12',
    image: 'https://images.pokemontcg.io/base1/12.png',
    rarity: 'Rare Holo',
    display: 'Ninetales (Base Set)',
    searchValue: 'Ninetales 12'
  },
  {
    id: 'lucario-v-78',
    name: 'Lucario V',
    set: 'Astral Radiance',
    number: '78',
    image: 'https://images.pokemontcg.io/swsh10/78.png',
    rarity: 'Rare Holo V',
    display: 'Lucario V (Astral Radiance)',
    searchValue: 'Lucario V 78'
  }
]

async function searchPokemonAPI(query: string): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  const startTime = Date.now()
  
  try {
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=8`
    const headers = { 'Accept': 'application/json' }
    
    console.log(`🌐 API Request URL: ${url}`)
    console.log(`📤 API Request Headers:`, headers)
    console.log(`🔗 Encoded Query: "${encodeURIComponent(query)}" (original: "${query}")`)
    console.log(`⏱️  Starting API call at ${new Date().toISOString()}`)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers
    })
    
    const fetchTime = Date.now() - startTime
    console.log(`⏱️  API call completed in ${fetchTime}ms`)
    
    clearTimeout(timeout)
    
    console.log(`📨 API Response Status: ${response.status} ${response.statusText}`)
    console.log(`📥 API Response Headers:`, Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Pokemon TCG API returned ${response.status} for query: "${query}"`)
      console.error(`❌ Error Response Body:`, errorText)
      return null
    }
    
    const data = await response.json()
    console.log(`📦 Raw API Response:`, {
      totalCount: data.totalCount,
      count: data.count,
      page: data.page,
      pageSize: data.pageSize,
      cardsFound: data.data?.length || 0
    })
    
    if (data.data?.length > 0) {
      console.log(`🎴 Cards returned:`)
      data.data.forEach((card: any, index: number) => {
        console.log(`  ${index + 1}. ${card.name} (${card.set?.name || 'Unknown Set'}) #${card.number || 'N/A'}`)
      })
      
      const mappedResults = data.data.map((card: any) => ({
        id: card.id,
        name: card.name,
        set: card.set?.name || 'Unknown Set',
        number: card.number || '',
        image: card.images?.small || '',
        rarity: card.rarity || 'Unknown',
        display: `${card.name} (${card.set?.name || 'Unknown Set'})`,
        searchValue: card.number ? `${card.name} ${card.number}` : card.name
      }))
      
      console.log(`✅ Mapped ${mappedResults.length} cards for autocomplete`)
      return mappedResults
    }
    
    console.log(`❌ No cards found in API response`)
    return null
  } catch (error) {
    clearTimeout(timeout)
    const errorTime = Date.now() - startTime
    console.error(`❌ Pokemon TCG API fetch error for "${query}" after ${errorTime}ms:`, error)
    return null
  }
}

// Alternative API: TCGPlayer (if API key is available)
async function searchTCGPlayerAPI(query: string): Promise<any> {
  const tcgPlayerToken = process.env.TCGPLAYER_API_TOKEN
  
  if (!tcgPlayerToken) {
    console.log('🔄 TCGPlayer API token not available')
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  const startTime = Date.now()
  
  try {
    // TCGPlayer uses different search format
    const searchUrl = `https://api.tcgplayer.com/catalog/products?q=${encodeURIComponent(query)}&limit=8&productTypes=Cards&categoryId=3` // 3 = Pokemon
    console.log(`🎯 Trying TCGPlayer API: ${searchUrl}`)
    
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 
        'Accept': 'application/json',
        'Authorization': `Bearer ${tcgPlayerToken}`
      }
    })
    
    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      console.error(`❌ TCGPlayer API returned ${response.status} for query: "${query}"`)
      return null
    }
    
    const data = await response.json()
    console.log(`📦 TCGPlayer API found ${data.results?.length || 0} cards`)
    
    if (data.results?.length > 0) {
      return data.results.map((card: any) => ({
        id: card.productId,
        name: card.name,
        set: card.groupName || 'Unknown Set',
        number: card.productNumber || '',
        image: card.imageUrl || '',
        rarity: card.rarity || 'Unknown',
        display: `${card.name} (${card.groupName || 'Unknown Set'})`,
        searchValue: card.productNumber ? `${card.name} ${card.productNumber}` : card.name
      }))
    }
    
    return null
  } catch (error) {
    clearTimeout(timeout)
    const errorTime = Date.now() - startTime
    console.error(`❌ TCGPlayer API fetch error for "${query}" after ${errorTime}ms:`, error)
    return null
  }
}

// Alternative API: TCGDx (backup API)
async function searchTCGDxAPI(query: string): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  const startTime = Date.now()
  
  try {
    // TCGDx API doesn't support query parameters for filtering
    // We fetch from the base endpoint and filter locally
    const searchUrl = `https://api.tcgdex.net/v2/en/cards`
    console.log(`🎯 Trying TCGDx API: ${searchUrl}`)
    
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 
        'Accept': 'application/json'
      }
    })
    
    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      console.error(`❌ TCGDx API returned ${response.status} for query: "${query}"`)
      return null
    }
    
    const data = await response.json()
    console.log(`📦 TCGDx API found ${Array.isArray(data) ? data.length : 0} total cards`)
    
    if (Array.isArray(data) && data.length > 0) {
      // Filter cards locally by name (case-insensitive)
      const lowercaseQuery = query.toLowerCase()
      const filteredCards = data.filter((card: any) => 
        card.name && card.name.toLowerCase().includes(lowercaseQuery)
      )
      
      console.log(`📦 TCGDx API filtered to ${filteredCards.length} matching cards`)
      
      if (filteredCards.length > 0) {
      // Limit to 8 results to match other APIs
        const limitedResults = filteredCards.slice(0, 8)
      return limitedResults.map((card: any) => ({
        id: card.id,
        name: card.name,
        set: card.set?.name || 'Unknown Set',
        number: card.localId || '',
        image: card.image || '',
        rarity: 'Unknown', // TCGDx doesn't include rarity in search results
        display: `${card.name} ${card.set?.name ? `(${card.set.name})` : ''}`.trim(),
        searchValue: card.localId ? `${card.name} ${card.localId}` : card.name
      }))
      }
    }
    
    return null
  } catch (error) {
    clearTimeout(timeout)
    const errorTime = Date.now() - startTime
    console.error(`❌ TCGDx API fetch error for "${query}" after ${errorTime}ms:`, error)
    return null
  }
}

// Fetch a single card from TCGDx by setId and localId
async function fetchTCGDxCardBySetAndNumber(setId: string, localId: string): Promise<any> {
  const url = `https://api.tcgdex.net/v2/en/sets/${setId}/${localId}`
  try {
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!response.ok) {
      console.error(`❌ TCGDx set-card API returned ${response.status} for setId: ${setId}, localId: ${localId}`)
      return null
    }
    const card = await response.json()
    return [{
      id: card.id,
      name: card.name,
      set: card.set?.name || 'Unknown Set',
      number: card.localId || '',
      image: card.image || '',
      rarity: card.rarity || 'Unknown',
      display: `${card.name} (${card.set?.name || setId})`,
      searchValue: card.localId ? `${card.name} ${card.localId}` : card.name
    }]
  } catch (error) {
    console.error(`❌ Error fetching TCGDx card by set and number:`, error)
    return null
  }
}

function searchFallbackData(query: string) {
  const queryWords = query.toLowerCase().split(' ')
  return FALLBACK_DATA.filter(card => {
    const cardText = `${card.name} ${card.number} ${card.searchValue}`.toLowerCase()
    return queryWords.every(word => cardText.includes(word))
  })
}





export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  console.log(`🚀 Autocomplete started: "${query}"`)
  
  if (!query || query.length < 2) {
    console.log(`❌ Query too short: "${query}"`)
    return NextResponse.json({ suggestions: [] })
  }

  try {
    // Check cache first
    const cacheKey = query.toLowerCase().trim()
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`💾 Cache hit for: "${query}"`)
      return NextResponse.json({ suggestions: cached.data })
    }

    const correctedQuery = correctSpelling(query.trim())
    if (correctedQuery !== query.trim()) {
      console.log(`📝 Spelling corrected: "${query.trim()}" → "${correctedQuery}"`)
    } else {
      console.log(`📝 No spelling corrections needed for: "${correctedQuery}"`)
    }
    
    // Build search strategies
    const strategies = []
    console.log(`🔧 Building search strategies for: "${correctedQuery}"`)
    
    // "pokemon number" format (e.g., "charizard 223")
    const numberMatch = correctedQuery.match(/^(.+?)\s+(\d+)$/)
    if (numberMatch) {
      const [, name, number] = numberMatch
      const strategy = `name:*${name}* number:${number}`
      strategies.push(strategy)
      console.log(`🔢 Added number strategy: ${strategy}`)
    }
    
    // "pokemon type" format (e.g., "charizard ex", "rayquaza v")  
    const words = correctedQuery.split(' ')
    const cardTypes = ['ex', 'gx', 'v', 'vmax', 'vstar']
    if (words.length === 2 && !numberMatch) {
      const [name, type] = words
      if (cardTypes.includes(type.toLowerCase())) {
        let strategy = ''
        if (type.toLowerCase() === 'ex') {
          strategy = `name:*${name}*EX*`
        } else if (type.toLowerCase() === 'gx') {
          strategy = `name:*${name}*GX*`
        } else {
          strategy = `name:*${name}* name:*${type.toUpperCase()}*`
        }
        strategies.push(strategy)
        console.log(`🎴 Added type strategy: ${strategy}`)
      }
    }
    
    // Multi-word name strategy (e.g., "galarian moltres")
    if (words.length >= 2 && !numberMatch && !cardTypes.includes(words[words.length - 1].toLowerCase())) {
      // Capitalize each word and wrap in parentheses for proper API syntax
      const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      const multiWordStrategy = `(${capitalizedWords.map(word => `name:*${word}*`).join(' AND ')})`
      strategies.push(multiWordStrategy)
      console.log(`🔀 Added multi-word strategy: ${multiWordStrategy}`)
    }
    
    // Basic searches with proper capitalization
    const capitalizedQuery = correctedQuery.charAt(0).toUpperCase() + correctedQuery.slice(1).toLowerCase()
    const basicStrategies = [`name:${capitalizedQuery}*`, `name:*${capitalizedQuery}*`]
    strategies.push(...basicStrategies)
    console.log(`🔍 Added basic strategies: ${basicStrategies.join(', ')}`)
    
    // Try Pokemon TCG API first
    for (const strategy of strategies) {
      console.log(`🎯 Trying Pokemon TCG API strategy: ${strategy}`)
      const apiResults = await searchPokemonAPI(strategy)
      
      if (apiResults && apiResults.length > 0) {
        cache.set(cacheKey, { data: apiResults, timestamp: Date.now() })
        console.log(`✅ Pokemon TCG API success: ${apiResults.length} results`)
        return NextResponse.json({ suggestions: apiResults })
      }
    }
    
    // Try TCGPlayer API as alternative 
    console.log(`🔄 Pokemon TCG API failed, trying TCGPlayer API for: "${correctedQuery}"`)
    const tcgPlayerResults = await searchTCGPlayerAPI(correctedQuery)
    
    if (tcgPlayerResults && tcgPlayerResults.length > 0) {
      cache.set(cacheKey, { data: tcgPlayerResults, timestamp: Date.now() })
      console.log(`✅ TCGPlayer API success: ${tcgPlayerResults.length} results`)
      return NextResponse.json({ suggestions: tcgPlayerResults })
    }

    // Try TCGDx API as backup
    console.log(`🔄 TCGPlayer API failed, trying TCGDx API for: "${correctedQuery}"`)
    let tcgdxResults = await searchTCGDxAPI(correctedQuery)
    
    // Try setId/number pattern: e.g., 'Bulbasaur sv2a 142' or just 'sv2a 142'
    const setNumberMatch = correctedQuery.match(/([a-zA-Z0-9]+)\s+(\d{1,4})$/)
    if ((!tcgdxResults || tcgdxResults.length === 0) && setNumberMatch) {
      const setId = setNumberMatch[1]
      const localId = setNumberMatch[2]
      console.log(`🔎 Trying TCGDx set-card API for setId: ${setId}, localId: ${localId}`)
      tcgdxResults = await fetchTCGDxCardBySetAndNumber(setId, localId)
    }
    if (tcgdxResults && tcgdxResults.length > 0) {
      cache.set(cacheKey, { data: tcgdxResults, timestamp: Date.now() })
      console.log(`✅ TCGDx API success: ${tcgdxResults.length} results`)
      return NextResponse.json({ suggestions: tcgdxResults })
    }
    
    // Fallback to local data if all APIs fail
    console.log(`🔄 All APIs failed, using fallback data for: "${correctedQuery}"`)
    const fallbackResults = searchFallbackData(correctedQuery)
    
    if (fallbackResults.length > 0) {
      console.log(`✅ Fallback success: ${fallbackResults.length} results`)
      console.log(`📊 Fallback results: ${fallbackResults.map(r => r.display).join(', ')}`)
      return NextResponse.json({ suggestions: fallbackResults })
    }
    
    console.log(`❌ No results found anywhere for: "${correctedQuery}"`)
    return NextResponse.json({ suggestions: [] })
    
  } catch (error) {
    console.error(`💥 Autocomplete error for query "${query}":`, error)
    
    // Emergency fallback
    console.log(`🆘 Emergency fallback for: "${query.trim()}"`)
    const fallbackResults = searchFallbackData(query.trim())
    console.log(`🆘 Emergency fallback returned ${fallbackResults.length} results`)
    return NextResponse.json({ suggestions: fallbackResults })
  }
} 