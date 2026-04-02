import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';
import { sendError } from '../utils/responses.js';

/**
 * requireHouseholdMember
 *
 * Validates that the authenticated user belongs to the household specified
 * by `:id` in the route params. Attaches `req.householdId` and `req.userRole`
 * to the request.
 *
 * Returns 404 if the household does not exist.
 * Returns 403 if the user is not a member of that household.
 *
 * Use AFTER `authenticate` middleware.
 */
export function requireHouseholdMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const targetHouseholdId = req.params.id;

  prisma.householdMember
    .findUnique({
      where: {
        userId_householdId: {
          userId: req.userId!,
          householdId: targetHouseholdId,
        },
      },
      select: { role: true },
    })
    .then((membership) => {
      if (!membership) {
        // Distinguish "household doesn't exist" from "user not a member"
        return prisma.household
          .findUnique({ where: { id: targetHouseholdId }, select: { id: true } })
          .then((household) => {
            if (!household) {
              sendError(res, 404, 'HOUSEHOLD_NOT_FOUND', 'Household not found');
            } else {
              sendError(res, 403, 'HOUSEHOLD_UNAUTHORIZED', 'You are not a member of this household');
            }
          });
      }

      req.householdId = targetHouseholdId;
      req.userRole = membership.role;
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
    sendError(res, 403, 'ADMIN_REQUIRED', 'This action requires admin privileges');
    return;
  }

  next();
}
