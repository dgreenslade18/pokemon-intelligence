'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  created_at: string
  subscription_status: string
  user_level: 'tester' | 'super_admin'
  last_login?: string
  is_active?: boolean
  deactivated_at?: string
  deactivated_by?: string
}

interface EmailSubmission {
  id: string
  email: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  assigned_user_id?: string
  notes?: string
  email_sent_at?: string
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [emailSubmissions, setEmailSubmissions] = useState<EmailSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'emails'>('users')

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Check if user is super admin
    const checkUserLevel = async () => {
      try {
        const response = await fetch('/api/user-level')
        const data = await response.json()
        
        if (data.userLevel !== 'super_admin') {
          router.push('/')
          return
        }

        // Load users and email submissions
        await loadData()
      } catch (error) {
        console.error('Error checking user level:', error)
        router.push('/')
      }
    }

    checkUserLevel()
  }, [session, status, router])

  const loadData = async () => {
    try {
      const [usersResponse, emailsResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/email-submissions')
      ])

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users)
      }

      if (emailsResponse.ok) {
        const emailsData = await emailsResponse.json()
        setEmailSubmissions(emailsData.submissions)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserLevel = async (userId: string, newLevel: 'tester' | 'super_admin') => {
    try {
      const response = await fetch(`/api/users/${userId}/level`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userLevel: newLevel }),
      })

      if (response.ok) {
        await loadData() // Reload data
      }
    } catch (error) {
      console.error('Error updating user level:', error)
    }
  }

  const updateEmailStatus = async (submissionId: string, status: 'pending' | 'approved' | 'rejected', userId?: string) => {
    try {
      const response = await fetch(`/api/email-submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status,
          assignedUserId: userId 
        }),
      })

      if (response.ok) {
        await loadData() // Reload data
      }
    } catch (error) {
      console.error('Error updating email status:', error)
    }
  }

  const grantAccess = async (email: string) => {
    try {
      const response = await fetch('/api/email/access-granted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        await loadData() // Reload data
        alert('Access granted email sent successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error granting access:', error)
      alert('Failed to grant access')
    }
  }

  const deactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    
    try {
      const response = await fetch(`/api/users/${userId}/deactivate`, {
        method: 'POST',
      })

      if (response.ok) {
        await loadData()
        alert('User deactivated successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deactivating user:', error)
      alert('Failed to deactivate user')
    }
  }

  const reactivateUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/reactivate`, {
        method: 'POST',
      })

      if (response.ok) {
        await loadData()
        alert('User reactivated successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error reactivating user:', error)
      alert('Failed to reactivate user')
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return
    
    try {
      const response = await fetch(`/api/users/${userId}/delete`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadData()
        alert('User deleted successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const resetPassword = async (userId: string) => {
    if (!confirm('Are you sure you want to reset this user\'s password? A new password will be generated and sent to their email.')) return
    
    try {
      const response = await fetch(`/api/users/${userId}/password-reset`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Password reset successfully. New password: ${result.newPassword}`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Failed to reset password')
    }
  }

  const deleteEmailSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this email submission? This action cannot be undone.')) return
    
    try {
      const response = await fetch(`/api/email-submissions/${submissionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadData()
        alert('Email submission deleted successfully')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting email submission:', error)
      alert('Failed to delete email submission')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to App
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'emails'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Email Submissions ({emailSubmissions.length})
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-6">Registered Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Level</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Created</th>
                    <th className="text-left py-3 px-4">Last Login</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/10">
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.user_level === 'super_admin' 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-blue-600 text-white'
                        }`}>
                          {user.user_level}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.subscription_status === 'pro' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-yellow-600 text-white'
                          }`}>
                            {user.subscription_status}
                          </span>
                          {user.is_active === false && (
                            <div className="text-xs text-red-400">
                              Deactivated
                              {user.deactivated_at && (
                                <div>on {new Date(user.deactivated_at).toLocaleDateString('en-GB')}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(user.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })
                          : 'Never'
                        }
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-2">
                          <select
                            value={user.user_level}
                            onChange={(e) => updateUserLevel(user.id, e.target.value as 'tester' | 'super_admin')}
                            className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 text-sm"
                          >
                            <option value="tester">Tester</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          
                          <div className="flex space-x-1">
                            {user.is_active === false ? (
                              <button
                                onClick={() => reactivateUser(user.id)}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                                title="Reactivate user"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => deactivateUser(user.id)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs"
                                title="Deactivate user"
                              >
                                Deactivate
                              </button>
                            )}
                            
                            <button
                              onClick={() => resetPassword(user.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                              title="Reset password"
                            >
                              Reset PW
                            </button>
                            
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                              title="Delete user permanently"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Email Submissions Tab */}
        {activeTab === 'emails' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-semibold text-white mb-6">Email Submissions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Submitted</th>
                    <th className="text-left py-3 px-4">Email Sent</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emailSubmissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-white/10">
                      <td className="py-3 px-4">{submission.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          submission.status === 'approved' 
                            ? 'bg-green-600 text-white'
                            : submission.status === 'rejected'
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-600 text-white'
                        }`}>
                          {submission.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(submission.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {submission.email_sent_at 
                          ? new Date(submission.email_sent_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Not sent'
                        }
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <select
                            value={submission.status}
                            onChange={(e) => updateEmailStatus(submission.id, e.target.value as 'pending' | 'approved' | 'rejected')}
                            className="bg-white/20 text-white border border-white/30 rounded px-2 py-1 text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          {submission.status === 'pending' && (
                            <button
                              onClick={() => grantAccess(submission.email)}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                            >
                              Grant Access
                            </button>
                          )}
                          <button
                            onClick={() => deleteEmailSubmission(submission.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                            title="Delete email submission"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 