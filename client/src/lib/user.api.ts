import api from '@/lib/api';
import type { User } from '@/types/user';

export async function getCurrentUserApi(): Promise<User> {
  const res = await api.get('/users/me');
  return res.data.data;
}

export async function updateUserPreferencesApi(
  preferences: { timezone?: string | null; timezoneAuto?: boolean }
): Promise<User> {
  const res = await api.put('/users/me/preferences', preferences);
  return res.data.data;
}