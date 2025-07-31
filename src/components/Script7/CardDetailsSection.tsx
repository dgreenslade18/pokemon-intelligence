import React from 'react'
import { CardDetails } from './types'

interface CardDetailsSectionProps {
  cardDetails: CardDetails
}

export default function CardDetailsSection({ cardDetails }: CardDetailsSectionProps) {
  return (
    <div className="bento-card rounded-3xl p-5 md:p-8">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        Card Information
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card Image */}
        <div className="flex justify-center lg:justify-start max-w-[50%] md:max-w-full">
          {cardDetails.images?.large || cardDetails.images?.small ? (
            <img 
              src={cardDetails.images.large || cardDetails.images.small} 
              alt={cardDetails.name}
              className="max-w-full h-auto rounded-2xl shadow-lg max-h-96 object-contain"
              style={{ aspectRatio: '2.5/3.5' }}
            />
          ) : (
            <div className="w-64 h-80 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">No image available</span>
            </div>
          )}
        </div>
        
        {/* Card Details */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {cardDetails.name}
            </h4>
            {/* {cardDetails.supertype && (
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                {cardDetails.supertype}
              </p>
            )} */}
          </div>
          
          <div className="text-sm">
            {cardDetails.set?.name && (
              <div className="flex items-center gap-2 justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Set:</span>
                <p className="text-gray-600 dark:text-white">{cardDetails.set.name}</p>
              </div>
            )}
            
            {cardDetails.number && (
              <div className="flex items-center gap-2 justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Number:</span>
                <p className="text-gray-600 dark:text-white">{cardDetails.number}</p>
              </div>
            )}
            
            {cardDetails.rarity && (
              <div className="flex items-center gap-2 justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Rarity:</span>
                <p className="text-gray-600 dark:text-white">{cardDetails.rarity}</p>
              </div>
            )}
            
            {cardDetails.hp && (
              <div className="flex items-center gap-2 justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">HP:</span>
                <p className="text-gray-600 dark:text-white">{cardDetails.hp}</p>
              </div>
            )}
          </div>
          
          {cardDetails.types && cardDetails.types.length > 0 && (
            <div className="flex items-center gap-2 justify-between">
              <span className="font-medium text-gray-700 dark:text-gray-300">Types:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {cardDetails.types.map((type, index) => (
                  <span key={index} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 