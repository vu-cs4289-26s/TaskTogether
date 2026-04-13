import { Router, Response } from 'express';
import { authenticate } from '../middleware/authentication.js';
import { requireHouseholdMember, requireAdmin } from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';
import { createNotification, broadcastNotification } from '../lib/notifications.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import { userSelect } from '../utils/selects.js';
import { requireString, isOneOf } from '../utils/validation.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const ISSUE_TYPES = ['MAINTENANCE', 'HOUSEMATE_CONFLICT', 'NOISE_COMPLAINT', 'CLEANLINESS', 'OTHER'] as const;
const ISSUE_PRIORITIES = ['URGENT', 'MEDIUM', 'LOW'] as const;

// POST / — Create an issue (any household member)
// TODO: Validate title is required and non-empty
// TODO: Set reportedById to req.userId
// TODO: Set householdId from req.householdId
// TODO: Include reportedBy and comments in response
router.post(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { title, description, photoUrls, type, priority, isAnonymous } = req.body;

            const trimmedTitle = requireString(title);
            if (!trimmedTitle) {
                sendError(res, 400, 'VALIDATION_ERROR', 'Title is required');
                return;
            }

            if (!isOneOf(type, ISSUE_TYPES)) {
                sendError(res, 400, 'VALIDATION_ERROR', 'Invalid issue type');
                return;
            }

            if (!isOneOf(priority, ISSUE_PRIORITIES)) {
                sendError(res, 400, 'VALIDATION_ERROR', 'Invalid priority');
                return;
            }

      const issue = await prisma.issue.create({
        data: {
          title: trimmedTitle,
          description: requireString(description) ?? null,
          photoUrls: Array.isArray(photoUrls) ? photoUrls : [],

                    type,       // Prisma enum value
                    priority,   // Prisma enum value
                    isAnonymous: Boolean(isAnonymous),

                    householdId: req.householdId!,
                    reportedById: req.userId!,
                },
                include: {
                    reportedBy: { select: userSelect },
                    comments: { include: { user: { select: userSelect } } },
                },
            });

            sendSuccess(res, issue, 201);
        } catch (err: any) {
            console.error(err);

            // Helpful Prisma enum error handling
            if (err?.code === 'P2003' || err?.code === 'P2009') {
                sendError(res, 400, 'VALIDATION_ERROR', 'Invalid issue input');
                return;
            }

            sendError(res, 500, 'SERVER_ERROR', 'Failed to create issue');
        }
    }
);

// GET / — List issues (paginated, filterable by status)
// TODO: Support ?page, ?limit, ?status query params
// TODO: Include reportedBy user and _count of comments
// TODO: Order by createdAt desc
router.get(
    '/',
    requireHouseholdMember,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const issues = await prisma.issue.findMany({
                where: { householdId: req.householdId! },
                orderBy: { createdAt: 'desc' },
                include: {
                    reportedBy: { select: userSelect },
                    comments: { include: { user: { select: userSelect } } },
                },
            });

            res.json({
                status: 'success',
                data: issues,
                meta: { total: issues.length },
            });
        } catch (err) {
            sendError(res, 500, 'SERVER_ERROR', 'Failed to list issues');
        }
    }
);

// GET /:issueId — Get a single issue with all comments
// TODO: Validate issue belongs to this household
// TODO: Include reportedBy, comments with user details
router.get(
    '/:issueId',
    requireHouseholdMember,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { issueId } = req.params;

            const issue = await prisma.issue.findFirst({
                where: { id: issueId, householdId: req.householdId! },
                include: {
                    reportedBy: { select: userSelect },
                    comments: {
                        orderBy: { createdAt: 'asc' },
                        include: { user: { select: userSelect } },
                    },
                },
            });

            if (!issue) {
                sendError(res, 404, 'NOT_FOUND', 'Issue not found');
                return;
            }

            sendSuccess(res, issue);
        } catch (err) {
            sendError(res, 500, 'SERVER_ERROR', 'Failed to get issue');
        }
    }
);

// PUT /:issueId — Update an issue (reporter or admin)
// TODO: Reporter can update title, description, photoUrl
// TODO: Admin can also update status
// TODO: Validate the issue belongs to this household
router.put(
    '/:issueId',
    requireHouseholdMember,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { issueId } = req.params;

            const issue = await prisma.issue.findFirst({
                where: { id: issueId, householdId: req.householdId! },
                select: { id: true, reportedById: true, status: true, title: true },
            });

            if (!issue) {
                sendError(res, 404, 'NOT_FOUND', 'Issue not found');
                return;
            }

            const isAdmin = req.userRole === 'ADMIN';
            const isReporter = issue.reportedById === req.userId;

            // Everyone can view others, but only admin or reporter can edit
            if (!isAdmin && !isReporter) {
                sendError(res, 403, 'FORBIDDEN', 'You can only edit your own issues');
                return;
            }

    const {
      title,
      description,
      photoUrls,
      type,
      priority,
      isAnonymous,
      status, // admin-only
    } = req.body;

    const data: any = {};

    // Reporter OR Admin: allowed fields
    if (title !== undefined) {
      const trimmed = requireString(title);
      if (!trimmed) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Title cannot be empty');
        return;
      }
      data.title = trimmed;
    }
    if (description !== undefined) {
      data.description = requireString(description) ?? null;
    }
    if (photoUrls !== undefined) {
      if (photoUrls === null) {
        data.photoUrls = [];
      } else if (Array.isArray(photoUrls)) {
        data.photoUrls = photoUrls.filter((url): url is string => typeof url === 'string');
      }
    }
    if (type) data.type = type;
    if (priority) data.priority = priority;
    if (typeof isAnonymous === 'boolean') data.isAnonymous = isAnonymous;

            // Admin-only: status
            if (status !== undefined) {
                if (!isAdmin) {
                    sendError(res, 403, 'ADMIN_REQUIRED', 'Only admins can change status');
                    return;
                }
                data.status = status;
            }

            const updated = await prisma.issue.update({
                where: { id: issue.id },
                data,
                include: {
                    reportedBy: { select: userSelect },
                    comments: { include: { user: { select: userSelect } } },
                },
            });

            // Broadcast notification if status changed
            if (data.status && data.status !== issue.status) {
                broadcastNotification({
                    householdId: req.householdId!,
                    excludeUserIds: [req.userId!],
                    type: 'ISSUE_STATUS_CHANGED',
                    message: `Issue "${updated.title}" status changed to ${data.status}`,
                    payload: { issueId: updated.id, oldStatus: issue.status, newStatus: data.status },
                }).catch(console.error);
            }

            sendSuccess(res, updated);
        } catch (err) {
            sendError(res, 500, 'SERVER_ERROR', 'Failed to update issue');
        }
    }
);

// DELETE /:issueId — Delete an issue (admin only)
router.delete(
    '/:issueId',
    requireHouseholdMember,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { issueId } = req.params;

            // Only delete if it belongs to this household
            const deleted = await prisma.issue.deleteMany({
                where: {
                    id: issueId,
                    householdId: req.householdId!,
                },
            });

            if (deleted.count === 0) {
                sendError(res, 404, 'NOT_FOUND', 'Issue not found');
                return;
            }

            // Cascade will remove IssueComment due to onDelete: Cascade
            res.status(204).send();
        } catch (err) {
            sendError(res, 500, 'SERVER_ERROR', 'Failed to delete issue');
        }
    }
);

// ============================================
// ISSUE COMMENT ENDPOINTS
// ============================================

// POST /:issueId/comments — Add a comment to an issue
// TODO: Validate content is required and non-empty
// TODO: Set userId to req.userId
// TODO: Validate issue belongs to this household
router.post(
    '/:issueId/comments',
    requireHouseholdMember,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { issueId } = req.params;
            const { content, photoUrl } = req.body as {
                content?: string;
                photoUrl?: string | null;
            };

            const trimmedContent = content?.trim();

            if (!trimmedContent) {
                sendError(res, 400, 'VALIDATION_ERROR', 'Comment content is required');
                return;
            }

            const issue = await prisma.issue.findFirst({
                where: {
                    id: issueId,
                    householdId: req.householdId!,
                },
                select: { id: true },
            });

            if (!issue) {
                sendError(res, 404, 'NOT_FOUND', 'Issue not found');
                return;
            }

            const created = await prisma.issueComment.create({
                data: {
                    content: trimmedContent,
                    photoUrl: photoUrl ?? null,
                    issueId,
                    userId: req.userId!,
                },
                include: {
                    user: {
                        select: userSelect,
                    },
                },
            });

            sendSuccess(res, created, 201);
        } catch (err) {
            sendError(res, 500, 'SERVER_ERROR', 'Failed to create comment');
        }
    }
);

// GET /:issueId/comments — List all comments for an issue
// TODO: Order by createdAt asc
// TODO: Include user details for each comment
router.get(
    '/:issueId/comments',
    requireHouseholdMember,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { issueId } = req.params;

            const issue = await prisma.issue.findFirst({
                where: {
                    id: issueId,
                    householdId: req.householdId!,
                },
                select: { id: true },
            });

            if (!issue) {
                sendError(res, 404, 'NOT_FOUND', 'Issue not found');
                return;
            }

            const comments = await prisma.issueComment.findMany({
                where: { issueId },
                orderBy: { createdAt: 'asc' },
                include: {
                    user: {
                        select: userSelect,
                    },
                },
            });

            sendSuccess(res, comments);
        } catch (err) {
            sendError(res, 500, 'SERVER_ERROR', 'Failed to load comments');
        }
    }
);

//for notifications
router.put(
    '/:issueId',
    requireHouseholdMember,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { issueId } = req.params;

            const issue = await prisma.issue.findFirst({
                where: { id: issueId, householdId: req.householdId! },
                select: {
                    id: true,
                    reportedById: true,
                    status: true,
                    title: true,
                },
            });

            if (!issue) {
                sendError(res, 404, 'NOT_FOUND', 'Issue not found');
                return;
            }

            const isAdmin = req.userRole === 'ADMIN';
            const isReporter = issue.reportedById === req.userId;

            if (!isAdmin && !isReporter) {
                sendError(res, 403, 'FORBIDDEN', 'You can only edit your own issues');
                return;
            }

    const {
      title,
      description,
      photoUrls,
      type,
      priority,
      isAnonymous,
      status, // admin-only
    } = req.body;

    const data: any = {};

    if (title !== undefined) {
      const trimmed = requireString(title);
      if (!trimmed) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Title cannot be empty');
        return;
      }
      data.title = trimmed;
    }

    if (description !== undefined) {
      data.description = requireString(description) ?? null;
    }

    if (photoUrls !== undefined) {
      if (photoUrls === null) {
        data.photoUrls = [];
      } else if (Array.isArray(photoUrls)) {
        data.photoUrls = photoUrls.filter((url): url is string => typeof url === 'string');
      }
    }

    if (type !== undefined) {
                if (!isOneOf(type, ISSUE_TYPES)) {
                    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid issue type');
                    return;
                }
                data.type = type;
            }

            if (priority !== undefined) {
                if (!isOneOf(priority, ISSUE_PRIORITIES)) {
                    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid priority');
                    return;
                }
                data.priority = priority;
            }

            if (typeof isAnonymous === 'boolean') data.isAnonymous = isAnonymous;

            if (status !== undefined) {
                if (!isAdmin) {
                    sendError(res, 403, 'ADMIN_REQUIRED', 'Only admins can change status');
                    return;
                }

                data.status = status;
            }

            const oldStatus = issue.status;

            const updated = await prisma.issue.update({
                where: { id: issue.id },
                data,
                include: {
                    reportedBy: { select: userSelect },
                    comments: { include: { user: { select: userSelect } } },
                },
            });

            const newStatus = updated.status;

            if (status !== undefined && newStatus !== oldStatus) {
                if (issue.reportedById !== req.userId) {
                    createNotification({
                        userId: issue.reportedById,
                        householdId: req.householdId!,
                        type: 'ISSUE_STATUS_CHANGED',
                        message: `Your issue "${updated.title}" changed from ${oldStatus} to ${newStatus}`,
                        payload: {
                            issueId: updated.id,
                            issueTitle: updated.title,
                            oldStatus,
                            newStatus,
                        },
                    }).catch(console.error);
                }

                broadcastNotification({
                    householdId: req.householdId!,
                    excludeUserIds: [...new Set([req.userId!, issue.reportedById])],          
                    type: 'ISSUE_STATUS_CHANGED',
                    message: `Issue "${updated.title}" status changed from ${oldStatus} to ${newStatus}`,
                    payload: {
                        issueId: updated.id,
                        issueTitle: updated.title,
                        oldStatus,
                        newStatus,
                    },
                }).catch(console.error);
            }

            sendSuccess(res, updated);
        } catch (err) {
            sendError(res, 500, 'SERVER_ERROR', 'Failed to update issue');
        }
    }
);

export default router;
