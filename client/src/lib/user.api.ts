import api from '@/lib/api';
import type { User } from '@/types/user';

export async function getCurrentUserApi(): Promise<User> {
  const res = await api.get('/users/me');
  return res.data.data;
}

export async function updateProfileApi(data: {
  name?: string;
  avatar?: string | null;
}): Promise<User> {
  const res = await api.patch('/users/me', data);
  return res.data.data;
}