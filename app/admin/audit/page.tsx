'use client'
import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Clock, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Eye,
  X
} from 'lucide-react'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import toast, { Toaster } from 'react-hot-toast'
import { createAuditLog } from '@/lib/audit'

interface AuditLog {
  id: number
  admin_name: string
  admin_email: string
  admin_role: string
  action: string
  entity_type: string
  entity_name: string
  changes: string
  old_data: any
  new_data: any
  status: string
  created_at: string
  // ❌ REMOVED: ip_address: string
}

export default function AuditLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterEntity, setFilterEntity] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const itemsPerPage = 20

  // Only Super Admin can view audit logs
  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">Only Super Admins can view audit logs.</p>
        </div>
      </div>
    )
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

      // Apply filters
      if (search) {
        query = query.or(`admin_name.ilike.%${search}%,admin_email.ilike.%${search}%,entity_name.ilike.%${search}%`)
      }
      if (filterAction !== 'all') {
        query = query.eq('action', filterAction)
      }
      if (filterEntity !== 'all') {
        query = query.eq('entity_type', filterEntity)
      }
      if (filterRole !== 'all') {
        query = query.eq('admin_role', filterRole)
      }

      const { data, error, count } = await query

      if (error) throw error

      setLogs(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [currentPage, search, filterAction, filterEntity, filterRole])

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      ACTIVATE: 'bg-emerald-100 text-emerald-800',
      DEACTIVATE: 'bg-orange-100 text-orange-800',
      APPROVE: 'bg-green-100 text-green-800',
      REJECT: 'bg-red-100 text-red-800',
      RESOLVE: 'bg-purple-100 text-purple-800',
      VIEW: 'bg-gray-100 text-gray-800',
    }
    return styles[action] || 'bg-gray-100 text-gray-800'
  }

  const getEntityBadge = (entity: string) => {
    const styles: Record<string, string> = {
      STUDENT: 'bg-blue-100 text-blue-800',
      SCHOLARSHIP: 'bg-purple-100 text-purple-800',
      APPLICATION: 'bg-amber-100 text-amber-800',
      MERIT_LIST: 'bg-green-100 text-green-800',
      DISPUTE: 'bg-red-100 text-red-800',
      USER: 'bg-gray-100 text-gray-800',
    }
    return styles[entity] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const exportCSV = () => {
    const headers = ['User', 'Email', 'Role', 'Action', 'Entity', 'Entity Name', 'Changes', 'Status', 'Time']
    const rows = logs.map(log => [
      log.admin_name,
      log.admin_email,
      log.admin_role,
      log.action,
      log.entity_type,
      log.entity_name || '',
      log.changes || '',
      log.status,
      formatDate(log.created_at)
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {logs.length} records
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Track all reviewer and admin activities</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="ACTIVATE">Activate</option>
            <option value="DEACTIVATE">Deactivate</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
            <option value="RESOLVE">Resolve</option>
          </select>

          <select
            value={filterEntity}
            onChange={(e) => {
              setFilterEntity(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Entities</option>
            <option value="STUDENT">Student</option>
            <option value="SCHOLARSHIP">Scholarship</option>
            <option value="APPLICATION">Application</option>
            <option value="MERIT_LIST">Merit List</option>
            <option value="DISPUTE">Dispute</option>
            <option value="USER">User</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value)
              setCurrentPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="reviewer">Reviewer</option>
          </select>

          <button
            onClick={() => {
              setSearch('')
              setFilterAction('all')
              setFilterEntity('all')
              setFilterRole('all')
              setCurrentPage(1)
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                    <p className="text-gray-500">No audit logs match your filters.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.admin_name}</div>
                        <div className="text-xs text-gray-500">{log.admin_email}</div>
                        <span className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          log.admin_role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {log.admin_role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityBadge(log.entity_type)}`}>
                        {log.entity_type}
                      </span>
                      {log.entity_name && (
                        <div className="text-xs text-gray-500 mt-1">{log.entity_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600 max-w-xs truncate" title={log.changes}>
                        {log.changes || 'No changes'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-600">{formatDate(log.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedLog(log)
                          setShowDetailModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal - IP Address Removed */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Audit Log Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">User</p>
                  <p className="text-sm font-medium text-gray-900">{selectedLog.admin_name}</p>
                  <p className="text-xs text-gray-500">{selectedLog.admin_email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${
                    selectedLog.admin_role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedLog.admin_role}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Action</p>
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${getActionBadge(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Entity</p>
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${getEntityBadge(selectedLog.entity_type)}`}>
                    {selectedLog.entity_type}
                  </span>
                  {selectedLog.entity_name && (
                    <p className="text-sm text-gray-700 mt-1">{selectedLog.entity_name}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Changes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1">{selectedLog.changes || 'No changes'}</p>
                </div>
                {selectedLog.old_data && (
                  <div className="col-span-1">
                    <p className="text-xs text-gray-500">Old Data</p>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.new_data && (
                  <div className="col-span-1">
                    <p className="text-xs text-gray-500">New Data</p>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${
                    selectedLog.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedLog.status}
                  </span>
                </div>
                {/* ✅ IP ADDRESS REMOVED */}
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-sm text-gray-700">{formatDate(selectedLog.created_at)}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}