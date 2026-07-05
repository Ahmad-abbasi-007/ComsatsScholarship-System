'use client'
import { Bell, User, Settings, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../app/contexts/AuthContext'
import NotificationBell from '@/components/NotificationBell';
import Link from 'next/link'

export function AdminHeader() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()
  const { logout, user } = useAuth()

  const handleSignOut = () => {
    logout();
    router.push('/admin/login')
  }

  const getAdminId = () => {
    return localStorage.getItem('adminId') || '97bca663-9121-48c4-82c7-b76a03c25ec6';
  };

  return (
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-6 py-4">
      <div className="flex items-center justify-end">

        <div className="flex items-center gap-4">

          <div className="flex items-center gap-4">
            <NotificationBell userId={getAdminId()} userType="admin" />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-800 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.name || 'Administrator'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 backdrop-blur-sm">
                <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50 rounded-t-xl">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.name || 'Administrator'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200"
                  >
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 rounded-b-xl"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}