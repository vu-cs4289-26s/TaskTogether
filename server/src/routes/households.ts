import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import {
  requireHouseholdMember,
  requireAdmin,
  requireOwner,
} from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

const router = Router();

// All household routes require authentication
router.use(authenticate);

// Reusable select for user fields (never leak password)
const userSelect = { id: true, name: true, email: true, avatar: true } as const;

// Reusable include for household with owner + members
const householdWithMembers = {
  owner: { select: userSelect },
  members: {
    include: {
      user: { select: userSelect },
    },
  },
} as const;

// Max household name length
const MAX_NAME_LENGTH = 100;

// ============================================
// GET /api/households — Get all households the user belongs to
// Supports optional pagination via ?page=1&limit=20
// ============================================
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [memberships, total] = await Promise.all([
        prisma.householdMember.findMany({
          where: { userId: req.userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            household: {
              include: householdWithMembers,
            },
          },
        }),
        prisma.householdMember.count({ where: { userId: req.userId } }),
      ]);

      const households = memberships.map((m) => ({
        ...m.household,
        myRole: m.role,
      }));

      res.json({
        status: 'success',
        data: households,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('GET /api/households error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch households' },
      });
    }
  }
);

// ============================================
// GET /api/households/:id — Get a single household
// ============================================
router.get(
  '/:id',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const household = await prisma.household.findUnique({
        where: { id: req.householdId },
        include: householdWithMembers,
      });

      if (!household) {
        res.status(404).json({
          status: 'error',
          error: { code: 'HOUSEHOLD_NOT_FOUND', message: 'Household not found' },
        });
        return;
      }

      res.json({
        status: 'success',
        data: {
          ...household,
          myRole: req.userRole,
        },
      });
    } catch (err) {
      console.error('GET /api/households/:id error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch household' },
      });
    }
  }
);

// ============================================
// POST /api/households — Create a new household
// ============================================
router.post(
  '/',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'Household name is required' },
        });
        return;
      }

      if (name.trim().length > MAX_NAME_LENGTH) {
        res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: `Household name must be ${MAX_NAME_LENGTH} characters or fewer`,
          },
        });
        return;
      }

      // Create household and add the creator as an ADMIN member in a transaction
      const household = await prisma.$transaction(async (tx) => {
        const newHousehold = await tx.household.create({
          data: {
            name: name.trim(),
            ownerId: req.userId!,
          },
        });

        await tx.householdMember.create({
          data: {
            userId: req.userId!,
            householdId: newHousehold.id,
            role: 'ADMIN',
          },
        });

        return tx.household.findUnique({
          where: { id: newHousehold.id },
          include: householdWithMembers,
        });
      });

      res.status(201).json({
        status: 'success',
        data: household,
      });
    } catch (err) {
      console.error('POST /api/households error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create household' },
      });
    }
  }
);

// ============================================
// PUT /api/households/:id — Update household info (owner only)
// ============================================
router.put(
  '/:id',
  requireOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'Household name is required' },
        });
        return;
      }

      if (name.trim().length > MAX_NAME_LENGTH) {
        res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: `Household name must be ${MAX_NAME_LENGTH} characters or fewer`,
          },
        });
        return;
      }

      const updated = await prisma.household.update({
        where: { id: req.householdId },
        data: { name: name.trim() },
        include: householdWithMembers,
      });

      res.json({
        status: 'success',
        data: updated,
      });
    } catch (err) {
      console.error('PUT /api/households/:id error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update household' },
      });
    }
  }
);

// ============================================
// DELETE /api/households/:id — Delete household (owner only)
// ============================================
router.delete(
  '/:id',
  requireOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await prisma.household.delete({
        where: { id: req.householdId },
      });

      res.status(204).send();
    } catch (err) {
      console.error('DELETE /api/households/:id error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete household' },
      });
    }
  }
);

// ============================================
// PUT /api/households/:id/transfer — Transfer ownership (owner only)
// ============================================
router.put(
  '/:id/transfer',
  requireOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { newOwnerId } = req.body;

      if (!newOwnerId || typeof newOwnerId !== 'string') {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'newOwnerId is required' },
        });
        return;
      }

      // Verify the new owner is a member of this household
      const membership = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: {
            userId: newOwnerId,
            householdId: req.householdId!,
          },
        },
      });

      if (!membership) {
        res.status(404).json({
          status: 'error',
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Target user is not a member of this household',
          },
        });
        return;
      }

      // Transfer ownership and promote new owner to ADMIN in a transaction
      const updated = await prisma.$transaction(async (tx) => {
        await tx.household.update({
          where: { id: req.householdId! },
          data: { ownerId: newOwnerId },
        });

        // Promote the new owner to ADMIN if they aren't already
        await tx.householdMember.update({
          where: { id: membership.id },
          data: { role: 'ADMIN' },
        });

        return tx.household.findUnique({
          where: { id: req.householdId! },
          include: householdWithMembers,
        });
      });

      res.json({
        status: 'success',
        data: updated,
      });
    } catch (err) {
      console.error('PUT /api/households/:id/transfer error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to transfer ownership' },
      });
    }
  }
);

// ============================================
// GET /api/households/:id/members — List household members
// ============================================
router.get(
  '/:id/members',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const members = await prisma.householdMember.findMany({
        where: { householdId: req.householdId },
        include: {
          user: { select: userSelect },
        },
      });

      const household = await prisma.household.findUnique({
        where: { id: req.householdId },
        select: { ownerId: true },
      });

      const data = members.map((m) => ({
        ...m.user,
        role: m.role,
        isOwner: m.userId === household?.ownerId,
        joinedAt: m.createdAt,
      }));

      res.json({
        status: 'success',
        data,
      });
    } catch (err) {
      console.error('GET /api/households/:id/members error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch members' },
      });
    }
  }
);

// ============================================
// PUT /api/households/:id/members/:userId/role — Update member role (admin only)
// ============================================
router.put(
  '/:id/members/:userId/role',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId: targetUserId } = req.params;
      const { role } = req.body;

      if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'Role must be ADMIN or MEMBER' },
        });
        return;
      }

      // Cannot change the owner's role
      const household = await prisma.household.findUnique({
        where: { id: req.householdId },
        select: { ownerId: true },
      });

      if (targetUserId === household?.ownerId) {
        res.status(400).json({
          status: 'error',
          error: {
            code: 'CANNOT_CHANGE_OWNER_ROLE',
            message: 'Cannot change the household owner\'s role. Transfer ownership instead.',
          },
        });
        return;
      }

      const membership = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: {
            userId: targetUserId,
            householdId: req.householdId!,
          },
        },
      });

      if (!membership) {
        res.status(404).json({
          status: 'error',
          error: { code: 'USER_NOT_FOUND', message: 'User is not a member of this household' },
        });
        return;
      }

      const updated = await prisma.householdMember.update({
        where: { id: membership.id },
        data: { role },
        include: {
          user: { select: userSelect },
        },
      });

      res.json({
        status: 'success',
        data: {
          ...updated.user,
          role: updated.role,
          joinedAt: updated.createdAt,
        },
      });
    } catch (err) {
      console.error('PUT /api/households/:id/members/:userId/role error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update member role' },
      });
    }
  }
);

// ============================================
// DELETE /api/households/:id/members/:userId — Remove member
// ============================================
router.delete(
  '/:id/members/:userId',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id, userId: targetUserId } = req.params;

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

      // Owner cannot remove themselves (must delete household or transfer ownership)
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
      const membership = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: {
            userId: targetUserId,
            householdId: id,
          },
        },
      });

      if (!membership) {
        res.status(404).json({
          status: 'error',
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User is not a member of this household',
          },
        });
        return;
      }

      await prisma.householdMember.delete({
        where: { id: membership.id },
      });

      res.status(204).send();
    } catch (err) {
      console.error('DELETE /api/households/:id/members/:userId error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' },
      });
    }
  }
);

// ============================================
// POST /api/households/:id/invites — Generate invite code (owner only)
// Persisted to database instead of in-memory
// ============================================
router.post(
  '/:id/invites',
  requireOwner,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Generate a random 8-character invite code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invite = await prisma.householdInvite.create({
        data: {
          code,
          expiresAt,
          householdId: req.householdId!,
        },
      });

      res.status(201).json({
        status: 'success',
        data: {
          code: invite.code,
          expiresAt: invite.expiresAt.toISOString(),
        },
      });
    } catch (err) {
      console.error('POST /api/households/:id/invites error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create invite' },
      });
    }
  }
);

// ============================================
// POST /api/households/join/:code — Join household via invite code
// ============================================
router.post(
  '/join/:code',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const invite = await prisma.householdInvite.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!invite) {
        res.status(404).json({
          status: 'error',
          error: { code: 'INVITE_NOT_FOUND', message: 'Invalid invite code' },
        });
        return;
      }

      if (invite.usedAt) {
        res.status(410).json({
          status: 'error',
          error: { code: 'INVITE_USED', message: 'This invite code has already been used' },
        });
        return;
      }

      if (new Date() > invite.expiresAt) {
        res.status(410).json({
          status: 'error',
          error: { code: 'INVITE_EXPIRED', message: 'This invite code has expired' },
        });
        return;
      }

      // Check if user is already a member of this household
      const existingMembership = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: {
            userId: req.userId!,
            householdId: invite.householdId,
          },
        },
      });

      if (existingMembership) {
        res.status(409).json({
          status: 'error',
          error: {
            code: 'HOUSEHOLD_ALREADY_MEMBER',
            message: 'You are already a member of this household.',
          },
        });
        return;
      }

      // Join the household and mark invite as used in a transaction
      const household = await prisma.$transaction(async (tx) => {
        await tx.householdMember.create({
          data: {
            userId: req.userId!,
            householdId: invite.householdId,
            role: 'MEMBER',
          },
        });

        await tx.householdInvite.update({
          where: { id: invite.id },
          data: { usedAt: new Date() },
        });

        return tx.household.findUnique({
          where: { id: invite.householdId },
          include: householdWithMembers,
        });
      });

      res.json({
        status: 'success',
        data: household,
      });
    } catch (err) {
      console.error('POST /api/households/join/:code error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to join household' },
      });
    }
  }
);

export default router;
