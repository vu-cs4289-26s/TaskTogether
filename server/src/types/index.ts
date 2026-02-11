import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  /** Populated by requireHousehold / requireHouseholdMember middleware */
  householdId?: string;
  /** Populated by requireHousehold / requireHouseholdMember middleware */
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
