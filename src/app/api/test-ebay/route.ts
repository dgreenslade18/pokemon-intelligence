import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing eBay API...')
    
    const ebayAppId = process.env.EBAY_APP_ID
    const ebayToken = process.env.EBAY_ACCESS_TOKEN
    
    console.log(`📋 eBay App ID: ${ebayAppId ? ebayAppId.substring(0, 10) + '...' : 'NOT FOUND'}`)
    console.log(`🔑 eBay Token: ${ebayToken ? ebayToken.substring(0, 20) + '...' : 'NOT FOUND'}`)
    
    if (!ebayAppId || !ebayToken) {
      return NextResponse.json({
        error: 'eBay credentials not found',
        hasAppId: !!ebayAppId,
        hasToken: !!ebayToken
      })
    }
    
    const searchQuery = `Mew 1 pokemon card`
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search`
    
    const params = new URLSearchParams({
      q: searchQuery,
      limit: '3',
      filter: 'buyingOptions:{AUCTION|FIXED_PRICE}',
      sort: 'price'
    })

    console.log(`📡 URL: ${url}?${params}`)

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${ebayToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB',
        'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country%3DGB'
      }
    })

    console.log(`🌐 Response Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Error: ${errorText}`)
      return NextResponse.json({
        error: `eBay API returned ${response.status}`,
        details: errorText
      })
    }

    const data = await response.json()
    console.log(`📦 Total items: ${data.total}`)
    
    const items = data.itemSummaries?.slice(0, 3).map((item: any) => {
      let price = 0
      if (item.price?.value) {
        price = parseFloat(item.price.value)
      } else if (item.currentBidPrice?.value) {
        price = parseFloat(item.currentBidPrice.value)
      }
      
      return {
        title: item.title,
        price,
        condition: item.condition,
        hasFixedPrice: !!item.price?.value,
        hasAuctionPrice: !!item.currentBidPrice?.value
      }
    }) || []

    return NextResponse.json({
      success: true,
      totalFound: data.total,
      items: items,
      hasCredentials: {
        appId: !!ebayAppId,
        token: !!ebayToken
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