import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  /** Populated by requireHouseholdMember middleware */
  householdId?: string;
  /** Populated by requireHouseholdMember middleware (per-household role from HouseholdMember) */
  userRole?: Role;
  /** Populated by requireHouseholdMember middleware — true if user is the household owner */
  isHouseholdOwner?: boolean;
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
