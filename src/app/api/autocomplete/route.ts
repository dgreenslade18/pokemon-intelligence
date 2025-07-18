import { NextRequest, NextResponse } from 'next/server'

// Spelling corrections for common misspellings
const SPELLING_CORRECTIONS: Record<string, string> = {
  'ninetails': 'ninetales',
  'gyrados': 'gyarados', 
  'dragonight': 'dragonite',
  'morty': 'morty',
  'mortys': 'morty\'s',
}

function correctSpelling(term: string): string {
  const words = term.toLowerCase().split(' ')
  return words.map(word => SPELLING_CORRECTIONS[word] || word).join(' ')
}

// Enhanced cache with longer duration
const cache = new Map<string, any>()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

// Enhanced fallback data with proper images and set names
const FALLBACK_DATA = [
  {
    id: 'charizard-base-4',
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
    id: 'pikachu-base-58',
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
    id: 'morty-conviction-201',
    name: 'Morty\'s Conviction',
    set: 'Temporal Forces',
    number: '201',
    image: 'https://images.pokemontcg.io/sv5/201.png',
    rarity: 'Rare',
    display: 'Morty\'s Conviction (Temporal Forces)',
    searchValue: 'Morty\'s Conviction 201'
  },
  {
    id: 'oddish-base-67',
    name: 'Oddish',
    set: 'Base Set',
    number: '67',
    image: 'https://images.pokemontcg.io/base1/67.png',
    rarity: 'Common',
    display: 'Oddish (Base Set)',
    searchValue: 'Oddish 67'
  },
  {
    id: 'squirtle-base-63',
    name: 'Squirtle',
    set: 'Base Set',
    number: '63',
    image: 'https://images.pokemontcg.io/base1/63.png',
    rarity: 'Common',
    display: 'Squirtle (Base Set)',
    searchValue: 'Squirtle 63'
  },
  {
    id: 'bulbasaur-base-44',
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
  {
    id: 'alakazam-base-1',
    name: 'Alakazam',
    set: 'Base Set',
    number: '1',
    image: 'https://images.pokemontcg.io/base1/1.png',
    rarity: 'Rare Holo',
    display: 'Alakazam (Base Set)',
    searchValue: 'Alakazam 1'
  },
  {
    id: 'blastoise-base-2',
    name: 'Blastoise',
    set: 'Base Set',
    number: '2',
    image: 'https://images.pokemontcg.io/base1/2.png',
    rarity: 'Rare Holo',
    display: 'Blastoise (Base Set)',
    searchValue: 'Blastoise 2'
  },
  {
    id: 'venusaur-base-15',
    name: 'Venusaur',
    set: 'Base Set',
    number: '15',
    image: 'https://images.pokemontcg.io/base1/15.png',
    rarity: 'Rare Holo',
    display: 'Venusaur (Base Set)',
    searchValue: 'Venusaur 15'
  },
  {
    id: 'gyarados-base-6',
    name: 'Gyarados',
    set: 'Base Set',
    number: '6',
    image: 'https://images.pokemontcg.io/base1/6.png',
    rarity: 'Rare Holo',
    display: 'Gyarados (Base Set)',
    searchValue: 'Gyarados 6'
  },
  {
    id: 'dragonite-fossil-4',
    name: 'Dragonite',
    set: 'Fossil',
    number: '4',
    image: 'https://images.pokemontcg.io/fossil/4.png',
    rarity: 'Rare Holo',
    display: 'Dragonite (Fossil)',
    searchValue: 'Dragonite 4'
  },
  {
    id: 'ninetales-base-12',
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

// Fast TCGDx API call with shorter timeout
async function searchTCGDxAPI(query: string): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000) // 2 second timeout
  const startTime = Date.now()
  
  try {
    const url = 'https://api.tcgdex.net/v2/en/cards'
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      console.log(`❌ TCGDx API returned ${response.status} for "${query}" after ${responseTime}ms`)
      return null
    }
    
    const data = await response.json()
    console.log(`📦 TCGDx API found ${data.length} total cards`)
    
    // Filter cards by query
    const queryLower = query.toLowerCase()
    const filteredCards = data.filter((card: any) => {
      const cardName = card.name?.toLowerCase() || ''
      const setId = card.set?.id?.toLowerCase() || ''
      const localId = card.localId?.toString() || ''
      
      return cardName.includes(queryLower) || 
             setId.includes(queryLower) || 
             localId.includes(queryLower)
    })
    
    console.log(`📦 TCGDx API filtered to ${filteredCards.length} matching cards`)
    
    if (filteredCards.length > 0) {
      const limitedResults = filteredCards.slice(0, 8)
      return limitedResults.map((card: any) => ({
        id: card.id,
        name: card.name,
        set: card.set?.name || 'Unknown Set',
        number: card.localId || '',
        image: card.image || '',
        rarity: card.rarity || 'Unknown',
        display: `${card.name} ${card.set?.name ? `(${card.set.name})` : ''}`.trim(),
        searchValue: card.localId ? `${card.name} ${card.localId}` : card.name
      }))
    }
    
    return null
  } catch (error) {
    clearTimeout(timeout)
    const errorTime = Date.now() - startTime
    console.error(`❌ TCGDx API fetch error for "${query}" after ${errorTime}ms:`, error)
    return null
  }
}

// Fast Pokemon TCG API call with shorter timeout
async function searchPokemonAPI(query: string): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2000) // 2 second timeout
  const startTime = Date.now()
  
  try {
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=8`
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      console.log(`❌ Pokemon TCG API returned ${response.status} for "${query}" after ${responseTime}ms`)
      return null
    }
    
    const data = await response.json()
    console.log(`📦 Pokemon TCG API found ${data.data?.length || 0} cards`)
    
    if (data.data && data.data.length > 0) {
      return data.data.map((card: any) => ({
        id: card.id,
        name: card.name,
        set: card.set?.name || 'Unknown Set',
        number: card.number || '',
        image: card.images?.small || card.images?.large || '',
        rarity: card.rarity || 'Unknown',
        display: `${card.name} (${card.set?.name || 'Unknown Set'})`,
        searchValue: card.number ? `${card.name} ${card.number}` : card.name
      }))
    }
    
    return null
  } catch (error) {
    clearTimeout(timeout)
    const errorTime = Date.now() - startTime
    console.error(`❌ Pokemon TCG API fetch error for "${query}" after ${errorTime}ms:`, error)
    return null
  }
}

function searchFallbackData(query: string) {
  const queryWords = query.toLowerCase().split(' ')
  return FALLBACK_DATA.filter(card => {
    const cardText = `${card.name} ${card.number} ${card.searchValue}`.toLowerCase()
    return queryWords.every(word => cardText.includes(word))
  }).slice(0, 8) // Limit to 8 results
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
    }
    
    // Build search strategies
    const strategies = []
    
    // "pokemon number" format (e.g., "charizard 223")
    const numberMatch = correctedQuery.match(/^(.+?)\s+(\d+)$/)
    if (numberMatch) {
      const [, name, number] = numberMatch
      const strategy = `name:*${name}* number:${number}`
      strategies.push(strategy)
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
      }
    }
    
    // Multi-word name strategy (e.g., "galarian moltres")
    if (words.length >= 2 && !numberMatch && !cardTypes.includes(words[words.length - 1].toLowerCase())) {
      const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      const multiWordStrategy = `(${capitalizedWords.map(word => `name:*${word}*`).join(' AND ')})`
      strategies.push(multiWordStrategy)
    }
    
    // Basic searches
    const capitalizedQuery = correctedQuery.charAt(0).toUpperCase() + correctedQuery.slice(1).toLowerCase()
    const basicStrategies = [`name:${capitalizedQuery}*`, `name:*${capitalizedQuery}*`]
    strategies.push(...basicStrategies)
    
    // Run APIs in parallel for speed
    const apiPromises = []
    
    // Add Pokemon TCG API calls for each strategy
    for (const strategy of strategies) {
      apiPromises.push(searchPokemonAPI(strategy))
    }
    
    // Add TCGDx API call
    apiPromises.push(searchTCGDxAPI(correctedQuery))
    
    // Wait for all APIs with a short timeout
    const results = await Promise.allSettled(apiPromises)
    
    // Process results
    let bestResults: any[] = []
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
        bestResults = result.value
        break // Use first successful result
      }
    }
    
    // If no API results, use fallback
    if (bestResults.length === 0) {
      console.log(`🔄 No API results, using fallback data for: "${correctedQuery}"`)
      bestResults = searchFallbackData(correctedQuery)
    }
    
    // Cache the results
    cache.set(cacheKey, { data: bestResults, timestamp: Date.now() })
    
    console.log(`✅ Autocomplete success: ${bestResults.length} results`)
    return NextResponse.json({ suggestions: bestResults })
    
  } catch (error) {
    console.error(`💥 Autocomplete error for query "${query}":`, error)
    
    // Emergency fallback
    console.log(`🆘 Emergency fallback for: "${query.trim()}"`)
    const fallbackResults = searchFallbackData(query.trim())
    return NextResponse.json({ suggestions: fallbackResults })
  }
} 