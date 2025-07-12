import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Save uploaded file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = path.join(uploadsDir, `input_${Date.now()}.csv`)
    await writeFile(filePath, buffer)

    // Run the Python script (Script 1)
    const scriptPath = path.join(process.cwd(), '..', 'bulk_simple.py')
    const pythonEnv = path.join(process.cwd(), '..', 'venv', 'bin', 'python3')
    
    // Execute the script
    try {
      const { stdout, stderr } = await execAsync(
        `cd ${path.dirname(scriptPath)} && ${pythonEnv} bulk_simple.py`,
        { 
          env: { 
            ...process.env,
            INPUT_FILE: filePath
          },
          timeout: 300000 // 5 minutes timeout
        }
      )

      // Find the generated CSV file
      const outputPattern = /bulk_opportunities_.*\.csv/
      const outputMatch = stdout.match(outputPattern)
      
      if (outputMatch) {
        const outputFile = outputMatch[0]
        const outputPath = path.join(path.dirname(scriptPath), outputFile)
        
        return NextResponse.json({
          success: true,
          downloadUrl: `/api/download?file=${encodeURIComponent(outputFile)}`,
          message: 'Analysis completed successfully'
        })
      } else {
        throw new Error('Output file not found')
      }

    } catch (error) {
      console.error('Script execution error:', error)
      return NextResponse.json({
        error: 'Failed to process file',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 