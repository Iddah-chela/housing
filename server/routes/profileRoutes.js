import express from 'express';
import { uploadProfilePicture, getUserProfile, setAvatar } from '../controllers/profileController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Upload profile picture
router.post('/upload-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

// Set avatar from preset list
router.post('/set-avatar', protect, setAvatar);

// Get user profile
router.get('/me', protect, getUserProfile);

export default router;
