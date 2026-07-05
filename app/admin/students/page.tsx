'use client'
import { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { StudentTable } from '@/components/admin/students/StudentTable'
import { StudentFilters } from '@/components/admin/students/StudentFilters'
import { useAuth } from '@/app/contexts/AuthContext' // ✅ ADD THIS
import { createAuditLog } from '@/lib/audit' // ✅ ADD THIS

interface Student {
  id: string
  name: string
  regno: string
  department: string
  level: 'undergraduate' | 'graduate'
  session: string
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  cgpa?: number
  registrationDate: string
  avatar?: string
  email?: string
}

export default function StudentsPage() {
  const { user } = useAuth() // ✅ ADD THIS
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/students')

      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
        setFilteredStudents(data.students || [])
      } else {
        setStudents([])
        setFilteredStudents([])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
      setFilteredStudents([])
    } finally {
      setLoading(false)
    }
  }

  // Deactivate Student
  const handleDeactivateStudent = async (student: Student) => {
    toast.dismiss()
    toast(
      (t) => (
        <div className="text-center">
          <p className="font-semibold text-gray-800 mb-2">Deactivate Student?</p>
          <p className="text-sm text-gray-600 mb-1">{student.name}</p>
          <p className="text-xs text-gray-500 mb-3">({student.regno})</p>
          <p className="text-xs text-gray-500 mb-4">Student will not be able to login.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                confirmDeactivate(student)
              }}
              className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 min-w-[80px]"
            >
              Deactivate
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

  const confirmDeactivate = async (student: Student) => {
    try {
      const response = await fetch('/api/admin/students/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, is_active: false })
      })

      if (response.ok) {
        // ✅ AUDIT LOG: Student Deactivated
        await createAuditLog({
          adminId: user?.id || '',
          adminName: user?.name || 'Unknown',
          adminEmail: user?.email || '',
          adminRole: user?.role || 'reviewer',
          action: 'DEACTIVATE',
          entityType: 'STUDENT',
          entityId: parseInt(student.id),
          entityName: student.name,
          changes: `Deactivated student: ${student.name} (${student.regno})`,
          // ipAddress: '0.0.0.0',
          userAgent: navigator.userAgent
        })

        toast.dismiss()
        toast.success(`${student.name} deactivated`, {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '10px 16px',
          },
        })
        fetchStudents()
      } else {
        const error = await response.json()
        toast.error(`Failed: ${error.error}`, {
          duration: 3000,
          position: 'top-center',
        })
      }
    } catch (error) {
      toast.error('Failed to deactivate student', {
        duration: 3000,
        position: 'top-center',
      })
    }
  }

  // Activate Student
  const handleActivateStudent = async (student: Student) => {
    toast.dismiss()
    toast(
      (t) => (
        <div className="text-center">
          <p className="font-semibold text-gray-800 mb-2">Activate Student?</p>
          <p className="text-sm text-gray-600 mb-1">{student.name}</p>
          <p className="text-xs text-gray-500 mb-3">({student.regno})</p>
          <p className="text-xs text-gray-500 mb-4">Student will be able to login again.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                confirmActivate(student)
              }}
              className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 min-w-[80px]"
            >
              Activate
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

  const confirmActivate = async (student: Student) => {
    try {
      const response = await fetch('/api/admin/students/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, is_active: true })
      })

      if (response.ok) {
        // ✅ AUDIT LOG: Student Activated
await createAuditLog({
  adminId: user?.id || '',
  adminName: user?.name || 'Unknown',
  adminEmail: user?.email || '',
  adminRole: user?.role || 'reviewer',
  action: 'DEACTIVATE',
  entityType: 'STUDENT',
  entityId: parseInt(student.id),
  entityName: student.name,
  changes: `Deactivated student: ${student.name} (${student.regno})`,
  userAgent: navigator.userAgent
})

        toast.dismiss()
        toast.success(`${student.name} activated`, {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#dcfce7',
            color: '#166534',
            borderRadius: '8px',
            padding: '10px 16px',
          },
        })
        fetchStudents()
      } else {
        const error = await response.json()
        toast.error(`Failed: ${error.error}`, {
          duration: 3000,
          position: 'top-center',
        })
      }
    } catch (error) {
      toast.error('Failed to activate student', {
        duration: 3000,
        position: 'top-center',
      })
    }
  }

  // Delete Student
  const handleDeleteStudent = async (student: Student) => {
    toast.dismiss()
    toast(
      (t) => (
        <div className="text-center">
          <p className="font-bold text-red-600 mb-2">Delete Student?</p>
          <p className="text-sm text-gray-600 mb-1">{student.name}</p>
          <p className="text-xs text-gray-500 mb-3">({student.regno})</p>
          <p className="text-xs text-red-500 font-semibold mb-2">This action cannot be undone!</p>
          <p className="text-xs text-gray-500 mb-4">All student data will be permanently deleted.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                confirmDelete(student)
              }}
              className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 min-w-[100px]"
            >
              Delete
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
        duration: 8000,
        position: 'top-center',
        style: {
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          maxWidth: '340px',
        },
      }
    )
  }

  const confirmDelete = async (student: Student) => {
    try {
      const response = await fetch(`/api/admin/students/delete?id=${student.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // ✅ AUDIT LOG: Student Deleted
        await createAuditLog({
          adminId: user?.id || '',
          adminName: user?.name || 'Unknown',
          adminEmail: user?.email || '',
          adminRole: user?.role || 'reviewer',
          action: 'DELETE',
          entityType: 'STUDENT',
          entityId: parseInt(student.id),
          entityName: student.name,
          changes: `Deleted student: ${student.name} (${student.regno})`,
          // ipAddress: '0.0.0.0',
          userAgent: navigator.userAgent
        })

        toast.dismiss()
        toast.success(`${student.name} deleted`, {
          duration: 4000,
          position: 'top-center',
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '10px 16px',
          },
        })
        fetchStudents()
      } else {
        const error = await response.json()
        toast.error(`Failed: ${error.error}`, {
          duration: 3000,
          position: 'top-center',
        })
      }
    } catch (error) {
      toast.error('Failed to delete student', {
        duration: 3000,
        position: 'top-center',
      })
    }
  }

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student)
    setShowViewModal(true)
  }

  const handleEditStudent = (student: Student) => {
    setEditingStudent({ ...student })
    setShowEditModal(true)
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent) return

    setUpdating(true)
    try {
      const response = await fetch('/api/admin/students/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStudent.id,
          name: editingStudent.name,
          email: editingStudent.email
        })
      })

      if (response.ok) {
        // ✅ AUDIT LOG: Student Updated
        await createAuditLog({
          adminId: user?.id || '',
          adminName: user?.name || 'Unknown',
          adminEmail: user?.email || '',
          adminRole: user?.role || 'reviewer',
          action: 'UPDATE',
          entityType: 'STUDENT',
          entityId: parseInt(editingStudent.id),
          entityName: editingStudent.name,
          changes: `Updated student: ${editingStudent.name} (${editingStudent.regno})`,
          // ipAddress: '0.0.0.0',
          userAgent: navigator.userAgent
        })

        toast.dismiss()
        toast.success('Student updated', {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#dcfce7',
            color: '#166534',
            borderRadius: '8px',
            padding: '10px 16px',
          },
        })
        setShowEditModal(false)
        fetchStudents()
      } else {
        const error = await response.json()
        toast.error(`Failed: ${error.error}`, {
          duration: 3000,
          position: 'top-center',
        })
      }
    } catch (error) {
      toast.error('Failed to update student', {
        duration: 3000,
        position: 'top-center',
      })
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const getInitials = (name: string) => {
    if (!name) return 'S'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
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

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
        <p className="text-gray-600 mt-2">Manage and view all registered students</p>
      </div>

      <StudentFilters
        students={students}
        onFilteredStudents={setFilteredStudents}
        loading={loading}
      />
      
      <StudentTable
        students={filteredStudents}
        loading={loading}
        onViewStudent={handleViewStudent}
        onEditStudent={handleEditStudent}
        onDeactivateStudent={handleDeactivateStudent}
        onActivateStudent={handleActivateStudent}
        onDeleteStudent={handleDeleteStudent}
      />

      {/* VIEW STUDENT MODAL */}
      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Student Profile</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="flex justify-center mb-4">
                {selectedStudent.avatar ? (
                  <img
                    src={selectedStudent.avatar}
                    alt={selectedStudent.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-200"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      {getInitials(selectedStudent.name)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-base font-semibold text-gray-900">{selectedStudent.name}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Registration Number</p>
                  <p className="text-base font-mono text-gray-900">{selectedStudent.regno}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-base text-gray-900">{selectedStudent.email || 'Not provided'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Level</p>
                  <p className="text-base capitalize text-gray-900">{selectedStudent.level}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Status</p>
                  <p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${selectedStudent.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedStudent.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {selectedStudent.status}
                    </span>
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Registration Date</p>
                  <p className="text-base text-gray-900">
                    {selectedStudent.registrationDate ? new Date(selectedStudent.registrationDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    handleEditStudent(selectedStudent)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Edit Student</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                  <input
                    type="text"
                    value={editingStudent.regno}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    disabled
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingStudent.email || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="student@example.com"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStudent}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}