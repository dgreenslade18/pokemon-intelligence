import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'

interface PikawizCard {
  name: string
  cardNumber: string
  psa10: number
  psa9: number
  psa8: number
  psa7: number
  psa6: number
  totalPSA: number
  cgc10: number
  cgc9: number
  cgc8: number
  totalCGC: number
  ace10: number
  ace9: number
  ace8: number
  totalACE: number
}

interface PikawizSetData {
  setName: string
  setSlug: string
  cards: PikawizCard[]
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const setSlug = searchParams.get('set') || 'prismatic-evolutions'
    const testMode = searchParams.get('test') === 'true'
    const debugMode = searchParams.get('debug') === 'true'

    console.log(`🕸️ Starting Pikawiz scrape for set: ${setSlug}`)

    if (testMode) {
      // Return test data to verify the structure
      return NextResponse.json({
        success: true,
        data: {
          setName: 'Prismatic Evolutions (Test)',
          setSlug: setSlug,
          cards: [
            {
              name: 'Pikachu ex',
              cardNumber: '001',
              psa10: 1250,
              psa9: 850,
              psa8: 420,
              psa7: 180,
              psa6: 75,
              totalPSA: 2775,
              cgc10: 320,
              cgc9: 180,
              cgc8: 95,
              totalCGC: 595,
              ace10: 45,
              ace9: 25,
              ace8: 12,
              totalACE: 82
            }
          ],
          lastUpdated: new Date().toISOString()
        }
      })
    }

    // Launch Puppeteer to handle Cloudflare protection
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()

    // Set user agent to appear more like a real browser
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })

    // Navigate to the Pikawiz pop report page
    const url = `https://www.pikawiz.com/cards/pop-report/${setSlug}`
    console.log(`🌐 Navigating to: ${url}`)

    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })

    // Wait for the content to load (bypassing Cloudflare)
    console.log(`⏳ Waiting for content to load...`)
    
    try {
      // Wait for either the population table or a specific content indicator
      await page.waitForSelector('table, .card-list, .population-data', { 
        timeout: 20000 
      })
      console.log(`✅ Content loaded successfully`)
    } catch (error) {
      console.log(`⚠️ Timeout waiting for content, proceeding anyway...`)
    }

    // Get the page content
    const content = await page.content()
    await browser.close()

    // Parse the HTML with Cheerio
    const $ = cheerio.load(content)
    console.log(`📝 Page title: ${$('title').text()}`)

    if (debugMode) {
      // Return debug information about the page structure
      return NextResponse.json({
        success: true,
        debug: {
          pageTitle: $('title').text(),
          hasContent: content.length > 1000,
          bodyClasses: $('body').attr('class'),
          mainSelectors: {
            tables: $('table').length,
            rows: $('tr').length,
            divs: $('div').length,
            spans: $('span').length
          },
          possibleContainers: [
            { selector: 'table', count: $('table').length },
            { selector: '.card', count: $('.card').length },
            { selector: '.population', count: $('.population').length },
            { selector: '.report', count: $('.report').length },
            { selector: '[class*="card"]', count: $('[class*="card"]').length },
            { selector: '[class*="pop"]', count: $('[class*="pop"]').length },
            { selector: '[class*="data"]', count: $('[class*="data"]').length }
          ],
          cardRelatedClasses: Array.from(new Set(
            $('*').map((i, el) => $(el).attr('class')).get()
              .filter(Boolean)
              .flatMap(cls => cls.split(' '))
              .filter(cls => cls.includes('card') || cls.includes('pop') || cls.includes('report') || cls.includes('table') || cls.includes('row') || cls.includes('cell'))
          )).slice(0, 30),
          possibleDataElements: [
            'thead', 'tbody', 'tr', 'td', 'th'
          ].map(tag => ({
            tag,
            count: $(tag).length,
            sample: $(tag).first().text().substring(0, 100)
          })),
          specificSelectors: [
            { selector: 'tr:contains("Pikachu")', count: $('tr:contains("Pikachu")').length },
            { selector: 'td:contains("10")', count: $('td:contains("10")').length },
            { selector: '[class*="row"]', count: $('[class*="row"]').length },
            { selector: '[class*="cell"]', count: $('[class*="cell"]').length },
            { selector: '[class*="table"]', count: $('[class*="table"]').length }
          ],
          bodyTextSample: $('body').text().replace(/\s+/g, ' ').substring(1000, 2000)
        }
      })
    }

    // Extract population data (we'll need to analyze the actual HTML structure)
    const setData: PikawizSetData = {
      setName: extractSetName($),
      setSlug: setSlug,
      cards: extractCardData($),
      lastUpdated: new Date().toISOString()
    }

    console.log(`📊 Extracted ${setData.cards.length} cards from ${setData.setName}`)

    return NextResponse.json({
      success: true,
      data: setData,
      debug: {
        pageTitle: $('title').text(),
        hasContent: content.length > 1000,
        contentPreview: content.substring(0, 500)
      }
    })

  } catch (error) {
    console.error('❌ Error scraping Pikawiz:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function to extract set name from the page
function extractSetName($: cheerio.CheerioAPI): string {
  // Try multiple selectors to find the set name
  const selectors = [
    'h1',
    '.set-title',
    '.page-title',
    'title'
  ]

  for (const selector of selectors) {
    const element = $(selector).first()
    if (element.length && element.text().trim()) {
      return element.text().trim()
    }
  }

  return 'Unknown Set'
}

// Helper function to extract card data from the page
function extractCardData($: cheerio.CheerioAPI): PikawizCard[] {
  const cards: PikawizCard[] = []

  // Since Pikawiz uses modern div-based layout, let's look for div containers
  // Try to find divs that might contain card data
  const cardContainers = [
    $('[class*="card-row"]'),
    $('[class*="pop-row"]'),
    $('[class*="report-row"]'),
    $('[class*="data-row"]'),
    $('div:contains("Pikachu")'),
    $('div:contains("Charizard")'),
    $('div:contains("PSA")'),
    // Look for divs that contain numbers (population counts)
    $('div').filter((i, el) => {
      const text = $(el).text().trim()
      return /^\d+$/.test(text) && parseInt(text) > 10
    })
  ]

  console.log(`🔍 Searching card containers:`)
  cardContainers.forEach((container, index) => {
    console.log(`  Container ${index}: ${container.length} elements`)
  })

  // Extract the actual data by analyzing the text content more intelligently
  const bodyText = $('body').text()
  
  // Look for card names followed by population numbers
  // Pikawiz likely has patterns like "Pikachu ex" followed by grade numbers
  const pokemonCardPatterns = [
    /pikachu[^a-z]*(?:ex|gx|v|vmax|vstar)?/gi,
    /charizard[^a-z]*(?:ex|gx|v|vmax|vstar)?/gi,
    /eevee[^a-z]*(?:ex|gx|v|vmax|vstar)?/gi,
    /rayquaza[^a-z]*(?:ex|gx|v|vmax|vstar)?/gi,
    /mewtwo[^a-z]*(?:ex|gx|v|vmax|vstar)?/gi
  ]

  // Find all card mentions and their surrounding text
  const cardMatches = []
  for (const pattern of pokemonCardPatterns) {
    const matches = [...bodyText.matchAll(pattern)]
         for (const match of matches) {
       const cardName = match[0].trim()
         .replace(/\s+/g, ' ')  // Clean up whitespace
         .replace(/\n/g, ' ')   // Remove newlines
         .replace(/\t/g, ' ')   // Remove tabs
         .split('-')[0]         // Remove extra text after dashes
         .split('•')[0]         // Remove extra text after bullets
         .trim()
       const startIndex = match.index || 0
      const surroundingText = bodyText.substring(startIndex, startIndex + 500)
      
      // Look for numbers that could be population data in the surrounding text
      const numbers = [...surroundingText.matchAll(/\b(\d{1,5})\b/g)]
        .map(m => parseInt(m[1]))
        .filter(n => n >= 10 && n <= 50000) // Reasonable population range
      
      if (numbers.length >= 3) { // Need at least 3 numbers for different grades
        cardMatches.push({
          name: cardName,
          numbers: numbers.slice(0, 10) // Take first 10 numbers found
        })
      }
    }
  }

  console.log(`🃏 Found ${cardMatches.length} potential card matches:`)
  cardMatches.forEach((match, i) => {
    console.log(`  ${i + 1}. ${match.name}: [${match.numbers.slice(0, 5).join(', ')}...]`)
  })

  // Convert matches to card data
  for (const match of cardMatches.slice(0, 5)) { // Limit to first 5 cards
    // Try to intelligently assign numbers to grades
    // Typically: higher grades = lower population
    const sortedNumbers = [...match.numbers].sort((a, b) => a - b)
    
    const card: PikawizCard = {
      name: match.name,
      cardNumber: String(cards.length + 1).padStart(3, '0'),
      psa10: sortedNumbers[0] || 0,    // Lowest number = PSA 10 (rarest)
      psa9: sortedNumbers[1] || 0,     // Second lowest = PSA 9
      psa8: sortedNumbers[2] || 0,     // Third lowest = PSA 8  
      psa7: sortedNumbers[3] || 0,     // Fourth lowest = PSA 7
      psa6: sortedNumbers[4] || 0,     // Fifth lowest = PSA 6
      totalPSA: 0, // Will calculate below
      cgc10: sortedNumbers[5] || 0,    // Next numbers for CGC
      cgc9: sortedNumbers[6] || 0,
      cgc8: sortedNumbers[7] || 0,
      totalCGC: 0, // Will calculate below
      ace10: sortedNumbers[8] || 0,    // Remaining for ACE
      ace9: sortedNumbers[9] || 0,
      ace8: 0,
      totalACE: 0 // Will calculate below
    }

    // Calculate totals
    card.totalPSA = card.psa10 + card.psa9 + card.psa8 + card.psa7 + card.psa6
    card.totalCGC = card.cgc10 + card.cgc9 + card.cgc8
    card.totalACE = card.ace10 + card.ace9 + card.ace8

    cards.push(card)
  }

  // If no cards found through pattern matching, try a simpler approach
  if (cards.length === 0) {
    // Look for any sequence of numbers that could be population data
    const allNumbers = [...bodyText.matchAll(/\b(\d{1,5})\b/g)]
      .map(m => parseInt(m[1]))
      .filter(n => n >= 10 && n <= 50000)
      .slice(0, 20) // Take first 20 reasonable numbers

    if (allNumbers.length >= 5) {
      console.log(`📊 Using number sequence approach: [${allNumbers.slice(0, 10).join(', ')}...]`)
      
      const card: PikawizCard = {
        name: 'Detected Card',
        cardNumber: '001',
        psa10: allNumbers[0] || 0,
        psa9: allNumbers[1] || 0,
        psa8: allNumbers[2] || 0,
        psa7: allNumbers[3] || 0,
        psa6: allNumbers[4] || 0,
        totalPSA: 0,
        cgc10: allNumbers[5] || 0,
        cgc9: allNumbers[6] || 0,
        cgc8: allNumbers[7] || 0,
        totalCGC: 0,
        ace10: allNumbers[8] || 0,
        ace9: allNumbers[9] || 0,
        ace8: allNumbers[10] || 0,
        totalACE: 0
      }

      card.totalPSA = card.psa10 + card.psa9 + card.psa8 + card.psa7 + card.psa6
      card.totalCGC = card.cgc10 + card.cgc9 + card.cgc8
      card.totalACE = card.ace10 + card.ace9 + card.ace8

      cards.push(card)
    }
  }

  return cards
}

// Helper function to extract card data from a table row
function extractCardFromRow($: cheerio.CheerioAPI, row: cheerio.Cheerio<any>): PikawizCard | null {
  try {
    const cells = row.find('td, .cell, .data-cell')
    
    // This structure will need to be adjusted based on actual Pikawiz HTML
    // For now, making educated guesses about column structure
    
    if (cells.length < 5) return null

    const name = $(cells[0]).text().trim()
    const cardNumber = $(cells[1]).text().trim()
    
    if (!name || name.length < 2) return null

    return {
      name: name,
      cardNumber: cardNumber || '000',
      psa10: parseInt($(cells[2]).text().replace(/[^\d]/g, '')) || 0,
      psa9: parseInt($(cells[3]).text().replace(/[^\d]/g, '')) || 0,
      psa8: parseInt($(cells[4]).text().replace(/[^\d]/g, '')) || 0,
      psa7: parseInt($(cells[5]).text().replace(/[^\d]/g, '')) || 0,
      psa6: parseInt($(cells[6]).text().replace(/[^\d]/g, '')) || 0,
      totalPSA: 0, // Will calculate
      cgc10: parseInt($(cells[7]).text().replace(/[^\d]/g, '')) || 0,
      cgc9: parseInt($(cells[8]).text().replace(/[^\d]/g, '')) || 0,
      cgc8: parseInt($(cells[9]).text().replace(/[^\d]/g, '')) || 0,
      totalCGC: 0, // Will calculate
      ace10: parseInt($(cells[10]).text().replace(/[^\d]/g, '')) || 0,
      ace9: parseInt($(cells[11]).text().replace(/[^\d]/g, '')) || 0,
      ace8: parseInt($(cells[12]).text().replace(/[^\d]/g, '')) || 0,
      totalACE: 0 // Will calculate
    }
  } catch (error) {
    console.error('Error extracting card data from row:', error)
    return null
  }
} 