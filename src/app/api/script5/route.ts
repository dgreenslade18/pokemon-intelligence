import { NextResponse } from 'next/server'

interface GradingServiceData {
  name: string
  logo: string
  basePrice: number
  express: number
  fastest: number
  turnaround: {
    standard: string
    express: string
    fastest: string
  }
  shipping: {
    uk: number
    insurance: number
    tracking: boolean
  }
  cardValue: {
    min: number
    max: number
  }
  specialty: string
  website: string
  lastUpdated: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const service = searchParams.get('service')
  
  try {
    // Simulate API response with current grading service data
    const gradingServices: GradingServiceData[] = [
      {
        name: "PSA (Professional Sports Authenticator)",
        logo: "🏆",
        basePrice: 20,
        express: 50,
        fastest: 150,
        turnaround: {
          standard: "45-60 days",
          express: "15-20 days",
          fastest: "3-5 days"
        },
        shipping: {
          uk: 25,
          insurance: 15,
          tracking: true
        },
        cardValue: {
          min: 10,
          max: 49999
        },
        specialty: "Most recognized brand - highest market value",
        website: "https://www.psacard.com",
        lastUpdated: new Date().toISOString()
      },
      {
        name: "BGS (Beckett Grading Services)",
        logo: "💎",
        basePrice: 18,
        express: 45,
        fastest: 120,
        turnaround: {
          standard: "30-45 days",
          express: "10-15 days",
          fastest: "2-3 days"
        },
        shipping: {
          uk: 22,
          insurance: 12,
          tracking: true
        },
        cardValue: {
          min: 10,
          max: 99999
        },
        specialty: "Subgrade system - detailed condition breakdown",
        website: "https://www.beckett.com",
        lastUpdated: new Date().toISOString()
      },
      {
        name: "ACE Grading",
        logo: "🎯",
        basePrice: 8,
        express: 20,
        fastest: 60,
        turnaround: {
          standard: "21-30 days",
          express: "7-10 days",
          fastest: "1-2 days"
        },
        shipping: {
          uk: 15,
          insurance: 8,
          tracking: true
        },
        cardValue: {
          min: 5,
          max: 9999
        },
        specialty: "UK-based service - no international shipping delays",
        website: "https://www.acegrading.com",
        lastUpdated: new Date().toISOString()
      },
      {
        name: "GetGraded",
        logo: "⚡",
        basePrice: 12,
        express: 30,
        fastest: 80,
        turnaround: {
          standard: "28-35 days",
          express: "10-14 days",
          fastest: "2-4 days"
        },
        shipping: {
          uk: 18,
          insurance: 10,
          tracking: true
        },
        cardValue: {
          min: 10,
          max: 19999
        },
        specialty: "Fast turnaround - growing market recognition",
        website: "https://www.getgraded.com",
        lastUpdated: new Date().toISOString()
      },
      {
        name: "TAG Grading",
        logo: "🏷️",
        basePrice: 15,
        express: 35,
        fastest: 90,
        turnaround: {
          standard: "35-45 days",
          express: "12-18 days",
          fastest: "3-5 days"
        },
        shipping: {
          uk: 20,
          insurance: 12,
          tracking: true
        },
        cardValue: {
          min: 10,
          max: 29999
        },
        specialty: "Competitive pricing - consistent quality",
        website: "https://www.taggrading.com",
        lastUpdated: new Date().toISOString()
      },
      {
        name: "PG Grading",
        logo: "🔍",
        basePrice: 10,
        express: 25,
        fastest: 70,
        turnaround: {
          standard: "30-40 days",
          express: "8-12 days",
          fastest: "1-3 days"
        },
        shipping: {
          uk: 16,
          insurance: 9,
          tracking: true
        },
        cardValue: {
          min: 5,
          max: 14999
        },
        specialty: "Budget-friendly option - good for lower value cards",
        website: "https://www.pggrading.com",
        lastUpdated: new Date().toISOString()
      }
    ]

    // If specific service requested, return just that service
    if (service) {
      const specificService = gradingServices.find(s => 
        s.name.toLowerCase().includes(service.toLowerCase())
      )
      if (specificService) {
        return NextResponse.json({ service: specificService })
      } else {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 })
      }
    }

    // Return all services with analysis
    const analysis = {
      bestValue: gradingServices.reduce((best, current) => 
        (current.basePrice + current.shipping.uk) < (best.basePrice + best.shipping.uk) ? current : best
      ),
      fastestStandard: gradingServices.reduce((fastest, current) => {
        const currentDays = parseInt(current.turnaround.standard.split('-')[0])
        const fastestDays = parseInt(fastest.turnaround.standard.split('-')[0])
        return currentDays < fastestDays ? current : fastest
      }),
      fastestExpress: gradingServices.reduce((fastest, current) => {
        const currentDays = parseInt(current.turnaround.fastest.split('-')[0])
        const fastestDays = parseInt(fastest.turnaround.fastest.split('-')[0])
        return currentDays < fastestDays ? current : fastest
      }),
      ukBased: gradingServices.filter(s => s.specialty.includes('UK-based')),
      highestValue: gradingServices.reduce((highest, current) => 
        current.cardValue.max > highest.cardValue.max ? current : highest
      )
    }

    return NextResponse.json({
      services: gradingServices,
      analysis,
      totalServices: gradingServices.length,
      lastUpdated: new Date().toISOString(),
      disclaimer: "Prices are estimates and may vary. Always check official websites for current pricing."
    })

  } catch (error) {
    console.error('Error fetching grading services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grading services data' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cardCount, cardValue, serviceType } = body

    // Simulate calculation logic
    const gradingServices: GradingServiceData[] = [
      // ... same data as above
    ]

    const calculations = gradingServices.map(service => {
      const basePrice = serviceType === 'standard' ? service.basePrice : 
                       serviceType === 'express' ? service.express : service.fastest
      const gradingCost = basePrice * cardCount
      const shippingCost = service.shipping.uk
      const insuranceCost = cardValue > 100 ? service.shipping.insurance : 0
      const totalCost = gradingCost + shippingCost + insuranceCost

      return {
        ...service,
        calculation: {
          gradingCost,
          shippingCost,
          insuranceCost,
          totalCost,
          costPerCard: totalCost / cardCount
        }
      }
    })

    // Sort by total cost
    calculations.sort((a, b) => a.calculation.totalCost - b.calculation.totalCost)

    return NextResponse.json({
      calculations,
      summary: {
        cheapest: calculations[0],
        mostExpensive: calculations[calculations.length - 1],
        averageCost: calculations.reduce((sum, calc) => sum + calc.calculation.totalCost, 0) / calculations.length,
        cardCount,
        cardValue,
        serviceType
      }
    })

  } catch (error) {
    console.error('Error calculating grading costs:', error)
    return NextResponse.json(
      { error: 'Failed to calculate grading costs' },
      { status: 500 }
    )
  }
} 