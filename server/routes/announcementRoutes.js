import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  createAnnouncement,
  getActiveAnnouncements,
  getAnnouncements,
  killAnnouncement,
  previewAnnouncementRecipients,
  updateAnnouncement,
} from '../controllers/announcementController.js';

const announcementRouter = express.Router();

announcementRouter.get('/active', getActiveAnnouncements);

announcementRouter.use(protect);

announcementRouter.get('/preview', previewAnnouncementRecipients);
announcementRouter.get('/', getAnnouncements);
announcementRouter.post('/', upload.single('image'), createAnnouncement);
announcementRouter.put('/:announcementId', upload.single('image'), updateAnnouncement);
announcementRouter.post('/:announcementId/kill', killAnnouncement);

export default announcementRouter;
