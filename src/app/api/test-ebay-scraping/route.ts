import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing eBay web scraping...')
    
    const searchTerm = 'venusaur ex 198 pokemon card'
    const encodedSearch = encodeURIComponent(searchTerm)
    
    // UK eBay sold items search with proper filters
    const url = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodedSearch}&_sacat=0&_from=R40&Graded=No&_dcat=183454&LH_PrefLoc=1&LH_Sold=1&LH_Complete=1&rt=nc&LH_Auction=1&_ipg=50&_sop=13`
    
    console.log(`🌐 Scraping eBay URL: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })

    console.log(`🌐 Response Status: ${response.status}`)

    if (!response.ok) {
      return NextResponse.json({
        error: `eBay scraping failed: ${response.status}`,
        status: response.status
      })
    }

    const html = await response.text()
    console.log(`📦 HTML length: ${html.length}`)
    
    // Save debug file
    const fs = require('fs')
    fs.writeFileSync('debug_ebay_test.html', html)
    console.log('💾 Saved debug file: debug_ebay_test.html')
    
    // Extract prices using multiple patterns
    const pricePatterns = [
      /(?:£|GBP\s?)([0-9,]+\.?[0-9]*)/gi,
      /(?:Price|Sold for|Final bid)[^£]*£([0-9,]+\.?[0-9]*)/gi,
      /([0-9,]+\.?[0-9]*)\s*(?:GBP|£)/gi
    ]
    
    const titlePatterns = [
      /<h3[^>]*class="[^"]*s-item__title[^"]*"[^>]*>([^<]+)/gi,
      /<span[^>]*class="[^"]*clipped[^"]*"[^>]*>([^<]+)/gi,
      /<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*title="([^"]+)"/gi
    ]
    
    const prices: number[] = []
    const titles: string[] = []
    
    // Extract prices using multiple patterns
    for (const pattern of pricePatterns) {
      let match
      while ((match = pattern.exec(html)) !== null && prices.length < 10) {
        const price = parseFloat(match[1].replace(/,/g, ''))
        if (price > 0 && price < 10000) {
          prices.push(price)
        }
      }
      if (prices.length > 0) break
    }
    
    // Extract titles using multiple patterns
    for (const pattern of titlePatterns) {
      let match
      while ((match = pattern.exec(html)) !== null && titles.length < 10) {
        const title = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .trim()
        
        if (title && title.length > 5) {
          titles.push(title)
        }
      }
      if (titles.length > 0) break
    }
    
    console.log(`📊 Scraping results: ${prices.length} prices, ${titles.length} titles`)
    
    const results = []
    for (let i = 0; i < Math.min(prices.length, 4); i++) {
      const title = titles[i] || `${searchTerm} - eBay Sold Item`
      const price = prices[i]
      
      // Additional validation to ensure UK-based results
      const titleLower = title.toLowerCase()
      const isUkBased = titleLower.includes('uk') || 
                       titleLower.includes('united kingdom') || 
                       titleLower.includes('gb') || 
                       titleLower.includes('great britain') ||
                       titleLower.includes('england') ||
                       titleLower.includes('scotland') ||
                       titleLower.includes('wales') ||
                       titleLower.includes('northern ireland')
      
      // Skip if title suggests non-UK location
      const nonUkIndicators = ['us seller', 'usa', 'united states', 'canada', 'australia', 'germany', 'france']
      const isNonUk = nonUkIndicators.some(indicator => titleLower.includes(indicator))
      
      if (isNonUk) {
        console.log(`⚠️  Skipping non-UK result: ${title}`)
        continue
      }
      
      results.push({
        title,
        price,
        isUkBased,
        source: 'eBay UK (Test)'
      })
    }
    
    return NextResponse.json({
      success: true,
      url: url,
      results: results,
      stats: {
        totalPrices: prices.length,
        totalTitles: titles.length,
        ukBasedResults: results.length
      }
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 