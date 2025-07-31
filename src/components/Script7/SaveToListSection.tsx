import React from 'react'
import { Button } from '../Button'

interface SaveToListSectionProps {
  onSaveToCompList: () => void
  saving: boolean
  saveMessage: string | null
  isLoggedIn: boolean
  cardName?: string
}

export default function SaveToListSection({ 
  onSaveToCompList, 
  saving, 
  saveMessage, 
  isLoggedIn,
  cardName 
}: SaveToListSectionProps) {
  if (!isLoggedIn || !cardName) {
    return null
  }

  return (
    <div className="bento-card rounded-3xl p-5 md:p-8">
      <div className="flex items-center justify-between">
        <div>
        <Button
          onClick={onSaveToCompList}
          disabled={saving}
          color="primary"
          className="px-6 py-3"
        >
          {saving ? 'Saving...' : 'Add to Comp List'}
        </Button>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
            Add this card to your comparison list for future reference
          </p>
        </div>
       
      </div>
      
      {saveMessage && (
        <div className={`mt-4 p-3 rounded-lg ${
          saveMessage.includes('successfully') 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {saveMessage}
        </div>
      )}
    </div>
  )
} 