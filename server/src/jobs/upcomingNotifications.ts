import prisma from '../lib/prisma.js';
import { broadcastNotification } from '../lib/notifications.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;

async function checkUpcomingTasks(): Promise<void> {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);

    // Find tasks due in the next 24 hours that have at least one
    // assignment which hasn't been notified yet.
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: now, lte: in24h },
        assignments: { some: { notifiedAt: null } },
      },
      select: {
        id: true,
        title: true,
        householdId: true,
        dueDate: true,
        assignments: {
          where: { notifiedAt: null },
          select: { id: true },
        },
      },
    });

    for (const task of tasks) {
      await broadcastNotification({
        householdId: task.householdId,
        type: 'TASK_UPCOMING',
        message: `Task "${task.title}" is due soon`,
        payload: { taskId: task.id, dueDate: task.dueDate?.toISOString() },
      });

      // Mark assignments as notified so we don't send duplicates
      await prisma.taskAssignment.updateMany({
        where: {
          taskId: task.id,
          notifiedAt: null,
        },
        data: { notifiedAt: now },
      });
    }

    if (tasks.length > 0) {
      console.log(`[upcomingNotifications] Sent notifications for ${tasks.length} upcoming task(s)`);
    }
  } catch (err) {
    console.error('[upcomingNotifications] Error:', err);
  }
}

export function startUpcomingNotificationsJob(): void {
  // Run once on startup, then every day
  checkUpcomingTasks();
  setInterval(checkUpcomingTasks, TWENTY_FOUR_HOURS_MS);
  console.log('[upcomingNotifications] Job started — checking every hour');
}
