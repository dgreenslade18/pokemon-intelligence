import { AutocompleteItem } from './types'

interface MultipleResultsModalProps {
  show: boolean
  searchTerm: string
  results: AutocompleteItem[]
  onCardSelect: (card: AutocompleteItem) => void
  onClose: () => void
}

export default function MultipleResultsModal({
  show,
  searchTerm,
  results,
  onCardSelect,
  onClose
}: MultipleResultsModalProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold dark:text-white text-black">Did you mean?</h2>
              <p className="text-black/60 dark:text-white/60 mt-1">
                We found multiple cards matching "{searchTerm}". Please select the specific card you want to analyze:
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Results Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((card, index) => (
              <div
                key={index}
                onClick={() => onCardSelect(card)}
                className="p-4 rounded-2xl border border-black/10 dark:border-white/10 hover:border-purple-500 dark:hover:border-purple-400 cursor-pointer transition-all duration-200 hover:shadow-lg group bg-white dark:bg-gray-700/50"
              >
                <div className="flex items-start gap-4">
                  {card.images?.small && (
                    <div className="shrink-0">
                      <img
                        src={card.images.small}
                        alt={card.name}
                        className="w-16 h-22 object-contain rounded-lg group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-black dark:text-white text-sm mb-2 leading-tight">
                      {card.name}
                    </h3>
                    <div className="space-y-1">
                      {card.set && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-black/50 dark:text-white/50">Set:</span>
                          <span className="bg-black/10 dark:bg-white/10 px-2 py-1 rounded text-xs font-medium">
                            {card.set}
                          </span>
                        </div>
                      )}
                      {card.number && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-black/50 dark:text-white/50">Number:</span>
                          <span className="text-xs font-medium text-black dark:text-white">
                            #{card.number}
                          </span>
                        </div>
                      )}
                      {card.rarity && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-black/50 dark:text-white/50">Rarity:</span>
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                            {card.rarity}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Hover indicator */}
                <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-medium">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Analyze this card
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-black/60 dark:text-white/60">
              Found {results.length} matching cards
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-black/10 dark:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 