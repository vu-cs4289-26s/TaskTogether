import type { User } from '@/types/user';

type ApiUser = {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  createdAt?: string;
};

export async function getCurrentUserApi(): Promise<User> {
  const res = await fetch('/api/me', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error('Failed to load user profile');
  }

  const data = (await res.json()) as ApiUser;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    username: data.username,
    phone: data.phone,
    createdAt: data.createdAt,
  };
}