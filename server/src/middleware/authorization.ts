import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

/**
 * requireHouseholdMember
 *
 * Validates that the authenticated user belongs to the household specified
 * by `:id` in the route params. Attaches `req.householdId`, `req.userRole`,
 * and `req.isHouseholdOwner` to the request.
 *
 * Returns 403 if the user is not a member of that specific household.
 *
 * Use AFTER `authenticate` middleware.
 * Use on routes like `/api/households/:id/members`.
 */
export function requireHouseholdMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const targetHouseholdId = req.params.id;

  Promise.all([
    prisma.householdMember.findUnique({
      where: {
        userId_householdId: {
          userId: req.userId!,
          householdId: targetHouseholdId,
        },
      },
      select: { role: true },
    }),
    prisma.household.findUnique({
      where: { id: targetHouseholdId },
      select: { ownerId: true },
    }),
  ])
    .then(([membership, household]) => {
      if (!household) {
        res.status(404).json({
          status: 'error',
          error: {
            code: 'HOUSEHOLD_NOT_FOUND',
            message: 'Household not found',
          },
        });
        return;
      }

      if (!membership) {
        res.status(403).json({
          status: 'error',
          error: {
            code: 'HOUSEHOLD_UNAUTHORIZED',
            message: 'You are not a member of this household',
          },
        });
        return;
      }

      req.householdId = targetHouseholdId;
      req.userRole = membership.role;
      req.isHouseholdOwner = household.ownerId === req.userId;
      next();
    })
    .catch((err) => {
      next(err);
    });
}

/**
 * requireAdmin
 *
 * Checks that `req.userRole` is ADMIN. Must be used AFTER `requireHouseholdMember`
 * (which populates `req.userRole`).
 *
 * Returns 403 if the user is not an ADMIN.
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({
      status: 'error',
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'This action requires admin privileges',
      },
    });
    return;
  }

  next();
}

/**
 * requireOwner
 *
 * Checks that the authenticated user is the owner of the household specified
 * by `:id` in the route params.
 *
 * Returns 403 if the user is not the owner.
 *
 * Use AFTER `authenticate` middleware.
 */
export function requireOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const targetHouseholdId = req.params.id;

  prisma.household
    .findUnique({
      where: { id: targetHouseholdId },
      select: { ownerId: true },
    })
    .then((household) => {
      if (!household) {
        res.status(404).json({
          status: 'error',
          error: {
            code: 'HOUSEHOLD_NOT_FOUND',
            message: 'Household not found',
          },
        });
        return;
      }

      if (household.ownerId !== req.userId) {
        res.status(403).json({
          status: 'error',
          error: {
            code: 'HOUSEHOLD_UNAUTHORIZED',
            message: 'Only the household owner can perform this action',
          },
        });
        return;
      }

      req.householdId = targetHouseholdId;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
