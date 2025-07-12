import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    // Use the correct Pokemon TCG API query format (Lucene-like syntax)
    let searchTerm = query.trim()
    
    // Handle common Pokemon card naming conventions more flexibly
    // Don't transform if there's a number following (let the search handle both formats)
    const hasCardNumber = /\s+\d+$/.test(searchTerm)
    
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
    
    // Check if search term ends with a number (card number)
    const cardNumberMatch = searchTerm.match(/^(.+?)\s+(\d+)$/)
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

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PokemonIntelligence/1.0'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

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
        
        const fallbackResponse = await fetch(fallbackUrl, {
          headers: {
            'User-Agent': 'PokemonIntelligence/1.0'
          },
          next: { revalidate: 3600 }
        })
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          return formatSuggestions(fallbackData)
        }
      }
      
      return NextResponse.json({ suggestions: [] })
    }

    const data = await response.json()
    return formatSuggestions(data)
    
  } catch (error) {
    console.error('Autocomplete API error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}

function formatSuggestions(data: any) {
  if (!data.data || !Array.isArray(data.data)) {
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
} 