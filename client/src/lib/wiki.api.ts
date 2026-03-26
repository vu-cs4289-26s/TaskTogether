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
