// Format price with trailing zeros
export const formatPrice = (price: number | string): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price
  return num.toFixed(2)
}

// Format date to UK format (DD MMM YYYY)
export const formatUKDate = (dateString: string): string => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) return dateString
    
    // Format as DD MMM YYYY (e.g., "15 Jan 2024")
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch (error) {
    // Return original string if parsing fails
    return dateString
  }
}

// Get progress icon based on stage
export const getProgressIcon = (stage: string): string => {
  switch (stage) {
    case 'starting':
    case 'analysis':
      return '🚀'
    case 'ebay':
      return '🏪'
    case 'cardmarket':
      return '🎮'
    default:
      return '⚡'
  }
}

// Get progress color classes based on stage
export const getProgressColor = (stage: string): string => {
  switch (stage) {
    case 'ebay':
      return 'from-blue-500 to-blue-600'
    case 'cardmarket':
      return 'from-purple-500 to-purple-600'
    case 'analysis':
      return 'from-orange-500 to-orange-600'
    default:
      return 'from-gray-500 to-gray-600'
  }
}

// Calculate progress percentage
export const getProgressPercentage = (stage: string, progressStages: Set<string>): number => {
  const completedStages = Array.from(progressStages)
  const totalStages = ['starting', 'ebay', 'cardmarket', 'analysis']
  const completedCount = totalStages.filter(s => completedStages.includes(s)).length
  
  // Base progress on completed stages rather than current stage
  const baseProgress = Math.min(90, (completedCount / totalStages.length) * 90)
  
  // Add some progress for the current stage to make it feel more responsive
  return Math.min(baseProgress + 10, 90)
}

// Create specific search term for card analysis
export const createSpecificSearchTerm = (selectedCard: any): string => {
  let specificSearchTerm = selectedCard.name
  
  // If we have set and number info, create a more specific search
  if (selectedCard.set && selectedCard.number) {
    specificSearchTerm = `${selectedCard.name} ${selectedCard.set} ${selectedCard.number}`
  } else if (selectedCard.id) {
    // Use the card ID as it's the most specific identifier
    specificSearchTerm = selectedCard.id
  }
  
  return specificSearchTerm
}

// Debounce function for autocomplete
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
} 