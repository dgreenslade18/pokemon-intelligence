// Function to properly capitalize card names
export function capitalizeCardName(cardName: string): string {
  // Handle special cases and common Pokemon card naming conventions
  const specialWords = ['ex', 'gx', 'v', 'vmax', 'vstar', 'ar', 'chr', 'sar', 'sr', 'ur', 'rr', 'hr', 'gr', 'pr', 'fr', 'tr', 'mr', 'nr', 'or', 'qr', 'rr', 'sr', 'tr', 'ur', 'vr', 'wr', 'xr', 'yr', 'zr']
  
  return cardName
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize the first word (Pokemon name)
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      
      // Handle special words that should be uppercase
      if (specialWords.includes(word.toLowerCase())) {
        return word.toUpperCase()
      }
      
      // Handle words that should be title case (like "Special", "Delivery", etc.)
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
} 