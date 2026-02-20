import { NotificationType, Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { getIO } from './socket.js';

interface CreateNotificationParams {
  userId: string;
  householdId: string;
  type: NotificationType;
  message: string;
  payload?: Record<string, unknown>;
}

/**
 * Creates a Notification DB record and emits a real-time socket event
 * to the recipient's personal room (`user:{userId}`).
 *
 * Socket emit failures are caught and logged — they never propagate to callers.
 * Safe to fire-and-forget with .catch(console.error) or to await directly.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { userId, householdId, type, message, payload } = params;

  const notification = await prisma.notification.create({
    data: {
      userId,
      householdId,
      type,
      message,
      payload: payload ? (payload as Prisma.InputJsonValue) : undefined,
    },
  });

  try {
    getIO().to(`user:${userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      message: notification.message,
      payload: notification.payload,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });
  } catch (err) {
    console.error('Socket emit failed for notification:', err);
  }
}
