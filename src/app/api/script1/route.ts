import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Japanese Market analysis is temporarily unavailable in this deployment. Please use Card Comp for pricing analysis.',
    disabled: true
  }, { status: 503 })
} 