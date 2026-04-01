import api from '@/lib/api';
import type { Household } from '@/types/households';

export async function listHouseholdsApi(): Promise<Household[]> {
  const res = await api.get('/households');
  return res.data.data;
}

export async function getHouseholdApi(id: string): Promise<Household> {
  const res = await api.get(`/households/${id}`);
  return res.data.data;
}

export async function createHouseholdApi(input: { name: string }): Promise<Household> {
  const res = await api.post('/households', input);
  return res.data.data;
}

export async function updateHouseholdApi(id: string, input: { name: string }): Promise<Household> {
  const res = await api.put(`/households/${id}`, input);
  return res.data.data;
}

export async function deleteHouseholdApi(id: string): Promise<void> {
  await api.delete(`/households/${id}`);
}

export async function createInviteApi(householdId: string): Promise<{ code: string; expiresAt: string }> {
  const res = await api.post(`/households/${householdId}/invites`);
  return res.data.data;
}

export async function joinHouseholdApi(code: string): Promise<Household> {
  const res = await api.post(`/households/join/${code}`);
  return res.data.data;
}

export async function getActiveInviteApi(householdId: string): Promise<{ code: string; expiresAt: string } | null> {
  const res = await api.get(`/households/${householdId}/invites/active`);
  return res.data.data;
}

export async function expireInviteApi(householdId: string): Promise<void> {
  await api.delete(`/households/${householdId}/invites/active`);
}

export async function sendEmailInviteApi(householdId: string, email: string): Promise<{ email: string; sent: boolean }> {
  const res = await api.post(`/households/${householdId}/invites/email`, { email });
  return res.data.data;
}

export async function listMembersApi(
  householdId: string
): Promise<Array<{ id: string; name: string; email: string; avatar: string | null; role: string; joinedAt: string }>> {
  const res = await api.get(`/households/${householdId}/members`);
  return res.data.data;
}

export async function removeMemberApi(householdId: string, userId: string): Promise<void> {
  await api.delete(`/households/${householdId}/members/${userId}`);
}

export async function promoteMemberApi(householdId: string, userId: string): Promise<void> {
  await api.put(`/households/${householdId}/members/${userId}/role`, { role: 'ADMIN' });
}
