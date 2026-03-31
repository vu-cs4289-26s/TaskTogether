import { Task } from "@/types/tasks";

export function compareTasksByUrgency(a: Task, b: Task): number {
  const now = new Date();

  // Completed tasks always sort after pending
  const aDone = isTaskCompleted(a);
  const bDone = isTaskCompleted(b);
  if (aDone !== bDone) return aDone ? 1 : -1;

  // For completed tasks, most recently completed first
  if (aDone && bDone) {
    const aComp = a.completions[0]?.completedAt ?? a.updatedAt;
    const bComp = b.completions[0]?.completedAt ?? b.updatedAt;
    return new Date(bComp).getTime() - new Date(aComp).getTime();
  }

  // Overdue before not overdue
  const aDue = a.dueDate ? new Date(a.dueDate) : null;
  const bDue = b.dueDate ? new Date(b.dueDate) : null;
  const aOverdue = aDue && aDue < now;
  const bOverdue = bDue && bDue < now;
  if (aOverdue && !bOverdue) return -1;
  if (!aOverdue && bOverdue) return 1;

  // Higher priority first
  const pMap: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const aPri = pMap[a.priority ?? 'medium'] ?? 1;
  const bPri = pMap[b.priority ?? 'medium'] ?? 1;
  if (aPri !== bPri) return aPri - bPri;

  // Due date ascending, no date last
  if (aDue && !bDue) return -1;
  if (!aDue && bDue) return 1;
  if (aDue && bDue) return aDue.getTime() - bDue.getTime();

  // Fallback: newest first
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export const priorityStyles: Record<string, string> = {
  high: "bg-urgent/10 text-urgent border border-urgent",
  medium: "bg-pending/10 text-pending border border-pending",
  low: "bg-success/10 text-success border border-success",
};

export const priorityLabels: Record<string, string> = {
  high: "P1",
  medium: "P2",
  low: "P3",
};

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isTaskCompleted(task: Task): boolean {
  return (
    task.completions.length > 0 ||
    task.assignments.some((a: { status: string }) => a.status === "COMPLETED")
  );
}
