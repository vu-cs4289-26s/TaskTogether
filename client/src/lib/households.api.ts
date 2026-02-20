import api from '@/lib/api';
import type { Household } from '@/types/households';

export async function listHouseholdsApi(): Promise<Household[]> {
  const res = await api.get('/households');
  return res.data;
}

export async function getHouseholdApi(id: string): Promise<Household> {
  const res = await api.get(`/households/${id}`);
  return res.data;
}

export async function createHouseholdApi(input: { name: string }): Promise<Household> {
  const res = await api.post('/households', input);
  return res.data;
}