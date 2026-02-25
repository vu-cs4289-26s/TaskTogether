import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireHouseholdMember, requireAdmin } from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const userSelect = { id: true, name: true, email: true, avatar: true } as const;

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
            const { title, description, photoUrl } = req.body;

            if (!title || !title.trim()) {
                res.status(400).json({
                    status: 'error',
                    error: { code: 'VALIDATION_ERROR', message: 'Title is required' },
                });
                return;
            }

            const issue = await prisma.issue.create({
                data: {
                    title: title.trim(),
                    description: description ?? null,
                    photoUrl: photoUrl ?? null,
                    householdId: req.householdId!,   // comes from middleware
                    reportedById: req.userId!,       // comes from auth middleware
                },
                include: {
                    reportedBy: { select: userSelect },
                    comments: {
                        include: {
                            user: { select: userSelect },
                        },
                    },
                },
            });

            res.status(201).json({
                status: 'success',
                data: issue,
            });
        } catch (err) {
            console.error(err);
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
        // TODO: Implement issue listing with pagination
        res.status(501).json({
            status: 'error',
            error: { code: 'NOT_IMPLEMENTED', message: 'Issue listing not implemented yet' },
        });
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
            const issues = await prisma.issue.findMany({
                where: {
                    householdId: req.householdId!,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    reportedBy: { select: userSelect },
                    comments: {
                        include: {
                            user: { select: userSelect },
                        },
                    },
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

// PUT /:issueId — Update an issue (reporter or admin)
// TODO: Reporter can update title, description, photoUrl
// TODO: Admin can also update status
// TODO: Validate the issue belongs to this household
router.put(
    '/:issueId',
    requireHouseholdMember,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        // TODO: Implement issue update
        res.status(501).json({
            status: 'error',
            error: { code: 'NOT_IMPLEMENTED', message: 'Issue update not implemented yet' },
        });
    }
);

// DELETE /:issueId — Delete an issue (admin only)
router.delete(
    '/:issueId',
    requireHouseholdMember,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        // TODO: Implement issue deletion
        res.status(501).json({
            status: 'error',
            error: { code: 'NOT_IMPLEMENTED', message: 'Issue deletion not implemented yet' },
        });
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
