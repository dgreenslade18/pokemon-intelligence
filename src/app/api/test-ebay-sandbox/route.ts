import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing eBay Finding API in SANDBOX mode...')
    
    const ebayAppId = process.env.EBAY_APP_ID
    console.log(`📋 eBay App ID: ${ebayAppId ? ebayAppId.substring(0, 10) + '...' : 'NOT FOUND'}`)
    
    if (!ebayAppId) {
      return NextResponse.json({
        error: 'eBay App ID not found',
        hasAppId: !!ebayAppId
      })
    }
    
    const searchQuery = `Charizard ex 199/165`
    
    // Try SANDBOX endpoint for Finding API
    const url = 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'
    
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': ebayAppId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': searchQuery,
      'paginationInput.entriesPerPage': '5',
      'sortOrder': 'EndTimeSoonest',
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true'
    })

    const fullUrl = `${url}?${params}`
    console.log(`📡 SANDBOX URL: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'PokemonArbitrage/1.0'
      }
    })

    console.log(`🌐 SANDBOX Response Status: ${response.status}`)

    const data = await response.json()
    
    if (!response.ok) {
      console.error(`❌ SANDBOX Error:`, data)
      return NextResponse.json({
        error: `eBay SANDBOX Finding API returned ${response.status}`,
        details: data,
        testedEndpoint: 'SANDBOX'
      })
    }

    // Parse successful response
    const searchResult = data.findCompletedItemsResponse?.[0]
    const searchResultData = searchResult?.searchResult?.[0]
    const items = searchResultData?.item || []
    
    console.log(`📦 SANDBOX Total items found: ${searchResultData?.['@count'] || 0}`)
    
    const parsedItems = items.slice(0, 5).map((item: any) => {
      const sellingStatus = item.sellingStatus?.[0]
      const convertedPrice = sellingStatus?.convertedCurrentPrice?.[0]
      const price = convertedPrice ? parseFloat(convertedPrice['__value__']) : 0
      
      return {
        title: item.title?.[0],
        price: price,
        currency: convertedPrice?.['@currencyId'],
        condition: item.condition?.[0]?.conditionDisplayName?.[0],
        viewItemURL: item.viewItemURL?.[0],
        itemId: item.itemId?.[0]
      }
    })

    return NextResponse.json({
      success: true,
      environment: 'SANDBOX',
      totalFound: searchResultData?.['@count'] || 0,
      items: parsedItems,
      message: 'SANDBOX API is working! Your app is configured for sandbox mode.'
    })
    
  } catch (error) {
    console.error('❌ SANDBOX Test failed:', error)
    return NextResponse.json({
      error: 'SANDBOX Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 