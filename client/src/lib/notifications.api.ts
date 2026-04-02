import api from '@/lib/api';
import { buildQueryString } from '@/lib/queryParams';
import type { Notification } from '@/types/notifications';

export async function listNotificationsApi(
  householdId: string,
  params?: { page?: number; limit?: number; unreadOnly?: boolean }
): Promise<{ notifications: Notification[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const qs = buildQueryString({
    page: params?.page,
    limit: params?.limit,
    unreadOnly: params?.unreadOnly || undefined,
  });
  const res = await api.get(`/households/${householdId}/tasks/notifications${qs}`);
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
