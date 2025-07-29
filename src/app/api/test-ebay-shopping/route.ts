import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing eBay Shopping API (less restrictive)...')
    
    const ebayAppId = process.env.EBAY_APP_ID
    console.log(`📋 eBay App ID: ${ebayAppId ? ebayAppId.substring(0, 10) + '...' : 'NOT FOUND'}`)
    
    if (!ebayAppId) {
      return NextResponse.json({
        error: 'eBay App ID not found',
        hasAppId: !!ebayAppId
      })
    }
    
    const searchQuery = `Charizard ex pokemon card`
    
    // eBay Shopping API (more permissive)
    const url = 'https://open.api.ebay.com/shopping'
    
    const params = new URLSearchParams({
      'callname': 'FindProducts',
      'responseencoding': 'JSON',
      'appid': ebayAppId,
      'siteid': '3', // UK site
      'version': '967',
      'QueryKeywords': searchQuery,
      'MaxEntries': '5',
      'ProductSort': 'Popularity'
    })

    const fullUrl = `${url}?${params}`
    console.log(`📡 Shopping API URL: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'PokemonArbitrage/1.0'
      }
    })

    console.log(`🌐 Shopping API Response Status: ${response.status}`)

    const data = await response.json()
    
    if (!response.ok) {
      console.error(`❌ Shopping API Error:`, data)
      return NextResponse.json({
        error: `eBay Shopping API returned ${response.status}`,
        details: data,
        testedEndpoint: 'SHOPPING_API'
      })
    }

    console.log(`📦 Shopping API Response:`, Object.keys(data))
    
    // Check if we got products
    const products = data.Product || []
    
    const parsedProducts = products.slice(0, 5).map((product: any) => ({
      title: product.Title,
      productID: product.ProductID?.Value,
      stockPhotoURL: product.StockPhotoURL,
      reviewCount: product.ReviewCount,
      detailsURL: product.DetailsURL
    }))

    return NextResponse.json({
      success: true,
      apiType: 'SHOPPING_API',
      totalFound: products.length,
      products: parsedProducts,
      message: 'Shopping API test - this API works but returns product catalogs, not sold listings',
      rawData: data
    })
    
  } catch (error) {
    console.error('❌ Shopping API Test failed:', error)
    return NextResponse.json({
      error: 'Shopping API Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 