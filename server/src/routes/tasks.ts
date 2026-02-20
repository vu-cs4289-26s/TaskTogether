import { Router, Response } from 'express';
import { TaskStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { requireHouseholdMember, requireAdmin } from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';
import { createNotification } from '../lib/notifications.js';
import { generateNextOccurrence } from '../lib/taskRecurrence.js';

// mergeParams: true lets requireHouseholdMember read :id from the parent route
const router = Router({ mergeParams: true });

router.use(authenticate);

const userSelect = { id: true, name: true, email: true, avatar: true } as const;

const VALID_RECURRENCE_PATTERNS = ['daily', 'weekly', 'monthly'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
const MAX_TITLE_LENGTH = 200;

// ============================================
// Notification endpoints — registered BEFORE /:taskId routes
// to prevent Express matching "notifications" as a taskId param
// ============================================

// GET /api/households/:id/tasks/notifications — List my notifications
router.get(
  '/notifications',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;
      const unreadOnly = req.query.unreadOnly === 'true';

      const where = {
        userId: req.userId!,
        householdId: req.householdId!,
        ...(unreadOnly ? { isRead: false } : {}),
      };

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where }),
      ]);

      res.json({
        status: 'success',
        data: notifications,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('GET /notifications error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' },
      });
    }
  }
);

// PUT /api/households/:id/tasks/notifications/read-all — Mark all as read
router.put(
  '/notifications/read-all',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId: req.userId!,
          householdId: req.householdId!,
          isRead: false,
        },
        data: { isRead: true },
      });

      res.json({
        status: 'success',
        data: { count: result.count },
      });
    } catch (err) {
      console.error('PUT /notifications/read-all error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notifications as read' },
      });
    }
  }
);

// PUT /api/households/:id/tasks/notifications/:notificationId/read — Mark one as read
router.put(
  '/notifications/:notificationId/read',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { notificationId } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification || notification.householdId !== req.householdId) {
        res.status(404).json({
          status: 'error',
          error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' },
        });
        return;
      }

      if (notification.userId !== req.userId) {
        res.status(403).json({
          status: 'error',
          error: { code: 'FORBIDDEN', message: 'This notification does not belong to you' },
        });
        return;
      }

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      res.json({ status: 'success', data: updated });
    } catch (err) {
      console.error('PUT /notifications/:notificationId/read error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notification as read' },
      });
    }
  }
);

// ============================================
// Task CRUD
// ============================================

// POST /api/households/:id/tasks — Create a task
router.post(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        title,
        description,
        dueDate,
        priority,
        isRecurring = false,
        recurrencePattern,
        isRotating = false,
        assignedToUserId,
      } = req.body;

      // --- Validation ---
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'Task title is required' },
        });
        return;
      }

      if (title.trim().length > MAX_TITLE_LENGTH) {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` },
        });
        return;
      }

      if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'priority must be "low", "medium", or "high"' },
        });
        return;
      }

      const effectiveIsRecurring = isRotating ? true : isRecurring;

      if (effectiveIsRecurring && !VALID_RECURRENCE_PATTERNS.includes(recurrencePattern)) {
        res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'recurrencePattern must be "daily", "weekly", or "monthly" when isRecurring is true',
          },
        });
        return;
      }

      if (isRotating && req.userRole !== 'ADMIN') {
        res.status(403).json({
          status: 'error',
          error: { code: 'ADMIN_REQUIRED', message: 'Only admins can create rotating tasks' },
        });
        return;
      }

      let parsedDueDate: Date | undefined;
      if (dueDate) {
        parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          res.status(400).json({
            status: 'error',
            error: { code: 'VALIDATION_ERROR', message: 'Invalid dueDate format' },
          });
          return;
        }
      }

      // Validate assignee
      if (assignedToUserId) {
        if (req.userRole !== 'ADMIN' && assignedToUserId !== req.userId) {
          res.status(403).json({
            status: 'error',
            error: { code: 'FORBIDDEN_ASSIGNMENT', message: 'Members can only assign tasks to themselves' },
          });
          return;
        }

        const assigneeMembership = await prisma.householdMember.findUnique({
          where: {
            userId_householdId: { userId: assignedToUserId, householdId: req.householdId! },
          },
        });

        if (!assigneeMembership) {
          res.status(400).json({
            status: 'error',
            error: { code: 'ASSIGNEE_NOT_MEMBER', message: 'Assignee is not a member of this household' },
          });
          return;
        }
      }

      // --- Create task + optional assignment in a transaction ---
      const task = await prisma.$transaction(async (tx) => {
        const newTask = await tx.task.create({
          data: {
            title: title.trim(),
            description: description?.trim() ?? null,
            dueDate: parsedDueDate ?? null,
            priority: priority ?? 'medium',
            isRecurring: effectiveIsRecurring,
            recurrencePattern: effectiveIsRecurring ? recurrencePattern : null,
            isRotating,
            creatorId: req.userId!,
            householdId: req.householdId!,
          },
        });

        if (assignedToUserId) {
          await tx.taskAssignment.create({
            data: {
              taskId: newTask.id,
              userId: assignedToUserId,
              status: 'PENDING',
            },
          });
        }

        return tx.task.findUnique({
          where: { id: newTask.id },
          include: {
            creator: { select: userSelect },
            assignments: { include: { user: { select: userSelect } } },
            completions: { orderBy: { completedAt: 'desc' }, take: 1 },
          },
        });
      });

      // Notify the assignee outside the transaction
      if (assignedToUserId) {
        createNotification({
          userId: assignedToUserId,
          householdId: req.householdId!,
          type: 'TASK_ASSIGNED',
          message: `You have been assigned the task "${title.trim()}"`,
          payload: { taskId: task!.id, taskTitle: task!.title },
        }).catch(console.error);
      }

      res.status(201).json({ status: 'success', data: task });
    } catch (err) {
      console.error('POST /tasks error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create task' },
      });
    }
  }
);

// GET /api/households/:id/tasks — List tasks (paginated, filterable)
router.get(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      // Build dynamic where clause
      const where: Record<string, unknown> = { householdId: req.householdId };

      if (req.query.assignedToMe === 'true') {
        where.assignments = { some: { userId: req.userId } };
      }

      if (req.query.unassigned === 'true') {
        where.assignments = { none: {} };
      }

      if (req.query.status && Object.values(TaskStatus).includes(req.query.status as TaskStatus)) {
        where.assignments = {
          ...(typeof where.assignments === 'object' && where.assignments !== null ? where.assignments : {}),
          some: { status: req.query.status as TaskStatus },
        };
      }

      if (req.query.isRecurring === 'true') {
        where.isRecurring = true;
      } else if (req.query.isRecurring === 'false') {
        where.isRecurring = false;
      }

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            creator: { select: userSelect },
            assignments: { include: { user: { select: userSelect } } },
            completions: { orderBy: { completedAt: 'desc' }, take: 1 },
          },
        }),
        prisma.task.count({ where }),
      ]);

      res.json({
        status: 'success',
        data: tasks,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('GET /tasks error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tasks' },
      });
    }
  }
);

// GET /api/households/:id/tasks/:taskId — Get a single task
router.get(
  '/:taskId',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        include: {
          creator: { select: userSelect },
          assignments: { include: { user: { select: userSelect } } },
          completions: {
            include: { user: { select: userSelect } },
            orderBy: { completedAt: 'desc' },
          },
        },
      });

      if (!task || task.householdId !== req.householdId) {
        res.status(404).json({
          status: 'error',
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
        });
        return;
      }

      res.json({ status: 'success', data: task });
    } catch (err) {
      console.error('GET /tasks/:taskId error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch task' },
      });
    }
  }
);

// PUT /api/households/:id/tasks/:taskId — Update a task (creator or admin)
router.put(
  '/:taskId',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
      });

      if (!task || task.householdId !== req.householdId) {
        res.status(404).json({
          status: 'error',
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
        });
        return;
      }

      if (task.creatorId !== req.userId && req.userRole !== 'ADMIN') {
        res.status(403).json({
          status: 'error',
          error: { code: 'TASK_UPDATE_FORBIDDEN', message: 'Only the task creator or an admin can update this task' },
        });
        return;
      }

      const { title, description, dueDate, priority, isRecurring, recurrencePattern, isRotating } = req.body;

      // Validate title if provided
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          res.status(400).json({
            status: 'error',
            error: { code: 'VALIDATION_ERROR', message: 'Task title cannot be empty' },
          });
          return;
        }
        if (title.trim().length > MAX_TITLE_LENGTH) {
          res.status(400).json({
            status: 'error',
            error: { code: 'VALIDATION_ERROR', message: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` },
          });
          return;
        }
      }

      if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'priority must be "low", "medium", or "high"' },
        });
        return;
      }

      const effectiveIsRecurring = isRotating ?? task.isRotating ? true : (isRecurring ?? task.isRecurring);
      const effectivePattern = recurrencePattern ?? task.recurrencePattern;

      if (effectiveIsRecurring && !VALID_RECURRENCE_PATTERNS.includes(effectivePattern)) {
        res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'recurrencePattern must be "daily", "weekly", or "monthly" when isRecurring is true',
          },
        });
        return;
      }

      if ((isRotating === true) && req.userRole !== 'ADMIN') {
        res.status(403).json({
          status: 'error',
          error: { code: 'ADMIN_REQUIRED', message: 'Only admins can make a task rotating' },
        });
        return;
      }

      let parsedDueDate: Date | null | undefined;
      if (dueDate === null) {
        parsedDueDate = null;
      } else if (dueDate !== undefined) {
        parsedDueDate = new Date(dueDate);
        if (isNaN(parsedDueDate.getTime())) {
          res.status(400).json({
            status: 'error',
            error: { code: 'VALIDATION_ERROR', message: 'Invalid dueDate format' },
          });
          return;
        }
      }

      const updated = await prisma.task.update({
        where: { id: task.id },
        data: {
          ...(title !== undefined ? { title: title.trim() } : {}),
          ...(description !== undefined ? { description: description?.trim() ?? null } : {}),
          ...(parsedDueDate !== undefined ? { dueDate: parsedDueDate } : {}),
          ...(isRecurring !== undefined ? { isRecurring: effectiveIsRecurring } : {}),
          ...(recurrencePattern !== undefined ? { recurrencePattern: effectiveIsRecurring ? effectivePattern : null } : {}),
          ...(isRotating !== undefined ? { isRotating } : {}),
          ...(priority !== undefined ? { priority } : {}),
        },
        include: {
          creator: { select: userSelect },
          assignments: { include: { user: { select: userSelect } } },
          completions: { orderBy: { completedAt: 'desc' }, take: 1 },
        },
      });

      res.json({ status: 'success', data: updated });
    } catch (err) {
      console.error('PUT /tasks/:taskId error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update task' },
      });
    }
  }
);

// DELETE /api/households/:id/tasks/:taskId — Delete a task (admin only)
router.delete(
  '/:taskId',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        select: { id: true, householdId: true },
      });

      if (!task || task.householdId !== req.householdId) {
        res.status(404).json({
          status: 'error',
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
        });
        return;
      }

      await prisma.task.delete({ where: { id: task.id } });
      res.status(204).send();
    } catch (err) {
      console.error('DELETE /tasks/:taskId error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete task' },
      });
    }
  }
);

// ============================================
// Assignment management
// ============================================

// POST /api/households/:id/tasks/:taskId/assign — Assign or unassign a task
router.post(
  '/:taskId/assign',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { assignedToUserId } = req.body; // null to unassign

      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        select: { id: true, householdId: true, title: true },
      });

      if (!task || task.householdId !== req.householdId) {
        res.status(404).json({
          status: 'error',
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
        });
        return;
      }

      // Unassign path
      if (assignedToUserId === null || assignedToUserId === undefined) {
        if (req.userRole !== 'ADMIN') {
          res.status(403).json({
            status: 'error',
            error: { code: 'ADMIN_REQUIRED', message: 'Only admins can unassign tasks' },
          });
          return;
        }

        await prisma.taskAssignment.deleteMany({
          where: {
            taskId: task.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        });

        const updated = await prisma.task.findUnique({
          where: { id: task.id },
          include: {
            creator: { select: userSelect },
            assignments: { include: { user: { select: userSelect } } },
            completions: { orderBy: { completedAt: 'desc' }, take: 1 },
          },
        });
        res.json({ status: 'success', data: updated });
        return;
      }

      // Assign path
      if (typeof assignedToUserId !== 'string') {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'assignedToUserId must be a string or null' },
        });
        return;
      }

      // Members can only self-assign unassigned tasks
      if (req.userRole !== 'ADMIN') {
        if (assignedToUserId !== req.userId) {
          res.status(403).json({
            status: 'error',
            error: { code: 'FORBIDDEN_ASSIGNMENT', message: 'Members can only assign tasks to themselves' },
          });
          return;
        }

        const existingActive = await prisma.taskAssignment.findFirst({
          where: { taskId: task.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        });

        if (existingActive) {
          res.status(403).json({
            status: 'error',
            error: { code: 'TASK_ALREADY_ASSIGNED', message: 'This task is already assigned. Only an admin can reassign it.' },
          });
          return;
        }
      }

      // Verify assignee is a household member
      const assigneeMembership = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: { userId: assignedToUserId, householdId: req.householdId! },
        },
      });

      if (!assigneeMembership) {
        res.status(400).json({
          status: 'error',
          error: { code: 'ASSIGNEE_NOT_MEMBER', message: 'Assignee is not a member of this household' },
        });
        return;
      }

      // Replace any existing active assignment and create the new one
      const updated = await prisma.$transaction(async (tx) => {
        await tx.taskAssignment.deleteMany({
          where: { taskId: task.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        });

        await tx.taskAssignment.create({
          data: { taskId: task.id, userId: assignedToUserId, status: 'PENDING' },
        });

        return tx.task.findUnique({
          where: { id: task.id },
          include: {
            creator: { select: userSelect },
            assignments: { include: { user: { select: userSelect } } },
            completions: { orderBy: { completedAt: 'desc' }, take: 1 },
          },
        });
      });

      createNotification({
        userId: assignedToUserId,
        householdId: req.householdId!,
        type: 'TASK_ASSIGNED',
        message: `You have been assigned the task "${task.title}"`,
        payload: { taskId: task.id, taskTitle: task.title },
      }).catch(console.error);

      res.json({ status: 'success', data: updated });
    } catch (err) {
      console.error('POST /tasks/:taskId/assign error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to assign task' },
      });
    }
  }
);

// ============================================
// Task completion
// ============================================

// POST /api/households/:id/tasks/:taskId/complete — Complete a task
router.post(
  '/:taskId/complete',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { notes, photoUrl } = req.body;

      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        include: { assignments: true },
      });

      if (!task || task.householdId !== req.householdId) {
        res.status(404).json({
          status: 'error',
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
        });
        return;
      }

      // Find the requester's active assignment
      const activeAssignment = task.assignments.find(
        (a) => a.userId === req.userId && (a.status === 'PENDING' || a.status === 'IN_PROGRESS')
      );

      if (!activeAssignment && req.userRole !== 'ADMIN') {
        res.status(403).json({
          status: 'error',
          error: { code: 'NOT_ASSIGNED', message: 'You are not assigned to this task' },
        });
        return;
      }

      type NextOccurrence = { nextTask: { id: string; title: string }; assignedUserId: string | null } | null;

      const { completion, nextOccurrence } = await prisma.$transaction(async (tx) => {
        // Mark assignment as completed
        if (activeAssignment) {
          await tx.taskAssignment.update({
            where: { id: activeAssignment.id },
            data: { status: 'COMPLETED' },
          });
        }

        // Create completion record
        const comp = await tx.taskCompletion.create({
          data: {
            taskId: task.id,
            userId: req.userId!,
            notes: notes ?? null,
            photoUrl: photoUrl ?? null,
          },
        });

        // Generate next occurrence if recurring
        let next: NextOccurrence = null;
        if (task.isRecurring) {
          const result = await generateNextOccurrence(task, tx);
          if (result) {
            next = result;
          }
        }

        return { completion: comp, nextOccurrence: next };
      });

      // Post-transaction: notify admins + task creator about completion
      const admins = await prisma.householdMember.findMany({
        where: { householdId: req.householdId!, role: 'ADMIN' },
        select: { userId: true },
      });

      const recipientIds = new Set(admins.map((a) => a.userId));
      recipientIds.add(task.creatorId); // also notify creator
      recipientIds.delete(req.userId!); // don't notify the completer

      for (const userId of recipientIds) {
        createNotification({
          userId,
          householdId: req.householdId!,
          type: 'TASK_COMPLETED',
          message: `Task "${task.title}" has been completed`,
          payload: { taskId: task.id, completedBy: req.userId },
        }).catch(console.error);
      }

      // Notify the next assignee if a recurring next occurrence was created
      if (nextOccurrence && nextOccurrence.assignedUserId) {
        createNotification({
          userId: nextOccurrence.assignedUserId,
          householdId: req.householdId!,
          type: 'TASK_ASSIGNED',
          message: `You have been assigned the task "${nextOccurrence.nextTask.title}"`,
          payload: { taskId: nextOccurrence.nextTask.id, taskTitle: nextOccurrence.nextTask.title },
        }).catch(console.error);
      }

      res.json({
        status: 'success',
        data: {
          completion,
          nextTask: nextOccurrence ? nextOccurrence.nextTask : null,
        },
      });
    } catch (err) {
      console.error('POST /tasks/:taskId/complete error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to complete task' },
      });
    }
  }
);

// ============================================
// Assignments list
// ============================================

// GET /api/households/:id/tasks/:taskId/assignments — List all assignments for a task
router.get(
  '/:taskId/assignments',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.taskId },
        select: { id: true, householdId: true },
      });

      if (!task || task.householdId !== req.householdId) {
        res.status(404).json({
          status: 'error',
          error: { code: 'TASK_NOT_FOUND', message: 'Task not found' },
        });
        return;
      }

      const assignments = await prisma.taskAssignment.findMany({
        where: { taskId: task.id },
        include: { user: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ status: 'success', data: assignments });
    } catch (err) {
      console.error('GET /tasks/:taskId/assignments error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assignments' },
      });
    }
  }
);

export default router;
