'use client'

import { useState, useEffect } from 'react'
import {
    DollarSign,
    CheckCircle,
    Clock,
    TrendingUp,
    Award,
    Users,
    RefreshCw,
    Eye,
    Shield
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { hasAccess } from '@/lib/roleCheck'
import toast, { Toaster } from 'react-hot-toast'

export default function BudgetOverviewPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [loadingData, setLoadingData] = useState(true)
    const [stats, setStats] = useState<any>(null)
    const [scholarships, setScholarships] = useState<any[]>([])
    const [selectedScholarship, setSelectedScholarship] = useState<any>(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)

    const pathname = '/admin/budget/overview'

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
            fetchBudgetData()
        } else {
            setLoadingData(false)
        }
    }, [user])

    const fetchBudgetData = async () => {
        try {
            setLoadingData(true)
            const response = await fetch('/api/admin/budget/overview')
            const data = await response.json()
            setStats(data.stats)
            setScholarships(data.scholarships || [])
        } catch (error) {
            console.error('Error fetching budget data:', error)
            toast.error('Failed to load budget data')
        } finally {
            setLoadingData(false)
        }
    }

    const handleViewDetails = (scholarship: any) => {
        setSelectedScholarship(scholarship)
        setShowDetailsModal(true)
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
                <p className="mt-4 text-gray-500">Loading budget data...</p>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <Toaster position="top-center" />

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Budget Overview</h1>
                    <p className="text-gray-500 text-sm mt-1">Complete budget summary and analytics</p>
                </div>
                <button
                    onClick={fetchBudgetData}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Budget</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        Rs. {stats.totalBudget?.toLocaleString() || 0}
                                    </p>
                                </div>
                                <DollarSign className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Approved</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        Rs. {stats.approvedBudget?.toLocaleString() || 0}
                                    </p>
                                </div>
                                <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600">
                                        Rs. {stats.pendingBudget?.toLocaleString() || 0}
                                    </p>
                                </div>
                                <Clock className="w-6 h-6 text-yellow-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Remaining</p>
                                    <p className="text-2xl font-bold text-purple-600">
                                        Rs. {stats.remainingBudget?.toLocaleString() || 0}
                                    </p>
                                </div>
                                <TrendingUp className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Budget Utilization</span>
                            <span className="text-sm font-medium text-gray-900">
                                {stats.totalBudget > 0
                                    ? Math.round((stats.approvedBudget / stats.totalBudget) * 100)
                                    : 0}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                style={{
                                    width: `${stats.totalBudget > 0 ? Math.min((stats.approvedBudget / stats.totalBudget) * 100, 100) : 0}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-4 text-center">
                            <p className="text-sm text-gray-500">Total Scholarships</p>
                            <p className="text-2xl font-bold">{stats.totalScholarships || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4 text-center">
                            <p className="text-sm text-gray-500">Total Students</p>
                            <p className="text-2xl font-bold">{stats.totalStudents || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4 text-center">
                            <p className="text-sm text-gray-500">Approved</p>
                            <p className="text-2xl font-bold text-green-600">{stats.approvedCount || 0}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-4 text-center">
                            <p className="text-sm text-gray-500">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.pendingCount || 0}</p>
                        </div>
                    </div>

                    {/* Scholarship-wise Breakdown */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Scholarship-wise Breakdown</h3>
                            <span className="text-sm text-gray-500">{scholarships.length} scholarships</span>
                        </div>
                        <div className="overflow-x-auto">
                            {scholarships.length === 0 ? (
                                <div className="text-center py-12">
                                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No scholarship data available</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-blue-600 text-white">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Scholarship</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Mode</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Students</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Required</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Approved</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Used</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider rounded-tr-lg">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {scholarships.map((sch: any) => {
                                            const displayRequired = sch.budget_required || 0
                                            const displayApproved = sch.budget_allocated || 0
                                            const percentage = sch.budget_status === 'approved' && displayRequired > 0
                                                ? Math.round((displayApproved / displayRequired) * 100)
                                                : 0

                                            return (
                                                <tr key={sch.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Award className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm font-medium text-gray-900">{sch.title}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className="text-sm capitalize text-gray-600">{sch.scholarship_mode}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                                                        {sch.selected_count || 0}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-blue-600">
                                                        Rs. {displayRequired.toLocaleString() || 0}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-green-600">
                                                        Rs. {displayApproved.toLocaleString() || 0}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(sch.budget_status)}`}>
                                                            {sch.budget_status || 'pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                                <div
                                                                    className={`h-1.5 rounded-full ${percentage >= 100 ? 'bg-green-500' : percentage > 0 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                                                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500">{percentage}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <button
                                                            onClick={() => handleViewDetails(sch)}
                                                            className="text-blue-600 hover:text-blue-800 text-sm"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* View Details Modal */}
            {showDetailsModal && selectedScholarship && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Budget Details</h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
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
                                        {selectedScholarship.budget_status || 'pending'}
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500">Total Required</p>
                                    <p className="text-lg font-bold text-blue-600">
                                        Rs. {selectedScholarship.budget_required?.toLocaleString() || 0}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500">Approved Budget</p>
                                    <p className="text-lg font-bold text-green-600">
                                        Rs. {selectedScholarship.budget_allocated?.toLocaleString() || 0}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500">Selected Students</p>
                                    <p className="text-lg font-bold">{selectedScholarship.selected_count || 0}</p>
                                </div>
                            </div>

                            {selectedScholarship.scholarship_mode === 'tiered' && selectedScholarship.tiers && selectedScholarship.tiers.length > 0 && (
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
                                onClick={() => setShowDetailsModal(false)}
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