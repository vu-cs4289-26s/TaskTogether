import api from '@/lib/api';
import { buildQueryString } from '@/lib/queryParams';
import type { Task, CreateTaskInput, UpdateTaskInput, CompleteTaskInput, TaskAssignment } from '@/types/tasks';
import type { PaginationMeta } from '@/types/households';

export async function listTasksApi(
  householdId: string,
  params?: {
    page?: number;
    limit?: number;
    assignedToMe?: boolean;
    unassigned?: boolean;
    status?: string;
    isRecurring?: boolean;
  }
): Promise<{ tasks: Task[]; meta: PaginationMeta }> {
  const qs = buildQueryString({
    page: params?.page,
    limit: params?.limit,
    assignedToMe: params?.assignedToMe || undefined,
    unassigned: params?.unassigned || undefined,
    status: params?.status,
    isRecurring: params?.isRecurring,
  });
  const res = await api.get(`/households/${householdId}/tasks${qs}`);
  return { tasks: res.data.data, meta: res.data.meta };
}

export async function getTaskApi(householdId: string, taskId: string): Promise<Task> {
  const res = await api.get(`/households/${householdId}/tasks/${taskId}`);
  return res.data.data;
}

export async function createTaskApi(householdId: string, input: CreateTaskInput): Promise<Task> {
  const res = await api.post(`/households/${householdId}/tasks`, input);
  return res.data.data;
}

export async function updateTaskApi(householdId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
  const res = await api.put(`/households/${householdId}/tasks/${taskId}`, input);
  return res.data.data;
}

export async function deleteTaskApi(householdId: string, taskId: string): Promise<void> {
  await api.delete(`/households/${householdId}/tasks/${taskId}`);
}

export async function assignTaskApi(
  householdId: string,
  taskId: string,
  assignedToUserId: string | null
): Promise<Task> {
  const res = await api.post(`/households/${householdId}/tasks/${taskId}/assign`, { assignedToUserId });
  return res.data.data;
}

export async function completeTaskApi(
  householdId: string,
  taskId: string,
  input?: CompleteTaskInput
): Promise<{ completion: unknown; nextTask: unknown }> {
  const res = await api.post(`/households/${householdId}/tasks/${taskId}/complete`, input ?? {});
  return res.data.data;
}

export async function listAssignmentsApi(householdId: string, taskId: string): Promise<TaskAssignment[]> {
  const res = await api.get(`/households/${householdId}/tasks/${taskId}/assignments`);
  return res.data.data;
}
