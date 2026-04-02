import { Router, Response } from 'express';
import { ActivityStatus, ActivityType, Prisma } from '@prisma/client';
import { authenticate } from '../middleware/authentication.js';
import { requireHouseholdMember, requireAdmin } from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';
import {sendError, sendSuccess, sendPaginated} from '../utils/responses.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const userSelect = { id: true, name: true, email: true, avatar: true } as const;
const VALID_ACTIVITY_TYPES = new Set<ActivityType>(['HOMEWORK', 'BONDING', 'CHORE', 'OTHER']);
const VALID_ACTIVITY_STATUSES = new Set<ActivityStatus>([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

const activityInclude = {
  participants: {
    include: {
      user: {
        select: userSelect,
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  checkIns: {
    include: {
      user: {
        select: userSelect,
      },
    },
    orderBy: { checkedInAt: 'desc' as const },
  },
} satisfies Prisma.QualityTimeActivityInclude;

function parseDateInput(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function findActivityOr404(
  householdId: string,
  activityId: string,
  res: Response
) {
  const activity = await prisma.qualityTimeActivity.findFirst({
    where: {
      id: activityId,
      householdId,
    },
    include: activityInclude,
  });

  if (!activity) {
    sendError(res, 404, 'ACTIVITY_NOT_FOUND', 'Activity not found');
    return null;
  }

  return activity;
}

async function validateParticipantIds(
  householdId: string,
  participantUserIds: string[] | undefined,
  res: Response
) {
  const uniqueParticipantUserIds = [...new Set((participantUserIds ?? []).filter(Boolean))];

  if (uniqueParticipantUserIds.length === 0) {
    return [];
  }

  const memberships = await prisma.householdMember.findMany({
    where: {
      householdId,
      userId: { in: uniqueParticipantUserIds },
    },
    select: { userId: true },
  });

  if (memberships.length !== uniqueParticipantUserIds.length) {
    sendError(res, 400, 'INVALID_PARTICIPANTS', 'All participants must belong to this household');
    return null;
  }

  return uniqueParticipantUserIds;
}

router.post(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { title, description, activityType, scheduledAt, participantUserIds } = req.body;

      if (typeof title !== 'string' || title.trim().length === 0) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Activity title is required');
        return;
      }

      if (!VALID_ACTIVITY_TYPES.has(activityType)) {
        sendError(res, 400, 'VALIDATION_ERROR', 'activityType must be one of HOMEWORK, BONDING, CHORE, or OTHER');
        return;
      }

      const parsedScheduledAt = parseDateInput(scheduledAt);
      if (!parsedScheduledAt) {
        sendError(res, 400, 'VALIDATION_ERROR', 'scheduledAt must be a valid ISO date string');
        return;
      }

      if (participantUserIds !== undefined && !Array.isArray(participantUserIds)) {
        sendError(res, 400, 'VALIDATION_ERROR', 'participantUserIds must be an array of user IDs');
        return;
      }

      const validParticipantIds = await validateParticipantIds(
        req.householdId!,
        participantUserIds,
        res
      );
      if (validParticipantIds === null) {
        return;
      }

      const activity = await prisma.qualityTimeActivity.create({
        data: {
          title: title.trim(),
          description:
            typeof description === 'string' && description.trim().length > 0
              ? description.trim()
              : null,
          activityType,
          scheduledAt: parsedScheduledAt,
          householdId: req.householdId!,
          participants:
            validParticipantIds.length > 0
              ? {
                  create: validParticipantIds.map((userId) => ({
                    userId,
                  })),
                }
              : undefined,
        },
        include: activityInclude,
      });

      sendSuccess(res, activity, 201);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create activity');
    }
  }
);

router.get(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const skip = (page - 1) * limit;
      const { status, activityType } = req.query;

      if (status && (typeof status !== 'string' || !VALID_ACTIVITY_STATUSES.has(status as ActivityStatus))) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid activity status filter');
        return;
      }

      if (
        activityType &&
        (typeof activityType !== 'string' || !VALID_ACTIVITY_TYPES.has(activityType as ActivityType))
      ) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid activity type filter');
        return;
      }

      const where: Prisma.QualityTimeActivityWhereInput = {
        householdId: req.householdId!,
        ...(status ? { status: status as ActivityStatus } : {}),
        ...(activityType ? { activityType: activityType as ActivityType } : {}),
      };

      const [activities, total] = await Promise.all([
        prisma.qualityTimeActivity.findMany({
          where,
          include: activityInclude,
          orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
          skip,
          take: limit,
        }),
        prisma.qualityTimeActivity.count({ where }),
      ]);


      sendPaginated(res, activities, { page, limit, total });
    } catch (err) {
      console.error('GET /activities error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch activities' },
      });
    }
  }
);

router.get(
  '/:activityId',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const activity = await findActivityOr404(req.householdId!, req.params.activityId, res);
      if (!activity) {
        return;
      }

      res.json({
        status: 'success',
        data: activity,
      });
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch activity');
    }
  }
);

router.put(
  '/:activityId',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const existing = await findActivityOr404(req.householdId!, req.params.activityId, res);
      if (!existing) {
        return;
      }

      const { title, description, activityType, status, scheduledAt } = req.body;
      const data: Prisma.QualityTimeActivityUpdateInput = {};

      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          sendError(res, 400, 'VALIDATION_ERROR', 'Activity title cannot be empty');
          return;
        }
        data.title = title.trim();
      }

      if (description !== undefined) {
        if (description !== null && typeof description !== 'string') {
          sendError(res, 400, 'VALIDATION_ERROR', 'description must be a string or null');
          return;
        }
        data.description =
          typeof description === 'string' && description.trim().length > 0
            ? description.trim()
            : null;
      }

      if (activityType !== undefined) {
        if (!VALID_ACTIVITY_TYPES.has(activityType)) {
          sendError(res, 400, 'VALIDATION_ERROR', 'Invalid activityType');
          return;
        }
        data.activityType = activityType;
      }

      if (scheduledAt !== undefined) {
        const parsedScheduledAt = parseDateInput(scheduledAt);
        if (!parsedScheduledAt) {
          sendError(res, 400, 'VALIDATION_ERROR', 'scheduledAt must be a valid ISO date string');
          return;
        }
        data.scheduledAt = parsedScheduledAt;
      }

      if (status !== undefined) {
        if (!VALID_ACTIVITY_STATUSES.has(status)) {
          sendError(res, 400, 'VALIDATION_ERROR', 'Invalid activity status');
          return;
        }

        data.status = status;

        if (status === 'IN_PROGRESS') {
          data.startedAt = existing.startedAt ?? new Date();
          data.completedAt = null;
        } else if (status === 'COMPLETED') {
          data.startedAt = existing.startedAt ?? new Date();
          data.completedAt = new Date();
        } else if (status === 'SCHEDULED') {
          data.startedAt = null;
          data.completedAt = null;
        } else if (status === 'CANCELLED') {
          data.completedAt = null;
        }
      }

      const updated = await prisma.qualityTimeActivity.update({
        where: { id: existing.id },
        data,
        include: activityInclude,
      });

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update activity');
    }
  }
);

router.delete(
  '/:activityId',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const existing = await findActivityOr404(req.householdId!, req.params.activityId, res);
      if (!existing) {
        return;
      }

      await prisma.qualityTimeActivity.delete({
        where: { id: existing.id },
      });

      res.status(204).send();
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to delete activity');
    }
  }
);

router.post(
  '/:activityId/join',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const activity = await findActivityOr404(req.householdId!, req.params.activityId, res);
      if (!activity) {
        return;
      }

      try {
        await prisma.activityParticipant.create({
          data: {
            activityId: activity.id,
            userId: req.userId!,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          sendError(res, 409, 'ALREADY_JOINED', 'You have already joined this activity');
          return;
        }
        throw err;
      }

      const updated = await prisma.qualityTimeActivity.findUnique({
        where: { id: activity.id },
        include: activityInclude,
      });

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to join activity');
    }
  }
);

router.post(
  '/:activityId/leave',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const activity = await findActivityOr404(req.householdId!, req.params.activityId, res);
      if (!activity) {
        return;
      }

      const participation = await prisma.activityParticipant.findUnique({
        where: {
          activityId_userId: {
            activityId: activity.id,
            userId: req.userId!,
          },
        },
      });

      if (!participation) {
        sendError(res, 400, 'NOT_PARTICIPANT', 'You are not currently participating in this activity');
        return;
      }

      await prisma.activityParticipant.delete({
        where: { id: participation.id },
      });

      const updated = await prisma.qualityTimeActivity.findUnique({
        where: { id: activity.id },
        include: activityInclude,
      });

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to leave activity');
    }
  }
);

router.post(
  '/:activityId/check-in',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const activity = await findActivityOr404(req.householdId!, req.params.activityId, res);
      if (!activity) {
        return;
      }

      const participation = await prisma.activityParticipant.findUnique({
        where: {
          activityId_userId: {
            activityId: activity.id,
            userId: req.userId!,
          },
        },
      });

      if (!participation) {
        sendError(res, 403, 'NOT_PARTICIPANT', 'You must join the activity before checking in');
        return;
      }

      const { photoUrl, notes } = req.body;

      if (photoUrl !== undefined && photoUrl !== null && typeof photoUrl !== 'string') {
        sendError(res, 400, 'VALIDATION_ERROR', 'photoUrl must be a string if provided');
        return;
      }

      if (notes !== undefined && notes !== null && typeof notes !== 'string') {
        sendError(res, 400, 'VALIDATION_ERROR', 'notes must be a string if provided');
        return;
      }

      const checkIn = await prisma.activityCheckIn.create({
        data: {
          activityId: activity.id,
          userId: req.userId!,
          photoUrl: typeof photoUrl === 'string' && photoUrl.trim().length > 0 ? photoUrl.trim() : null,
          notes: typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : null,
        },
        include: {
          user: {
            select: userSelect,
          },
        },
      });

      sendSuccess(res, checkIn, 201);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to check in to activity');
    }
  }
);

export default router;
