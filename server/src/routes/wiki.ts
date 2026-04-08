import { Router, Response } from 'express';
import { authenticate } from '../middleware/authentication.js';
import { requireHouseholdMember } from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';
import { sendError, sendSuccess } from '../utils/responses.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const DEFAULT_SECTIONS = [
  { slug: 'garbage', title: 'Garbage & Recycling' },
  { slug: 'appliances', title: 'Appliances' },
  { slug: 'bills', title: 'Bills & Subscriptions' },
  { slug: 'weather', title: 'Weather & Seasonal' },
  { slug: 'parking', title: 'Parking & Storage' },
  { slug: 'rules', title: 'Rules & Expectations' },
  { slug: 'misc', title: 'Miscellaneous' },
];

const updatedBySelect = { id: true, name: true } as const;

// Helper to generate a slug from a title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to ensure unique slug
async function ensureUniqueSlug(householdId: string, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.wikiSection.findFirst({
      where: { householdId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// GET / — List all wiki sections for a household (auto-creates defaults if none exist)
router.get(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const householdId = req.householdId!;

      let sections = await prisma.wikiSection.findMany({
        where: { householdId },
        orderBy: { order: 'asc' },
        include: { updatedBy: { select: updatedBySelect } },
      });

      // Auto-seed default sections on first visit
      if (sections.length === 0) {
        await prisma.wikiSection.createMany({
          data: DEFAULT_SECTIONS.map((s, index) => ({
            slug: s.slug,
            title: s.title,
            content: '',
            order: index,
            householdId,
          })),
        });

        sections = await prisma.wikiSection.findMany({
          where: { householdId },
          orderBy: { order: 'asc' },
          include: { updatedBy: { select: updatedBySelect } },
        });
      }

      sendSuccess(res, sections);
    } catch (err) {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to list wiki sections');
    }
  }
);

// POST / — Create a new section
router.post(
  '/',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const householdId = req.householdId!;
      const { title, slug: requestedSlug } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Title is required');
        return;
      }

      // Generate or use provided slug
      const baseSlug = requestedSlug || generateSlug(title);
      const slug = await ensureUniqueSlug(householdId, baseSlug);

      // Get max order
      const maxOrder = await prisma.wikiSection.findFirst({
        where: { householdId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      const section = await prisma.wikiSection.create({
        data: {
          slug,
          title: title.trim(),
          content: '',
          order: (maxOrder?.order ?? -1) + 1,
          householdId,
        },
        include: { updatedBy: { select: updatedBySelect } },
      });

      sendSuccess(res, section, 201);
    } catch (err) {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to create wiki section');
    }
  }
);

// PATCH /reorder — Bulk reorder sections
router.patch(
  '/reorder',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const householdId = req.householdId!;
      const { order } = req.body;

      if (!Array.isArray(order) || order.length === 0) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Order array is required');
        return;
      }

      // Verify all sections belong to this household
      const sections = await prisma.wikiSection.findMany({
        where: { householdId },
        select: { id: true },
      });
      const validIds = new Set(sections.map(s => s.id));
      
      if (!order.every(id => validIds.has(id))) {
        sendError(res, 400, 'VALIDATION_ERROR', 'Invalid section IDs in order array');
        return;
      }

      // Update orders in a transaction
      await prisma.$transaction(
        order.map((id, index) =>
          prisma.wikiSection.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      const updated = await prisma.wikiSection.findMany({
        where: { householdId },
        orderBy: { order: 'asc' },
        include: { updatedBy: { select: updatedBySelect } },
      });

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to reorder wiki sections');
    }
  }
);

// PATCH /:slug — Rename a section (title and/or slug)
router.patch(
  '/:slug',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const householdId = req.householdId!;
      const { slug } = req.params;
      const { title, slug: newSlug } = req.body;

      const section = await prisma.wikiSection.findUnique({
        where: { householdId_slug: { householdId, slug } },
      });

      if (!section) {
        sendError(res, 404, 'NOT_FOUND', 'Wiki section not found');
        return;
      }

      const updateData: { title?: string; slug?: string } = {};

      if (title && typeof title === 'string' && title.trim().length > 0) {
        updateData.title = title.trim();
      }

      if (newSlug && typeof newSlug === 'string' && newSlug !== slug) {
        updateData.slug = await ensureUniqueSlug(householdId, newSlug, section.id);
      }

      if (Object.keys(updateData).length === 0) {
        sendError(res, 400, 'VALIDATION_ERROR', 'No valid fields to update');
        return;
      }

      const updated = await prisma.wikiSection.update({
        where: { id: section.id },
        data: updateData,
        include: { updatedBy: { select: updatedBySelect } },
      });

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to rename wiki section');
    }
  }
);

// DELETE /:slug — Delete a section
router.delete(
  '/:slug',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const householdId = req.householdId!;
      const { slug } = req.params;

      const section = await prisma.wikiSection.findUnique({
        where: { householdId_slug: { householdId, slug } },
      });

      if (!section) {
        sendError(res, 404, 'NOT_FOUND', 'Wiki section not found');
        return;
      }

      await prisma.wikiSection.delete({
        where: { id: section.id },
      });

      sendSuccess(res, { success: true });
    } catch (err) {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to delete wiki section');
    }
  }
);

// PUT /:slug — Update a wiki section's content (any household member)
router.put(
  '/:slug',
  requireHouseholdMember,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const householdId = req.householdId!;
      const { slug } = req.params;
      const { content } = req.body;

      if (typeof content !== 'string') {
        sendError(res, 400, 'VALIDATION_ERROR', 'Content is required');
        return;
      }

      const section = await prisma.wikiSection.findUnique({
        where: { householdId_slug: { householdId, slug } },
      });

      if (!section) {
        sendError(res, 404, 'NOT_FOUND', 'Wiki section not found');
        return;
      }

      const updated = await prisma.wikiSection.update({
        where: { id: section.id },
        data: {
          content,
          updatedById: req.userId!,
        },
        include: { updatedBy: { select: updatedBySelect } },
      });

      sendSuccess(res, updated);
    } catch (err) {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to update wiki section');
    }
  }
);

export default router;
