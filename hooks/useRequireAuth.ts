'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Not logged in - redirect to login
      router.push('/login');
    }
  }, [user, loading, router]);

  return { user, loading, isAuthenticated: !!user };
}