'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id?: string;
  name: string;
  regno: string;
  token?: string;
  email?: string; 
  type: 'student' | 'admin';
  role?: 'super_admin' | 'admin' | 'reviewer' | 'viewer';
  is_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  loading: boolean;
  isStudent: () => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  hasPermission: (requiredRole: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isStudent = () => {
    return !!localStorage.getItem('studentToken');
  };

  const isAdmin = () => {
    return !!localStorage.getItem('adminToken');
  };

  const isSuperAdmin = () => {
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      const admin = JSON.parse(adminData);
      return admin.role === 'super_admin';
    }
    return false;
  };

  const hasPermission = (requiredRoles: string[]) => {
    if (!user) return false;
    if (user.type !== 'admin') return false;
    return requiredRoles.includes(user.role || '');
  };

  useEffect(() => {
    const checkAuth = () => {
      const studentAuth = isStudent();
      const adminAuth = isAdmin();
      
      if (studentAuth && adminAuth) {
        if (user?.type === 'admin') {
          const admin = JSON.parse(localStorage.getItem('admin')!);
          setUser({
            id: admin.id || 'admin',
            name: admin.name || 'Administrator',
            email: admin.email || '',
            regno: 'admin',
            token: localStorage.getItem('adminToken')!,
            type: 'admin',
            role: admin.role || 'admin',
            is_active: admin.is_active !== undefined ? admin.is_active : true
          });
        } else {
          setUser({
            name: localStorage.getItem('studentName')!,
            regno: localStorage.getItem('studentRegno')!,
            token: localStorage.getItem('studentToken')!,
            type: 'student'
          });
        }
      }
      else if (studentAuth) {
        setUser({
          name: localStorage.getItem('studentName')!,
          regno: localStorage.getItem('studentRegno')!,
          token: localStorage.getItem('studentToken')!,
          type: 'student'
        });
      }
      else if (adminAuth) {
        const admin = JSON.parse(localStorage.getItem('admin')!);
        setUser({
          id: admin.id || 'admin',
          name: admin.name || 'Administrator',
          email: admin.email || '',
          regno: 'admin',
          token: localStorage.getItem('adminToken')!,
          type: 'admin',
          role: admin.role || 'admin',
          is_active: admin.is_active !== undefined ? admin.is_active : true
        });
      }
      else {
        setUser(null);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData: User) => {
    if (userData.regno === 'admin' || userData.type === 'admin') {
      localStorage.setItem('adminToken', userData.token || 'admin-token');
      localStorage.setItem('admin', JSON.stringify({ 
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role || 'admin',
        is_active: userData.is_active !== undefined ? userData.is_active : true
      }));
    } else {
      localStorage.setItem('studentToken', userData.token || 'student-token');
      localStorage.setItem('studentName', userData.name);
      localStorage.setItem('studentRegno', userData.regno);
      localStorage.setItem('studentEmail', userData.email || '');
    }
    setUser({ ...userData, type: userData.regno === 'admin' ? 'admin' : 'student' });
  };

  const logout = () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentName');
    localStorage.removeItem('studentRegno');
    localStorage.removeItem('studentLevel');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    sessionStorage.removeItem('adminAuth');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading,
      isStudent, 
      isAdmin,
      isSuperAdmin,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};