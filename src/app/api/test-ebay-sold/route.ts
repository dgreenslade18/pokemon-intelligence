import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing eBay Finding API for sold items...')
    
    const ebayAppId = process.env.EBAY_APP_ID
    console.log(`📋 eBay App ID: ${ebayAppId ? ebayAppId.substring(0, 10) + '...' : 'NOT FOUND'}`)
    
    if (!ebayAppId) {
      return NextResponse.json({
        error: 'eBay App ID not found',
        hasAppId: !!ebayAppId
      })
    }
    
    const searchQuery = `Charizard ex 199/165`
    
    // Official eBay Finding API for completed (sold) items
    const url = 'https://svcs.ebay.com/services/search/FindingService/v1'
    
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': ebayAppId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': searchQuery,
      'paginationInput.entriesPerPage': '10',
      'sortOrder': 'EndTimeSoonest',
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'itemFilter(1).name': 'ListingType',
      'itemFilter(1).value': 'Auction',
      'itemFilter(2).name': 'LocatedIn', 
      'itemFilter(2).value': 'GB'
    })

    const fullUrl = `${url}?${params}`
    console.log(`📡 URL: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'PokemonArbitrage/1.0'
      }
    })

    console.log(`🌐 Response Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Error: ${errorText}`)
      return NextResponse.json({
        error: `eBay Finding API returned ${response.status}`,
        details: errorText
      })
    }

    const data = await response.json()
    console.log(`📦 Raw response keys:`, Object.keys(data))
    
    // Parse eBay Finding API response
    const searchResult = data.findCompletedItemsResponse?.[0]
    const searchResultData = searchResult?.searchResult?.[0]
    const items = searchResultData?.item || []
    
    console.log(`📦 Total items found: ${searchResultData?.['@count'] || 0}`)
    
    const parsedItems = items.slice(0, 10).map((item: any) => {
      const sellingStatus = item.sellingStatus?.[0]
      const convertedPrice = sellingStatus?.convertedCurrentPrice?.[0]
      const price = convertedPrice ? parseFloat(convertedPrice['__value__']) : 0
      
      const listingInfo = item.listingInfo?.[0]
      const endTime = listingInfo?.endTime?.[0]
      
      return {
        title: item.title?.[0],
        price: price,
        currency: convertedPrice?.['@currencyId'],
        condition: item.condition?.[0]?.conditionDisplayName?.[0],
        endTime: endTime,
        viewItemURL: item.viewItemURL?.[0],
        itemId: item.itemId?.[0],
        categoryName: item.primaryCategory?.[0]?.categoryName?.[0]
      }
    })

    return NextResponse.json({
      success: true,
      totalFound: searchResultData?.['@count'] || 0,
      items: parsedItems,
      hasCredentials: {
        appId: !!ebayAppId
      },
      rawSample: items[0] // Include first raw item for debugging
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 