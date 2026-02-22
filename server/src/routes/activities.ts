import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireHouseholdMember, requireAdmin } from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const userSelect = { id: true, name: true, email: true, avatar: true } as const;

// ============================================
// ACTIVITY / CALENDAR ENDPOINTS
// Owner: Emily
// ============================================

// POST / — Create an activity (any household member)
// TODO: Validate title is required and non-empty
// TODO: Validate activityType is one of: HOMEWORK, BONDING, CHORE, OTHER
// TODO: Validate scheduledAt is a valid ISO date
// TODO: Optionally add participantUserIds (validate they are household members)
// TODO: Set householdId from req.householdId
// TODO: Include participants and checkIns in response
router.post(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: Implement activity creation
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Activity creation not implemented yet' },
    });
  }
);

// GET / — List activities (paginated, filterable by status and activityType)
// TODO: Support ?page, ?limit, ?status, ?activityType query params
// TODO: Include participants with user details
// TODO: Order by scheduledAt asc (upcoming first)
router.get(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: Implement activity listing with pagination
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Activity listing not implemented yet' },
    });
  }
);

// GET /:activityId — Get a single activity with participants and check-ins
// TODO: Validate activity belongs to this household
// TODO: Include participants with user details and checkIns with user details
router.get(
  '/:activityId',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: Implement get single activity
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Get activity not implemented yet' },
    });
  }
);

// PUT /:activityId — Update an activity (creator or admin)
// TODO: Validate the activity belongs to this household
// TODO: Allow updating title, description, activityType, status, scheduledAt
router.put(
  '/:activityId',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: Implement activity update
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Activity update not implemented yet' },
    });
  }
);

// DELETE /:activityId — Delete an activity (admin only)
router.delete(
  '/:activityId',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: Implement activity deletion
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Activity deletion not implemented yet' },
    });
  }
);

// POST /:activityId/join — Join an activity (add self as participant)
// TODO: Prevent duplicate participation (unique constraint on [activityId, userId])
// TODO: Validate the activity belongs to this household
router.post(
  '/:activityId/join',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: Implement join activity
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Join activity not implemented yet' },
    });
  }
);

// POST /:activityId/leave — Leave an activity (remove self as participant)
// TODO: Validate user is currently a participant
router.post(
  '/:activityId/leave',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: Implement leave activity
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Leave activity not implemented yet' },
    });
  }
);

// POST /:activityId/check-in — Check in to an activity
// TODO: Validate the user is a participant of this activity
// TODO: Accept optional photoUrl and notes
router.post(
  '/:activityId/check-in',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // TODO: Implement check-in
    res.status(501).json({
      status: 'error',
      error: { code: 'NOT_IMPLEMENTED', message: 'Activity check-in not implemented yet' },
    });
  }
);

export default router;
