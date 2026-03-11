import express from 'express';
import rateLimit from 'express-rate-limit';
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
    applyReferral,
    guestInitiateUnlock,
    guestConfirmPayment,
    getPropertyUnlockInfo
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isAdmin } from '../controllers/adminController.js';

const paymentRouter = express.Router();

// Very strict limit for STK push endpoints to prevent M-Pesa spam to third parties
const stkLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many payment attempts. Please wait before trying again.' },
});

// Check if first unlock is free
paymentRouter.get('/is-first-unlock', protect, checkFirstUnlock);

// Combined: pass-status + free-check + referral-info in one call
paymentRouter.get('/property-unlock-info', protect, getPropertyUnlockInfo);

// Initiate property unlock payment (STK push — limited)
paymentRouter.post('/initiate-unlock', stkLimiter, protect, initiateUnlock);

// Check if user has an active pass (global — no property ID needed)
paymentRouter.get('/pass-status', protect, checkUnlockStatus);
// Legacy alias kept for compatibility
paymentRouter.get('/unlock-status/:propertyId', protect, checkUnlockStatus);

// PayHero webhook (no auth required - PayHero calls this)
paymentRouter.post('/webhook', paymentWebhook);

// Guest payment (no auth required — STK push limited)
paymentRouter.post('/guest-unlock', stkLimiter, guestInitiateUnlock);
paymentRouter.post('/guest-confirm', guestConfirmPayment);

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
