import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// eBay Marketplace Account Deletion Notification Endpoint
// This endpoint is required by eBay to comply with marketplace deletion policies

// Your verification token for eBay
const VERIFICATION_TOKEN = '5546fe83e12d8670fcf17a67eb4c9ab79540f2b290ecd8188ac2435dc39afae6'

export async function POST(request: NextRequest) {
  try {
    // Get the raw body
    const body = await request.text()
    
    // Parse the notification
    let notification
    try {
      notification = JSON.parse(body)
    } catch (e) {
      console.error('Invalid JSON in eBay notification:', e)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Verify the token if provided
    const providedToken = notification.verificationToken || request.headers.get('x-ebay-verification-token')
    if (providedToken && providedToken !== VERIFICATION_TOKEN) {
      console.error('Invalid verification token provided:', providedToken)
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 401 })
    }

    // Log the notification (in production, you'd want to process this properly)
    console.log('Received eBay marketplace deletion notification:', {
      timestamp: new Date().toISOString(),
      notification: notification
    })

    // eBay expects a 200 response to confirm receipt
    return NextResponse.json({ 
      status: 'received',
      message: 'Marketplace account deletion notification processed successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Error processing eBay notification:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// eBay may also send GET requests to verify the endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge_code')
  const token = searchParams.get('verification_token')
  
  // Handle eBay verification challenge
  if (challenge) {
    console.log('eBay verification challenge received:', challenge)
    
    // Calculate the challengeResponse according to eBay's specification
    // Hash order: challengeCode + verificationToken + endpoint
    const endpoint = request.url.split('?')[0] // Remove query parameters to get base URL
    const hash = createHash('sha256')
    hash.update(challenge)
    hash.update(VERIFICATION_TOKEN)
    hash.update(endpoint)
    const challengeResponse = hash.digest('hex')
    
    console.log('Calculated challenge response:', challengeResponse)
    
    return NextResponse.json({ 
      challengeResponse: challengeResponse 
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
  
  // Handle verification token validation
  if (token) {
    console.log('eBay verification token received:', token)
    if (token === VERIFICATION_TOKEN) {
      return NextResponse.json({ 
        verification_token: token,
        status: 'verified' 
      }, { status: 200 })
    } else {
      return NextResponse.json({ 
        error: 'Invalid verification token' 
      }, { status: 401 })
    }
  }
  
  // Default response for endpoint health check
  return NextResponse.json({ 
    status: 'active',
    message: 'eBay marketplace account deletion notification endpoint is active',
    timestamp: new Date().toISOString(),
    verificationToken: VERIFICATION_TOKEN
  }, { status: 200 })
} 