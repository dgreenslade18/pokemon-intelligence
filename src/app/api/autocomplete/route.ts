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

// Request deduplication to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<any>>()

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
    id: 'gengar-tg06',
    name: 'Gengar',
    set: 'Brilliant Stars',
    number: 'TG06',
    image: 'https://images.pokemontcg.io/swsh9/TG06.png',
    rarity: 'Trainer Gallery',
    display: 'Gengar (Brilliant Stars)',
    searchValue: 'Gengar TG06'
  },
  {
    id: 'gengar-base-5',
    name: 'Gengar',
    set: 'Base Set',
    number: '5',
    image: 'https://images.pokemontcg.io/base1/5.png',
    rarity: 'Rare Holo',
    display: 'Gengar (Base Set)',
    searchValue: 'Gengar 5'
  },
  {
    id: 'gengar-fossil-5',
    name: 'Gengar',
    set: 'Fossil',
    number: '5',
    image: 'https://images.pokemontcg.io/fossil/5.png',
    rarity: 'Rare Holo',
    display: 'Gengar (Fossil)',
    searchValue: 'Gengar 5'
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

// Optimized TCGDx API call with faster timeout and early filtering
async function searchTCGDxAPI(query: string): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500) // Increased to 1.5 seconds
  const startTime = Date.now()
  
  try {
    const response = await fetch('https://api.tcgdex.net/v2/en/cards', {
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
    
    // Enhanced filtering with better pattern matching
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(' ')
    
    const filteredCards = data.filter((card: any) => {
      const cardName = card.name?.toLowerCase() || ''
      const setId = card.set?.id?.toLowerCase() || ''
      const localId = card.localId?.toString() || ''
      const cardNumber = card.number?.toString() || ''
      
      // Check if all query words are found in any of the card fields
      return queryWords.every(word => {
        return cardName.includes(word) || 
               setId.includes(word) || 
               localId.includes(word) ||
               cardNumber.includes(word) ||
               // Handle trainer gallery format
               (word.startsWith('tg') && cardName.includes(word.toUpperCase()))
      })
    })
    
    console.log(`📦 TCGDx API filtered to ${filteredCards.length} matching cards`)
    
    if (filteredCards.length > 0) {
      const limitedResults = filteredCards.slice(0, 8)
      return limitedResults.map((card: any) => {
        // Better set name extraction from TCGDx
        let setName = 'Unknown Set'
        if (card.set?.name) {
          setName = card.set.name
        } else if (card.set?.id) {
          // Try to extract set name from ID
          const setId = card.set.id
          if (setId.includes('-')) {
            setName = setId.split('-').map((part: string) => 
              part.charAt(0).toUpperCase() + part.slice(1)
            ).join(' ')
          } else {
            setName = setId.charAt(0).toUpperCase() + setId.slice(1)
          }
        }
        
        // Better image extraction
        let imageUrl = ''
        if (card.image) {
          imageUrl = card.image
        } else if (card.images && card.images.small) {
          imageUrl = card.images.small
        } else if (card.images && card.images.large) {
          imageUrl = card.images.large
        }
        
        return {
          id: card.id,
          name: card.name,
          set: setName,
          number: card.localId || card.number || '',
          image: imageUrl,
          rarity: card.rarity || 'Unknown',
          display: `${card.name} (${setName})`,
          searchValue: card.localId ? `${card.name} ${card.localId}` : card.name
        }
      })
    }
    
    return null
  } catch (error) {
    clearTimeout(timeout)
    const errorTime = Date.now() - startTime
    console.error(`❌ TCGDx API fetch error for "${query}" after ${errorTime}ms:`, error)
    return null
  }
}

// Optimized Pokemon TCG API call with faster timeout
async function searchPokemonAPI(query: string): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500) // Increased to 1.5 seconds
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

// Simplified search strategy builder
function buildSearchStrategies(query: string): string[] {
  const strategies: string[] = []
  
  // "pokemon number" format (e.g., "charizard 223", "gengar tg06")
  const numberMatch = query.match(/^(.+?)\s+(\d+|[a-z]+\d+)$/i)
  if (numberMatch) {
    const [, name, number] = numberMatch
    // Handle trainer gallery format (tg06, tg07, etc.)
    if (number.toLowerCase().startsWith('tg')) {
      strategies.push(`name:*${name}* AND name:*${number.toUpperCase()}*`)
      strategies.push(`name:*${name}* AND number:${number}`)
    } else {
      strategies.push(`name:*${name}* AND number:${number}`)
    }
    return strategies // Return early for number searches
  }
  
  // "pokemon type" format (e.g., "charizard ex", "rayquaza v")  
  const words = query.split(' ')
  const cardTypes = ['ex', 'gx', 'v', 'vmax', 'vstar']
  if (words.length === 2) {
    const [name, type] = words
    if (cardTypes.includes(type.toLowerCase())) {
      if (type.toLowerCase() === 'ex') {
        strategies.push(`name:*${name}*EX*`)
      } else if (type.toLowerCase() === 'gx') {
        strategies.push(`name:*${name}*GX*`)
      } else {
        strategies.push(`name:*${name}* AND name:*${type.toUpperCase()}*`)
      }
      return strategies // Return early for type searches
    }
  }
  
  // Simple wildcard search for everything else
  strategies.push(`name:*${query}*`)
  
  return strategies
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  console.log(`🚀 Autocomplete started: "${query}"`)
  
  if (!query || query.length < 2) {
    console.log(`❌ Query too short: "${query}"`)
    return NextResponse.json({ suggestions: [] })
  }

  // Early return for very short queries with fallback data
  if (query.length <= 3) {
    const fallbackResults = searchFallbackData(query.trim())
    return NextResponse.json({ suggestions: fallbackResults })
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
    
    // Check for pending request to prevent duplicates
    if (pendingRequests.has(cacheKey)) {
      console.log(`⏳ Waiting for pending request: "${query}"`)
      const result = await pendingRequests.get(cacheKey)
      return NextResponse.json({ suggestions: result })
    }
    
    // Build simplified search strategies
    const strategies = buildSearchStrategies(correctedQuery)
    
    // Create the request promise with early termination
    const requestPromise = (async () => {
      // Try Pokemon TCG API first (usually faster and more accurate)
      for (const strategy of strategies) {
        try {
          const result = await searchPokemonAPI(strategy)
          if (result && result.length > 0) {
            console.log(`✅ Pokemon TCG API success with strategy: "${strategy}"`)
            return result
          }
        } catch (error) {
          console.log(`⚠️ Pokemon TCG API strategy failed: "${strategy}"`)
          continue // Try next strategy
        }
      }
      
      // Only fallback to TCGDx if Pokemon TCG API completely failed
      try {
        const tcgdxResult = await searchTCGDxAPI(correctedQuery)
        if (tcgdxResult && tcgdxResult.length > 0) {
          console.log(`✅ TCGDx API success (fallback)`)
          return tcgdxResult
        }
      } catch (error) {
        console.log(`⚠️ TCGDx API failed`)
      }
      
      // Final fallback to static data
      console.log(`🔄 No API results, using fallback data for: "${correctedQuery}"`)
      return searchFallbackData(correctedQuery)
    })()
    
    // Store the pending request
    pendingRequests.set(cacheKey, requestPromise)
    
    // Wait for result and clean up
    const bestResults = await requestPromise
    pendingRequests.delete(cacheKey)
    
    // Cache the results (only cache successful API results, not fallback)
    if (bestResults.length > 0) {
      cache.set(cacheKey, { data: bestResults, timestamp: Date.now() })
    }
    
    console.log(`✅ Autocomplete success: ${bestResults.length} results`)
    return NextResponse.json({ suggestions: bestResults })
    
  } catch (error) {
    console.error(`💥 Autocomplete error for query "${query}":`, error)
    
    // Clean up pending request on error
    const cacheKey = query.toLowerCase().trim()
    pendingRequests.delete(cacheKey)
    
    // Emergency fallback
    console.log(`🆘 Emergency fallback for: "${query.trim()}"`)
    const fallbackResults = searchFallbackData(query.trim())
    return NextResponse.json({ suggestions: fallbackResults })
  }
} 