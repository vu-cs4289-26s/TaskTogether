import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      error: {
        code: 'AUTH_TOKEN_MISSING',
        message: 'Authentication token is required.',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({
      status: 'error',
      error: {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Invalid or expired authentication token.',
      },
    });
  }
}
