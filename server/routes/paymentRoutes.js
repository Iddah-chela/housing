import express from 'express';
import { 
    initiateUnlock, 
    checkUnlockStatus, 
    paymentWebhook,
    confirmPayment,
    requestRefund,
    getUnlockHistory,
    getPendingRefunds,
    processRefund,
    checkFirstUnlock,
    getReferralInfo,
    applyReferral
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isAdmin } from '../controllers/adminController.js';

const paymentRouter = express.Router();

// Check if first unlock is free
paymentRouter.get('/is-first-unlock', protect, checkFirstUnlock);

// Initiate property unlock payment
paymentRouter.post('/initiate-unlock', protect, initiateUnlock);

// Check if user has an active pass (global — no property ID needed)
paymentRouter.get('/pass-status', protect, checkUnlockStatus);
// Legacy alias kept for compatibility
paymentRouter.get('/unlock-status/:propertyId', protect, checkUnlockStatus);

// PayHero webhook (no auth required - PayHero calls this)
paymentRouter.post('/webhook', paymentWebhook);

// Manual payment confirmation (for testing)
paymentRouter.post('/confirm-payment', protect, confirmPayment);

// Request refund
paymentRouter.post('/request-refund', protect, requestRefund);

// Get unlock history
paymentRouter.get('/unlock-history', protect, getUnlockHistory);

// Referral info (code, count, available unlocks)
paymentRouter.get('/referral-info', protect, getReferralInfo);

// Apply referral code (post-signup)
paymentRouter.post('/apply-referral', protect, applyReferral);

// Admin: Get pending refund requests
paymentRouter.get('/admin/refunds', protect, isAdmin, getPendingRefunds);

// Admin: Process refund
paymentRouter.post('/admin/process-refund', protect, isAdmin, processRefund);

export default paymentRouter;
