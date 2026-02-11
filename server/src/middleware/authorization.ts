import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types/index.js';

const prisma = new PrismaClient();

/**
 * requireHousehold
 *
 * Looks up the authenticated user's household membership and attaches
 * `req.householdId` and `req.userRole` to the request.
 *
 * Returns 404 if the user is not in any household.
 *
 * Use AFTER `authenticate` middleware.
 * Use BEFORE any route that needs household context.
 */
export function requireHousehold(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  prisma.user
    .findUnique({
      where: { id: req.userId },
      select: {
        householdId: true,
        role: true,
        household: { select: { ownerId: true } },
      },
    })
    .then((user) => {
      if (!user || !user.householdId) {
        res.status(404).json({
          status: 'error',
          error: {
            code: 'HOUSEHOLD_NOT_FOUND',
            message: 'You are not a member of any household',
          },
        });
        return;
      }

      req.householdId = user.householdId;
      req.userRole = user.role;
      req.isHouseholdOwner = user.household?.ownerId === req.userId;
      next();
    })
    .catch((err) => {
      next(err);
    });
}

/**
 * requireHouseholdMember
 *
 * Validates that the authenticated user belongs to the household specified
 * by `:id` in the route params. Attaches `req.householdId` and `req.userRole`.
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
    prisma.user.findUnique({
      where: { id: req.userId },
      select: { householdId: true, role: true },
    }),
    prisma.household.findUnique({
      where: { id: targetHouseholdId },
      select: { ownerId: true },
    }),
  ])
    .then(([user, household]) => {
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

      if (!user || user.householdId !== targetHouseholdId) {
        res.status(403).json({
          status: 'error',
          error: {
            code: 'HOUSEHOLD_UNAUTHORIZED',
            message: 'You are not a member of this household',
          },
        });
        return;
      }

      req.householdId = user.householdId;
      req.userRole = user.role;
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
 * Checks that `req.userRole` is ADMIN. Must be used AFTER `requireHousehold`
 * or `requireHouseholdMember` (which populate `req.userRole`).
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

      // Also populate householdId for downstream use
      req.householdId = targetHouseholdId;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
