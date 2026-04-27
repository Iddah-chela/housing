import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  createAnnouncement,
  deleteAnnouncement,
  deleteAnnouncementForever,
  getActiveAnnouncements,
  getAnnouncements,
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
announcementRouter.post('/:announcementId/delete', deleteAnnouncement);
announcementRouter.post('/:announcementId/kill', deleteAnnouncement);
announcementRouter.delete('/:announcementId', deleteAnnouncementForever);

export default announcementRouter;
