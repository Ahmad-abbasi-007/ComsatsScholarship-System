'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Users, 
  Award,
  RefreshCw,
  Edit,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { hasAccess } from '@/lib/roleCheck'
import toast, { Toaster } from 'react-hot-toast'

export default function BudgetApprovalsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [loadingData, setLoadingData] = useState(true)
  const [scholarships, setScholarships] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [selectedScholarship, setSelectedScholarship] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const pathname = '/admin/budget/approvals'

  // ✅ Role-based access check
  useEffect(() => {
    if (!loading) {
      const role = user?.role || 'viewer'
      if (!hasAccess(pathname, role)) {
        router.push('/admin/dashboard')
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    if (hasAccess(pathname, user?.role || 'viewer')) {
      fetchScholarships()
    } else {
      setLoadingData(false)
    }
  }, [filter, user])

  const fetchScholarships = async () => {
    try {
      setLoadingData(true)
      const response = await fetch(`/api/admin/budget/approvals?status=${filter}`)
      const data = await response.json()
      setScholarships(data.scholarships || [])
    } catch (error) {
      console.error('Error fetching scholarships:', error)
      toast.error('Failed to load budget approvals')
    } finally {
      setLoadingData(false)
    }
  }

  const handleApprove = (id: string, title: string) => {
    toast.dismiss()
    toast(
      (t) => (
        <div className="text-center">
          <p className="font-semibold text-gray-800 mb-2">Approve Budget?</p>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-xs text-gray-500 mb-4">Students will be awarded and notified.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                confirmApprove(id)
              }}
              className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 min-w-[80px]"
            >
              Approve
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 min-w-[80px]"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 6000,
        position: 'top-center',
        style: {
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          maxWidth: '320px',
        },
      }
    )
  }

  const confirmApprove = async (id: string) => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/admin/budget/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.dismiss()
        toast.success('Budget approved! Students have been awarded.', {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#dcfce7',
            color: '#166534',
            borderRadius: '8px',
            padding: '10px 16px',
          },
        })
        fetchScholarships()
      } else {
        toast.error(data.error || 'Failed to approve budget', {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '10px 16px',
          },
        })
      }
    } catch (error) {
      toast.error('Error approving budget', {
        duration: 3000,
        position: 'top-center',
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          padding: '10px 16px',
        },
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleViewDetails = (scholarship: any) => {
    setSelectedScholarship(scholarship)
    setShowModal(true)
  }

  const getStatusBadge = (status: string) => {
    const styles: any = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      adjusted: 'bg-blue-100 text-blue-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
  ]

  // ✅ Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // ✅ Check access using roleCheck
  const role = user?.role || 'viewer'
  if (!hasAccess(pathname, role)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loadingData) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading budget approvals...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '14px',
          },
        }}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Approvals</h1>
          <p className="text-gray-500 text-sm mt-1">Review and approve scholarship budgets</p>
        </div>
        <button
          onClick={fetchScholarships}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === option.value
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      {!loadingData && scholarships.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Required</p>
                <p className="text-2xl font-bold mt-1">
                  Rs. {scholarships.reduce((sum, s) => sum + (s.budget_required || 0), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold mt-1">
                  {scholarships.reduce((sum, s) => sum + (s.selected_count || 0), 0)}
                </p>
              </div>
              <Users className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Scholarships</p>
                <p className="text-2xl font-bold mt-1">{scholarships.length}</p>
              </div>
              <Award className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* No Data */}
      {!loadingData && scholarships.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No {filter} budget approvals found</p>
        </div>
      )}

      {/* Scholarship Cards */}
      {!loadingData && scholarships.length > 0 && (
        <div className="space-y-4">
          {scholarships.map((scholarship) => (
            <div key={scholarship.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{scholarship.title}</h3>
                  <p className="text-sm text-gray-500">
                    {scholarship.scholarship_mode === 'tiered' ? 'Tiered' : 'Single'} Mode
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(scholarship.budget_status)}`}>
                  {scholarship.budget_status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500">Total Required</p>
                  <p className="text-lg font-bold text-blue-600">
                    Rs. {scholarship.budget_allocated?.toLocaleString() || scholarship.budget_required?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Selected Students</p>
                  <p className="text-lg font-bold">{scholarship.selected_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mode</p>
                  <p className="text-lg font-bold capitalize">{scholarship.scholarship_mode}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Applications</p>
                  <p className="text-lg font-bold">{scholarship.total_applications || 0}</p>
                </div>
              </div>

              {/* Tier Breakdown */}
              {scholarship.scholarship_mode === 'tiered' && scholarship.tiers && scholarship.tiers.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-600 mb-2">Tier Breakdown</p>
                  <div className="flex flex-wrap gap-3">
                    {scholarship.tiers.map((tier: any) => (
                      <div key={tier.id} className="text-xs bg-white px-2 py-1 rounded border">
                        {tier.tier_name}: {tier.count || 0} students × Rs. {tier.award_amount_numeric?.toLocaleString() || 0}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {scholarship.budget_status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(scholarship.id, scholarship.title)}
                      disabled={processingId === scholarship.id}
                      className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <Link
                      href={`/admin/scholarships/${scholarship.id}`}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Adjust
                    </Link>
                  </>
                )}
                <button
                  onClick={() => handleViewDetails(scholarship)}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Details Modal */}
      {showModal && selectedScholarship && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Budget Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedScholarship.title}</h3>
                <p className="text-sm text-gray-500">
                  {selectedScholarship.scholarship_mode === 'tiered' ? 'Tiered' : 'Single'} Mode
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block mt-1 ${getStatusBadge(selectedScholarship.budget_status)}`}>
                    {selectedScholarship.budget_status}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Required</p>
                  <p className="text-lg font-bold text-blue-600">
                    Rs. {selectedScholarship.budget_required?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Selected Students</p>
                  <p className="text-lg font-bold">{selectedScholarship.selected_count || 0}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Applications</p>
                  <p className="text-lg font-bold">{selectedScholarship.total_applications || 0}</p>
                </div>
              </div>

              {selectedScholarship.scholarship_mode === 'tiered' && selectedScholarship.tiers && (
                <div>
                  <p className="font-medium text-gray-700 mb-2">Tier Breakdown</p>
                  <div className="space-y-2">
                    {selectedScholarship.tiers.map((tier: any) => (
                      <div key={tier.id} className="flex justify-between bg-gray-50 p-2 rounded">
                        <span>{tier.tier_name}</span>
                        <span>{tier.count || 0} students × Rs. {tier.award_amount_numeric?.toLocaleString() || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}