'use client'

import { useState, useRef } from 'react'

interface Script1PanelProps {
  onBack: () => void
}

export default function Script1Panel({ onBack }: Script1PanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
    setResult(null)
    setDownloadUrl(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/csv') {
      handleFileSelect(droppedFile)
    } else {
      setError('Please upload a CSV file')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleRun = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/script1', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        if (data.downloadPath) {
          setDownloadUrl(`/api/download?file=${encodeURIComponent(data.downloadPath)}`)
        }
      } else {
        setError(data.message || 'Analysis failed')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'japanese_arbitrage_results.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={onBack}
            className="flex items-center text-white/60 hover:text-white mb-8 group transition-all duration-300"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Scripts
          </button>
          <h1 className="text-5xl font-bold gradient-text mb-4">
            Japanese Market
          </h1>
          <p className="text-white/60 text-xl font-light">Discover cross-market arbitrage opportunities</p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Upload Section */}
          <div className="bento-card rounded-3xl p-10 mb-8">
            <h2 className="text-3xl font-semibold text-white mb-8">Upload Japanese Card URLs</h2>
            
            {/* File Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-500 ${
                isDragging
                  ? 'border-orange-400 bg-orange-500/10 scale-105'
                  : file
                  ? 'border-orange-500/50 bg-orange-500/5'
                  : 'border-white/20 hover:border-orange-500/50 hover:bg-orange-500/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              
              <div className="flex flex-col items-center">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 transition-all duration-300 ${
                  file ? 'bg-orange-500/20 scale-110' : 'bg-white/10'
                }`}>
                  <span className="text-4xl">
                    {file ? '📊' : '📄'}
                  </span>
                </div>
                
                {file ? (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-3">File Selected</h3>
                    <p className="text-orange-300 font-medium mb-3 text-lg">{file.name}</p>
                    <p className="text-white/60">
                      {(file.size / 1024).toFixed(1)} KB • Ready to analyze
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-3">Drop CSV file here</h3>
                    <p className="text-white/60 mb-6 text-lg">
                      Or click to browse for your Japanese card URLs spreadsheet
                    </p>
                    <div className="inline-flex items-center px-6 py-3 glass rounded-2xl hover:bg-white/10 transition-all duration-300">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-white font-medium">Choose File</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Run Button */}
            <div className="flex justify-center mt-8">
              <button
                onClick={handleRun}
                disabled={!file || uploading}
                className="px-10 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 shadow-2xl hover:shadow-orange-500/30"
              >
                <div className="flex items-center">
                  {uploading ? (
                    <>
                      <svg className="w-5 h-5 mr-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Analyzing Market...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Run Analysis
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bento-card rounded-3xl p-8 mb-8 border-red-500/20">
              <div className="flex items-center text-red-300">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-lg">Analysis Error</span>
              </div>
              <p className="text-red-200/80 mt-2 ml-9 text-base">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="bento-card rounded-3xl p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-semibold text-white">Analysis Complete</h2>
                {downloadUrl && (
                  <button
                    onClick={handleDownload}
                    className="px-8 py-4 glass rounded-2xl text-green-300 hover:bg-green-500/10 transition-all duration-300 group"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium">Download Results</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-white mb-2">{result.summary?.totalCards || 0}</div>
                  <div className="text-sm text-white/60 font-light">Cards Analyzed</div>
                </div>
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-orange-400 mb-2">{result.summary?.profitableCards || 0}</div>
                  <div className="text-sm text-white/60 font-light">Profitable</div>
                </div>
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {result.summary?.totalProfit ? `$${result.summary.totalProfit.toFixed(0)}` : '$0'}
                  </div>
                  <div className="text-sm text-white/60 font-light">Total Profit</div>
                </div>
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {result.summary?.avgROI ? `${result.summary.avgROI.toFixed(1)}%` : '0%'}
                  </div>
                  <div className="text-sm text-white/60 font-light">Avg ROI</div>
                </div>
              </div>

              {/* Success Message */}
              <div className="glass rounded-2xl p-6 border-green-500/20">
                <div className="flex items-center text-green-300">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Your arbitrage analysis is ready!</span>
                </div>
                <p className="text-green-200/80 mt-2 ml-8">
                  {result.message || 'Download the CSV file to view detailed results with profit calculations and market comparisons.'}
                </p>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-12 bento-card rounded-3xl p-8">
            <h3 className="text-2xl font-semibold text-white mb-6">How This Works</h3>
            <div className="grid md:grid-cols-2 gap-8 text-white/70">
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-4"></span>
                  <span>Upload CSV with Japanese Pokemon card URLs</span>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-4"></span>
                  <span>Scrapes Japanese marketplace prices automatically</span>
                </li>
              </ul>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-4"></span>
                  <span>Compares with eBay sold listings for profit analysis</span>
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-4"></span>
                  <span>Returns detailed arbitrage opportunities report</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 