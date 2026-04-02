import { Router, Response } from 'express';
import { authenticate } from '../middleware/authentication.js';
import { requireHouseholdMember } from '../middleware/authorization.js';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

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

            res.json({ status: 'success', data: sections });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                status: 'error',
                error: { code: 'SERVER_ERROR', message: 'Failed to list wiki sections' },
            });
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
                res.status(400).json({
                    status: 'error',
                    error: { code: 'VALIDATION_ERROR', message: 'Content is required' },
                });
                return;
            }

            const section = await prisma.wikiSection.findUnique({
                where: { householdId_slug: { householdId, slug } },
            });

            if (!section) {
                res.status(404).json({
                    status: 'error',
                    error: { code: 'NOT_FOUND', message: 'Wiki section not found' },
                });
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

            res.json({ status: 'success', data: updated });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                status: 'error',
                error: { code: 'SERVER_ERROR', message: 'Failed to update wiki section' },
            });
        }
    }
);

export default router;
