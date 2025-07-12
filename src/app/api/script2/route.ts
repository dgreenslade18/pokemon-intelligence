import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

function parsePythonOutput(output: string) {
  // Parse the Python script output to extract summary statistics and detailed card data
  let totalCards = 0
  let gradingCandidates = 0
  let totalProfit = 0
  let avgROI = 0
  let message = 'Grading analysis completed successfully'
  let gradingOpportunities: any[] = []

  try {
    // Extract number of profitable opportunities
    const profitableMatch = output.match(/🎯 PROFITABLE OPPORTUNITIES: (\d+)\/(\d+)/);
    if (profitableMatch) {
      gradingCandidates = parseInt(profitableMatch[1])
      totalCards = parseInt(profitableMatch[2])
    }

    // Extract total profit potential from portfolio summary
    const profitMatch = output.match(/Total Profit Potential: £(\d+)/);
    if (profitMatch) {
      totalProfit = parseInt(profitMatch[1])
    }

    // Extract portfolio ROI
    const roiMatch = output.match(/Portfolio ROI: (\d+)%/);
    if (roiMatch) {
      avgROI = parseInt(roiMatch[1])
    }

    // Count total analyzed cards by counting "CARD X:" entries
    const cardMatches = output.match(/🎴 CARD \d+:/g);
    if (cardMatches) {
      totalCards = cardMatches.length
    }

    // Extract detailed card information
    const cardSections = output.split(/🎴 CARD \d+: /);
    for (let i = 1; i < cardSections.length; i++) {
      const section = cardSections[i]
      
      // Extract card name (first line)
      const nameMatch = section.match(/^([^\n]+)/)
      const cardName = nameMatch ? nameMatch[1].trim() : `Card ${i}`
      
      // Extract card details
      const cardNumberMatch = section.match(/Card Number: ([^\n]+)/)
      const typeMatch = section.match(/Type: ([^\n]+)/)
      const rawPriceMatch = section.match(/Raw Price: £(\d+)/)
      
      // Extract ACE analysis
      const aceGradedMatch = section.match(/💎 ACE 10 ANALYSIS:\s+Graded Price: £(\d+)/)
      const aceInvestmentMatch = section.match(/Total Investment: £(\d+)/)
      const aceNetProfitMatch = section.match(/Net Profit: £(\d+)/)
      const aceROIMatch = section.match(/ROI: ([\d.]+)%/)
      const aceMultipleMatch = section.match(/Return Multiple: ([\d.]+)x/)
      
      // Extract PSA analysis
      const psaGradedMatch = section.match(/🏆 PSA 10 ANALYSIS:\s+Graded Price: £(\d+)/)
      const psaInvestmentMatch = section.match(/🏆 PSA 10 ANALYSIS:[\s\S]*?Total Investment: £(\d+)/)
      const psaNetProfitMatch = section.match(/🏆 PSA 10 ANALYSIS:[\s\S]*?Net Profit: £(\d+)/)
      const psaROIMatch = section.match(/🏆 PSA 10 ANALYSIS:[\s\S]*?ROI: ([\d.]+)%/)
      const psaMultipleMatch = section.match(/🏆 PSA 10 ANALYSIS:[\s\S]*?Return Multiple: ([\d.]+)x/)
      
      // Extract recommendation
      const recommendationMatch = section.match(/🎯 RECOMMENDATION: ([^\n]+)/)
      
      if (nameMatch && rawPriceMatch) {
        const card = {
          name: cardName,
          cardNumber: cardNumberMatch ? cardNumberMatch[1].trim() : 'N/A',
          type: typeMatch ? typeMatch[1].trim() : 'Unknown',
          rawPrice: parseInt(rawPriceMatch[1]),
          ace: {
            gradedPrice: aceGradedMatch ? parseInt(aceGradedMatch[1]) : 0,
            totalInvestment: aceInvestmentMatch ? parseInt(aceInvestmentMatch[1]) : 0,
            netProfit: aceNetProfitMatch ? parseInt(aceNetProfitMatch[1]) : 0,
            roi: aceROIMatch ? parseFloat(aceROIMatch[1]) : 0,
            multiple: aceMultipleMatch ? parseFloat(aceMultipleMatch[1]) : 0
          },
          psa: {
            gradedPrice: psaGradedMatch ? parseInt(psaGradedMatch[1]) : 0,
            totalInvestment: psaInvestmentMatch ? parseInt(psaInvestmentMatch[1]) : 0,
            netProfit: psaNetProfitMatch ? parseInt(psaNetProfitMatch[1]) : 0,
            roi: psaROIMatch ? parseFloat(psaROIMatch[1]) : 0,
            multiple: psaMultipleMatch ? parseFloat(psaMultipleMatch[1]) : 0
          },
          recommendation: recommendationMatch ? recommendationMatch[1].trim() : 'No recommendation',
          isProfitable: recommendationMatch ? !recommendationMatch[1].includes('❌ SKIP') : false
        }
        
        gradingOpportunities.push(card)
      }
    }

    // Create summary message
    if (gradingCandidates > 0) {
      message = `Found ${gradingCandidates} profitable grading opportunities from ${totalCards} cards analyzed`
    } else {
      message = `Analyzed ${totalCards} cards - no opportunities meeting 3x return criteria found`
    }

  } catch (error) {
    console.error('Error parsing Python output:', error)
  }

  return {
    summary: {
      totalCards,
      gradingCandidates,
      totalProfit,
      avgROI
    },
    gradingOpportunities,
    message
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sets } = body  // Changed from selectedSets to sets to match frontend

    if (!sets || sets.length === 0) {
      return NextResponse.json({ 
        success: false,
        message: 'No sets selected' 
      }, { status: 400 })
    }

    // Path to Python script and virtual environment
    const scriptPath = path.join(process.cwd(), 'grading_arbitrage_analyzer.py')
    const venvPythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({
        success: false,
        message: 'Python script not found: grading_arbitrage_analyzer.py'
      }, { status: 404 })
    }

    // Write sets to environment or file for Python script
    const setsData = JSON.stringify(sets)
    const setsFile = path.join(process.cwd(), 'selected_sets.json')
    fs.writeFileSync(setsFile, setsData)

    // Run Python script
    const pythonProcess = spawn(venvPythonPath, [scriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300000, // 5 minutes timeout
      env: {
        ...process.env,
        SELECTED_SETS: setsData
      }
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    // Wait for script completion
    try {
      await new Promise<void>((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`Python script failed with code ${code}: ${stderr}`))
          }
        })

        pythonProcess.on('error', (error) => {
          reject(error)
        })
      })

      // Clean up temporary file
      if (fs.existsSync(setsFile)) {
        fs.unlinkSync(setsFile)
      }

      // Look for generated CSV file
      const outputPattern = /grading_arbitrage_analysis_.*\.csv/
      const outputMatch = stdout.match(outputPattern)
      
      if (outputMatch) {
        const outputFile = outputMatch[0]
        const fullOutputPath = path.join(process.cwd(), outputFile)
        
        if (fs.existsSync(fullOutputPath)) {
          const summaryData = parsePythonOutput(stdout)
          
          return NextResponse.json({
            success: true,
            downloadPath: outputFile,
            message: summaryData.message,
            summary: summaryData.summary,
            gradingOpportunities: summaryData.gradingOpportunities,
            sets: sets
          })
        }
      }

      // Parse summary data from output
      const summaryData = parsePythonOutput(stdout)
      
      return NextResponse.json({
        success: true,
        message: summaryData.message || 'Grading analysis completed successfully',
        summary: summaryData.summary,
        gradingOpportunities: summaryData.gradingOpportunities,
        sets: sets,
        output: stdout // Keep for debugging
      })

    } catch (error) {
      console.error('Script execution error:', error)
      
      // Clean up temporary file on error
      if (fs.existsSync(setsFile)) {
        fs.unlinkSync(setsFile)
      }
      
      return NextResponse.json({
        success: false,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: stderr || 'No error details available'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 