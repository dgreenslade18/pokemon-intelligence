import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Path to Python script and virtual environment
    const scriptPath = path.join(process.cwd(), '..', 'etb_arbitrage_analyzer.py')
    const venvPythonPath = path.join(process.cwd(), '..', 'venv', 'bin', 'python')
    const resultPath = path.join(process.cwd(), '..', 'etb_arbitrage_results.json')

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({
        success: false,
        error: 'Python script not found',
        message: 'etb_arbitrage_analyzer.py is missing'
      }, { status: 404 })
    }

    // Run Python script
    const pythonProcess = spawn(venvPythonPath, [scriptPath], {
      cwd: path.join(process.cwd(), '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000 // 30 second timeout
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    // Wait for script completion
    await new Promise<void>((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`))
        }
      })

      pythonProcess.on('error', (error) => {
        reject(error)
      })
    })

    // Read results file
    if (fs.existsSync(resultPath)) {
      const resultsData = fs.readFileSync(resultPath, 'utf8')
      const results = JSON.parse(resultsData)
      
      // Ensure all ETB objects have proper numeric values and purchase links
      const processETBs = (etbs: any[]) => {
        return etbs.map(etb => ({
          id: etb.id || 'unknown',
          name: etb.name || 'Unknown ETB',
          releaseYear: etb.releaseYear || 2023,
          currentPrice: Number(etb.currentPrice) || 0,
          historicalHigh: Number(etb.historicalHigh) || 0,
          priceDropPercent: Number(etb.priceDropPercent) || 0,
          trend: etb.trend || 'stable',
          priceChange: Number(etb.priceChange) || 0,
          availability: etb.availability || 'Unknown',
          salesVolume: Number(etb.salesVolume) || 0,
          isUndervalued: Boolean(etb.isUndervalued),
          potentialUpside: Number(etb.potentialUpside) || 0,
          ebay_avg_price: Number(etb.ebay_avg_price) || 0,
          recent_sales_count: Number(etb.recent_sales_count) || 0,
          purchaseLinks: etb.purchaseLinks || {},
          recommendedSource: etb.recommendedSource || 'tcgplayer',
          buyNowUrl: etb.buyNowUrl || `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(etb.name || 'pokemon etb')}`
        }))
      }
      
      return NextResponse.json({
        success: true,
        dataSource: 'live',
        message: `Live ETB Market Analysis - ${results.summary.trending_count} trending ETBs and ${results.summary.undervalued_count} undervalued opportunities found`,
        lastUpdated: results.summary.last_updated,
        trendingETBs: processETBs(results.trending_etbs || []),
        undervaluedETBs: processETBs(results.undervalued_etbs || []),
        summary: {
          total_etbs: Number(results.summary.total_etbs) || 0,
          trending_count: Number(results.summary.trending_count) || 0,
          undervalued_count: Number(results.summary.undervalued_count) || 0,
          avg_current_price: Number(results.summary.avg_current_price) || 0,
          total_market_value: Number(results.summary.total_market_value) || 0,
          last_updated: results.summary.last_updated,
          data_sources: results.summary.data_sources || ['live_analysis']
        }
      })
    } else {
      throw new Error('Results file not generated')
    }

  } catch (error) {
    console.error('Script4 API Error:', error)
    
    // Return mock data with proper structure for development
    const mockTrendingETBs = [
      {
        id: '1',
        name: 'Scarlet & Violet Base Set ETB',
        releaseYear: 2023,
        currentPrice: 45.99,
        historicalHigh: 55.99,
        priceDropPercent: 15.5,
        trend: 'up' as const,
        priceChange: 8.3,
        availability: 'In Print',
        salesVolume: 1250,
        isUndervalued: false,
        potentialUpside: 12.1,
        purchaseLinks: {
          tcgplayer: 'https://www.tcgplayer.com/search/pokemon/product?q=Scarlet+Violet+Base+Set+Elite+Trainer+Box',
          ebay: 'https://www.ebay.com/sch/i.html?_nkw=Scarlet+Violet+Base+Set+Elite+Trainer+Box+pokemon',
          amazon: 'https://www.amazon.com/s?k=Scarlet+Violet+Base+Set+Elite+Trainer+Box+pokemon'
        },
        recommendedSource: 'tcgplayer',
        buyNowUrl: 'https://www.tcgplayer.com/search/pokemon/product?q=Scarlet+Violet+Base+Set+Elite+Trainer+Box'
      },
      {
        id: '2',
        name: 'Lost Origin ETB',
        releaseYear: 2022,
        currentPrice: 52.99,
        historicalHigh: 65.99,
        priceDropPercent: 19.7,
        trend: 'stable' as const,
        priceChange: 2.1,
        availability: 'Limited',
        salesVolume: 890,
        isUndervalued: true,
        potentialUpside: 24.5,
        purchaseLinks: {
          tcgplayer: 'https://www.tcgplayer.com/search/pokemon/product?q=Lost+Origin+Elite+Trainer+Box',
          ebay: 'https://www.ebay.com/sch/i.html?_nkw=Lost+Origin+Elite+Trainer+Box+pokemon',
          amazon: 'https://www.amazon.com/s?k=Lost+Origin+Elite+Trainer+Box+pokemon'
        },
        recommendedSource: 'ebay',
        buyNowUrl: 'https://www.ebay.com/sch/i.html?_nkw=Lost+Origin+Elite+Trainer+Box+pokemon'
      }
    ]

    const mockUndervaluedETBs = [
      {
        id: '3',
        name: 'Fusion Strike ETB',
        releaseYear: 2021,
        currentPrice: 38.99,
        historicalHigh: 65.99,
        priceDropPercent: 40.9,
        trend: 'down' as const,
        priceChange: -12.5,
        availability: 'Out of Print',
        salesVolume: 340,
        isUndervalued: true,
        potentialUpside: 69.2,
        purchaseLinks: {
          tcgplayer: 'https://www.tcgplayer.com/search/pokemon/product?q=Fusion+Strike+Elite+Trainer+Box',
          ebay: 'https://www.ebay.com/sch/i.html?_nkw=Fusion+Strike+Elite+Trainer+Box+pokemon',
          amazon: 'https://www.amazon.com/s?k=Fusion+Strike+Elite+Trainer+Box+pokemon'
        },
        recommendedSource: 'ebay',
        buyNowUrl: 'https://www.ebay.com/sch/i.html?_nkw=Fusion+Strike+Elite+Trainer+Box+pokemon'
      }
    ]
    
    // Return mock data response with proper structure
    return NextResponse.json({
      success: true,
      dataSource: 'demo',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Showing demo ETB data - real market intelligence requires Python script setup.',
      trendingETBs: mockTrendingETBs,
      undervaluedETBs: mockUndervaluedETBs,
      lastUpdated: new Date().toISOString(),
      summary: {
        total_etbs: 3,
        trending_count: mockTrendingETBs.length,
        undervalued_count: mockUndervaluedETBs.length,
        avg_current_price: Math.round(((mockTrendingETBs[0].currentPrice + mockTrendingETBs[1].currentPrice + mockUndervaluedETBs[0].currentPrice) / 3) * 100) / 100,
        total_market_value: Math.round(((mockTrendingETBs[0].currentPrice * mockTrendingETBs[0].salesVolume) + (mockTrendingETBs[1].currentPrice * mockTrendingETBs[1].salesVolume) + (mockUndervaluedETBs[0].currentPrice * mockUndervaluedETBs[0].salesVolume)) * 100) / 100,
        last_updated: new Date().toISOString(),
        data_sources: ['demo']
      }
    })
  }
} 