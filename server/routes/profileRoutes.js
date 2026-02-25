import express from 'express';
import { uploadProfilePicture, getUserProfile } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Upload profile picture
router.post('/upload-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

// Get user profile
router.get('/me', protect, getUserProfile);

export default router;
