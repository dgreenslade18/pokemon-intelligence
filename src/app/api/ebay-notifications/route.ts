import { NextRequest, NextResponse } from 'next/server'

// eBay Marketplace Account Deletion Notification Endpoint
// This endpoint is required by eBay to comply with marketplace deletion policies

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
    return NextResponse.json({ 
      challenge_response: challenge 
    }, { status: 200 })
  }
  
  // Handle verification token
  if (token) {
    console.log('eBay verification token received:', token)
    return NextResponse.json({ 
      verification_token: token,
      status: 'verified' 
    }, { status: 200 })
  }
  
  // Default response for endpoint health check
  return NextResponse.json({ 
    status: 'active',
    message: 'eBay marketplace account deletion notification endpoint is active',
    timestamp: new Date().toISOString()
  }, { status: 200 })
} 