import { Task, TaskAssignment, Prisma } from '@prisma/client';

type TaskWithAssignments = Task & { assignments: TaskAssignment[] };

/**
 * Advances a due date by the given recurrence pattern.
 * Falls back to `new Date()` if currentDate is null.
 */
export function advanceDueDate(currentDate: Date | null, pattern: string): Date {
  const base = currentDate ? new Date(currentDate) : new Date();

  switch (pattern) {
    case 'daily':
      base.setDate(base.getDate() + 1);
      break;
    case 'weekly':
      base.setDate(base.getDate() + 7);
      break;
    case 'monthly':
      base.setMonth(base.getMonth() + 1);
      break;
    default:
      throw new Error(`Unknown recurrence pattern: ${pattern}`);
  }

  return base;
}

interface NextOccurrenceResult {
  nextTask: Task;
  assignedUserId: string | null;
}

/**
 * Generates the next occurrence of a recurring task.
 * Must be called inside an existing Prisma transaction.
 *
 * For rotating tasks: assigns to the next member round-robin by HouseholdMember.createdAt ASC.
 * For non-rotating tasks: carries forward the same assignee (or null if unassigned).
 *
 * Returns the new Task and the userId who was assigned (null if unassigned),
 * so the caller can send a TASK_ASSIGNED notification outside the transaction.
 */
export async function generateNextOccurrence(
  task: TaskWithAssignments,
  tx: Prisma.TransactionClient
): Promise<NextOccurrenceResult | null> {
  if (!task.recurrencePattern) {
    console.warn(`generateNextOccurrence: task ${task.id} has isRecurring=true but no recurrencePattern`);
    return null;
  }

  const nextDueDate = advanceDueDate(task.dueDate, task.recurrencePattern);

  // Create the next task as a copy of the current one
  const nextTask = await tx.task.create({
    data: {
      title: task.title,
      description: task.description,
      dueDate: nextDueDate,
      isRecurring: task.isRecurring,
      recurrencePattern: task.recurrencePattern,
      isRotating: task.isRotating,
      rotationIndex: task.rotationIndex, // will be updated below if rotating
      creatorId: task.creatorId,
      householdId: task.householdId,
    },
  });

  let assignedUserId: string | null = null;

  if (task.isRotating) {
    // Fetch all current household members sorted by join date for round-robin
    const members = await tx.householdMember.findMany({
      where: { householdId: task.householdId },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });

    if (members.length > 0) {
      const nextIndex = (task.rotationIndex + 1) % members.length;
      assignedUserId = members[nextIndex].userId;

      // Update both the new task's rotationIndex and the original (for reference consistency)
      await Promise.all([
        tx.task.update({ where: { id: nextTask.id }, data: { rotationIndex: nextIndex } }),
        tx.task.update({ where: { id: task.id }, data: { rotationIndex: nextIndex } }),
      ]);
    }
  } else {
    // Non-rotating: carry forward the same assignee if one existed
    const activeAssignment = task.assignments.find(
      (a) => a.status === 'PENDING' || a.status === 'IN_PROGRESS'
    );
    assignedUserId = activeAssignment?.userId ?? null;
  }

  // Create the assignment for the next task if we have an assignee
  if (assignedUserId) {
    await tx.taskAssignment.create({
      data: {
        taskId: nextTask.id,
        userId: assignedUserId,
        status: 'PENDING',
      },
    });
  }

  return { nextTask, assignedUserId };
}
