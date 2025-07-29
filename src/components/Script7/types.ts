export interface ProgressUpdate {
  stage: string
  message: string
  timestamp: string
}

// Add time period types
export type TimePeriod = '7days' | '30days' | '90days' | '6months' | 'alltime'

export interface TimePeriodOption {
  value: TimePeriod
  label: string
  days?: number  // undefined for 'alltime'
}

export interface PromoInfo {
  isPromo: boolean
  promoType?: 'black_star' | 'cosmic_eclipse' | 'other'
  isSealed: boolean
  sealedKeywords: string[]
}

export interface FilteredEbayResults {
  sealed: Array<{
    title: string
    price: number
    source: string
    url?: string
    soldDate?: string
  }>
  unsealed: Array<{
    title: string
    price: number
    source: string
    url?: string
    soldDate?: string
  }>
  promoInfo: PromoInfo
}

export interface TCGPlayerPricing {
  url: string
  updated_at: string
  prices: {
    [category: string]: {
      low?: number
      mid?: number
      high?: number
      market?: number
      directLow?: number
    }
  }
}

export interface CardMarketPricing {
  url: string
  updated_at: string
  prices: {
    averageSellPrice?: number
    lowPrice?: number
    trendPrice?: number
    germanProLow?: number
    suggestedPrice?: number
    reverseHoloSell?: number
    reverseHoloLow?: number
    reverseHoloTrend?: number
    lowPriceExPlus?: number
    avg1?: number
    avg7?: number
    avg30?: number
    reverseHoloAvg1?: number
    reverseHoloAvg7?: number
    reverseHoloAvg30?: number
  }
}

export interface GradePopulation {
  grade: number | string  // e.g., 10, 9, 8, etc.
  count: number
  label?: string  // e.g., "PSA 10", "CGC 10"
}

export interface PopulationData {
  service: 'PSA' | 'CGC' | 'ACE'
  totalPopulation: number
  gemRate?: number  // Percentage of gem mint (grade 10) cards
  grades: GradePopulation[]
  lastUpdated?: string
  cardInfo?: {
    name: string
    set: string
    number: string
  }
}

export interface AllPopulationData {
  psa?: PopulationData
  cgc?: PopulationData
  ace?: PopulationData
  lastFetched?: string
}

export interface CardDetails {
  images?: {
    small: string
    large: string
  }
  set?: {
    id: string
    name: string
    series: string
    releaseDate: string
    total: number
  }
  name: string
  number: string
  rarity: string
  artist: string
  hp?: string
  types: string[]
  supertype: string
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
  legalities?: {
    standard: string
    expanded: string
    unlimited: string
  }
  nationalPokedexNumbers?: number[]
  tcgplayer_pricing?: TCGPlayerPricing
  cardmarket_pricing?: CardMarketPricing
  population_data?: AllPopulationData  // Add population data to card details
}

export interface CardInfo {
  name: string
  set: string
  number: string
  rarity: string
  artist: string
  hp?: string
  types: string[]
  supertype: string
}

export interface CardImages {
  small: string
  large: string
}

export interface CardMarketData {
  title: string
  price: number
  source: string
  url: string
  card_info?: CardInfo
  images?: CardImages
  tcgplayer_pricing?: TCGPlayerPricing
  cardmarket_pricing?: CardMarketPricing
}

export interface EbayItem {
  title: string
  price: number
  source: string
  url?: string
  soldDate?: string
  image?: string
  condition?: string
}

export interface AnalysisResult {
  card_name: string
  timestamp: string
  ebay_prices: EbayItem[]
  cardmarket: CardMarketData | null
  card_details?: CardDetails
  analysis: {
    ebay_average?: number
    cardmarket_price?: number
    final_average?: number
    price_range?: string
    recommendation?: string
    // Multi-value pricing
    buy_value?: number
    trade_value?: number
    cash_value?: number
    pricing_strategy?: {
      show_buy_value: boolean
      show_trade_value: boolean
      show_cash_value: boolean
      buy_price?: string
      trade_price?: string
      cash_price?: string
    }
    // Whatnot pricing strategy
    whatnot_pricing?: {
      net_proceeds_at_market: string
      price_to_charge_for_market: string
      fees_percentage: number
    }
    // Promo and Sealed info
    promo_info?: PromoInfo
    filtered_ebay_results?: FilteredEbayResults
    // Extended chart data for time periods
    chart_data?: {
      all_sales: EbayItem[]  // All sales data for chart filtering
      available_periods: TimePeriod[]  // Which periods have data
    }
  }
}

export interface Script7PanelProps {
  onBack: () => void
  hideBackButton?: boolean
}

export interface AutocompleteItem {
  name: string
  set?: string
  number?: string
  fullCardNumber?: string  // e.g., "117/122" for complete card format
  rarity?: string
  id?: string
  image?: string  // Single image URL from API
  images?: {
    small: string
    large: string
  }
} 