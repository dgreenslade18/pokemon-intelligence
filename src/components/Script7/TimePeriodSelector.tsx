import React, { useState, useRef, useEffect } from 'react'
import { TimePeriod, TimePeriodOption } from './types'

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod
  onPeriodChange: (period: TimePeriod) => void
  availablePeriods?: TimePeriod[]
}

const TIME_PERIOD_OPTIONS: TimePeriodOption[] = [
  { value: '7days', label: 'Last 7 Days', days: 7 },
  { value: '30days', label: 'Last 30 Days', days: 30 },
  { value: '90days', label: 'Last 3 Months', days: 90 },
  { value: '6months', label: 'Last 6 Months', days: 180 },
  { value: 'alltime', label: 'All Time' }
]

export default function TimePeriodSelector({ 
  selectedPeriod, 
  onPeriodChange, 
  availablePeriods 
}: TimePeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filter options based on available periods
  const filteredOptions = availablePeriods 
    ? TIME_PERIOD_OPTIONS.filter(option => availablePeriods.includes(option.value))
    : TIME_PERIOD_OPTIONS

  const selectedOption = TIME_PERIOD_OPTIONS.find(option => option.value === selectedPeriod)

  const handleOptionSelect = (period: TimePeriod) => {
    onPeriodChange(period)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between min-w-[140px] px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {selectedOption?.label || 'Select Period'}
        </span>
        <svg 
          className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionSelect(option.value)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                  selectedPeriod === option.value 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                <span>{option.label}</span>
                {selectedPeriod === option.value && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 