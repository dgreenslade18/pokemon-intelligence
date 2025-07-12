import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Path to Python script and virtual environment
    const scriptPath = path.join(process.cwd(), '..', 'trending_cards_analyzer.py')
    const venvPythonPath = path.join(process.cwd(), '..', 'venv', 'bin', 'python')
    const resultPath = path.join(process.cwd(), '..', 'trending_cards_results.json')

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({
        success: false,
        error: 'Python script not found',
        message: 'trending_cards_analyzer.py is missing'
      }, { status: 404 })
    }

    // Run Python script
    const pythonProcess = spawn(venvPythonPath, [scriptPath], {
      cwd: path.join(process.cwd(), '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000 // 30 second timeout
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

    // Read results file
    if (fs.existsSync(resultPath)) {
      const resultsData = fs.readFileSync(resultPath, 'utf8')
      const results = JSON.parse(resultsData)

    return NextResponse.json({
      success: true,
        dataSource: 'live',
        message: `Real Pokemon TCG API data - ${results.summary.trending_count} trending cards and ${results.summary.undervalued_count} undervalued opportunities found`,
        lastUpdated: results.summary.last_updated,
        trendingCards: results.trending_cards,
        undervaluedCards: results.undervalued_cards,
        summary: results.summary
      })
    } else {
      throw new Error('Results file not generated')
    }

  } catch (error) {
    console.error('Script3 API Error:', error)
    
    // Return error response - no fake data fallback
    return NextResponse.json({
      success: false,
      dataSource: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Real-time data unavailable. This script only provides authentic market intelligence.',
      trendingCards: [],
      undervaluedCards: [],
      summary: {
        total_cards: 0,
        trending_count: 0,
        undervalued_count: 0,
        last_updated: new Date().toISOString()
      }
    }, { status: 500 })
  }
} 