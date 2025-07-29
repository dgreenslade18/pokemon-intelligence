import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔑 Generating fresh eBay OAuth token...')
    
    const ebayAppId = process.env.EBAY_APP_ID
    const ebayCertId = process.env.EBAY_CERT_ID
    
    console.log(`📋 eBay App ID: ${ebayAppId ? ebayAppId.substring(0, 10) + '...' : 'NOT FOUND'}`)
    console.log(`🔐 eBay Cert ID: ${ebayCertId ? ebayCertId.substring(0, 10) + '...' : 'NOT FOUND'}`)
    
    if (!ebayAppId || !ebayCertId) {
      return NextResponse.json({
        error: 'eBay credentials not found',
        hasAppId: !!ebayAppId,
        hasCertId: !!ebayCertId
      })
    }
    
    // Generate OAuth 2.0 Client Credentials token
    const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token'
    
    // Create Basic Auth header
    const credentials = `${ebayAppId}:${ebayCertId}`
    const base64Credentials = Buffer.from(credentials).toString('base64')
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    console.log(`🌐 Token Response Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Token Error: ${errorText}`)
      return NextResponse.json({
        error: `eBay token generation failed: ${response.status}`,
        details: errorText
      })
    }

    const tokenData = await response.json()
    console.log(`✅ Token generated successfully`)
    console.log(`📝 Token type: ${tokenData.token_type}`)
    console.log(`⏱️ Expires in: ${tokenData.expires_in} seconds`)
    
    return NextResponse.json({
      success: true,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      accessToken: tokenData.access_token,
      message: 'Copy this access_token to your .env.local as EBAY_ACCESS_TOKEN'
    })
    
  } catch (error) {
    console.error('❌ Token generation failed:', error)
    return NextResponse.json({
      error: 'Token generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 