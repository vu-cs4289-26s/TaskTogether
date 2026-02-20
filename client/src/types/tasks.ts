import type { UserSummary } from './households';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  status: TaskStatus;
  createdAt: string;
  user: UserSummary;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  userId: string;
  notes: string | null;
  photoUrl: string | null;
  completedAt: string;
  user?: UserSummary;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority | null;
  isRecurring: boolean;
  recurrencePattern: string | null;
  isRotating: boolean;
  rotationIndex: number;
  creatorId: string;
  householdId: string;
  createdAt: string;
  updatedAt: string;
  creator: UserSummary;
  assignments: TaskAssignment[];
  completions: TaskCompletion[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  isRotating?: boolean;
  assignedToUserId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  isRotating?: boolean;
}

export interface CompleteTaskInput {
  notes?: string;
  photoUrl?: string;
}
