import React from 'react'
import LoadingShimmer from '../LoadingShimmer'
import { ProgressUpdate } from './types'

interface ProgressDisplayProps {
  error: string | null
  loading: boolean
  progress: ProgressUpdate | null
}

export default function ProgressDisplay({ error, loading, progress }: ProgressDisplayProps) {
  
  // Show error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <div className="text-lg font-semibold">Analysis Failed</div>
          <div className="text-sm mt-2 max-w-md mx-auto">{error}</div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="text-center py-8">
        <LoadingShimmer />
        <div className="text-gray-600 dark:text-gray-300 mt-4">
          <div className="text-lg font-medium">
            {progress?.message || 'Analyzing card data...'}
          </div>
          <div className="text-sm mt-2 text-gray-500 dark:text-gray-400">
            Please wait while we gather pricing information from multiple sources
          </div>
        </div>
      </div>
    )
  }

  // Show completion state briefly (hidden by default)
  // if (progress?.stage === 'complete') {
  //   return (
  //     <div className="hidden text-center py-4">
  //       <div className="text-green-600 dark:text-green-400">
  //         <div className="text-lg font-medium">✅ Analysis Complete!</div>
  //       </div>
  //     </div>
  //   )
  // }

  return null
} 