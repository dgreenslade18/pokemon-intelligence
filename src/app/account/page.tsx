'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface UserPreferences {
  show_buy_value: boolean
  show_trade_value: boolean
  show_cash_value: boolean
  trade_percentage: number
  cash_percentage: number
  whatnot_fees: number
}

interface CompListItem {
  id: string
  user_id: string
  card_name: string
  card_number: string
  recommended_price: string
  tcg_price: number
  ebay_average: number
  saved_at: string
  card_image_url?: string
  set_name?: string
}

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [preferences, setPreferences] = useState<UserPreferences>({
    show_buy_value: true,
    show_trade_value: false,
    show_cash_value: false,
    trade_percentage: 80,
    cash_percentage: 70,
    whatnot_fees: 12.5
  })
  const [compList, setCompList] = useState<CompListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [compListLoading, setCompListLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!session?.user?.id) return

      try {
        const response = await fetch('/api/user-preferences')
        if (response.ok) {
          const result = await response.json()
          setPreferences(result.data)
        } else {
          console.error('Failed to load preferences')
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      loadPreferences()
    }
  }, [session])

  // Load comp list
  useEffect(() => {
    const loadCompList = async () => {
      if (!session?.user?.id) return

      try {
        const response = await fetch('/api/comp-list')
        if (response.ok) {
          const result = await response.json()
          setCompList(result.items || [])
        } else {
          console.error('Failed to load comp list')
        }
      } catch (error) {
        console.error('Error loading comp list:', error)
      } finally {
        setCompListLoading(false)
      }
    }

    if (session?.user?.id) {
      loadCompList()
    }
  }, [session])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Settings saved successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(result.error || 'Failed to save settings')
      }
    } catch (error) {
      setError('An error occurred while saving settings')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveFromCompList = async (itemId: string) => {
    try {
      const response = await fetch(`/api/comp-list?id=${itemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCompList(prev => prev.filter(item => item.id !== itemId))
        setMessage('Card removed from comp list!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError('Failed to remove card from comp list')
      }
    } catch (error) {
      setError('An error occurred while removing card')
    }
  }

  const updatePreference = (key: keyof UserPreferences, value: boolean | number) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="mb-4 text-gray-300 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">My Account</h1>
          <p className="text-gray-300">Configure your pricing strategy and display preferences</p>
        </div>

        {/* Account Info Card */}
        <div className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-300 text-sm">Email</label>
              <p className="text-white font-medium">{session?.user?.email}</p>
            </div>
            <div>
              <label className="text-gray-300 text-sm">Subscription</label>
              <p className="text-white font-medium capitalize">
                {session?.user?.subscriptionStatus === 'free' ? 'TESTING' : session?.user?.subscriptionStatus}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Strategy Card */}
        <div className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Pricing Strategy Settings</h2>
          
          {/* Display Options */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-4">Display Options</h3>
            <p className="text-gray-300 text-sm mb-4">Choose which pricing values to show in your card analysis results:</p>
            
            <div className="space-y-4">
              {/* Buy Value Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <h4 className="text-white font-medium">Show Buy Value</h4>
                  <p className="text-gray-400 text-sm">Market price for buying/selling at full value</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.show_buy_value}
                    onChange={(e) => updatePreference('show_buy_value', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Trade Value Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <h4 className="text-white font-medium">Show Trade Value</h4>
                  <p className="text-gray-400 text-sm">Price to pay when buying for store credit/trade</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.show_trade_value}
                    onChange={(e) => updatePreference('show_trade_value', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Cash Value Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <h4 className="text-white font-medium">Show Cash Value</h4>
                  <p className="text-gray-400 text-sm">Price to pay when buying with cash</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.show_cash_value}
                    onChange={(e) => updatePreference('show_cash_value', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Percentage Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-4">Percentage Settings</h3>
            <p className="text-gray-300 text-sm mb-4">Set your custom percentages for trade and cash purchases, plus Whatnot selling fees:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Trade Percentage */}
              <div className="p-4 rounded-lg bg-white/5">
                <label className="block text-white font-medium mb-2">
                  Trade Percentage
                </label>
                <p className="text-gray-400 text-sm mb-3">
                  Percentage of market value to pay for trade credit purchases
                </p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={preferences.trade_percentage}
                    onChange={(e) => updatePreference('trade_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-2 text-gray-400">%</span>
                </div>
              </div>

              {/* Cash Percentage */}
              <div className="p-4 rounded-lg bg-white/5">
                <label className="block text-white font-medium mb-2">
                  Cash Percentage
                </label>
                <p className="text-gray-400 text-sm mb-3">
                  Percentage of market value to pay for cash purchases
                </p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={preferences.cash_percentage}
                    onChange={(e) => updatePreference('cash_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-2 text-gray-400">%</span>
                </div>
              </div>

              {/* Whatnot Fees */}
              <div className="p-4 rounded-lg bg-white/5">
                <label className="block text-white font-medium mb-2">
                  Whatnot Fees
                </label>
                <p className="text-gray-400 text-sm mb-3">
                  Platform fees for selling on Whatnot (used to calculate net proceeds)
                </p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={preferences.whatnot_fees}
                    onChange={(e) => updatePreference('whatnot_fees', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-2 text-gray-400">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Example Preview */}
          <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
            <h4 className="text-white font-medium mb-3">Preview Example</h4>
            <p className="text-gray-300 text-sm mb-3">
              For a card with £100 market value, your settings would show:
            </p>
            <div className="space-y-2 text-sm">
              {preferences.show_buy_value && (
                <div className="text-green-400">• Buy Value: £100.00 (100% of market)</div>
              )}
              {preferences.show_trade_value && (
                <div className="text-blue-400">• Trade Value: £{Number(preferences.trade_percentage).toFixed(2)} ({preferences.trade_percentage}% of market)</div>
              )}
              {preferences.show_cash_value && (
                <div className="text-orange-400">• Cash Value: £{Number(preferences.cash_percentage).toFixed(2)} ({preferences.cash_percentage}% of market)</div>
              )}
              <div className="text-purple-400 border-t border-white/10 pt-2 mt-2">
                • Net proceeds after Whatnot fees ({preferences.whatnot_fees}%): £{(100 * (1 - preferences.whatnot_fees / 100)).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300">
              {message}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300">
              {error}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Comp List Card */}
        <div className="backdrop-blur-md bg-white/10 rounded-xl border border-white/20 p-6 mt-6">
          <h2 className="text-xl font-semibold text-white mb-6">My Comp List</h2>
          
          {compListLoading ? (
            <div className="text-center py-8">
              <div className="text-white text-lg">Loading comp list...</div>
            </div>
          ) : compList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No cards in your comp list yet</div>
              <p className="text-gray-500 text-sm">Cards you analyse will appear here for easy reference</p>
            </div>
          ) : (
            <div className="space-y-4">
              {compList.map((item) => (
                <div key={item.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Card Image */}
                    <div className="flex-shrink-0">
                      {item.card_image_url ? (
                        <img 
                          src={item.card_image_url} 
                          alt={item.card_name}
                          className="w-20 h-28 object-cover rounded-lg border border-white/20"
                        />
                      ) : (
                        <div className="w-20 h-28 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center">
                          <span className="text-white/50 text-xs text-center">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="flex-grow">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div>
                          <h3 className="text-white font-semibold text-lg">{item.card_name}</h3>
                          {item.set_name && (
                            <p className="text-gray-300 text-sm">{item.set_name}</p>
                          )}
                          {item.card_number && (
                            <p className="text-gray-400 text-sm">#{item.card_number}</p>
                          )}
                        </div>
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveFromCompList(item.id)}
                          className="text-red-400 hover:text-red-300 transition-colors text-sm px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Price Information */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-gray-400 text-xs uppercase tracking-wide">Recommended Price</p>
                          <p className="text-green-400 font-semibold">{item.recommended_price}</p>
                        </div>
                        
                        {item.tcg_price > 0 && (
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-gray-400 text-xs uppercase tracking-wide">TCG Price</p>
                            <p className="text-blue-400 font-semibold">£{item.tcg_price.toFixed(2)}</p>
                          </div>
                        )}
                        
                        {item.ebay_average > 0 && (
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-gray-400 text-xs uppercase tracking-wide">eBay Average</p>
                            <p className="text-purple-400 font-semibold">£{item.ebay_average.toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      {/* Saved Date */}
                      <div className="mt-3">
                        <p className="text-gray-500 text-xs">
                          Saved on {new Date(item.saved_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Comp List Stats */}
          {compList.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-white">{compList.length}</p>
                  <p className="text-gray-400 text-sm">Total Cards</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    £{compList.reduce((sum, item) => sum + (item.tcg_price || 0), 0).toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm">Total TCG Value</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">
                    £{compList.reduce((sum, item) => sum + (item.ebay_average || 0), 0).toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm">Total eBay Value</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 