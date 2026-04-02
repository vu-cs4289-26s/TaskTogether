import { Router, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { authenticate } from '../middleware/authentication.js';
import { AuthenticatedRequest } from '../types/index.js';
import { uploadToS3 } from '../lib/s3.js';
import { sendError, sendSuccess } from '../utils/responses.js';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/upload — Upload a single image, return its S3 URL
router.post(
  '/',
  upload.single('photo'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        sendError(res, 400, 'NO_FILE', 'No image file provided');
        return;
      }

      // Resize / compress with sharp (max 1200px wide, keep aspect ratio)
      const processed = await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const url = await uploadToS3(
        processed,
        req.file.originalname,
        'image/jpeg'
      );

      sendSuccess(res, { url });
    } catch (err) {
      sendError(res, 500, 'UPLOAD_FAILED', 'Failed to upload image');
    }
  }
);

export default router;
