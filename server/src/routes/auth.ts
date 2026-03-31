import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;
const TWO_FACTOR_CODE_TTL_MS = 1000 * 60 * 10;

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  passwordUpdatedAt: Date | null;
  twoFactorEnabled: boolean;
  createdAt?: Date;
  timezone: string | null; 
  timezoneAuto: boolean
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    passwordUpdatedAt: user.passwordUpdatedAt,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
    timezone: user.timezone,
    timezoneAuto: user.timezoneAuto,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getResetPasswordBaseUrl(): string {
  return (
    process.env.RESET_PASSWORD_URL ||
    `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password`
  );
}

function getPasswordValidationError(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number';
  }
  return null;
}

function generateTwoFactorCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'noreply@tasktogether.local';

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.log('\n[TaskTogether Password Reset]');
    console.log(`To: ${email}`);
    console.log(`Reset link: ${resetUrl}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Reset your TaskTogether password',
    text: `We received a request to reset your password. Use the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <p>We received a request to reset your TaskTogether password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

async function sendTwoFactorCodeEmail(email: string, code: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'noreply@tasktogether.local';

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.log('\n[TaskTogether 2FA Code]');
    console.log(`To: ${email}`);
    console.log(`2FA code: ${code}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Your TaskTogether verification code',
    text: `Your TaskTogether verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
    html: `
      <p>Your TaskTogether verification code is:</p>
      <h2>${code}</h2>
      <p>This code will expire in 10 minutes.</p>
    `,
  });
}

async function findValidResetTokenRecord(token: string) {
  const tokenHash = hashResetToken(token);

  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
}

async function issueAndSendTwoFactorCode(user: { id: string; email: string }) {
  const code = generateTwoFactorCode();
  const expiresAt = new Date(Date.now() + TWO_FACTOR_CODE_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorCode: code,
      twoFactorCodeExpiry: expiresAt,
    },
  });

  await sendTwoFactorCodeEmail(user.email, code);

  return expiresAt;
}

async function getAuthenticatedUser(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) {
    res.status(401).json({
      status: 'error',
      error: {
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
      },
    });
    return null;
  }

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
    return null;
  }

  return user;
}

function isTwoFactorCodeValid(
  user: {
    twoFactorCode: string | null;
    twoFactorCodeExpiry: Date | null;
  },
  code: string
): boolean {
  return (
    !!user.twoFactorCode &&
    !!user.twoFactorCodeExpiry &&
    user.twoFactorCode === code.trim() &&
    user.twoFactorCodeExpiry > new Date()
  );
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : '';

  if (!name || !normalizedEmail || !password) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name, email, and password are required',
      },
    });
    return;
  }

  if (!isValidEmail(normalizedEmail)) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please enter a valid email address',
      },
    });
    return;
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: passwordError,
      },
    });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      passwordUpdatedAt: now,
    },
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
  const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : '';

  if (!normalizedEmail || !password) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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

  if (user.twoFactorEnabled) {
    await issueAndSendTwoFactorCode(user);

    res.json({
      status: 'success',
      data: {
        requiresTwoFactor: true,
        userId: user.id,
        message: 'A verification code has been sent to your email',
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

// POST /api/auth/2fa/verify-login
router.post('/2fa/verify-login', async (req: Request, res: Response): Promise<void> => {
  const { userId, code } = req.body;

  if (!userId || !code) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'User ID and verification code are required',
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user.twoFactorEnabled) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: 'Two-factor authentication is not enabled for this account',
      },
    });
    return;
  }

  if (!isTwoFactorCodeValid(user, String(code))) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_INVALID_OR_EXPIRED',
        message: 'Verification code is invalid or has expired',
      },
    });
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorCode: null,
      twoFactorCodeExpiry: null,
    },
  });

  const token = generateToken(user.id);

  res.json({
    status: 'success',
    data: {
      user: sanitizeUser(updatedUser),
      token,
    },
  });
});

// POST /api/auth/2fa/enable
// Option B request step: send code, do not enable yet
router.post('/2fa/enable', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  if (user.twoFactorEnabled) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_ALREADY_ENABLED',
        message: 'Two-factor authentication is already enabled',
      },
    });
    return;
  }

  await issueAndSendTwoFactorCode(user);

  res.json({
    status: 'success',
    data: {
      message: 'Verification code sent successfully',
    },
  });
});

// POST /api/auth/2fa/verify-enable
router.post('/2fa/verify-enable', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  const { code } = req.body;

  if (!code) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_CODE_REQUIRED',
        message: 'Verification code is required',
      },
    });
    return;
  }

  if (user.twoFactorEnabled) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_ALREADY_ENABLED',
        message: 'Two-factor authentication is already enabled',
      },
    });
    return;
  }

  if (!isTwoFactorCodeValid(user, String(code))) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_INVALID_OR_EXPIRED',
        message: 'Verification code is invalid or has expired',
      },
    });
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorCode: null,
      twoFactorCodeExpiry: null,
    },
  });

  res.json({
    status: 'success',
    data: {
      message: 'Two-factor authentication enabled successfully',
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      user: sanitizeUser(updatedUser),
    },
  });
});

// POST /api/auth/2fa/disable/request
router.post('/2fa/disable/request', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  if (!user.twoFactorEnabled) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: 'Two-factor authentication is not enabled',
      },
    });
    return;
  }

  await issueAndSendTwoFactorCode(user);

  res.json({
    status: 'success',
    data: {
      message: 'Verification code sent successfully',
    },
  });
});

// POST /api/auth/2fa/disable/verify
router.post('/2fa/disable/verify', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  const { code } = req.body;

  if (!code) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_CODE_REQUIRED',
        message: 'Verification code is required',
      },
    });
    return;
  }

  if (!user.twoFactorEnabled) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: 'Two-factor authentication is not enabled',
      },
    });
    return;
  }

  if (!isTwoFactorCodeValid(user, String(code))) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_INVALID_OR_EXPIRED',
        message: 'Verification code is invalid or has expired',
      },
    });
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorCode: null,
      twoFactorCodeExpiry: null,
    },
  });

  res.json({
    status: 'success',
    data: {
      message: 'Two-factor authentication disabled successfully',
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      user: sanitizeUser(updatedUser),
    },
  });
});

// POST /api/auth/2fa/send-password-change-code
router.post('/2fa/send-password-change-code', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  if (!user.twoFactorEnabled) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: 'Two-factor authentication is not enabled',
      },
    });
    return;
  }

  await issueAndSendTwoFactorCode(user);

  res.json({
    status: 'success',
    data: {
      message: 'Verification code sent successfully',
    },
  });
});

// POST /api/auth/2fa/send-code
// Kept as a helper alias for existing frontend use
router.post('/2fa/send-code', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  if (!user.twoFactorEnabled) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: 'Two-factor authentication is not enabled',
      },
    });
    return;
  }

  await issueAndSendTwoFactorCode(user);

  res.json({
    status: 'success',
    data: {
      message: 'Verification code sent successfully',
    },
  });
});

// POST /api/auth/2fa/disable
// Legacy immediate-disable route kept for compatibility, but Option B should use disable/request + disable/verify
router.post('/2fa/disable', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  if (!user.twoFactorEnabled) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: 'Two-factor authentication is not enabled',
      },
    });
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorCode: null,
      twoFactorCodeExpiry: null,
    },
  });

  res.json({
    status: 'success',
    data: {
      message: 'Two-factor authentication disabled successfully',
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      user: sanitizeUser(updatedUser),
    },
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : '';

  if (!normalizedEmail) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email is required',
      },
    });
    return;
  }

  if (!isValidEmail(normalizedEmail)) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please enter a valid email address',
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    res.json({
      status: 'success',
      data: {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      },
    });
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: {
      email: normalizedEmail,
      usedAt: null,
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${getResetPasswordBaseUrl()}?token=${rawToken}`;
  await sendPasswordResetEmail(normalizedEmail, resetUrl);

  res.json({
    status: 'success',
    data: {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    },
  });
});

// GET /api/auth/reset-password/validate?token=...
router.get('/reset-password/validate', async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

  if (!token) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'RESET_TOKEN_MISSING',
        message: 'Reset token is required',
      },
    });
    return;
  }

  const tokenRecord = await findValidResetTokenRecord(token);

  if (!tokenRecord) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'RESET_TOKEN_INVALID_OR_EXPIRED',
        message: 'This password reset link is invalid or has expired',
      },
    });
    return;
  }

  res.json({
    status: 'success',
    data: {
      message: 'Reset token is valid',
    },
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Token and new password are required',
      },
    });
    return;
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: passwordError,
      },
    });
    return;
  }

  const tokenRecord = await findValidResetTokenRecord(token);

  if (!tokenRecord) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'RESET_TOKEN_INVALID_OR_EXPIRED',
        message: 'This password reset link is invalid or has expired',
      },
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: tokenRecord.email },
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

  const hashedPassword = await bcrypt.hash(password, 12);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { email: tokenRecord.email },
      data: {
        password: hashedPassword,
        passwordUpdatedAt: now,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        email: tokenRecord.email,
        id: { not: tokenRecord.id },
      },
    }),
  ]);

  res.json({
    status: 'success',
    data: {
      message: 'Password reset successful',
      passwordUpdatedAt: now,
    },
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword, twoFactorCode, code } = req.body;
  const submittedCode = typeof twoFactorCode === 'string' ? twoFactorCode : code;

  const user = await getAuthenticatedUser(req, res);
  if (!user) return;

  if (!currentPassword || !newPassword) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Current password and new password are required',
      },
    });
    return;
  }

  const passwordError = getPasswordValidationError(newPassword);
  if (passwordError) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: passwordError,
      },
    });
    return;
  }

  const currentPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!currentPasswordValid) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'AUTH_CURRENT_PASSWORD_INCORRECT',
        message: 'Current password is incorrect',
      },
    });
    return;
  }

  const sameAsOldPassword = await bcrypt.compare(newPassword, user.password);
  if (sameAsOldPassword) {
    res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'New password must be different from your current password',
      },
    });
    return;
  }

  if (user.twoFactorEnabled) {
    if (!submittedCode) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'TWO_FACTOR_CODE_REQUIRED',
          message: 'Verification code is required',
        },
      });
      return;
    }

    if (!isTwoFactorCodeValid(user, String(submittedCode))) {
      res.status(400).json({
        status: 'error',
        error: {
          code: 'TWO_FACTOR_INVALID_OR_EXPIRED',
          message: 'Verification code is invalid or has expired',
        },
      });
      return;
    }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  const now = new Date();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordUpdatedAt: now,
      twoFactorCode: null,
      twoFactorCodeExpiry: null,
    },
  });

  res.json({
    status: 'success',
    data: {
      message: 'Password changed successfully',
      passwordUpdatedAt: now,
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

// PUT /api/users/me/preferences
router.put('/me/preferences', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { timezone, timezoneAuto } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        timezone: timezone ?? undefined,
        timezoneAuto: timezoneAuto ?? undefined,
      },
    });

    res.json({
      status: 'success',
      data: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update preferences',
      },
    });
  }
});

export default router;
