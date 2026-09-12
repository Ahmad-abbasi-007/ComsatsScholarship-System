'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  Award, 
  UserCheck, 
  UserX, 
  Mail,
  ArrowLeft,
  Filter,
  ChevronDown
} from 'lucide-react';



interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export default function StudentNotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [studentRegNo, setStudentRegNo] = useState('');

  useEffect(() => {
    const regNo = localStorage.getItem('studentRegno');
    if (!regNo) {
      router.push('/student/login');
      return;
    }
    setStudentRegNo(regNo);
    fetchNotifications(regNo);
  }, []);

  const fetchNotifications = async (regNo: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/notifications?userId=${regNo}&userType=student&limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) ? { ...n, is_read: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true, userId: studentRegNo, userType: 'student' })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!confirm('Delete this notification?')) return;
    
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllRead = async () => {
    const readIds = notifications.filter(n => n.is_read).map(n => n.id);
    if (readIds.length === 0) return;
    
    if (!confirm(`Delete ${readIds.length} read notifications?`)) return;
    
    try {
      await Promise.all(readIds.map(id => 
        fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      ));
      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application_approved':
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case 'application_rejected':
        return <UserX className="w-5 h-5 text-red-500" />;
      case 'application_submitted':
        return <Mail className="w-5 h-5 text-blue-500" />;
      case 'merit_selected':
        return <Award className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">Stay updated with your scholarship journey</p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {unreadCount} unread • {notifications.length} total
              </span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
                >
                  <CheckCheck size={16} />
                  Mark all read
                </button>
              )}
              {notifications.some(n => n.is_read) && (
                <button
                  onClick={deleteAllRead}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm whitespace-nowrap"
                >
                  <Trash2 size={16} />
                  Clear read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-pulse">Loading notifications...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Bell size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "You don't have any notifications yet" 
                : filter === 'unread' 
                ? "You've read all notifications" 
                : "No read notifications"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-sm p-4 transition-all hover:shadow-md ${
                  !notification.is_read ? 'border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className={`text-base ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {formatDate(notification.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead([notification.id])}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <CheckCheck size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}