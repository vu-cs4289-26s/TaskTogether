import { Task } from '@/types/tasks';

export const priorityStyles: Record<string, string> = {
  high: 'bg-urgent/10 text-urgent border border-urgent',
  medium: 'bg-pending/10 text-pending border border-pending',
  low: 'bg-success/10 text-success border border-success',
};

export const priorityLabels: Record<string, string> = {
  high: 'P1',
  medium: 'P2',
  low: 'P3',
};

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function isTaskCompleted(task: Task): boolean {
  return (
    task.completions.length > 0 ||
    task.assignments.some((a : { status: string }) => a.status === 'COMPLETED')
  );
}