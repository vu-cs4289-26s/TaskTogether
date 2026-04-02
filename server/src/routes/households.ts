import { Router, Response } from 'express';
import crypto from 'crypto';
import { Prisma, HouseholdInvite } from '@prisma/client';
import { authenticate } from '../middleware/authentication.js';
import {
  requireHouseholdMember,
  requireAdmin,
} from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';
import { sendEmail } from '../utils/sendEmail.js';
import { sendError, sendSuccess, sendPaginated } from '../utils/responses.js';

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

      sendPaginated(res, households, { page, limit, total });
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch households');
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
        sendError(res, 404, 'HOUSEHOLD_NOT_FOUND', 'Household not found');
        return;
      }

      sendSuccess(res, {
        ...household,
        myRole: req.userRole,
      });
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch household');
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
        sendError(res, 400, 'VALIDATION_ERROR', 'Household name is required');
        return;
      }

      if (name.trim().length > MAX_NAME_LENGTH) {
        sendError(res, 400, 'VALIDATION_ERROR', `Household name must be ${MAX_NAME_LENGTH} characters or fewer`);
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

      sendSuccess(res, household, 201);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create household');
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
        sendError(res, 400, 'VALIDATION_ERROR', 'Household name is required');
        return;
      }

      if (name.trim().length > MAX_NAME_LENGTH) {
        sendError(res, 400, 'VALIDATION_ERROR', `Household name must be ${MAX_NAME_LENGTH} characters or fewer`);
        return;
      }

      const updated = await prisma.household.update({
        where: { id: req.householdId },
        data: { name: name.trim() },
        include: householdWithMembers,
      });

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update household');
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
        sendSuccess(res, {message: 'Your vote to delete this household has been recorded', votesReceived: voteCount, votesRequired: adminCount}, 202);
      }
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to process delete vote');
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

      sendSuccess(res, { votesReceived: votes.length, votesRequired: adminCount, myVote: votes.some((v) => v.voterId === req.userId), votes });
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch delete vote status');
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
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to retract delete vote');
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

      sendSuccess(res, data);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch members');
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
        sendError(res, 400, 'VALIDATION_ERROR', 'Role changes are only allowed for promotion to ADMIN. Demotion is not permitted.');
        return;
      }

      // Cannot change your own role
      if (targetUserId === req.userId) {
        sendError(res, 400, 'VALIDATION_ERROR', 'You cannot change your own role');
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
        sendError(res, 404, 'USER_NOT_FOUND', 'User is not a member of this household');
        return;
      }

      // Already an admin — idempotent response
      if (membership.role === 'ADMIN') {
        sendSuccess(res, { message: 'User is already an ADMIN' });
        return;
      }

      const updated = await prisma.householdMember.update({
        where: { id: membership.id },
        data: { role: 'ADMIN' },
        include: {
          user: { select: userSelect },
        },
      });

      sendSuccess(res, { ...updated.user, role: updated.role, joinedAt: updated.createdAt });
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update member role');
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
        sendError(res, 404, 'USER_NOT_FOUND', 'User is not a member of this household');
        return;
      }

      if (!isSelf) {
        // Trying to remove someone else — must be an admin
        if (!requesterIsAdmin) {
          sendError(res, 403, 'ADMIN_REQUIRED', 'Only admins can remove other members');
          return;
        }

        // Admins cannot forcibly remove other admins
        if (targetMembership.role === 'ADMIN') {
          sendError(res, 403, 'CANNOT_REMOVE_ADMIN', 'Admins cannot be removed by other admins. They must leave voluntarily.');
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
            sendError(res, 400, 'LAST_ADMIN_CANNOT_LEAVE', 'You are the last admin. Promote another member to admin before leaving.');
            return;
          }
        }
        // MEMBER leaving — always allowed, fall through
      }

      await prisma.householdMember.delete({ where: { id: targetMembership.id } });
      res.status(204).send();
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to remove member');
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
      // Expire all existing active invites for this household (enforce max 1 active)
      await prisma.householdInvite.updateMany({
        where: {
          householdId: req.householdId!,
          expiresAt: { gt: new Date() },
        },
        data: { expiresAt: new Date() },
      });

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const createInviteWithRetry = async (): Promise<HouseholdInvite> => {
        const MAX_ATTEMPTS = 5;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const code = crypto.randomBytes(4).toString('hex').toUpperCase();
          try {
            return await prisma.householdInvite.create({
              data: {
                code,
                expiresAt,
                householdId: req.householdId!,
              },
            });
          } catch (err) {
            const isUniqueViolation =
              err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

            if (!isUniqueViolation || attempt === MAX_ATTEMPTS) {
              throw err;
            }
            // Collision: retry with a new code
          }
        }

        throw new Error('Failed to create invite after retries');
      };

      const invite = await createInviteWithRetry();
      sendSuccess(res, { code: invite.code, expiresAt: invite.expiresAt.toISOString() }, 201);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create invite');
    }
  }
);

// ============================================
// GET /api/households/:id/invites/active — Get active invite code (admin only)
// ============================================
router.get(
  '/:id/invites/active',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const invite = await prisma.householdInvite.findFirst({
        where: {
          householdId: req.householdId!,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      sendSuccess(res, invite ? { code: invite.code, expiresAt: invite.expiresAt.toISOString() } : null);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch active invite');
    }
  }
);

// ============================================
// DELETE /api/households/:id/invites/active — Force-expire active invite (admin only)
// ============================================
router.delete(
  '/:id/invites/active',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await prisma.householdInvite.updateMany({
        where: {
          householdId: req.householdId!,
          expiresAt: { gt: new Date() },
        },
        data: { expiresAt: new Date() },
      });

      if (result.count === 0) {
        sendError(res, 404, 'NO_ACTIVE_INVITE', 'No active invite code to expire');
        return;
      }

      sendSuccess(res, null);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to expire invite');
    }
  }
);

// ============================================
// POST /api/households/:id/invites/email — Send email invite (admin only)
// ============================================
router.post(
  '/:id/invites/email',
  requireHouseholdMember,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      // Validate email
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Valid email is required');
        return;
      }

      // Get household info
      const household = await prisma.household.findUnique({
        where: { id: req.householdId! },
        select: { name: true },
      });

      if (!household) {
        sendError(res, 404, 'HOUSEHOLD_NOT_FOUND', 'Household not found');
        return;
      }

      // Check if email is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });

      if (existingUser) {
        const existingMembership = await prisma.householdMember.findUnique({
          where: {
            userId_householdId: {
              userId: existingUser.id,
              householdId: req.householdId!,
            },
          },
        });

        if (existingMembership) {
          sendError(res, 409, 'ALREADY_MEMBER', 'This user is already a member of this household');
          return;
        }
      }

      // Check for existing active invite
      let invite = await prisma.householdInvite.findFirst({
        where: {
          householdId: req.householdId!,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Create new invite if none exists
      if (!invite) {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const createInviteWithRetry = async (): Promise<HouseholdInvite> => {
          const MAX_ATTEMPTS = 5;
          for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            try {
              return await prisma.householdInvite.create({
                data: {
                  code,
                  expiresAt,
                  householdId: req.householdId!,
                },
              });
            } catch (err) {
              const isUniqueViolation =
                err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
              if (!isUniqueViolation || attempt === MAX_ATTEMPTS) {
                throw err;
              }
            }
          }
          throw new Error('Failed to create invite after retries');
        };
        invite = await createInviteWithRetry();
      }

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const inviteUrl = `${clientUrl}/invite/${invite.code}`;

      // Send email
      await sendEmail({
        to: email.toLowerCase(),
        subject: `You've been invited to join ${household.name} on TaskTogether`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2d6a4f;">You're Invited to Join ${household.name}!</h2>
            <p>Hello,</p>
            <p>You've been invited to join the household <strong>${household.name}</strong> on TaskTogether.</p>
            <p>Click the button below to accept the invitation and join:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" 
                 style="background-color: #2d6a4f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>Note:</strong> This invitation link expires in 7 days.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `You've been invited to join ${household.name} on TaskTogether.\n\nVisit this link to accept: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
      });

      sendSuccess(res, { email: email.toLowerCase(), sent: true });
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to send invite email');
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
        sendError(res, 404, 'INVITE_NOT_FOUND', 'Invalid invite code');
        return;
      }

      if (new Date() > invite.expiresAt) {
        sendError(res, 410, 'INVITE_EXPIRED', 'This invite code has expired');
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
        sendError(res, 409, 'HOUSEHOLD_ALREADY_MEMBER', 'You are already a member of this household.');
        return;
      }

      // Join the household in a transaction
      const household = await prisma.$transaction(async (tx) => {
        await tx.householdMember.create({
          data: {
            userId: req.userId!,
            householdId: invite.householdId,
            role: 'MEMBER',
          },
        });

        return tx.household.findUnique({
          where: { id: invite.householdId },
          include: householdWithMembers,
        });
      });

      sendSuccess(res, household);
    } catch (err) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Failed to join household');
    }
  }
);

export default router;
