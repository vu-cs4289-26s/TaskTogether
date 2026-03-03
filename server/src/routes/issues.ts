import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireHouseholdMember, requireAdmin } from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const userSelect = { id: true, name: true, email: true, avatar: true } as const;

const ISSUE_TYPES = new Set([
    'MAINTENANCE',
    'HOUSEMATE_CONFLICT',
    'NOISE_COMPLAINT',
    'CLEANLINESS',
    'OTHER',
]);

const ISSUE_PRIORITIES = new Set(['URGENT', 'MEDIUM', 'LOW']);

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
            const { title, description, photoUrl, type, priority, isAnonymous } = req.body;

            if (!title || !title.trim()) {
                res.status(400).json({
                    status: 'error',
                    error: { code: 'VALIDATION_ERROR', message: 'Title is required' },
                });
                return;
            }

            if (!type || !ISSUE_TYPES.has(type)) {
                res.status(400).json({
                    status: 'error',
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid issue type' },
                });
                return;
            }

            if (!priority || !ISSUE_PRIORITIES.has(priority)) {
                res.status(400).json({
                    status: 'error',
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid priority' },
                });
                return;
            }

            const issue = await prisma.issue.create({
                data: {
                    title: title.trim(),
                    description: typeof description === 'string' && description.trim() ? description.trim() : null,
                    photoUrl: photoUrl ?? null,

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

            res.status(201).json({ status: 'success', data: issue });
        } catch (err: any) {
            console.error(err);

            // Helpful Prisma enum error handling
            if (err?.code === 'P2003' || err?.code === 'P2009') {
                res.status(400).json({
                    status: 'error',
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid issue input' },
                });
                return;
            }

            res.status(500).json({
                status: 'error',
                error: { code: 'SERVER_ERROR', message: 'Failed to create issue' },
            });
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
            console.error(err);
            res.status(500).json({
                status: 'error',
                error: { code: 'SERVER_ERROR', message: 'Failed to list issues' },
            });
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
                res.status(404).json({
                    status: 'error',
                    error: { code: 'NOT_FOUND', message: 'Issue not found' },
                });
                return;
            }

            res.json({ status: 'success', data: issue });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                status: 'error',
                error: { code: 'SERVER_ERROR', message: 'Failed to get issue' },
            });
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
        select: { id: true, reportedById: true },
      });

      if (!issue) {
        res.status(404).json({
          status: 'error',
          error: { code: 'NOT_FOUND', message: 'Issue not found' },
        });
        return;
      }

      const isAdmin = req.userRole === 'ADMIN';
      const isReporter = issue.reportedById === req.userId;

      // Everyone can view others, but only admin or reporter can edit
      if (!isAdmin && !isReporter) {
        res.status(403).json({
          status: 'error',
          error: {
            code: 'FORBIDDEN',
            message: 'You can only edit your own issues',
          },
        });
        return;
      }

      const {
        title,
        description,
        photoUrl,
        type,
        priority,
        isAnonymous,
        status, // admin-only
      } = req.body;

      const data: any = {};

      // Reporter OR Admin: allowed fields
      if (typeof title === 'string') data.title = title.trim();
      if (description === null || typeof description === 'string') {
        const trimmed = typeof description === 'string' ? description.trim() : null;
        data.description = trimmed ? trimmed : null;
      }
      if (photoUrl === null || typeof photoUrl === 'string') data.photoUrl = photoUrl;
      if (type) data.type = type;
      if (priority) data.priority = priority;
      if (typeof isAnonymous === 'boolean') data.isAnonymous = isAnonymous;

      // Admin-only: status
      if (status !== undefined) {
        if (!isAdmin) {
          res.status(403).json({
            status: 'error',
            error: {
              code: 'ADMIN_REQUIRED',
              message: 'Only admins can change status',
            },
          });
          return;
        }
        data.status = status;
      }

      // Validate title if present
      if ('title' in data && !data.title) {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'Title cannot be empty' },
        });
        return;
      }

      const updated = await prisma.issue.update({
        where: { id: issue.id },
        data,
        include: {
          reportedBy: { select: userSelect },
          comments: { include: { user: { select: userSelect } } },
        },
      });

      res.json({ status: 'success', data: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        status: 'error',
        error: { code: 'SERVER_ERROR', message: 'Failed to update issue' },
      });
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
        res.status(404).json({
          status: 'error',
          error: { code: 'NOT_FOUND', message: 'Issue not found' },
        });
        return;
      }

      // Cascade will remove IssueComment due to onDelete: Cascade
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({
        status: 'error',
        error: { code: 'SERVER_ERROR', message: 'Failed to delete issue' },
      });
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
        // TODO: Implement add comment
        res.status(501).json({
            status: 'error',
            error: { code: 'NOT_IMPLEMENTED', message: 'Add comment not implemented yet' },
        });
    }
);

// GET /:issueId/comments — List all comments for an issue
// TODO: Order by createdAt asc
// TODO: Include user details for each comment
router.get(
    '/:issueId/comments',
    requireHouseholdMember,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        // TODO: Implement list comments
        res.status(501).json({
            status: 'error',
            error: { code: 'NOT_IMPLEMENTED', message: 'List comments not implemented yet' },
        });
    }
);

export default router;
