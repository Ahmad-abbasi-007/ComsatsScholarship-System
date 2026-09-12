'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, Award, UserCheck, UserX, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';



interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  userId: string;
  userType: 'student' | 'admin';
}

export default function NotificationBell({ userId, userType }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

// Fetch notifications
const fetchNotifications = async () => {
  if (!userId) {
    console.log('❌ [FETCH] No userId provided');
    return;
  }
  
  console.log('🔍 [FETCH] Fetching notifications for user:', userId, 'type:', userType);
  setLoading(true);
  
  try {
    const response = await fetch(`/api/notifications?userId=${userId}&userType=${userType}&limit=10`);
    console.log('🔍 [FETCH] Response status:', response.status);
    
    const data = await response.json();
    console.log('🔍 [FETCH] Response data:', data);
    
    if (data.success) {
      console.log('✅ [FETCH] Notifications received:', data.notifications?.length || 0);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } else {
      console.error('❌ [FETCH] API returned error:', data.error);
    }
  } catch (error) {
    console.error('❌ [FETCH] Error fetching notifications:', error);
  } finally {
    setLoading(false);
  }
};

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  // REAL-TIME SUBSCRIPTION - FIXED VERSION
// REAL-TIME SUBSCRIPTION - FIXED VERSION
useEffect(() => {
  if (!userId) {
    console.log('❌ No userId for real-time');
    return;
  }

  console.log('🔔 Setting up real-time for user:', userId);

  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('✅ New notification:', payload.new);
        const newNotification = payload.new as Notification;
        
        setNotifications(current => [newNotification, ...current].slice(0, 10));
        setUnreadCount(current => current + 1);
        
        toast.success(`🔔 ${newNotification.title}`);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);

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
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
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
        body: JSON.stringify({ markAll: true, userId, userType })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application_approved': return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'application_rejected': return <UserX className="w-4 h-4 text-red-500" />;
      case 'application_submitted': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'merit_selected': return <Award className="w-4 h-4 text-yellow-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

const handleNotificationClick = (notification: Notification) => {
  if (!notification.is_read) {
    markAsRead([notification.id]);
  }
  
  // PRIORITY 1: Merit list notifications go to main merit list page
  if (notification.type === 'merit_generated') {
    if (userType === 'student') {
      router.push('/student/merit-list');  // Goes to the main merit list page
    } else {
      router.push('/admin/merit');  // Goes to admin merit list page
    }
  }
  // PRIORITY 2: New scholarship notifications go to scholarships page
  else if (notification.type === 'new_scholarship' && notification.data?.scholarshipId) {
    if (userType === 'student') {
      router.push('/student/scholarships');
    } else {
      router.push('/admin/scholarships');
    }
  }
  // PRIORITY 3: If there's an applicationId, go to application page
  else if (notification.data?.applicationId) {
    if (userType === 'student') {
      router.push(`/student/applications?id=${notification.data.applicationId}`);
    } else {
      router.push(`/admin/applications/${notification.data.applicationId}`);
    }
  }
  // PRIORITY 4: If there's only scholarshipId, go to merit list (fallback)
  else if (notification.data?.scholarshipId) {
    router.push(userType === 'student' 
      ? `/student/merit-list/${notification.data.scholarshipId}`
      : `/admin/merit/${notification.data.scholarshipId}`
    );
  }
  
  setIsOpen(false);
};

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTime(notification.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t">
            <button
              onClick={() => router.push(userType === 'student' ? '/student/notifications' : '/admin/notifications')}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-1"
            >
              View All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}