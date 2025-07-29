import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const PSA_ACCESS_TOKEN = process.env.PSA_ACCESS_TOKEN
    if (!PSA_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'PSA_ACCESS_TOKEN not found' }, { status: 500 })
    }

    const headers = {
      'Authorization': `Bearer ${PSA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }

    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('test') || 'endpoints'

    console.log(`🧪 Testing PSA API - ${testType}`)

    if (testType === 'endpoints') {
      // Test various endpoint patterns to find what's available
      const testEndpoints = [
        'https://api.psacard.com/publicapi',
        'https://api.psacard.com/publicapi/pop',
        'https://api.psacard.com/publicapi/specs',
        'https://api.psacard.com/publicapi/search',
        'https://api.psacard.com/publicapi/cert'
      ]

      const results = []

      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: headers
          })
          
          results.push({
            endpoint,
            status: response.status,
            statusText: response.statusText,
            success: response.ok
          })

          if (response.ok) {
            try {
              const data = await response.json()
              results[results.length - 1].data = data
            } catch (e) {
              const text = await response.text()
              results[results.length - 1].text = text.substring(0, 200)
            }
          }
        } catch (error) {
          results.push({
            endpoint,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json({
        test: 'endpoints',
        results
      })
    }

    if (testType === 'spec') {
      // Test a specific specID if provided
      const specId = searchParams.get('specId') || '12345' // Default test ID
      
      const populationUrl = `https://api.psacard.com/publicapi/pop/GetPSASpecPopulation/${specId}`
      
      try {
        const response = await fetch(populationUrl, {
          method: 'GET',
          headers: headers
        })

        const result = {
          url: populationUrl,
          status: response.status,
          statusText: response.statusText,
          success: response.ok
        }

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            test: 'spec',
            result,
            data
          })
        } else {
          const errorText = await response.text()
          return NextResponse.json({
            test: 'spec',
            result,
            error: errorText
          })
        }
      } catch (error) {
        return NextResponse.json({
          test: 'spec',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (testType === 'swagger') {
      // Try to get Swagger documentation
      const swaggerUrl = 'https://api.psacard.com/publicapi/swagger.json'
      
      try {
        const response = await fetch(swaggerUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })

        if (response.ok) {
          const swaggerData = await response.json()
          return NextResponse.json({
            test: 'swagger',
            success: true,
            data: swaggerData
          })
        } else {
          return NextResponse.json({
            test: 'swagger',
            success: false,
            status: response.status,
            error: await response.text()
          })
        }
      } catch (error) {
        return NextResponse.json({
          test: 'swagger',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'PSA API Test',
      availableTests: ['endpoints', 'spec', 'swagger'],
      usage: 'Add ?test=endpoints or ?test=spec&specId=123 or ?test=swagger'
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 