import fs from 'fs'
import path from 'path'

export interface PokemonCard {
  id: string
  name: string
  supertype: string
  subtypes?: string[]
  level?: string
  hp?: string
  types?: string[]
  evolvesFrom?: string
  number: string
  artist?: string
  rarity?: string
  flavorText?: string
  set?: {
    id: string
    name: string
    series: string
    releaseDate: string
    total: number
  }
  images?: {
    small: string
    large: string
  }
  attacks?: Array<{
    name: string
    cost: string[]
    convertedEnergyCost: number
    damage: string
    text: string
  }>
  weaknesses?: Array<{
    type: string
    value: string
  }>
  resistances?: Array<{
    type: string
    value: string
  }>
  retreatCost?: string[]
  convertedRetreatCost?: number
  legalities?: {
    standard?: string
    expanded?: string
    unlimited?: string
  }
  nationalPokedexNumbers?: number[]
  tcgplayer?: {
    url: string
    updatedAt: string
    prices?: any
  }
}

export interface SearchResult {
  card: PokemonCard
  relevanceScore: number
}

// Set ID to readable name mapping
export const SET_NAMES: Record<string, string> = {
  'base1': 'Base Set',
  'base2': 'Jungle',
  'base3': 'Fossil',
  'base4': 'Base Set 2',
  'base5': 'Team Rocket',
  'base6': 'Gym Heroes',
  'gym1': 'Gym Heroes',
  'gym2': 'Gym Challenge',
  'neo1': 'Neo Genesis',
  'neo2': 'Neo Discovery',
  'neo3': 'Neo Revelation',
  'neo4': 'Neo Destiny',
  'swsh1': 'Sword & Shield',
  'swsh2': 'Rebel Clash',
  'swsh3': 'Darkness Ablaze',
  'swsh4': 'Vivid Voltage',
  'swsh5': 'Battle Styles',
  'swsh6': 'Chilling Reign',
  'swsh7': 'Evolving Skies',
  'swsh8': 'Fusion Strike',
  'swsh9': 'Brilliant Stars',
  'swsh10': 'Astral Radiance',
  'swsh11': 'Lost Origin',
  'swsh12': 'Silver Tempest',
  'swsh10tg': 'Astral Radiance Trainer Gallery',
  'swsh11tg': 'Lost Origin Trainer Gallery',
  'swsh12tg': 'Silver Tempest Trainer Gallery',
  'swsh9tg': 'Brilliant Stars Trainer Gallery',
  'swsh12pt5' : 'Crown Zenith',
  'swsh12pt5gg' : 'Crown Zenith GG',
  'swshp': 'SWSH Black Star Promos',
  'sv1': 'Scarlet & Violet',
  'sv2': 'Paldea Evolved',
  'sv3': 'Obsidian Flames',
  'sv4': 'Paradox Rift',
  'sv5': 'Temporal Forces',
  'sv6': 'Twilight Masquerade',
  'sv7': 'Stellar Crown',
  'sv8': 'Surging Sparks',
  'sv9' : 'Journey Together',
  'sv10' : 'Destined Rivals',
  'sv3pt5' : '151',
  'sv8pt5': 'Prismatic Evolutions',
  'sv6pt5' : 'Shrouded Fable',
  'sv4pt5': 'Paldean Fates',
  'rsv10pt5' : 'White Flare',
  'zsv10pt5' : 'Black Bolt',
  'svp': 'SVP Black Star Promos',
  'sm1': 'Sun & Moon',
  'sm2': 'Guardians Rising',
  'sm3': 'Burning Shadows',
  'sm4': 'Crimson Invasion',
  'sm5': 'Ultra Prism',
  'sm6': 'Forbidden Light',
  'sm7': 'Celestial Storm',
  'sm8': 'Lost Thunder',
  'sm9': 'Team Up',
  'sm10': 'Unbroken Bonds',
  'sm11': 'Unified Minds',
  'sm12': 'Cosmic Eclipse',
  'sm35': 'Hidden Fates',
  'sm75': 'Dragon Majesty',
  'sm115': 'Shining Legends',
  'smp': 'SM Black Star Promos',
  'cel25': 'Celebrations',
  'cel25c': 'Celebrations Classic Collection',
  'det1': 'Detective Pikachu',
  'xy1': 'XY',
  'xy2': 'Flashfire',
  'xy3': 'Furious Fists',
  'xy4': 'Phantom Forces',
  'xy5': 'Primal Clash',
  'xy6': 'Roaring Skies',
  'xy7': 'Ancient Origins',
  'xy8': 'BREAKthrough',
  'xy9': 'BREAKpoint',
  'xy10': 'Fates Collide',
  'xy11': 'Steam Siege',
  'xy12': 'Evolutions',
  'xy0': 'Kalos Starter Set',
  'xyp': 'XY Black Star Promos',
  'basep': 'Wizards Black Star Promos',
  'bp': 'Best of Game',
  'bwp': 'BW Black Star Promos',
  'dpp': 'DP Black Star Promos',
  'np': 'Nintendo Black Star Promos',
  'pop1': 'POP Series 1',
  'pop2': 'POP Series 2',
  'pop3': 'POP Series 3',
  'pop4': 'POP Series 4',
  'pop5': 'POP Series 5',
  'pop6': 'POP Series 6',
  'pop7': 'POP Series 7',
  'pop8': 'POP Series 8',
  'pop9': 'POP Series 9',
  'ex1': 'Ruby & Sapphire',
  'ex2': 'Sandstorm',
  'ex3': 'Dragon',
  'ex4': 'Team Magma vs Team Aqua',
  'ex5': 'Hidden Legends',
  'ex6': 'FireRed & LeafGreen',
  'ex7': 'Team Rocket Returns',
  'ex8': 'Deoxys',
  'ex9': 'Emerald',
  'ex10': 'Unseen Forces',
  'ex11': 'Delta Species',
  'ex12': 'Legend Maker',
  'ex13': 'Holon Phantoms',
  'ex14': 'Crystal Guardians',
  'ex15': 'Dragon Frontiers',
  'ex16': 'Power Keepers',
  'dp1': 'Diamond & Pearl',
  'dp2': 'Mysterious Treasures',
  'dp3': 'Secret Wonders',
  'dp4': 'Great Encounters',
  'dp5': 'Majestic Dawn',
  'dp6': 'Legends Awakened',
  'dp7': 'Stormfront',
  'pl1': 'Platinum',
  'pl2': 'Rising Rivals',
  'pl3': 'Supreme Victors',
  'pl4': 'Arceus',
  'hgss1': 'HeartGold & SoulSilver',
  'hgss2': 'Unleashed',
  'hgss3': 'Undaunted',
  'hgss4': 'Triumphant',
  'hsp': 'HGSS Black Star Promos',
  'col1': 'Call of Legends',
  'bw1': 'Black & White',
  'bw2': 'Emerging Powers',
  'bw3': 'Noble Victories',
  'bw4': 'Next Destinies',
  'bw5': 'Dark Explorers',
  'bw6': 'Dragons Exalted',
  'bw7': 'Boundaries Crossed',
  'bw8': 'Plasma Storm',
  'bw9': 'Plasma Freeze',
  'bw10': 'Plasma Blast',
  'bw11': 'Legendary Treasures',
  'ecard1': 'Expedition Base Set',
  'ecard2': 'Aquapolis',
  'ecard3': 'Skyridge',
  'fut20': 'Futsal Collection',
  'g1': 'Pokémon GO',
  'pgo': 'Pokémon GO',
  'mcd11': 'McDonald\'s Collection 2011',
  'mcd12': 'McDonald\'s Collection 2012',
  'mcd14': 'McDonald\'s Collection 2014',
  'mcd15': 'McDonald\'s Collection 2015',
  'mcd16': 'McDonald\'s Collection 2016',
  'mcd17': 'McDonald\'s Collection 2017',
  'mcd18': 'McDonald\'s Collection 2018',
  'mcd19': 'McDonald\'s Collection 2019',
  'mcd21': 'McDonald\'s Collection 2021',
  'mcd22': 'McDonald\'s Collection 2022',
}

class PokemonDatabase {
  private cards: Map<string, PokemonCard> = new Map()
  private searchIndex: Map<string, Set<string>> = new Map()
  private isInitialized = false
  private dataPath = path.join(process.cwd(), 'lib/pokemon-data')

  async initialize() {
    if (this.isInitialized) return

    console.log('🔄 Initializing Pokemon card database...')
    
    try {
      await this.loadLocalDatabase()
      this.buildSearchIndex()
      this.isInitialized = true
      console.log(`✅ Pokemon database initialized with ${this.cards.size} cards`)
    } catch (error) {
      console.error('❌ Failed to initialize Pokemon database:', error)
      throw error
    }
  }

  private async loadLocalDatabase() {
    // Check if we have local data
    const cacheFile = path.join(this.dataPath, 'cards-cache.json')
    
    if (fs.existsSync(cacheFile)) {
      console.log('📂 Loading cards from local cache...')
      const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
      
      // Check if cache is recent (less than 7 days old)
      const cacheAge = Date.now() - cacheData.timestamp
      const oneWeek = 7 * 24 * 60 * 60 * 1000
      
      if (cacheAge < oneWeek) {
        cacheData.cards.forEach((card: PokemonCard) => {
          this.cards.set(card.id, card)
        })
        console.log(`✅ Loaded ${this.cards.size} cards from cache`)
        return
      } else {
        console.log('⏰ Cache is outdated, refreshing...')
      }
    }

    // Download fresh data
    await this.downloadAndCacheData()
  }

  private async downloadAndCacheData() {
    console.log('🌐 Downloading Pokemon card data from GitHub...')
    
    // Ensure data directory exists
    try {
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(this.dataPath, { recursive: true })
      }
    } catch (error) {
      console.warn('⚠️ Could not create data directory:', error)
    }

    try {
      // Download sets metadata first
      console.log('📋 Downloading sets metadata...')
      const setsMetadataResponse = await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json')
      const setsMetadata = await setsMetadataResponse.json()
      
      // Create a lookup map for set metadata
      const setMetadataMap = new Map()
      setsMetadata.forEach((setMeta: any) => {
        setMetadataMap.set(setMeta.id, {
          name: setMeta.name,
          printedTotal: setMeta.printedTotal,
          releaseDate: setMeta.releaseDate,
          series: setMeta.series
        })
      })
      
      console.log(`✅ Downloaded metadata for ${setsMetadata.length} sets`)

      // Get list of set files
      const setsResponse = await fetch('https://api.github.com/repos/PokemonTCG/pokemon-tcg-data/contents/cards/en')
      const setsData = await setsResponse.json()
      
      const allCards: PokemonCard[] = []
      let processedSets = 0
      
      // 🚀 DOWNLOAD ALL SETS - Complete Pokemon TCG coverage!
      console.log(`📊 Found ${setsData.length} total sets available`)
      
      // Filter to only .json files (exclude any non-card files)
      const targetSets = setsData.filter(setFile => 
        setFile.name.endsWith('.json') && setFile.type === 'file'
      )
      
      console.log(`🎯 Downloading ALL ${targetSets.length} card sets for complete coverage...`)
      
      for (const setFile of targetSets) {
        if (setFile.name.endsWith('.json')) {
          console.log(`📥 Downloading ${setFile.name}...`)
          
                      const setResponse = await fetch(setFile.download_url)
            const setCards = await setResponse.json()
            
            // Extract set ID from filename (e.g., "swsh10tg.json" -> "swsh10tg")
            const setId = setFile.name.replace('.json', '')
            
            // Get set metadata from our downloaded metadata
            const setMeta = setMetadataMap.get(setId)
            const setName = setMeta?.name || SET_NAMES[setId] || setId.toUpperCase()
            const setTotal = setMeta?.printedTotal || setCards.length // Fallback to card count if no metadata
            const setSeries = setMeta?.series || this.getSeriesFromSetId(setId)
            const setReleaseDate = setMeta?.releaseDate || ''
            
            console.log(`📦 Processing ${setId}: "${setName}" (${setTotal} printed cards, ${setCards.length} total variants)`)
            
            // Add set information to each card
            const enrichedCards = setCards.map((card: any) => ({
              ...card,
              set: {
                id: setId,
                name: setName,
                series: setSeries,
                releaseDate: setReleaseDate,
                total: setTotal
              }
            }))
            
            allCards.push(...enrichedCards)
          processedSets++
          
          // Add delay to be respectful to GitHub API
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      console.log(`✅ Downloaded ${allCards.length} cards from ${processedSets} sets`)

      // Cache the data including sets metadata
      const cacheData = {
        timestamp: Date.now(),
        cards: allCards,
        setsProcessed: processedSets,
        setsMetadata: Array.from(setMetadataMap.entries())
      }

      fs.writeFileSync(
        path.join(this.dataPath, 'cards-cache.json'),
        JSON.stringify(cacheData, null, 2)
      )

      // Load into memory
      allCards.forEach(card => {
        this.cards.set(card.id, card)
      })

      console.log(`💾 Cached ${allCards.length} cards locally`)

    } catch (error) {
      console.error('❌ Failed to download card data:', error)
      throw error
    }
  }

  private buildSearchIndex() {
    console.log('🔍 Building search index...')
    
    for (const [id, card] of this.cards) {
      // Index by name words
      const nameWords = card.name.toLowerCase().split(/\s+/)
      nameWords.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set())
        }
        this.searchIndex.get(word)!.add(id)
      })

      // Index by set name
      if (card.set?.name) {
        const setWords = card.set.name.toLowerCase().split(/\s+/)
        setWords.forEach(word => {
          if (!this.searchIndex.has(word)) {
            this.searchIndex.set(word, new Set())
          }
          this.searchIndex.get(word)!.add(id)
        })
      }

      // Index by number (store in uppercase for consistent matching)
      if (card.number) {
        const numberKey = `number:${card.number.toUpperCase()}`
        if (!this.searchIndex.has(numberKey)) {
          this.searchIndex.set(numberKey, new Set())
        }
        this.searchIndex.get(numberKey)!.add(id)
      }

      // Index by types
      if (card.types) {
        card.types.forEach(type => {
          const typeKey = type.toLowerCase()
          if (!this.searchIndex.has(typeKey)) {
            this.searchIndex.set(typeKey, new Set())
          }
          this.searchIndex.get(typeKey)!.add(id)
        })
      }
    }

    console.log(`✅ Search index built with ${this.searchIndex.size} terms`)
  }

  search(query: string, limit: number = 10): SearchResult[] {
    if (!this.isInitialized) {
      throw new Error('Database not initialized')
    }

    const searchTerms = query.toLowerCase().trim().split(/\s+/)
    const cardScores = new Map<string, number>()

    // Search for matches
    for (const term of searchTerms) {
      // Exact word match
      if (this.searchIndex.has(term)) {
        for (const cardId of this.searchIndex.get(term)!) {
          cardScores.set(cardId, (cardScores.get(cardId) || 0) + 10)
        }
      }

      // Partial word match
      for (const [indexTerm, cardIds] of this.searchIndex) {
        if (indexTerm.includes(term) && indexTerm !== term) {
          for (const cardId of cardIds) {
            cardScores.set(cardId, (cardScores.get(cardId) || 0) + 5)
          }
        }
      }

      // Number search - handle both numeric (123) and alphanumeric (SWSH284, TG20) card numbers
      if (/^[A-Z]*\d+[A-Z]*$/i.test(term)) {
        const numberKey = `number:${term.toUpperCase()}`
        if (this.searchIndex.has(numberKey)) {
          for (const cardId of this.searchIndex.get(numberKey)!) {
            cardScores.set(cardId, (cardScores.get(cardId) || 0) + 15)
          }
        }
      }
    }

    // Convert to results and sort by score
    const results: SearchResult[] = []
    for (const [cardId, score] of cardScores) {
      const card = this.cards.get(cardId)
      if (card) {
        results.push({ card, relevanceScore: score })
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    return results.slice(0, limit)
  }

  getCard(id: string): PokemonCard | undefined {
    return this.cards.get(id)
  }

  async forceRefresh() {
    console.log('🔄 Forcing database refresh...')
    this.cards.clear()
    this.searchIndex.clear()
    this.isInitialized = false
    
    // Delete cache file
    const cacheFile = path.join(this.dataPath, 'cards-cache.json')
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile)
    }
    
    await this.initialize()
  }

  private getSeriesFromSetId(setId: string): string {
    if (setId.startsWith('base') || setId.startsWith('gym') || setId.startsWith('neo')) {
      return 'Classic'
    } else if (setId.startsWith('ex') || setId.startsWith('dp') || setId.startsWith('pl') || setId.startsWith('hgss')) {
      return 'e-Card & EX Series'
    } else if (setId.startsWith('bw')) {
      return 'Black & White'
    } else if (setId.startsWith('xy')) {
      return 'XY'
    } else if (setId.startsWith('sm')) {
      return 'Sun & Moon'
    } else if (setId.startsWith('swsh')) {
      return 'Sword & Shield'
    } else if (setId.startsWith('sv')) {
      return 'Scarlet & Violet'
    } else {
      return 'Other'
    }
  }

  getStats() {
    return {
      totalCards: this.cards.size,
      indexTerms: this.searchIndex.size,
      isInitialized: this.isInitialized
    }
  }
}

// Singleton instance
const pokemonDB = new PokemonDatabase()

export default pokemonDB 