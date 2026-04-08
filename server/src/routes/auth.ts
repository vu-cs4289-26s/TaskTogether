import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { authenticate } from "../middleware/authentication.js";
import { AuthenticatedRequest } from "../types/index.js";
import prisma from "../lib/prisma.js";
import { sendError, sendSuccess } from "../utils/responses.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;
const TWO_FACTOR_CODE_TTL_MS = 1000 * 60 * 10;
const GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function sanitizeUser(user: {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  googleId?: string | null;
  googleEmail?: string | null;
  passwordUpdatedAt: Date | null;
  twoFactorEnabled: boolean;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    googleLinked: Boolean(user.googleId),
    googleEmail: user.googleEmail,
    passwordUpdatedAt: user.passwordUpdatedAt,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getResetPasswordBaseUrl(): string {
  return (
    process.env.RESET_PASSWORD_URL ||
    `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password`
  );
}

function getPasswordValidationError(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number";
  }
  return null;
}

function generateTwoFactorCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type GoogleTokenInfo = {
  aud?: string;
  azp?: string;
  email?: string;
  email_verified?: string | boolean;
  iss?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

async function verifyGoogleCredential(credential: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("Google OAuth is not configured on the server.");
  }

  const response = await fetch(
    `${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(credential)}`,
  );

  if (!response.ok) {
    throw new Error("Google token verification failed.");
  }

  const tokenInfo = (await response.json()) as GoogleTokenInfo;

  const emailVerified =
    tokenInfo.email_verified === true || tokenInfo.email_verified === "true";
  const validIssuer =
    tokenInfo.iss === "accounts.google.com" ||
    tokenInfo.iss === "https://accounts.google.com";
  const validAudience =
    tokenInfo.aud === clientId || tokenInfo.azp === clientId;

  if (
    !tokenInfo.sub ||
    !tokenInfo.email ||
    !emailVerified ||
    !validIssuer ||
    !validAudience
  ) {
    throw new Error("Google account could not be verified.");
  }

  return {
    googleId: tokenInfo.sub,
    email: normalizeEmail(tokenInfo.email),
    name: tokenInfo.name?.trim() || tokenInfo.email.split("@")[0],
    avatar: tokenInfo.picture || null,
  };
}

async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  const from = process.env.SMTP_FROM || "noreply@tasktogether.local";
  await sendEmail({
    to: email,
    from,
    subject: "Reset your TaskTogether password",
    text: `We received a request to reset your password. Use the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <p>We received a request to reset your TaskTogether password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

async function sendTwoFactorCodeEmail(
  email: string,
  code: string,
): Promise<void> {
  const from = process.env.SMTP_FROM || "noreply@tasktogether.local";
  await sendEmail({
    to: email,
    from,
    subject: "Your TaskTogether verification code",
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
    sendError(res, 401, "AUTH_UNAUTHORIZED", "Unauthorized");
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
  });

  if (!user) {
    sendError(res, 404, "USER_NOT_FOUND", "User not found");
    return null;
  }

  return user;
}

function isTwoFactorCodeValid(
  user: {
    twoFactorCode: string | null;
    twoFactorCodeExpiry: Date | null;
  },
  code: string,
): boolean {
  return (
    !!user.twoFactorCode &&
    !!user.twoFactorCodeExpiry &&
    user.twoFactorCode === code.trim() &&
    user.twoFactorCodeExpiry > new Date()
  );
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
  const normalizedEmail =
    typeof email === "string" ? normalizeEmail(email) : "";

  if (!name || !normalizedEmail || !password) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Name, email, and password are required",
    );
    return;
  }

  if (!isValidEmail(normalizedEmail)) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please enter a valid email address",
    );
    return;
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    sendError(res, 400, "VALIDATION_ERROR", passwordError);
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    sendError(
      res,
      409,
      "AUTH_EMAIL_EXISTS",
      "An account with this email already exists",
    );
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

  sendSuccess(res, { user: sanitizeUser(user), token }, 201);
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const normalizedEmail =
    typeof email === "string" ? normalizeEmail(email) : "";

  if (!normalizedEmail || !password) {
    sendError(res, 400, "VALIDATION_ERROR", "Email and password are required");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user) {
    sendError(
      res,
      401,
      "AUTH_INVALID_CREDENTIALS",
      "Invalid email or password",
    );
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    sendError(
      res,
      401,
      "AUTH_INVALID_CREDENTIALS",
      "Invalid email or password",
    );
    return;
  }

  if (user.twoFactorEnabled) {
    await issueAndSendTwoFactorCode(user);
    sendSuccess(res, {
      requiresTwoFactor: true,
      userId: user.id,
      message: "A verification code has been sent to your email",
    });
    return;
  }

  const token = generateToken(user.id);
  sendSuccess(res, { user: sanitizeUser(user), token });
});

// POST /api/auth/google
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body;

  if (!credential || typeof credential !== "string") {
    sendError(res, 400, "VALIDATION_ERROR", "Google credential is required");
    return;
  }

  try {
    const googleProfile = await verifyGoogleCredential(credential);

    const existingGoogleUser = await prisma.user.findUnique({
      where: { googleId: googleProfile.googleId },
    });

    const existingEmailUser = await prisma.user.findUnique({
      where: { email: googleProfile.email },
    });

    if (
      existingGoogleUser &&
      existingEmailUser &&
      existingGoogleUser.id !== existingEmailUser.id
    ) {
      sendError(
        res,
        409,
        "AUTH_GOOGLE_ALREADY_LINKED",
        "This Google account is already linked to another user.",
      );
      return;
    }

    const randomPassword = await bcrypt.hash(crypto.randomUUID(), 12);
    const user =
      existingGoogleUser || existingEmailUser
        ? await prisma.user.update({
          where: { id: (existingGoogleUser || existingEmailUser)!.id },
          data: {
            googleId: googleProfile.googleId,
            googleEmail: googleProfile.email,
            avatar:
              (existingGoogleUser || existingEmailUser)!.avatar ||
              googleProfile.avatar,
          },
        })
        : await prisma.user.create({
          data: {
            name: googleProfile.name,
            email: googleProfile.email,
            password: randomPassword,
            passwordUpdatedAt: new Date(),
            avatar: googleProfile.avatar,
            googleId: googleProfile.googleId,
            googleEmail: googleProfile.email,
          },
        });

    if (user.twoFactorEnabled) {
      await issueAndSendTwoFactorCode(user);
      sendSuccess(res, {
        requiresTwoFactor: true,
        userId: user.id,
        message: "A verification code has been sent to your email",
      });
      return;
    }

    const token = generateToken(user.id);
    sendSuccess(res, { user: sanitizeUser(user), token });
  } catch (error) {
    if (error instanceof Error) {
      sendError(res, 401, "AUTH_GOOGLE_FAILED", error.message);
    } else {
      sendError(
        res,
        401,
        "AUTH_GOOGLE_FAILED",
        "Google authentication failed. Please try again.",
      );
    }
  }
});

// POST /api/auth/google/link
router.post(
  "/google/link",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { credential } = req.body;

    if (!credential || typeof credential !== "string") {
      sendError(res, 400, "VALIDATION_ERROR", "Google credential is required");
      return;
    }

    const currentUser = await getAuthenticatedUser(req, res);
    if (!currentUser) return;

    try {
      const googleProfile = await verifyGoogleCredential(credential);

      const userWithGoogle = await prisma.user.findUnique({
        where: { googleId: googleProfile.googleId },
      });

      if (userWithGoogle && userWithGoogle.id !== currentUser.id) {
        sendError(
          res,
          409,
          "AUTH_GOOGLE_ALREADY_LINKED",
          "This Google account is already linked to another user.",
        );
        return;
      }

      if (normalizeEmail(currentUser.email) !== googleProfile.email) {
        sendError(
          res,
          400,
          "AUTH_GOOGLE_EMAIL_MISMATCH",
          "Please choose the Google account that matches your TaskTogether email.",
        );
        return;
      }

      const user = await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          googleId: googleProfile.googleId,
          googleEmail: googleProfile.email,
          avatar: currentUser.avatar || googleProfile.avatar,
        },
      });

      sendSuccess(res, {
        message: "Google account linked successfully.",
        user: sanitizeUser(user),
      });
    } catch (error) {
      if (error instanceof Error) {
        sendError(res, 401, "AUTH_GOOGLE_FAILED", error.message);
      } else {
        sendError(
          res,
          401,
          "AUTH_GOOGLE_FAILED",
          "Google authentication failed. Please try again.",
        );
      }
    }
  },
);

// POST /api/auth/2fa/verify-login
router.post(
  "/2fa/verify-login",
  async (req: Request, res: Response): Promise<void> => {
    const { userId, code } = req.body;

    if (!userId || !code) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "User ID and verification code are required",
      );
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      sendError(res, 404, "USER_NOT_FOUND", "User not found");
      return;
    }

    if (!user.twoFactorEnabled) {
      sendError(
        res,
        400,
        "TWO_FACTOR_NOT_ENABLED",
        "Two-factor authentication is not enabled for this account",
      );
      return;
    }

    if (!isTwoFactorCodeValid(user, String(code))) {
      sendError(
        res,
        400,
        "TWO_FACTOR_INVALID_OR_EXPIRED",
        "Verification code is invalid or has expired",
      );
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
    sendSuccess(res, { user: sanitizeUser(updatedUser), token });
  },
);

// POST /api/auth/2fa/enable
// Option B request step: send code, do not enable yet
router.post(
  "/2fa/enable",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    if (user.twoFactorEnabled) {
      sendError(
        res,
        400,
        "TWO_FACTOR_ALREADY_ENABLED",
        "Two-factor authentication is already enabled",
      );
      return;
    }

    await issueAndSendTwoFactorCode(user);
    sendSuccess(res, { message: "Verification code sent successfully" });
  },
);

// POST /api/auth/2fa/verify-enable
router.post(
  "/2fa/verify-enable",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    const { code } = req.body;

    if (!code) {
      sendError(
        res,
        400,
        "TWO_FACTOR_CODE_REQUIRED",
        "Verification code is required",
      );
      return;
    }

    if (user.twoFactorEnabled) {
      sendError(
        res,
        400,
        "TWO_FACTOR_ALREADY_ENABLED",
        "Two-factor authentication is already enabled",
      );
      return;
    }

    if (!isTwoFactorCodeValid(user, String(code))) {
      sendError(
        res,
        400,
        "TWO_FACTOR_INVALID_OR_EXPIRED",
        "Verification code is invalid or has expired",
      );
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

    sendSuccess(res, {
      message: "Two-factor authentication enabled successfully",
      user: sanitizeUser(updatedUser),
      twoFactorEnabled: updatedUser.twoFactorEnabled,
    });
  },
);

// POST /api/auth/2fa/disable/request
router.post(
  "/2fa/disable/request",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    if (!user.twoFactorEnabled) {
      sendError(
        res,
        400,
        "TWO_FACTOR_NOT_ENABLED",
        "Two-factor authentication is not enabled",
      );
      return;
    }

    await issueAndSendTwoFactorCode(user);
    sendSuccess(res, { message: "Verification code sent successfully" });
  },
);

// POST /api/auth/2fa/disable/verify
router.post(
  "/2fa/disable/verify",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    const { code } = req.body;

    if (!code) {
      sendError(
        res,
        400,
        "TWO_FACTOR_CODE_REQUIRED",
        "Verification code is required",
      );
      return;
    }

    if (!user.twoFactorEnabled) {
      sendError(
        res,
        400,
        "TWO_FACTOR_NOT_ENABLED",
        "Two-factor authentication is not enabled",
      );
      return;
    }

    if (!isTwoFactorCodeValid(user, String(code))) {
      sendError(
        res,
        400,
        "TWO_FACTOR_INVALID_OR_EXPIRED",
        "Verification code is invalid or has expired",
      );
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

    sendSuccess(res, {
      message: "Two-factor authentication disabled successfully",
      user: sanitizeUser(updatedUser),
      twoFactorEnabled: updatedUser.twoFactorEnabled,
    });
  },
);

// POST /api/auth/2fa/send-password-change-code
router.post(
  "/2fa/send-password-change-code",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    if (!user.twoFactorEnabled) {
      sendError(
        res,
        400,
        "TWO_FACTOR_NOT_ENABLED",
        "Two-factor authentication is not enabled",
      );
      return;
    }

    await issueAndSendTwoFactorCode(user);
    sendSuccess(res, { message: "Verification code sent successfully" });
  },
);

// POST /api/auth/2fa/send-code
// Kept as a helper alias for existing frontend use
router.post(
  "/2fa/send-code",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    if (!user.twoFactorEnabled) {
      sendError(
        res,
        400,
        "TWO_FACTOR_NOT_ENABLED",
        "Two-factor authentication is not enabled",
      );
      return;
    }

    await issueAndSendTwoFactorCode(user);
    sendSuccess(res, { message: "Verification code sent successfully" });
  },
);

// POST /api/auth/2fa/disable
// Legacy immediate-disable route kept for compatibility, but Option B should use disable/request + disable/verify
router.post(
  "/2fa/disable",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    if (!user.twoFactorEnabled) {
      sendError(
        res,
        400,
        "TWO_FACTOR_NOT_ENABLED",
        "Two-factor authentication is not enabled",
      );
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

    sendSuccess(res, {
      message: "Two-factor authentication disabled successfully",
      user: sanitizeUser(updatedUser),
      twoFactorEnabled: updatedUser.twoFactorEnabled,
    });
  },
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const normalizedEmail =
      typeof email === "string" ? normalizeEmail(email) : "";

    if (!normalizedEmail) {
      sendError(res, 400, "VALIDATION_ERROR", "Email is required");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Please enter a valid email address",
      );
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      sendSuccess(res, {
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
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
    sendSuccess(res, {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  },
);

// GET /api/auth/reset-password/validate?token=...
router.get(
  "/reset-password/validate",
  async (req: Request, res: Response): Promise<void> => {
    const token =
      typeof req.query.token === "string" ? req.query.token.trim() : "";

    if (!token) {
      sendError(res, 400, "RESET_TOKEN_MISSING", "Reset token is required");
      return;
    }

    const tokenRecord = await findValidResetTokenRecord(token);

    if (!tokenRecord) {
      sendError(
        res,
        400,
        "RESET_TOKEN_INVALID_OR_EXPIRED",
        "This password reset link is invalid or has expired",
      );
      return;
    }

    sendSuccess(res, {
      message: "Reset token is valid",
    });
  },
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body;

    if (!token || !password) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Token and new password are required",
      );
      return;
    }

    const passwordError = getPasswordValidationError(password);
    if (passwordError) {
      sendError(res, 400, "VALIDATION_ERROR", passwordError);
      return;
    }

    const tokenRecord = await findValidResetTokenRecord(token);

    if (!tokenRecord) {
      sendError(
        res,
        400,
        "RESET_TOKEN_INVALID_OR_EXPIRED",
        "This password reset link is invalid or has expired",
      );
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.email },
    });

    if (!user) {
      sendError(res, 404, "USER_NOT_FOUND", "User not found");
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

    sendSuccess(res, {
      message: "Password reset successful",
      passwordUpdatedAt: now,
    });
  },
);

// POST /api/auth/change-password
router.post(
  "/change-password",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword, twoFactorCode, code } = req.body;
    const submittedCode =
      typeof twoFactorCode === "string" ? twoFactorCode : code;

    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    if (!currentPassword || !newPassword) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Current password and new password are required",
      );
      return;
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      sendError(res, 400, "VALIDATION_ERROR", passwordError);
      return;
    }

    const currentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!currentPasswordValid) {
      sendError(
        res,
        400,
        "AUTH_CURRENT_PASSWORD_INCORRECT",
        "Current password is incorrect",
      );
      return;
    }

    const sameAsOldPassword = await bcrypt.compare(newPassword, user.password);
    if (sameAsOldPassword) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "New password must be different from your current password",
      );
      return;
    }

    if (user.twoFactorEnabled) {
      if (!submittedCode) {
        sendError(
          res,
          400,
          "TWO_FACTOR_CODE_REQUIRED",
          "Verification code is required",
        );
        return;
      }

      if (!isTwoFactorCodeValid(user, String(submittedCode))) {
        sendError(
          res,
          400,
          "TWO_FACTOR_INVALID_OR_EXPIRED",
          "Verification code is invalid or has expired",
        );
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

    sendSuccess(res, {
      message: "Password changed successfully",
      passwordUpdatedAt: now,
    });
  },
);

// GET /api/users/me
router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      sendError(res, 404, "USER_NOT_FOUND", "User not found");
      return;
    }

    sendSuccess(res, sanitizeUser(user));
  },
);

// PATCH /api/users/me — update profile (name, avatar)
router.patch(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, avatar } = req.body ?? {};
      const data: { name?: string; avatar?: string | null } = {};

      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          sendError(res, 400, "VALIDATION_ERROR", "Name must be a non-empty string");
          return;
        }
        data.name = name.trim();
      }

      if (avatar !== undefined) {
        if (avatar !== null && typeof avatar !== "string") {
          sendError(res, 400, "VALIDATION_ERROR", "Avatar must be a string URL or null");
          return;
        }
        data.avatar = avatar;
      }

      if (Object.keys(data).length === 0) {
        sendError(res, 400, "VALIDATION_ERROR", "No fields to update");
        return;
      }

      const updated = await prisma.user.update({
        where: { id: req.userId },
        data,
      });

      sendSuccess(res, sanitizeUser(updated));
    } catch (err) {
      sendError(res, 500, "SERVER_ERROR", "Failed to update profile");
    }
  },
);

export default router;
