import api from './api';
import type { WikiSection } from '@/types/wiki';

export async function listWikiSectionsApi(householdId: string): Promise<WikiSection[]> {
  const res = await api.get(`/households/${householdId}/wiki`);
  return res.data.data;
}

export async function updateWikiSectionApi(
  householdId: string,
  slug: string,
  data: { content: string }
): Promise<WikiSection> {
  const res = await api.put(`/households/${householdId}/wiki/${slug}`, data);
  return res.data.data;
}

export async function createWikiSectionApi(
  householdId: string,
  data: { title: string; slug?: string }
): Promise<WikiSection> {
  const res = await api.post(`/households/${householdId}/wiki`, data);
  return res.data.data;
}

export async function renameWikiSectionApi(
  householdId: string,
  slug: string,
  data: { title?: string; slug?: string }
): Promise<WikiSection> {
  const res = await api.patch(`/households/${householdId}/wiki/${slug}`, data);
  return res.data.data;
}

export async function deleteWikiSectionApi(
  householdId: string,
  slug: string
): Promise<void> {
  await api.delete(`/households/${householdId}/wiki/${slug}`);
}

export async function reorderWikiSectionsApi(
  householdId: string,
  order: string[]
): Promise<WikiSection[]> {
  const res = await api.patch(`/households/${householdId}/wiki/reorder`, { order });
  return res.data.data;
}
