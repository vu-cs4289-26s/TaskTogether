export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'TASK_UPCOMING'
  | 'ISSUE_STATUS_CHANGED'
  | 'EVENT_UPCOMING';

export interface Notification {
  id: string;
  type: NotificationType;
  isRead: boolean;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  userId: string;
  householdId: string;
}
