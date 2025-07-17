'use client'

import { useState, useEffect } from 'react'

interface UserList {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: Date
  updated_at: Date
  is_default: boolean
}

interface ListManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onListUpdate: () => void
}

export default function ListManagementModal({ isOpen, onClose, onListUpdate }: ListManagementModalProps) {
  const [lists, setLists] = useState<UserList[]>([])
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [editingList, setEditingList] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  // Fetch lists and card counts
  const fetchLists = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/lists')
      const data = await response.json()
      
      if (data.success) {
        setLists(data.lists)
        
        // Fetch card counts for each list
        const counts: Record<string, number> = {}
        for (const list of data.lists) {
          const compResponse = await fetch(`/api/comp-list?listId=${list.id}`)
          const compData = await compResponse.json()
          counts[list.id] = compData.success ? compData.compList.length : 0
        }
        setCardCounts(counts)
      }
    } catch (error) {
      console.error('Error fetching lists:', error)
      setError('Failed to load lists')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchLists()
    }
  }, [isOpen])

  // Create new list
  const handleCreateList = async () => {
    if (!newListName.trim()) {
      setError('List name is required')
      return
    }

    // Validate alphanumeric only
    if (!/^[a-zA-Z0-9\s]+$/.test(newListName.trim())) {
      setError('List name can only contain letters, numbers, and spaces')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName.trim() })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setNewListName('')
        await fetchLists()
        onListUpdate()
      } else {
        setError(data.message || 'Failed to create list')
      }
    } catch (error) {
      console.error('Error creating list:', error)
      setError('Failed to create list')
    } finally {
      setLoading(false)
    }
  }

  // Start editing list
  const handleStartEdit = (list: UserList) => {
    setEditingList(list.id)
    setEditName(list.name)
    setError('')
  }

  // Save list edit
  const handleSaveEdit = async () => {
    if (!editingList || !editName.trim()) {
      setError('List name is required')
      return
    }

    // Validate alphanumeric only
    if (!/^[a-zA-Z0-9\s]+$/.test(editName.trim())) {
      setError('List name can only contain letters, numbers, and spaces')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/lists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          listId: editingList, 
          updates: { name: editName.trim() } 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setEditingList(null)
        setEditName('')
        await fetchLists()
        onListUpdate()
      } else {
        setError(data.message || 'Failed to update list')
      }
    } catch (error) {
      console.error('Error updating list:', error)
      setError('Failed to update list')
    } finally {
      setLoading(false)
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingList(null)
    setEditName('')
    setError('')
  }

  // Delete list
  const handleDeleteList = async (list: UserList) => {
    if (list.is_default) {
      setError('Cannot delete the default list')
      return
    }

    if (!confirm(`Are you sure you want to delete "${list.name}"? All cards will be moved to your default list.`)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/lists?id=${list.id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchLists()
        onListUpdate()
      } else {
        setError(data.message || 'Failed to delete list')
      }
    } catch (error) {
      console.error('Error deleting list:', error)
      setError('Failed to delete list')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manage Lists
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Create New List */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Create New List
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
              />
              <button
                onClick={handleCreateList}
                disabled={loading || !newListName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>

          {/* Lists */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Your Lists
            </h3>
            
            {loading && lists.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : lists.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                No lists found
              </div>
            ) : (
              lists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="flex-1">
                    {editingList === list.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-600 dark:text-white"
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        />
                        <button
                          onClick={handleSaveEdit}
                          disabled={loading}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={loading}
                          className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {list.name}
                        </span>
                        {list.is_default && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Default
                          </span>
                        )}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({cardCounts[list.id] || 0} cards)
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {editingList !== list.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(list)}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Rename list"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      {!list.is_default && (
                        <button
                          onClick={() => handleDeleteList(list)}
                          disabled={loading}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Delete list"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 