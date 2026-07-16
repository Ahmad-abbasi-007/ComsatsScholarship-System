'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Download, 
  Server,
  RefreshCw,
  Users,
  Lock,
  Save,
  Eye,
  EyeOff,
  Megaphone,
  Send,
  FileText,
  Shield
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminSettingsPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  
  const [systemInfo, setSystemInfo] = useState({
    totalStudents: 0,
    version: '2.0.0',
    framework: 'Next.js 14 + Supabase',
    nodeVersion: '18.17.0',
    database: 'Supabase PostgreSQL'
  });
  
  const { user: admin } = useAuth();

  // ✅ Check if admin exists
  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-red-600">Please login first</p>
        </div>
      </div>
    );
  }

  // ✅ Safe check for super admin
  const isSuperAdmin = admin.role === 'super_admin' || admin.email === 'admin@comsats.edu.pk';

  // ✅ Only Super Admin can access Settings
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Super Admin can access Settings.</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    setRefreshing(true);
    try {
      const studentsCount = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      setSystemInfo(prev => ({
        ...prev,
        totalStudents: studentsCount.count || 0
      }));
    } catch (error) {
      console.error('Error fetching system info:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const exportAllData = async () => {
    setExporting(true);
    try {
      const [studentsRes, scholarshipsRes, applicationsRes, meritListsRes] = await Promise.all([
        fetch('/api/admin/students').then(res => res.json()).catch(() => ({ students: [] })),
        fetch('/api/scholarships').then(res => res.json()).catch(() => ({ scholarships: [] })),
        supabase.from('scholarship_applications').select('*'),
        supabase.from('merit_lists').select('*')
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        exportedBy: 'Admin',
        systemInfo: systemInfo,
        students: studentsRes.students || [],
        scholarships: scholarshipsRes.scholarships || [],
        applications: applicationsRes.data || [],
        meritLists: meritListsRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scholarship_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const adminData = localStorage.getItem('admin');
    const adminObj = adminData ? JSON.parse(adminData) : null;
    const adminId = adminObj?.id || admin?.id;

    if (!adminId) {
      toast.error('Admin not found. Please login again.');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      toast.error('Password must be at least 8 characters, contain uppercase, lowercase, number, and special character');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch('/api/admin/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminId,
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password changed successfully!', {
          duration: 3000,
          position: 'top-center',
          style: { background: '#dcfce7', color: '#166534', borderRadius: '8px', padding: '10px 16px' },
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const sendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      toast.error('Please enter both title and message');
      return;
    }

    setSendingAnnouncement(true);
    try {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('regno');

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        toast.error('No students found');
        setSendingAnnouncement(false);
        return;
      }

      const notifications = students.map(student => ({
        user_id: student.regno,
        user_type: 'student',
        type: 'announcement',
        title: announcementTitle,
        message: announcementMessage,
        data: {
          type: 'admin_announcement',
          sentAt: new Date().toISOString()
        },
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(batch);
        
        if (insertError) throw insertError;
      }

      toast.success(`Announcement sent to ${students.length} students`, {
        duration: 4000,
        position: 'top-center',
        style: { background: '#dcfce7', color: '#166534', borderRadius: '8px', padding: '10px 16px' },
      });

      setAnnouncementTitle('');
      setAnnouncementMessage('');

    } catch (error) {
      console.error('Error sending announcement:', error);
      toast.error('Failed to send announcement');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleRefresh = () => {
    fetchSystemInfo();
    toast.success('System info refreshed');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster position="top-center" />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and system preferences</p>
        </div>

        <div className="space-y-6">
          
          {/* User Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{admin?.name}</p>
                <p className="text-sm text-gray-600">{admin?.email}</p>
                <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  {admin?.role || 'admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label className="text-sm text-gray-600">Show passwords</label>
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Admin Management - Super Admin Only */}
          <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Admin Management</h2>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Super Admin Only</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Manage other administrators and their roles</p>
            <Link
              href="/admin/admins"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Users size={18} />
              Manage Admins
            </Link>
          </div>

          {/* Export & Reports Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Export & Reports</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={exportAllData}
                disabled={exporting}
                className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Download size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Export Database Backup</span>
                </div>
                {exporting ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : null}
              </button>

              <button
                onClick={() => window.open('/admin/reports', '_blank')}
                className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Generate Reports</span>
                </div>
              </button>
            </div>
          </div>
          {/* Send Announcement Card */}
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-900">Send Announcement</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">All Students</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Send a notification to all registered students</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="e.g., Scholarship Deadline Reminder"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Enter your announcement message here..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <button
                type="button"
                onClick={sendAnnouncement}
                disabled={sendingAnnouncement}
                style={{
                  width: '100%',
                  backgroundColor: '#D97706',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B45309'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
              >
                {sendingAnnouncement ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Send Announcement to All Students
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* System Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Version</span>
                  <span className="font-medium">{systemInfo.version}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Framework</span>
                  <span className="font-medium">{systemInfo.framework}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Database</span>
                  <span className="font-medium">{systemInfo.database}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Node Version</span>
                  <span className="font-medium">{systemInfo.nodeVersion}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Total Students</span>
                  <span className="font-bold text-blue-600">{systemInfo.totalStudents}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Environment</span>
                  <span className="font-medium capitalize">{process.env.NODE_ENV || 'production'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>COMSATS University Islamabad - Scholarship Management System v{systemInfo.version}</p>
          <p className="mt-1">© 2026 All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}