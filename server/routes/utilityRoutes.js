import express from 'express';
import { getUtilityEntries, recordUtility, markUtilityPaid, updateUtilitySettings, sendUtilityReminder, saveRoomContact, getRoomContacts } from '../controllers/utilityController.js';
import { protect } from '../middleware/authMiddleware.js';

const utilityRouter = express.Router();

utilityRouter.get('/room-contacts/:propertyId', protect, getRoomContacts);
utilityRouter.get('/:propertyId', protect, getUtilityEntries);
utilityRouter.post('/record', protect, recordUtility);
utilityRouter.post('/mark-paid', protect, markUtilityPaid);
utilityRouter.post('/settings', protect, updateUtilitySettings);
utilityRouter.post('/remind', protect, sendUtilityReminder);
utilityRouter.post('/room-contact', protect, saveRoomContact);

export default utilityRouter;
