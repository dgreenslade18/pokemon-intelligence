import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    // Use the direct Pokemon TCG API (no API key required)
    const searchQuery = encodeURIComponent(query)
    const url = `https://api.pokemontcg.io/v2/cards?q=name:${searchQuery}*&pageSize=8&select=id,name,set,number,images,rarity`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`Pokemon TCG API returned ${response.status}`)
    }

    const data = await response.json()
    
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
    
  } catch (error) {
    console.error('Autocomplete API error:', error)
    return NextResponse.json({ suggestions: [] }, { status: 500 })
  }
} 