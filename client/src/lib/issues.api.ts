import api from '@/lib/api';
import { buildQueryString } from '@/lib/queryParams';
import type {
    Issue,
    CreateIssueInput,
    IssueType,
    IssuePriority,
    UpdateIssueInput,
    IssueComment,
    CreateIssueCommentInput,
} from '@/types/issues';
import type { PaginationMeta } from '@/types/households';

//UI section
type UiIssueType = 'maintenance' | 'conflict' | 'noise' | 'cleanliness' | 'other';
type UiIssuePriority = 'urgent' | 'medium' | 'low';
export type CreateIssueUiInput = {
    title: string;
    type: UiIssueType;
    priority: UiIssuePriority;
    description?: string;
    anonymous?: boolean;
    photoUrls?: string[];
};

//map ui to datasbase
const typeMap: Record<UiIssueType, IssueType> = {
    maintenance: 'MAINTENANCE',
    conflict: 'HOUSEMATE_CONFLICT',
    noise: 'NOISE_COMPLAINT',
    cleanliness: 'CLEANLINESS',
    other: 'OTHER',
};

const priorityMap: Record<UiIssuePriority, IssuePriority> = {
    urgent: 'URGENT',
    medium: 'MEDIUM',
    low: 'LOW',
};

function toCreateIssueInput(input: CreateIssueUiInput): CreateIssueInput {
    return {
        title: input.title.trim(),
        type: typeMap[input.type],
        priority: priorityMap[input.priority],
        description: input.description?.trim() ? input.description.trim() : null,
        photoUrls: input.photoUrls ?? [],
        isAnonymous: Boolean(input.anonymous),
    };
}


// implemented...?
export async function listIssuesApi(
    householdId: string,
    params?: { page?: number; limit?: number; status?: string }
): Promise<{ issues: Issue[]; meta: PaginationMeta }> {
    const qs = buildQueryString({
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
    });
    const res = await api.get(`/households/${householdId}/issues${qs}`);
    return { issues: res.data.data, meta: res.data.meta };
}

// TODO: Implement get single issue by ID
export async function getIssueApi(householdId: string, issueId: string): Promise<Issue> {
    const res = await api.get(`/households/${householdId}/issues/${issueId}`);
    return res.data.data;
}

// Implemented 
export async function createIssueApi(householdId: string, input: CreateIssueUiInput) {
    const payload = toCreateIssueInput(input);
    const res = await api.post(`/households/${householdId}/issues`, payload);
    return res.data.data;
}

// TODO: Implement update issue (reporter or admin)
export async function updateIssueApi(
    householdId: string,
    issueId: string,
    input: UpdateIssueInput
): Promise<Issue> {
    const res = await api.put(`/households/${householdId}/issues/${issueId}`, input);
    return res.data.data;
}

// TODO: Implement delete issue (admin only)
export async function deleteIssueApi(householdId: string, issueId: string): Promise<void> {
    await api.delete(`/households/${householdId}/issues/${issueId}`);
}

// TODO: Implement add comment to an issue
export async function createIssueCommentApi(
    householdId: string,
    issueId: string,
    input: CreateIssueCommentInput
): Promise<IssueComment> {
    const res = await api.post(`/households/${householdId}/issues/${issueId}/comments`, input);
    return res.data.data;
}

// TODO: Implement list comments for an issue
export async function listIssueCommentsApi(
    householdId: string,
    issueId: string
): Promise<IssueComment[]> {
    const res = await api.get(`/households/${householdId}/issues/${issueId}/comments`);
    return res.data.data;
}

