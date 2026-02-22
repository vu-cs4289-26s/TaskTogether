import api from '@/lib/api';
import type {
  Issue,
  CreateIssueInput,
  UpdateIssueInput,
  IssueComment,
  CreateIssueCommentInput,
} from '@/types/issues';
import type { PaginationMeta } from '@/types/households';

// TODO: Implement list issues with pagination and optional status filter
export async function listIssuesApi(
  householdId: string,
  params?: { page?: number; limit?: number; status?: string }
): Promise<{ issues: Issue[]; meta: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);

  const qs = query.toString();
  const res = await api.get(`/households/${householdId}/issues${qs ? `?${qs}` : ''}`);
  return { issues: res.data.data, meta: res.data.meta };
}

// TODO: Implement get single issue by ID
export async function getIssueApi(householdId: string, issueId: string): Promise<Issue> {
  const res = await api.get(`/households/${householdId}/issues/${issueId}`);
  return res.data.data;
}

// TODO: Implement create issue
export async function createIssueApi(householdId: string, input: CreateIssueInput): Promise<Issue> {
  const res = await api.post(`/households/${householdId}/issues`, input);
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
