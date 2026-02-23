import { Router, Response } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import {
  requireHouseholdMember,
  requireAdmin,
} from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

const router = Router();

// All household routes require authentication
router.use(authenticate);

// Reusable select for user fields (never leak password)
const userSelect = { id: true, name: true, email: true, avatar: true } as const;

// Reusable include for household with members
const householdWithMembers = {
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
// Creator is automatically added as ADMIN.
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
// PUT /api/households/:id — Update household info (any admin)
// ============================================
router.put(
  '/:id',
  requireHouseholdMember,
  requireAdmin,
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
// DELETE /api/households/:id — Consensual deletion (all admins must vote)
// Each admin calling this casts a vote. When all admins have voted, the
// household is deleted. Voting is idempotent — calling twice has no effect.
// ============================================
router.delete(
  '/:id',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const householdId = req.householdId!;
      const voterId = req.userId!;

      // Fetch all admins in this household
      const adminMembers = await prisma.householdMember.findMany({
        where: { householdId, role: 'ADMIN' },
        select: { userId: true },
      });

      // Record this admin's vote (upsert — idempotent)
      await prisma.householdDeleteVote.upsert({
        where: { householdId_voterId: { householdId, voterId } },
        create: { householdId, voterId },
        update: {},
      });

      // Count votes so far
      const voteCount = await prisma.householdDeleteVote.count({
        where: { householdId },
      });

      const adminCount = adminMembers.length;

      if (voteCount >= adminCount) {
        // All admins have voted — delete household (cascades all related data)
        await prisma.household.delete({ where: { id: householdId } });
        res.status(204).send();
      } else {
        // Waiting on remaining admins
        res.status(202).json({
          status: 'success',
          data: {
            message: 'Your vote to delete this household has been recorded',
            votesReceived: voteCount,
            votesRequired: adminCount,
          },
        });
      }
    } catch (err) {
      console.error('DELETE /api/households/:id error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process delete vote' },
      });
    }
  }
);

// ============================================
// GET /api/households/:id/delete-vote — Check current delete vote status
// ============================================
router.get(
  '/:id/delete-vote',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const householdId = req.householdId!;

      const [adminCount, votes] = await Promise.all([
        prisma.householdMember.count({ where: { householdId, role: 'ADMIN' } }),
        prisma.householdDeleteVote.findMany({
          where: { householdId },
          select: { voterId: true, createdAt: true },
        }),
      ]);

      res.json({
        status: 'success',
        data: {
          votesReceived: votes.length,
          votesRequired: adminCount,
          myVote: votes.some((v) => v.voterId === req.userId),
          votes,
        },
      });
    } catch (err) {
      console.error('GET /api/households/:id/delete-vote error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch delete vote status' },
      });
    }
  }
);

// ============================================
// DELETE /api/households/:id/delete-vote — Retract your delete vote
// ============================================
router.delete(
  '/:id/delete-vote',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await prisma.householdDeleteVote.deleteMany({
        where: { householdId: req.householdId!, voterId: req.userId! },
      });
      res.status(204).send();
    } catch (err) {
      console.error('DELETE /api/households/:id/delete-vote error:', err);
      res.status(500).json({
        status: 'error',
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retract delete vote' },
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

      const data = members.map((m) => ({
        ...m.user,
        role: m.role,
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
// PUT /api/households/:id/members/:userId/role — Promote member to admin (admin only)
// Demotion is not permitted — once admin, always admin.
// ============================================
router.put(
  '/:id/members/:userId/role',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId: targetUserId } = req.params;
      const { role } = req.body;

      // Only promotion to ADMIN is allowed
      if (role !== 'ADMIN') {
        res.status(400).json({
          status: 'error',
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Role changes are only allowed for promotion to ADMIN. Demotion is not permitted.',
          },
        });
        return;
      }

      // Cannot change your own role
      if (targetUserId === req.userId) {
        res.status(400).json({
          status: 'error',
          error: { code: 'VALIDATION_ERROR', message: 'You cannot change your own role' },
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

      // Already an admin — idempotent response
      if (membership.role === 'ADMIN') {
        res.json({
          status: 'success',
          data: { message: 'User is already an ADMIN' },
        });
        return;
      }

      const updated = await prisma.householdMember.update({
        where: { id: membership.id },
        data: { role: 'ADMIN' },
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
// DELETE /api/households/:id/members/:userId — Remove member or leave household
//
// Rules:
// - Any admin can remove a MEMBER; admins cannot forcibly remove other admins.
// - Any user can leave themselves.
// - An admin trying to leave must ensure at least one other admin remains.
// ============================================
router.delete(
  '/:id/members/:userId',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId: targetUserId } = req.params;
      const householdId = req.householdId!;
      const isSelf = targetUserId === req.userId;
      const requesterIsAdmin = req.userRole === 'ADMIN';

      // Find the target membership to understand their role
      const targetMembership = await prisma.householdMember.findUnique({
        where: {
          userId_householdId: { userId: targetUserId, householdId },
        },
      });

      if (!targetMembership) {
        res.status(404).json({
          status: 'error',
          error: { code: 'USER_NOT_FOUND', message: 'User is not a member of this household' },
        });
        return;
      }

      if (!isSelf) {
        // Trying to remove someone else — must be an admin
        if (!requesterIsAdmin) {
          res.status(403).json({
            status: 'error',
            error: { code: 'ADMIN_REQUIRED', message: 'Only admins can remove other members' },
          });
          return;
        }

        // Admins cannot forcibly remove other admins
        if (targetMembership.role === 'ADMIN') {
          res.status(403).json({
            status: 'error',
            error: {
              code: 'CANNOT_REMOVE_ADMIN',
              message: 'Admins cannot be removed by other admins. They must leave voluntarily.',
            },
          });
          return;
        }
        // Admin removing a MEMBER — allowed, fall through
      } else {
        // Leaving yourself
        if (requesterIsAdmin) {
          // Must ensure at least one other admin remains
          const otherAdminCount = await prisma.householdMember.count({
            where: { householdId, role: 'ADMIN', userId: { not: req.userId } },
          });

          if (otherAdminCount === 0) {
            res.status(400).json({
              status: 'error',
              error: {
                code: 'LAST_ADMIN_CANNOT_LEAVE',
                message: 'You are the last admin. Promote another member to admin before leaving.',
              },
            });
            return;
          }
        }
        // MEMBER leaving — always allowed, fall through
      }

      await prisma.householdMember.delete({ where: { id: targetMembership.id } });
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
// POST /api/households/:id/invites — Generate invite code (any admin)
// Persisted to database instead of in-memory
// ============================================
router.post(
  '/:id/invites',
  requireHouseholdMember,
  requireAdmin,
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
