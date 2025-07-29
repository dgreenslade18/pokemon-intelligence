import { NextRequest, NextResponse } from 'next/server'
import pokemonDB, { SET_NAMES } from '../../../../lib/pokemon-database'

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
  },
  {
    id: 'moltres-zapdos-articuno-gx-sm210',
    name: 'Moltres & Zapdos & Articuno GX',
    set: 'SM Black Star Promos',
    number: 'SM210',
    image: 'https://images.pokemontcg.io/smp/SM210.png',
    rarity: 'Promo',
    display: 'Moltres & Zapdos & Articuno GX (SM Black Star Promos)',
    searchValue: 'Moltres & Zapdos & Articuno GX SM210'
  },
  {
    id: 'moltres-zapdos-articuno-gx-44',
    name: 'Moltres & Zapdos & Articuno GX',
    set: 'Detective Pikachu',
    number: '44',
    image: 'https://images.pokemontcg.io/det1/44.png',
    rarity: 'Rare Holo GX',
    display: 'Moltres & Zapdos & Articuno GX (Detective Pikachu)',
    searchValue: 'Moltres & Zapdos & Articuno GX 44'
  },
  {
    id: 'moltres-zapdos-articuno-gx-66',
    name: 'Moltres & Zapdos & Articuno GX',
    set: 'Detective Pikachu',
    number: '66',
    image: 'https://images.pokemontcg.io/det1/66.png',
    rarity: 'Rare Holo GX',
    display: 'Moltres & Zapdos & Articuno GX (Detective Pikachu)',
    searchValue: 'Moltres & Zapdos & Articuno GX 66'
  },
  {
    id: 'moltres-zapdos-articuno-gx-69',
    name: 'Moltres & Zapdos & Articuno GX',
    set: 'Detective Pikachu',
    number: '69',
    image: 'https://images.pokemontcg.io/det1/69.png',
    rarity: 'Rare Holo GX',
    display: 'Moltres & Zapdos & Articuno GX (Detective Pikachu)',
    searchValue: 'Moltres & Zapdos & Articuno GX 69'
  }
]

// Enhanced set name mapping for TCGDx API
const SET_NAME_MAPPING: Record<string, string> = {
  // Sword & Shield era
  'swsh1': 'Sword & Shield',
  'swsh2': 'Rebel Clash',
  'swsh3': 'Darkness Ablaze',
  'swsh4': 'Champions Path',
  'swsh5': 'Vivid Voltage',
  'swsh6': 'Shining Fates',
  'swsh7': 'Battle Styles',
  'swsh8': 'Chilling Reign',
  'swsh9': 'Evolving Skies',
  'swsh10': 'Fusion Strike',
  'swsh11': 'Celebrations',
  'swsh12': 'Brilliant Stars',
  'swsh12pt5': 'Astral Radiance',
  'swsh13': 'Lost Origin',
  'swsh13pt5': 'Silver Tempest',
  'swsh14': 'Crown Zenith',
  
  // Scarlet & Violet era
  'sv1': 'Scarlet & Violet',
  'sv2': 'Paldea Evolved',
  'sv3': 'Obsidian Flames',
  'sv4': '151',
  'sv4pt5': 'Paldean Fates',
  'sv5': 'Temporal Forces',
  'sv6': 'Twilight Masquerade',
  'sv07': 'Stellar Crown',
  'sv8': 'Cyber Judge',
  'sv9': 'Wild Force',
  'sv10': 'Ancient Roar',
  'sv11': 'Future Flash',
  'sv12': 'Shrouded Fable',
  'sv13': 'Paradox Rift',
  'sv14': 'Crimson Haze',
  'sv15': 'Indigo Disk',
  
  // Sun & Moon era
  'sm1': 'Sun & Moon',
  'sm2': 'Guardians Rising',
  'sm3': 'Burning Shadows',
  'sm4': 'Crimson Invasion',
  'sm5': 'Ultra Prism',
  'sm6': 'Forbidden Light',
  'sm7': 'Celestial Storm',
  'sm8': 'Dragon Majesty',
  'sm9': 'Lost Thunder',
  'sm10': 'Team Up',
  'sm11': 'Detective Pikachu',
  'sm12': 'Unbroken Bonds',
  'sm12pt5': 'Unified Minds',
  'sm13': 'Hidden Fates',
  'sm14': 'Cosmic Eclipse',
  
  // XY era
  'xy1': 'XY',
  'xy2': 'Flashfire',
  'xy3': 'Furious Fists',
  'xy4': 'Phantom Forces',
  'xy5': 'Primal Clash',
  'xy6': 'Double Crisis',
  'xy7': 'Roaring Skies',
  'xy8': 'Ancient Origins',
  'xy9': 'Breakthrough',
  'xy10': 'Breakpoint',
  'xy11': 'Fates Collide',
  'xy12': 'Steam Siege',
  'xy12pt5': 'Evolutions',
  
  // Black & White era
  'bw1': 'Black & White',
  'bw2': 'Emerging Powers',
  'bw3': 'Noble Victories',
  'bw4': 'Next Destinies',
  'bw5': 'Dark Explorers',
  'bw6': 'Dragons Exalted',
  'bw7': 'Dragon Vault',
  'bw8': 'Boundaries Crossed',
  'bw9': 'Plasma Storm',
  'bw10': 'Plasma Freeze',
  'bw11': 'Plasma Blast',
  'bw12': 'Legendary Treasures',
  
  // HeartGold & SoulSilver era
  'hgss1': 'HeartGold & SoulSilver',
  'hgss2': 'Unleashed',
  'hgss3': 'Undaunted',
  'hgss4': 'Triumphant',
  'hgss5': 'Call of Legends',
  
  // Diamond & Pearl era
  'dp1': 'Diamond & Pearl',
  'dp2': 'Mysterious Treasures',
  'dp3': 'Secret Wonders',
  'dp4': 'Great Encounters',
  'dp5': 'Majestic Dawn',
  'dp6': 'Legends Awakened',
  'dp7': 'Stormfront',
  'dp8': 'Platinum',
  'dp9': 'Rising Rivals',
  'dp10': 'Supreme Victors',
  'dp11': 'Arceus',
  
  // Base sets
  'base1': 'Base Set',
  'base2': 'Jungle',
  'base3': 'Fossil',
  'base4': 'Base Set 2',
  'base5': 'Team Rocket',
  
  // Generations
  'g1': 'Generations',
  'base6': 'Gym Heroes',
  'base7': 'Gym Challenge',
  'base8': 'Neo Genesis',
  'base9': 'Neo Discovery',
  'base10': 'Neo Revelation',
  'base11': 'Neo Destiny',
  'base12': 'Legendary Collection',
  
  // Promos
  'swshp': 'SWSH Black Star Promos',
  'smp': 'SM Black Star Promos',
  'xyp': 'XY Black Star Promos',
  'bwp': 'BW Black Star Promos',
  'hgssp': 'HGSS Black Star Promos',
  'dpp': 'DP Black Star Promos',
  'basep': 'Base Set Promos',
  
  // Special sets
  'swsh9tg': 'Brilliant Stars Trainer Gallery',
  'swsh10tg': 'Astral Radiance Trainer Gallery',
  'swsh11tg': 'Lost Origin Trainer Gallery',
  'swsh12tg': 'Silver Tempest Trainer Gallery',
  'swsh13tg': 'Crown Zenith Trainer Gallery',
  
  // Common abbreviations
  'swsh': 'Sword & Shield',
  'sv': 'Scarlet & Violet',
  'sm': 'Sun & Moon',
  'xy': 'XY',
  'bw': 'Black & White',
  'hgss': 'HeartGold & SoulSilver',
  'dp': 'Diamond & Pearl',
  'base': 'Base Set'
}

// Enhanced set name extraction function
function extractSetName(card: any): string {
  // First try to get the set name directly
  if (card.set?.name) {
    return card.set.name
  }
  
  // Try to get set name from ID
  if (card.set?.id) {
    const setId = card.set.id.toLowerCase()
    
    // Check our mapping first
    if (SET_NAME_MAPPING[setId]) {
      return SET_NAME_MAPPING[setId]
    }
    
    // Handle trainer gallery cards
    if (setId.includes('tg')) {
      const baseSetId = setId.replace('tg', '')
      const baseSetName = SET_NAME_MAPPING[baseSetId]
      if (baseSetName) {
        return `${baseSetName} Trainer Gallery`
      }
    }
    
    // Try to extract from ID format
    if (setId.includes('-')) {
      const parts = setId.split('-')
      if (parts.length >= 2) {
        const era = parts[0].toUpperCase()
        const setNum = parts[1]
        
        // Map common eras
        const eraMapping: Record<string, string> = {
          'swsh': 'Sword & Shield',
          'sv': 'Scarlet & Violet',
          'sm': 'Sun & Moon',
          'xy': 'XY',
          'bw': 'Black & White',
          'hgss': 'HeartGold & SoulSilver',
          'dp': 'Diamond & Pearl',
          'base': 'Base Set'
        }
        
        if (eraMapping[era]) {
          return `${eraMapping[era]} ${setNum}`
        }
      }
    }
    
    // Fallback: capitalize and format the ID
    return setId.split('-').map((part: string) => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ')
  }
  
  // Try to extract set from card ID (for TCGDx API)
  if (card.id && !card.set) {
    // Handle TCGDx format: "sv07-001", "xy1-1", etc.
    const idParts = card.id.split('-')
    if (idParts.length >= 2) {
      const setId = idParts[0].toLowerCase()
      
      // Check our mapping first
      if (SET_NAME_MAPPING[setId]) {
        return SET_NAME_MAPPING[setId]
      }
      
      // Handle trainer gallery cards
      if (setId.includes('tg')) {
        const baseSetId = setId.replace('tg', '')
        const baseSetName = SET_NAME_MAPPING[baseSetId]
        if (baseSetName) {
          return `${baseSetName} Trainer Gallery`
        }
      }
      
      // Try to extract from ID format
      if (setId.includes('-')) {
        const parts = setId.split('-')
        if (parts.length >= 2) {
          const era = parts[0].toUpperCase()
          const setNum = parts[1]
          
          // Map common eras
          const eraMapping: Record<string, string> = {
            'swsh': 'Sword & Shield',
            'sv': 'Scarlet & Violet',
            'sm': 'Sun & Moon',
            'xy': 'XY',
            'bw': 'Black & White',
            'hgss': 'HeartGold & SoulSilver',
            'dp': 'Diamond & Pearl',
            'base': 'Base Set'
          }
          
          if (eraMapping[era]) {
            return `${eraMapping[era]} ${setNum}`
          }
        }
      }
      
      // Fallback: capitalize and format the ID
      return setId.split('-').map((part: string) => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ')
    }
  }
  
  return 'Unknown Set'
}

// Cache for TCGDx API to prevent repeated 2MB+ downloads
let tcgdxCache: any[] | null = null
let tcgdxCacheTimestamp = 0
const TCGDX_CACHE_DURATION = 60 * 60 * 1000 // 1 hour cache

// Helper function to filter cached TCGDx cards
function filterTCGDxCards(cards: any[], query: string): any[] {
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(' ')
  
  const filteredCards = cards.filter((card: any) => {
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
  
  console.log(`📦 TCGDx cache filtered to ${filteredCards.length} matching cards`)
  
  if (filteredCards.length > 0) {
    const limitedResults = filteredCards.slice(0, 15)
    return limitedResults.map((card: any) => {
      // Use enhanced set name extraction
      const setName = extractSetName(card)
      
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
        id: card.id || card.localId || `${card.set?.id}-${card.number}`,
        name: card.name,
        set: setName,
        number: card.number || card.localId,
        image: imageUrl,
        source: 'tcgdx',
        rarity: card.rarity?.name || 'Unknown'
      }
    })
  }
  
  return []
}

// Optimized TCGDx API call with caching and pagination
async function searchTCGDxAPI(query: string): Promise<any> {
  // Check cache first to avoid repeated downloads
  const now = Date.now()
  if (tcgdxCache && (now - tcgdxCacheTimestamp < TCGDX_CACHE_DURATION)) {
    console.log(`📋 Using cached TCGDx data (${tcgdxCache.length} cards)`)
    return filterTCGDxCards(tcgdxCache, query)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000) // Increased timeout for large download
  const startTime = Date.now()
  
  try {
    // Add pagination to reduce response size - get first 2000 cards instead of all
    console.log(`📡 Downloading TCGDx card database (fallback mode)...`)
    const response = await fetch('https://api.tcgdx.net/v2/en/cards?pagination=2000&page=1', {
      signal: controller.signal,
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
    
    clearTimeout(timeout)
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      console.log(`❌ TCGDx API returned ${response.status} for "${query}" after ${responseTime}ms`)
      return null
    }
    
    const data = await response.json()
    console.log(`📦 TCGDx API downloaded ${data.length} cards in ${responseTime}ms (cached for 1 hour)`)
    
    // Cache the result
    tcgdxCache = data
    tcgdxCacheTimestamp = now
    
    // Filter and return results
    return filterTCGDxCards(data, query)
    
  } catch (error) {
    const errorTime = Date.now() - startTime
    if (error.name === 'AbortError') {
      console.log(`⏱️ TCGDx API request aborted for "${query}" after ${errorTime}ms (this is normal during development)`)
    } else {
      console.warn(`❌ TCGDx API fetch error for "${query}" after ${errorTime}ms:`, error.message || error)
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// Optimized Pokemon TCG API call with faster timeout
async function searchPokemonAPI(query: string): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500) // Increased to 1.5 seconds
  const startTime = Date.now()
  
  try {
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=15`
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
      // Map and filter results to exclude ones with unknown sets
      const mappedResults = data.data.map((card: any) => {
        // Use enhanced set name extraction
        const setName = extractSetName(card)
        
        // Only include results where we can determine a proper set name
        if (setName === 'Unknown Set') {
          return null // Filter out this result
        }
        
        const cardNumber = card.number || ''
        const setTotal = card.set?.total
        const fullCardNumber = (cardNumber && setTotal) ? `${cardNumber}/${setTotal}` : cardNumber
        
        return {
          id: card.id,
          name: card.name,
          set: setName,
          number: cardNumber,
          fullCardNumber: fullCardNumber,
          image: card.images?.small || card.images?.large || '',
          rarity: card.rarity || 'Unknown',
          display: `${card.name} (${setName})`,
          searchValue: fullCardNumber ? `${card.name} ${fullCardNumber}` : card.name
        }
      }).filter(Boolean) // Remove null entries
      
      return mappedResults.length > 0 ? mappedResults : null
    }
    
    return null
  } catch (error) {
    clearTimeout(timeout)
    const errorTime = Date.now() - startTime
    
    // Don't log errors for aborted requests (common during hot reload)
    if (error.name === 'AbortError') {
      console.log(`⏱️ Pokemon TCG API request aborted for "${query}" (this is normal during development)`)
      return null
    }
    
    console.warn(`❌ Pokemon TCG API fetch error for "${query}" after ${errorTime}ms:`, error.message || error)
    return null
  }
}

function searchFallbackData(query: string) {
  const queryWords = query.toLowerCase().split(' ')
  return FALLBACK_DATA.filter(card => {
    const cardText = `${card.name} ${card.number} ${card.searchValue}`.toLowerCase()
    return queryWords.every(word => cardText.includes(word))
  }).slice(0, 15) // Limit to 15 results
}

// Enhanced search strategy builder
function buildSearchStrategies(query: string): string[] {
  const strategies: string[] = []
  
  // Handle promo cards with alphanumeric numbers (e.g., "SM210", "SWSH284")
  const promoMatch = query.match(/^(.+?)\s+([A-Z]+\d+)$/)
  if (promoMatch) {
    const [, name, promoNumber] = promoMatch
    strategies.push(`name:*${name}* AND number:${promoNumber}`)
    strategies.push(`name:*${name}*`)
    return strategies
  }
  
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
  
  // Handle complex names with special characters (like "Moltres & Zapdos & Articuno GX")
  if (query.includes('&') || query.includes('and')) {
    // For complex names, try multiple strategies
    strategies.push(`name:*${query}*`)
    strategies.push(`name:*${query.replace(/&/g, 'and')}*`)
    strategies.push(`name:*${query.replace(/and/g, '&')}*`)
    
    // Also try without the card type suffix
    const withoutType = query.replace(/\s+(ex|gx|v|vmax|vstar)$/i, '')
    if (withoutType !== query) {
      strategies.push(`name:*${withoutType}*`)
    }
    
    return strategies
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

  try {
    // Initialize database if not already done
    await pokemonDB.initialize()
    
    // Try local database first (lightning fast)
    const localResults = pokemonDB.search(query, 8)
    
    if (localResults.length > 0) {
      console.log(`⚡ Local search found ${localResults.length} results for "${query}"`)
      
      const suggestions = localResults.map(result => {
        const cardNumber = result.card.number || ''
        const setTotal = result.card.set?.total
        const fullCardNumber = (cardNumber && setTotal) ? `${cardNumber}/${setTotal}` : cardNumber
        
        // Translate set ID to proper set name using our mapping
        const setId = result.card.set?.id?.toLowerCase() || ''
        const setName = SET_NAMES[setId] || result.card.set?.name || 'Unknown Set'
        
        return {
          id: result.card.id,
          name: result.card.name,
          set: setName,
          number: cardNumber,
          fullCardNumber: fullCardNumber,
          image: result.card.images?.small,
          rarity: result.card.rarity || 'Unknown',
          relevanceScore: result.relevanceScore,
          source: 'local'
        }
      })
      
      return NextResponse.json({ suggestions })
    }
    
    // Fallback to API if local search has no results
    console.log(`🔄 No local results for "${query}", trying API fallback...`)

    // Early return for very short queries with fallback data
    if (query.length <= 3) {
      const fallbackResults = searchFallbackData(query.trim())
      return NextResponse.json({ suggestions: fallbackResults })
    }
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