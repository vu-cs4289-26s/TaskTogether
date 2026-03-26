import api from '@/lib/api';
import type { Notification } from '@/types/notifications';

export async function listNotificationsApi(
  householdId: string,
  params?: { page?: number; limit?: number; unreadOnly?: boolean }
): Promise<{ notifications: Notification[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.unreadOnly) query.set('unreadOnly', 'true');
  const qs = query.toString();
  const res = await api.get(`/households/${householdId}/tasks/notifications${qs ? `?${qs}` : ''}`);
  return { notifications: res.data.data, meta: res.data.meta };
}

export async function markNotificationReadApi(
  householdId: string,
  notificationId: string
): Promise<Notification> {
  const res = await api.put(`/households/${householdId}/tasks/notifications/${notificationId}/read`);
  return res.data.data;
}

export async function markAllNotificationsReadApi(
  householdId: string
): Promise<{ count: number }> {
  const res = await api.put(`/households/${householdId}/tasks/notifications/read-all`);
  return res.data.data;
}
