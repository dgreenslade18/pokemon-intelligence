import React from 'react'
import { AllPopulationData, PopulationData, GradePopulation } from './types'

interface PopulationDataSectionProps {
  populationData?: AllPopulationData
  loading?: boolean
}

interface PopulationServiceCardProps {
  data: PopulationData
}

function PopulationServiceCard({ data }: PopulationServiceCardProps) {
  const getGradeColor = (grade: number | string, service: string) => {
    if (grade === 10 || grade === '10') {
      return service === 'PSA' 
        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' 
        : 'bg-gradient-to-r from-blue-500 to-blue-700 text-white'
    }
    if (grade === 9 || grade === '9') {
      return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white'
    }
    return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
  }

  const formatGemRate = (rate?: number) => {
    if (!rate) return 'N/A'
    return `${rate.toFixed(1)}%`
  }

  return (
    <div className="bento-card rounded-3xl p-6">
      <h4 className="text-xl font-semibold mb-4 text-center">
        {data.service} Population Data
      </h4>
      
      {/* Summary Stats */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Population</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.totalPopulation.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gem Rate</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatGemRate(data.gemRate)}
          </p>
        </div>
      </div>

      {/* Grade Breakdown */}
      <div className="space-y-2">
        {data.grades
          .sort((a, b) => {
            const aNum = typeof a.grade === 'string' ? parseInt(a.grade) : a.grade
            const bNum = typeof b.grade === 'string' ? parseInt(b.grade) : b.grade
            return bNum - aNum // Sort descending
          })
          .map((gradeData, index) => (
            <div
              key={index}
              className="flex items-center justify-between"
            >
              <div className={`px-4 py-2 rounded-full flex-1 mr-3 ${getGradeColor(gradeData.grade, data.service)}`}>
                <span className="font-medium">
                  {gradeData.label || `${data.service} ${gradeData.grade}`}
                </span>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[60px] text-right">
                {gradeData.count.toLocaleString()}
              </span>
            </div>
          ))}
      </div>

      {/* Last Updated */}
      {data.lastUpdated && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

export default function PopulationDataSection({ populationData, loading }: PopulationDataSectionProps) {
  if (loading) {
    return (
      <div className="bento-card rounded-3xl p-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          Population Data
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!populationData || (!populationData.psa && !populationData.cgc && !populationData.ace)) {
    return (
      <div className="bento-card rounded-3xl p-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          Population Data
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No population data available for this card.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Population data may not be available for all cards or may take time to load.
          </p>
        </div>
      </div>
    )
  }

  const availableServices = [
    populationData.psa && { ...populationData.psa, service: 'PSA' as const },
    populationData.cgc && { ...populationData.cgc, service: 'CGC' as const },
    populationData.ace && { ...populationData.ace, service: 'ACE' as const },
  ].filter(Boolean) as PopulationData[]

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold flex items-center">
        Population Data
      </h3>
      
      <div className="flex flex-col gap-6">
        {availableServices.map((serviceData) => (
          <PopulationServiceCard key={serviceData.service} data={serviceData} />
        ))}
      </div>

      {populationData.lastFetched && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Data fetched: {new Date(populationData.lastFetched).toLocaleString()}
        </p>
      )}
    </div>
  )
} 