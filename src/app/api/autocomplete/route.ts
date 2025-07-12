import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    // RapidAPI Pokemon TCG API configuration (same as the main script)
    const apiHost = "pokemon-tcg-api.p.rapidapi.com"
    const apiKey = "2390eefca8msh0b090b1b575b879p1c9090jsn0df6e6a47659"
    
    const headers = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': apiHost
    }

    // Search for cards with the query
    const searchUrl = `https://${apiHost}/cards`
    const params = new URLSearchParams({
      'search': query,
      'pageSize': '8' // Limit to 8 suggestions
    })

    const response = await fetch(`${searchUrl}?${params}`, { 
      headers,
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      return NextResponse.json({ suggestions: [] })
    }

    // Format suggestions for autocomplete
    const suggestions = data.data.map((card: any) => {
      const cardName = card.name || 'Unknown Card'
      const cardNumber = card.card_number || ''
      
      // Create search value with card name + number (if available)
      const searchValue = cardNumber ? `${cardName} ${cardNumber}` : cardName
      
      return {
        id: card.tcgid || card.id,
        name: cardName,
        set: card.episode?.name || 'Unknown Set',
        number: cardNumber,
        image: card.image || '',
        rarity: card.rarity || 'Unknown',
        // Create a display name that includes set info
        display: `${cardName} (${card.episode?.name || 'Unknown Set'})`,
        searchValue: searchValue
      }
    })

    return NextResponse.json({ suggestions })
    
  } catch (error) {
    console.error('Autocomplete API error:', error)
    return NextResponse.json({ suggestions: [] }, { status: 500 })
  }
} 