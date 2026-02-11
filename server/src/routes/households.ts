import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import {
  requireHousehold,
  requireHouseholdMember,
  requireOwner,
} from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const prisma = new PrismaClient();

// All household routes require authentication
router.use(authenticate);

// ============================================
// GET /api/households — Get current user's household
// ============================================
router.get(
  '/',
  requireHousehold,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const household = await prisma.household.findUnique({
      where: { id: req.householdId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
      },
    });

    res.json({
      status: 'success',
      data: household,
    });
  }
);

// ============================================
// POST /api/households — Create a new household
// ============================================
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Household name is required',
      },
    });
    return;
  }



  // Create household and set user as owner + member in a transaction
  const household = await prisma.$transaction(async (tx) => {
    const newHousehold = await tx.household.create({
      data: {
        name: name.trim(),
        ownerId: req.userId!,
      },
    });

    // Add the creator as a member with ADMIN role
    await tx.user.update({
      where: { id: req.userId },
      data: {
        householdId: newHousehold.id,
        role: 'ADMIN',
      },
    });

    return tx.household.findUnique({
      where: { id: newHousehold.id },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
      },
    });
  });

  res.status(201).json({
    status: 'success',
    data: household,
  });
});

// ============================================
// PUT /api/households/:id — Update household info (owner only)
// ============================================
router.put(
  '/:id',
  requireOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Household name is required',
        },
      });
      return;
    }

    const updated = await prisma.household.update({
      where: { id },
      data: { name: name.trim() },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
      },
    });

    res.json({
      status: 'success',
      data: updated,
    });
  }
);

// ============================================
// GET /api/households/:id/members — List household members
// ============================================
router.get(
  '/:id/members',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const members = await prisma.user.findMany({
      where: { householdId: req.householdId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({
      status: 'success',
      data: members,
    });
  }
);

// ============================================
// DELETE /api/households/:id/members/:userId — Remove member
// ============================================
router.delete(
  '/:id/members/:userId',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id, userId: targetUserId } = req.params;

    // isHouseholdOwner is populated by requireHouseholdMember middleware
    const isOwner = req.isHouseholdOwner!;
    const isSelf = targetUserId === req.userId;

    if (!isOwner && !isSelf) {
      res.status(403).json({
        status: 'error',
        error: {
          code: 'HOUSEHOLD_UNAUTHORIZED',
          message: 'Only the household owner can remove other members',
        },
      });
      return;
    }

    // Owner cannot remove themselves (must delete household instead)
    if (isOwner && isSelf) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'HOUSEHOLD_OWNER_CANNOT_LEAVE',
          message:
            'The household owner cannot leave. Transfer ownership or delete the household.',
        },
      });
      return;
    }

    // Verify target user is actually in this household
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { householdId: true },
    });

    if (!targetUser || targetUser.householdId !== id) {
      res.status(404).json({
        status: 'error',
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User is not a member of this household',
        },
      });
      return;
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        householdId: null,
        role: 'MEMBER',
      },
    });

    res.status(204).send();
  }
);

// ============================================
// POST /api/households/:id/invites — Generate invite code (owner only)
// ============================================

// In-memory invite store (swap to Redis/DB for production)
const inviteCodes = new Map<string, { householdId: string; expiresAt: Date }>();

router.post(
  '/:id/invites',
  requireOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    // Generate a random 8-character invite code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    inviteCodes.set(code, { householdId: id, expiresAt });

    res.status(201).json({
      status: 'success',
      data: {
        code,
        expiresAt: expiresAt.toISOString(),
      },
    });
  }
);

// ============================================
// POST /api/households/join/:code — Join household via invite code
// ============================================
router.post(
  '/join/:code',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { code } = req.params;

    const invite = inviteCodes.get(code.toUpperCase());

    if (!invite) {
      res.status(404).json({
        status: 'error',
        error: {
          code: 'INVITE_NOT_FOUND',
          message: 'Invalid invite code',
        },
      });
      return;
    }

    if (new Date() > invite.expiresAt) {
      inviteCodes.delete(code.toUpperCase());
      res.status(410).json({
        status: 'error',
        error: {
          code: 'INVITE_EXPIRED',
          message: 'This invite code has expired',
        },
      });
      return;
    }

    // Check if user already belongs to a household
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { householdId: true },
    });

    if (user?.householdId) {
      res.status(409).json({
        status: 'error',
        error: {
          code: 'HOUSEHOLD_ALREADY_MEMBER',
          message:
            'You are already a member of a household. Leave your current household first.',
        },
      });
      return;
    }

    // Join the household
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        householdId: invite.householdId,
        role: 'MEMBER',
      },
    });

    const household = await prisma.household.findUnique({
      where: { id: invite.householdId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
      },
    });

    res.json({
      status: 'success',
      data: household,
    });
  }
);

// Export the invite codes map for potential use by other modules
export { inviteCodes };
export default router;
