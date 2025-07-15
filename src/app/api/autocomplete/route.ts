import { NextRequest, NextResponse } from 'next/server'

// Common Pokemon name spelling corrections
const SPELLING_CORRECTIONS: Record<string, string> = {
  'ninetails': 'ninetales',
  'nine tails': 'ninetales',
  'nine-tails': 'ninetales',
  'pikachu': 'pikachu', // already correct
  'charizard': 'charizard', // already correct
  'blastois': 'blastoise',
  'venesaur': 'venusaur',
  'venasaur': 'venusaur',
  'gyrados': 'gyarados',
  'gyarodos': 'gyarados',
  'alakazam': 'alakazam', // already correct
  'machamp': 'machamp', // already correct
  'mewtwo': 'mewtwo', // already correct
  'mew': 'mew', // already correct
  'dragonight': 'dragonite',
  'dragonknight': 'dragonite',
  'snorlax': 'snorlax', // already correct
  'articuno': 'articuno', // already correct
  'zapdos': 'zapdos', // already correct
  'moltres': 'moltres', // already correct
  'rhyperior': 'rhyperior', // already correct
  'garchomp': 'garchomp', // already correct
}

// Function to correct spelling in search terms
function correctSpelling(searchTerm: string): string {
  const words = searchTerm.toLowerCase().split(' ')
  const correctedWords = words.map(word => {
    // Remove common punctuation for matching
    const cleanWord = word.replace(/[.,!?;:]/g, '')
    return SPELLING_CORRECTIONS[cleanWord] || word
  })
  return correctedWords.join(' ')
}

// Special Pokemon card types that should be treated as part of the name
const SPECIAL_CARD_TYPES = ['v', 'ex', 'gx', 'vmax', 'vstar', 'vunion', 'break', 'prism', 'star']

// Cache to store recent results temporarily
const cache = new Map<string, any>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function makeApiRequest(url: string, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PokemonIntelligence/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    // Check cache first
    const cacheKey = query.toLowerCase().trim()
    const cachedResult = cache.get(cacheKey)
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      return NextResponse.json({ suggestions: cachedResult.data })
    }

    // Apply spelling correction first
    let searchTerm = correctSpelling(query.trim())
    
    // Check if search term ends with a card number (including numbers with slashes like 198/197)
    const cardNumberMatch = searchTerm.match(/^(.+?)\s+([\d\/\-A-Z]+)$/)
    let searchQuery: string
    
    if (cardNumberMatch) {
      // Search for card name AND card number
      const cardName = cardNumberMatch[1].trim()
      const cardNumber = cardNumberMatch[2].trim()
      
      if (cardName.includes(' ')) {
        // Multi-word card name with number - check for special card types
        const words = cardName.split(' ')
        const lastWord = words[words.length - 1].toLowerCase()
        
        if (SPECIAL_CARD_TYPES.includes(lastWord)) {
          // Handle special card types (e.g., "Charizard V 79")
          const baseName = words.slice(0, -1).join(' ')
          const cardType = words[words.length - 1]
          searchQuery = `name:*${baseName}*${cardType}* AND number:${cardNumber}`
        } else {
          // Regular multi-word search
          const nameQueries = words.map(word => `name:*${word}*`).join(' AND ')
          searchQuery = `(${nameQueries}) AND number:${cardNumber}`
        }
      } else {
        // Single word card name with number - try multiple search strategies
        // First try: exact name match
        searchQuery = `name:${cardName}* AND number:${cardNumber}`
      }
    } else if (searchTerm.includes(' ')) {
      // Multi-word search without card number
      const words = searchTerm.split(' ')
      const lastWord = words[words.length - 1].toLowerCase()
      
      if (SPECIAL_CARD_TYPES.includes(lastWord)) {
        // Handle special card types (e.g., "Rayquaza V", "Charizard EX")
        const baseName = words.slice(0, -1).join(' ')
        const cardType = words[words.length - 1]
        // Fixed: Pokemon TCG API expects hyphenated names for some card types
        if (cardType.toLowerCase() === 'ex') {
          searchQuery = `name:${baseName}-EX`
        } else if (cardType.toLowerCase() === 'gx') {
          searchQuery = `name:${baseName}-GX`
        } else {
          // For V, VMAX, VSTAR etc., use space format
          searchQuery = `name:*${baseName}* name:*${cardType}*`
        }
      } else {
        // Regular multi-word search
        const nameQueries = words.map(word => `name:*${word}*`).join(' AND ')
        searchQuery = nameQueries
      }
    } else {
      // Single word search
      searchQuery = `name:${searchTerm}*`
    }
    
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(searchQuery)}&pageSize=8&select=id,name,set,number,images,rarity`

    // Reduced timeout from 8s to 3s for better UX
    const response = await makeApiRequest(url, 3000)

    if (!response.ok) {
      console.error(`Pokemon TCG API returned ${response.status} for query: "${query}". Response: ${await response.text()}`)
      
      // If the specific search failed, try simplified fallback strategies
      if (cardNumberMatch) {
        const cardName = cardNumberMatch[1].trim()
        const cardNumber = cardNumberMatch[2].trim()
        
        // Strategy 1: Try common card types with the number
        const commonCardTypes = ['ex', 'v', 'vmax', 'vstar', 'gx']
        for (const cardType of commonCardTypes) {
          try {
            let typeSearchQuery: string
            if (cardType === 'ex') {
              typeSearchQuery = `name:${cardName}-EX number:${cardNumber}`
            } else if (cardType === 'gx') {
              typeSearchQuery = `name:${cardName}-GX number:${cardNumber}`
            } else {
              typeSearchQuery = `name:*${cardName}* name:*${cardType}* number:${cardNumber}`
            }
            const typeSearchUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(typeSearchQuery)}&pageSize=8&select=id,name,set,number,images,rarity`
            
            const typeResponse = await makeApiRequest(typeSearchUrl, 2000)
            
            if (typeResponse.ok) {
              const typeData = await typeResponse.json()
              if (typeData.data && typeData.data.length > 0) {
                const suggestions = formatSuggestionsData(typeData)
                // Cache the result
                cache.set(cacheKey, { data: suggestions, timestamp: Date.now() })
                return NextResponse.json({ suggestions })
              }
            }
          } catch (error) {
            // Continue to next strategy
            continue
          }
        }
        
        // Strategy 2: Try broader search with just the name and number (no specific type)
        try {
          const broadQuery = `name:*${cardName}* number:${cardNumber}`
          const broadUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(broadQuery)}&pageSize=8&select=id,name,set,number,images,rarity`
          
          const broadResponse = await makeApiRequest(broadUrl, 2000)
          
          if (broadResponse.ok) {
            const broadData = await broadResponse.json()
            if (broadData.data && broadData.data.length > 0) {
              const suggestions = formatSuggestionsData(broadData)
              // Cache the result
              cache.set(cacheKey, { data: suggestions, timestamp: Date.now() })
              return NextResponse.json({ suggestions })
            }
          }
        } catch (error) {
          // Continue to final fallback
        }
        
        // Strategy 3: Final fallback - search without the number
        try {
          let fallbackQuery: string
          
          if (cardName.includes(' ')) {
            const words = cardName.split(' ')
            const lastWord = words[words.length - 1].toLowerCase()
            
            if (SPECIAL_CARD_TYPES.includes(lastWord)) {
              // Handle special card types in fallback
              const baseName = words.slice(0, -1).join(' ')
              const cardType = words[words.length - 1]
              if (cardType.toLowerCase() === 'ex') {
                fallbackQuery = `name:${baseName}-EX`
              } else if (cardType.toLowerCase() === 'gx') {
                fallbackQuery = `name:${baseName}-GX`
              } else {
                fallbackQuery = `name:*${baseName}* name:*${cardType}*`
              }
            } else {
              // Regular multi-word fallback
              const nameQueries = words.map(word => `name:*${word}*`).join(' AND ')
              fallbackQuery = nameQueries
            }
          } else {
            fallbackQuery = `name:${cardName}*`
          }
          
          const fallbackUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(fallbackQuery)}&pageSize=8&select=id,name,set,number,images,rarity`
          
          const fallbackResponse = await makeApiRequest(fallbackUrl, 2000)
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            if (fallbackData.data && fallbackData.data.length > 0) {
              const suggestions = formatSuggestionsData(fallbackData)
              // Cache the result
              cache.set(cacheKey, { data: suggestions, timestamp: Date.now() })
              return NextResponse.json({ suggestions })
            }
          }
        } catch (fallbackError) {
          console.error('Fallback autocomplete API error:', fallbackError)
        }
      }
      
      return NextResponse.json({ suggestions: [] })
    }

    const data = await response.json()
    const suggestions = formatSuggestionsData(data)
    
    // Cache the successful result
    cache.set(cacheKey, { data: suggestions, timestamp: Date.now() })
    
    return NextResponse.json({ suggestions })
    
  } catch (error) {
    console.error('Autocomplete API error:', error)
    
    // Return empty suggestions instead of throwing error
    return NextResponse.json({ 
      suggestions: [],
      error: 'API temporarily unavailable'
    })
  }
}

function formatSuggestionsData(data: any) {
  try {
    if (!data || !data.data || !Array.isArray(data.data)) {
      return []
    }

    // Format suggestions for autocomplete
    const suggestions = data.data.map((card: any) => {
      const cardName = card.name || 'Unknown Card'
      const cardNumber = card.number || ''
      const setName = card.set?.name || 'Unknown Set'
      
      // Create search value with card name + number (if available)
      const searchValue = cardNumber ? `${cardName} ${cardNumber}` : cardName
      
      return {
        id: card.id,
        name: cardName,
        set: setName,
        number: cardNumber,
        image: card.images?.small || card.images?.large || '',
        rarity: card.rarity || 'Unknown',
        // Create a display name that includes set info
        display: `${cardName} (${setName})`,
        searchValue: searchValue
      }
    })

    return suggestions
  } catch (error) {
    console.error('Error formatting suggestions:', error)
    return []
  }
} 