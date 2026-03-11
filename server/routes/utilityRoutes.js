import express from 'express';
import { getUtilityEntries, recordUtility, markUtilityPaid, updateUtilitySettings, sendUtilityReminder } from '../controllers/utilityController.js';
import { protect } from '../middleware/authMiddleware.js';

const utilityRouter = express.Router();

utilityRouter.get('/:propertyId', protect, getUtilityEntries);
utilityRouter.post('/record', protect, recordUtility);
utilityRouter.post('/mark-paid', protect, markUtilityPaid);
utilityRouter.post('/settings', protect, updateUtilitySettings);
utilityRouter.post('/remind', protect, sendUtilityReminder);

export default utilityRouter;
