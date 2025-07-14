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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    // Apply spelling correction first
    let searchTerm = correctSpelling(query.trim())
    
    // Use the correct Pokemon TCG API query format (Lucene-like syntax)
    
    // Handle common Pokemon card naming conventions more flexibly
    // Don't transform if there's a card number following (let the search handle both formats)
    const hasCardNumber = /\s+[\d\/\-A-Z]+$/.test(searchTerm)
    
    if (!hasCardNumber) {
      // Only transform when there's no card number (for general searches)
      if (searchTerm.toLowerCase().endsWith(' ex')) {
        searchTerm = searchTerm.slice(0, -3) + '-EX'
      }
      else if (searchTerm.toLowerCase().endsWith(' v')) {
        searchTerm = searchTerm.slice(0, -2) + ' V'
      }
      else if (searchTerm.toLowerCase().endsWith(' vmax')) {
        searchTerm = searchTerm.slice(0, -5) + ' VMAX'
      }
    }
    
    // Check if search term ends with a card number (including numbers with slashes like 198/197)
    const cardNumberMatch = searchTerm.match(/^(.+?)\s+([\d\/\-A-Z]+)$/)
    let searchQuery: string
    
    if (cardNumberMatch) {
      // Search for card name AND card number
      const cardName = cardNumberMatch[1].trim()
      const cardNumber = cardNumberMatch[2].trim()
      
      if (cardName.includes(' ')) {
        // Multi-word card name with number
        const words = cardName.split(' ')
        const nameQueries = words.map(word => `name:*${word}*`).join(' AND ')
        searchQuery = `(${nameQueries}) AND number:${cardNumber}`
      } else {
        // Single word card name with number
        searchQuery = `name:${cardName}* AND number:${cardNumber}`
      }
    } else if (searchTerm.includes(' ')) {
      // Multi-word search without card number
      const words = searchTerm.split(' ')
      const nameQueries = words.map(word => `name:*${word}*`).join(' AND ')
      searchQuery = nameQueries
    } else {
      // Single word search
      searchQuery = `name:${searchTerm}*`
    }
    
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(searchQuery)}&pageSize=8&select=id,name,set,number,images,rarity`

    // Add timeout and better error handling for deployment environment
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PokemonIntelligence/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`Pokemon TCG API returned ${response.status} for query: "${query}". Response: ${await response.text()}`)
      
      // If the specific number search failed, try without the number
      if (cardNumberMatch) {
        const cardName = cardNumberMatch[1].trim()
        let fallbackQuery: string
        
        if (cardName.includes(' ')) {
          const words = cardName.split(' ')
          const nameQueries = words.map(word => `name:*${word}*`).join(' AND ')
          fallbackQuery = nameQueries
        } else {
          fallbackQuery = `name:${cardName}*`
        }
        
        const fallbackUrl = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(fallbackQuery)}&pageSize=8&select=id,name,set,number,images,rarity`
        
        try {
          const fallbackController = new AbortController()
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 8000)
          
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'User-Agent': 'PokemonIntelligence/1.0',
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            signal: fallbackController.signal
          })
          
          clearTimeout(fallbackTimeoutId)
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            return formatSuggestions(fallbackData)
          }
        } catch (fallbackError) {
          console.error('Fallback autocomplete API error:', fallbackError)
        }
      }
      
      return NextResponse.json({ suggestions: [] })
    }

    const data = await response.json()
    return formatSuggestions(data)
    
  } catch (error) {
    console.error('Autocomplete API error:', error)
    
    // Return empty suggestions instead of throwing error
    return NextResponse.json({ 
      suggestions: [],
      error: 'API temporarily unavailable'
    })
  }
}

function formatSuggestions(data: any) {
  try {
    if (!data || !data.data || !Array.isArray(data.data)) {
      return NextResponse.json({ suggestions: [] })
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

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error formatting suggestions:', error)
    return NextResponse.json({ suggestions: [] })
  }
} 