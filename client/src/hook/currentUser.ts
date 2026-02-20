'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/types/user';
import { getCurrentUser } from '@/lib/user';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const u = await getCurrentUser();
        if (!cancelled) setUser(u);
      } catch (e) {
        if (!cancelled) setError('Could not load your profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, error, setUser };
}