import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
