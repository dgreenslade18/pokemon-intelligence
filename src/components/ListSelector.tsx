'use client'

import { useState, useEffect } from 'react'
import ListManagementModal from './ListManagementModal'

interface UserList {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: Date
  updated_at: Date
  is_default: boolean
}

interface ListSelectorProps {
  selectedListId: string | null
  onListChange: (listId: string) => void
  onManageLists: () => void
}

export default function ListSelector({ selectedListId, onListChange, onManageLists }: ListSelectorProps) {
  const [lists, setLists] = useState<UserList[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)

  // Fetch lists
  const fetchLists = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/lists')
      const data = await response.json()
      
      if (data.success) {
        setLists(data.lists)
        
        // If no list is selected, select the default list
        if (!selectedListId && data.lists.length > 0) {
          const defaultList = data.lists.find((list: UserList) => list.is_default)
          if (defaultList) {
            onListChange(defaultList.id)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLists()
  }, [])

  const selectedList = lists.find(list => list.id === selectedListId)

  const handleListSelect = (listId: string) => {
    onListChange(listId)
    setShowDropdown(false)
  }

  const handleManageLists = () => {
    setShowDropdown(false)
    setShowManageModal(true)
  }

  const handleListUpdate = () => {
    fetchLists()
    onManageLists()
  }

  return (
    <div className="relative">
      {/* List Selector Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {loading ? 'Loading...' : selectedList?.name || 'Select List'}
        </span>
        
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10">
          <div className="py-1">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => handleListSelect(list.id)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between ${
                  selectedListId === list.id 
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{list.name}</span>
                  {list.is_default && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
                {selectedListId === list.id && (
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            
            <div className="border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleManageLists}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Lists
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Lists Modal */}
      <ListManagementModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        onListUpdate={handleListUpdate}
      />

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
} 