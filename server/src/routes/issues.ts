import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireHouseholdMember, requireAdmin } from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const userSelect = { id: true, name: true, email: true, avatar: true } as const;

// ============================================
// ISSUE ENDPOINTS
// Owner: Sahnee
// ============================================

// POST / — Create an issue (any household member)
// TODO: Validate title is required and non-empty
// TODO: Set reportedById to req.userId
// TODO: Set householdId from req.householdId
// TODO: Include reportedBy and comments in response
router.post(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: Implement issue creation
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Issue creation not implemented yet' },
    });
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
    // TODO: Implement get single issue
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Get issue not implemented yet' },
    });
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
