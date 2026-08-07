import express from 'express';
import * as caretakerAppController from '../controllers/caretakerApplicationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/roleMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post(
  '/apply',
  protect,
  upload.fields([{ name: 'idDocument', maxCount: 1 }]),
  caretakerAppController.submitCaretakerApplication
);
router.get('/my-status', protect, caretakerAppController.getMyCaretakerApplicationStatus);

router.get('/', protect, requireAdmin, caretakerAppController.getCaretakerApplications);
router.put('/:applicationId/approve', protect, requireAdmin, caretakerAppController.approveCaretakerApplication);
router.put('/:applicationId/reject', protect, requireAdmin, caretakerAppController.rejectCaretakerApplication);

export default router;
