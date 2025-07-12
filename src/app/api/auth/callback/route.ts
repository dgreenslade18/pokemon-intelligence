import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('eBay OAuth error:', error)
    return NextResponse.redirect(new URL('/?error=oauth_failed', request.url))
  }

  // Handle successful OAuth callback
  if (code) {
    console.log('eBay OAuth authorization code received:', code)
    
    // TODO: Exchange authorization code for access token
    // For now, just redirect to success page
    return NextResponse.redirect(new URL('/?success=oauth_connected', request.url))
  }

  // Handle missing code
  return NextResponse.redirect(new URL('/?error=missing_code', request.url))
}
