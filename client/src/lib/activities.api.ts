import api from '@/lib/api';
import type {
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
  ActivityCheckIn,
  CheckInInput,
} from '@/types/activities';
import type { PaginationMeta } from '@/types/households';

export async function listActivitiesApi(
  householdId: string,
  params?: { page?: number; limit?: number; status?: string; activityType?: string }
): Promise<{ activities: Activity[]; meta: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  if (params?.activityType) query.set('activityType', params.activityType);

  const qs = query.toString();
  const res = await api.get(`/households/${householdId}/activities${qs ? `?${qs}` : ''}`);
  return { activities: res.data.data, meta: res.data.meta };
}

export async function getActivityApi(householdId: string, activityId: string): Promise<Activity> {
  const res = await api.get(`/households/${householdId}/activities/${activityId}`);
  return res.data.data;
}

export async function createActivityApi(
  householdId: string,
  input: CreateActivityInput
): Promise<Activity> {
  const res = await api.post(`/households/${householdId}/activities`, input);
  return res.data.data;
}

export async function updateActivityApi(
  householdId: string,
  activityId: string,
  input: UpdateActivityInput
): Promise<Activity> {
  const res = await api.put(`/households/${householdId}/activities/${activityId}`, input);
  return res.data.data;
}

export async function deleteActivityApi(householdId: string, activityId: string): Promise<void> {
  await api.delete(`/households/${householdId}/activities/${activityId}`);
}

export async function joinActivityApi(householdId: string, activityId: string): Promise<Activity> {
  const res = await api.post(`/households/${householdId}/activities/${activityId}/join`);
  return res.data.data;
}

export async function leaveActivityApi(householdId: string, activityId: string): Promise<Activity> {
  const res = await api.post(`/households/${householdId}/activities/${activityId}/leave`);
  return res.data.data;
}

export async function checkInActivityApi(
  householdId: string,
  activityId: string,
  input?: CheckInInput
): Promise<ActivityCheckIn> {
  const res = await api.post(
    `/households/${householdId}/activities/${activityId}/check-in`,
    input ?? {}
  );
  return res.data.data;
}
