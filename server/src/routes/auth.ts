import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function sanitizeUser(user: { id: string; email: string; name: string; avatar: string | null; role: string; householdId: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    householdId: user.householdId,
  };
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name, email, and password are required',
      },
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters',
      },
    });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({
      status: 'error',
      error: {
        code: 'AUTH_EMAIL_EXISTS',
        message: 'An account with this email already exists',
      },
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  const token = generateToken(user.id);

  res.status(201).json({
    status: 'success',
    data: {
      user: sanitizeUser(user),
      token,
    },
  });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({
      status: 'error',
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({
      status: 'error',
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const token = generateToken(user.id);

  res.json({
    status: 'success',
    data: {
      user: sanitizeUser(user),
      token,
    },
  });
});

// GET /api/users/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
  });

  if (!user) {
    res.status(404).json({
      status: 'error',
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      },
    });
    return;
  }

  res.json({
    status: 'success',
    data: sanitizeUser(user),
  });
});

export default router;
