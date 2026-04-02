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

// GET / — List all wiki sections for a household (auto-creates defaults if none exist)
router.get(
    '/',
    requireHouseholdMember,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const householdId = req.householdId!;

            let sections = await prisma.wikiSection.findMany({
                where: { householdId },
                orderBy: { createdAt: 'asc' },
                include: { updatedBy: { select: updatedBySelect } },
            });

            // Auto-seed default sections on first visit
            if (sections.length === 0) {
                await prisma.wikiSection.createMany({
                    data: DEFAULT_SECTIONS.map((s) => ({
                        slug: s.slug,
                        title: s.title,
                        content: '',
                        householdId,
                    })),
                });

                sections = await prisma.wikiSection.findMany({
                    where: { householdId },
                    orderBy: { createdAt: 'asc' },
                    include: { updatedBy: { select: updatedBySelect } },
                });
            }

            sendSuccess(res, sections);
        } catch (err) {
            sendError(res, 500, 'SERVER_ERROR', 'Failed to list wiki sections');
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
