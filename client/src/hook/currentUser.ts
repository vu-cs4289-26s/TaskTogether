'use client';

import { useAuth } from '@/contexts/AuthContext';
 
export function useCurrentUser() {
  const { user, loading } = useAuth();
  return {
    user,
    loading,
    error: !loading && !user ? 'Not logged in' : null,
    setUser: () => {},  // no-op, auth context manages state
  };
}