import IntaSend from 'intasend-node';
import UserPass from "../models/userPass.js";
import User from "../models/user.js";

const PASS_PRICES = { '1day': 100, '7day': 300 };
const PASS_DAYS   = { '1day': 1,   '7day': 7   };

const activePassForUser = (userId) =>
    UserPass.findOne({ user: userId, paymentStatus: 'completed', expiresAt: { $gt: new Date() } });

const priorCompletedCount = (userId) =>
    UserPass.countDocuments({ user: userId, paymentStatus: 'completed' });

// FREE_UNLOCKS: how many free property views a new user gets before paying
const FREE_UNLOCKS = 2;

// Check if this will be user's first (free) pass — also considers referral unlocks
export const checkFirstUnlock = async (req, res) => {
    try {
        const count = await priorCompletedCount(req.user._id);
        const dbUser = await User.findById(req.user._id);
        const availableReferralUnlocks = (dbUser?.referralUnlocks || 0) - (dbUser?.referralUnlocksUsed || 0);
        
        // Free if: signup freebie remaining OR referral credits available
        const isFree = count < FREE_UNLOCKS || availableReferralUnlocks > 0;
        const reason = count < FREE_UNLOCKS ? 'signup' : availableReferralUnlocks > 0 ? 'referral' : null;
        
        res.json({ 
            success: true, 
            isFree,
            reason,
            referralUnlocksAvailable: Math.max(0, availableReferralUnlocks)
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Purchase / activate a pass
export const initiateUnlock = async (req, res) => {
    try {
        const { phoneNumber, passType = '1day' } = req.body;
        const userId = req.user._id;

        // If user already has an active pass, tell them
        const existing = await activePassForUser(userId);
        if (existing) {
            return res.json({
                success: true,
                alreadyUnlocked: true,
                message: `You already have an active ${existing.passType} pass`,
                unlock: { passType: existing.passType, expiresAt: existing.expiresAt,
                    daysRemaining: Math.ceil((existing.expiresAt - new Date()) / (1000 * 60 * 60 * 24)) }
            });
        }

        // -- FIRST FREE UNLOCKS / REFERRAL UNLOCKS ----------------------
        const priorCount = await priorCompletedCount(userId);
        const dbUser = await User.findById(userId);
        const availableReferralUnlocks = (dbUser?.referralUnlocks || 0) - (dbUser?.referralUnlocksUsed || 0);
        
        if (priorCount < FREE_UNLOCKS) {
            // Signup freebie
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            const freePass = await UserPass.create({
                user: userId, passType: '7day', amount: 0, isFree: true,
                phoneNumber: phoneNumber || '0000', paymentStatus: 'completed',
                transactionRef: 'FREE_' + Date.now(), expiresAt
            });
            const remaining = FREE_UNLOCKS - priorCount - 1;
            return res.json({
                success: true, isFree: true,
                message: remaining > 0
                    ? `Free view ${priorCount + 1}/${FREE_UNLOCKS}! You have ${remaining} more free view${remaining > 1 ? 's' : ''} left.`
                    : `Last free view used. From your next property, choose Ksh 100/day or Ksh 300/week.`,
                unlock: { passType: '1day', expiresAt: freePass.expiresAt, daysRemaining: 1 },
                unlockId: freePass._id
            });
        }
        
        if (availableReferralUnlocks > 0) {
            // Referral freebie — 24hr access
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const freePass = await UserPass.create({
                user: userId, passType: '1day', amount: 0, isFree: true,
                phoneNumber: phoneNumber || '0000', paymentStatus: 'completed',
                transactionRef: 'REFERRAL_' + Date.now(), expiresAt
            });
            // Decrement available referral unlocks
            dbUser.referralUnlocksUsed = (dbUser.referralUnlocksUsed || 0) + 1;
            await dbUser.save();
            const remaining = availableReferralUnlocks - 1;
            return res.json({
                success: true, isFree: true,
                message: remaining > 0
                    ? `Referral unlock used! You have ${remaining} more referral unlock${remaining > 1 ? 's' : ''} left.`
                    : `Last referral unlock used! Share your link to earn more.`,
                unlock: { passType: '1day', expiresAt: freePass.expiresAt, daysRemaining: 1 },
                unlockId: freePass._id
            });
        }
        // -----------------------------------------------------------------

        // Validate passType only for paid unlocks
        if (!PASS_PRICES[passType]) {
            return res.json({ success: false, message: "Invalid pass type. Choose '1day' (Ksh 100) or '7day' (Ksh 300)." });
        }

        // Format phone number
        let formattedPhone = (phoneNumber || '').replace(/\s/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.substring(1);
        else if (formattedPhone.startsWith('+254')) formattedPhone = formattedPhone.substring(1);
        else if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

        const amount = PASS_PRICES[passType];
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + PASS_DAYS[passType]);

        const pass = await UserPass.create({
            user: userId, passType, amount, phoneNumber: formattedPhone,
            paymentStatus: 'pending', expiresAt
        });

        const transactionRef = 'PATA_' + Date.now() + '_' + Math.random().toString(36).substring(7);

        // -- TEST MODE: skip real payment, auto-activate pass --------------
        if (process.env.PAYMENT_TEST_MODE === 'true') {
            pass.transactionRef = transactionRef;
            pass.paymentStatus = 'completed';
            await pass.save();
            console.log('?? TEST MODE: pass auto-activated', pass._id);
            return res.json({
                success: true, isFree: false, passType, amount,
                testMode: true,
                message: `[TEST] Pass activated instantly. In production this triggers a real M-Pesa prompt.`,
                transactionRef, unlockId: pass._id,
                unlock: { passType, expiresAt: pass.expiresAt,
                    daysRemaining: PASS_DAYS[passType] }
            });
        }
        // -----------------------------------------------------------------

        // -- INTASEND STK PUSH --------------------------------------------
        const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
        const secretKey      = process.env.INTASEND_SECRET_KEY;
        const isLive         = process.env.INTASEND_LIVE === 'true'; // false = sandbox

        if (!publishableKey || !secretKey) {
            await pass.deleteOne();
            return res.json({ success: false, message: 'Payment gateway not configured. Contact support.' });
        }

        try {
            const intasend   = new IntaSend(publishableKey, secretKey, !isLive);
            const collection = intasend.collection();

            const stkRes = await collection.mpesaStkPush({
                first_name: (req.user.fullName || 'CampusCrib').split(' ')[0],
                last_name:  (req.user.fullName || 'User').split(' ').slice(1).join(' ') || 'User',
                email:      req.user.email || 'customer@CampusCrib.co.ke',
                host:       process.env.BACKEND_URL || 'http://localhost:4000',
                amount,
                phone_number: formattedPhone,
                api_ref:      transactionRef,
                narrative:    `CampusCrib ${passType} pass - Ksh ${amount}`
            });

            // SDK throws on failure; reaching here means STK was queued
            const invoiceId = stkRes?.invoice?.invoice_id || stkRes?.invoice_id;
            pass.invoiceId = invoiceId;
            console.log('IntaSend STK queued, invoice_id:', invoiceId);
        } catch (stkErr) {
            const errDetail = stkErr?.response?.data || stkErr?.message || stkErr;
            console.error('IntaSend STK error:', JSON.stringify(errDetail, null, 2));
            await pass.deleteOne();
            const userMsg = typeof errDetail === 'object'
                ? (errDetail.detail || errDetail.message || JSON.stringify(errDetail))
                : String(errDetail);
            return res.json({ success: false, message: `IntaSend: ${userMsg}` });
        }
        // -----------------------------------------------------------------

        pass.transactionRef = transactionRef;
        await pass.save();

        res.json({
            success: true, isFree: false, passType, amount,
            message: `Payment of Ksh ${amount} initiated. Check your phone for M-Pesa prompt.`,
            transactionRef, unlockId: pass._id
        });
    } catch (error) {
        console.error('Pass purchase error:', error);
        res.json({ success: false, message: error.message });
    }
};

// Check if user currently has an active pass (global — not per property)
export const checkUnlockStatus = async (req, res) => {
    try {
        const pass = await activePassForUser(req.user._id);
        if (pass) {
            res.json({
                success: true, unlocked: true,
                unlock: {
                    passType: pass.passType,
                    expiresAt: pass.expiresAt,
                    daysRemaining: Math.ceil((pass.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
                }
            });
        } else {
            res.json({ success: true, unlocked: false });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// IntaSend webhook
export const paymentWebhook = async (req, res) => {
    try {
        // IntaSend sends: { invoice_id, state, api_ref, challenge, ... }
        // api_ref holds our transactionRef set during initiation
        const body = req.body;
        console.log('IntaSend Webhook:', JSON.stringify(body));

        // Optional: validate challenge secret
        const expectedChallenge = process.env.INTASEND_WEBHOOK_CHALLENGE;
        if (expectedChallenge && body.challenge !== expectedChallenge) {
            console.warn('Webhook challenge mismatch');
            return res.status(403).json({ success: false, message: 'Invalid challenge' });
        }

        const ref    = body.api_ref || body.invoice?.api_ref;
        const state  = (body.state  || body.invoice?.state || '').toUpperCase();

        if (!ref) return res.status(400).json({ success: false, message: 'Missing api_ref' });

        const pass = await UserPass.findOne({ transactionRef: ref });
        if (!pass) return res.status(404).json({ success: false, message: 'Pass record not found' });

        if (state === 'COMPLETE') {
            pass.paymentStatus = 'completed'; await pass.save();
            console.log('? Pass activated via IntaSend webhook:', pass._id);
        } else if (state === 'FAILED') {
            pass.paymentStatus = 'failed'; await pass.save();
        }
        res.json({ success: true, message: "Webhook processed" });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Confirm payment — verifies with IntaSend before activating
export const confirmPayment = async (req, res) => {
    try {
        const { unlockId } = req.body;
        const pass = await UserPass.findOne({ _id: unlockId, user: req.user._id });
        if (!pass) return res.json({ success: false, message: 'Pass record not found' });

        // Already activated (e.g. webhook fired first)
        if (pass.paymentStatus === 'completed') {
            return res.json({
                success: true,
                message: `Your ${pass.passType} pass is already active.`,
                unlock: { passType: pass.passType, expiresAt: pass.expiresAt,
                    daysRemaining: Math.ceil((pass.expiresAt - new Date()) / (1000 * 60 * 60 * 24)) }
            });
        }

        // TEST MODE: skip real verification
        if (process.env.PAYMENT_TEST_MODE === 'true') {
            pass.paymentStatus = 'completed';
            await pass.save();
            return res.json({
                success: true,
                message: `[TEST] Pass activated.`,
                unlock: { passType: pass.passType, expiresAt: pass.expiresAt,
                    daysRemaining: Math.ceil((pass.expiresAt - new Date()) / (1000 * 60 * 60 * 24)) }
            });
        }

        // Must have an invoice_id to check
        if (!pass.invoiceId) {
            return res.json({ success: false, message: 'Payment not found. Please initiate a new payment.' });
        }

        // Ask IntaSend for the real status
        const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY;
        const secretKey      = process.env.INTASEND_SECRET_KEY;
        const isLive         = process.env.INTASEND_LIVE === 'true';
        const intasend       = new IntaSend(publishableKey, secretKey, !isLive);
        const collection     = intasend.collection();

        let statusRes;
        try {
            statusRes = await collection.status(pass.invoiceId);
        } catch (e) {
            console.error('IntaSend status check error:', e?.message || e);
            return res.json({ success: false, message: 'Could not verify payment status. Please try again shortly.' });
        }

        const state = (statusRes?.invoice?.state || statusRes?.state || '').toUpperCase();
        console.log('IntaSend status check — invoice_id:', pass.invoiceId, 'state:', state);

        if (state === 'COMPLETE') {
            pass.paymentStatus = 'completed';
            await pass.save();
            return res.json({
                success: true,
                message: `Payment confirmed! Your ${pass.passType} pass is now active.`,
                unlock: { passType: pass.passType, expiresAt: pass.expiresAt,
                    daysRemaining: Math.ceil((pass.expiresAt - new Date()) / (1000 * 60 * 60 * 24)) }
            });
        } else if (state === 'FAILED' || state === 'CANCELLED') {
            pass.paymentStatus = 'failed';
            await pass.save();
            return res.json({ success: false, message: 'Payment was not completed. Please try again.' });
        } else {
            // PENDING or PROCESSING — payment hasn't gone through yet
            return res.json({ success: false, message: 'Payment is still being processed. Please wait a moment and try again.' });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Pass history for user
export const getUnlockHistory = async (req, res) => {
    try {
        const passes = await UserPass.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, unlocks: passes });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Admin: get all passes
export const getPendingRefunds = async (req, res) => {
    try {
        const passes = await UserPass.find({}).sort({ createdAt: -1 });
        res.json({ success: true, refundRequests: passes });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const requestRefund = async (_req, res) => res.json({ success: false, message: 'Refunds not applicable to passes' });
export const processRefund  = async (_req, res) => res.json({ success: false, message: 'Refunds not applicable to passes' });

// -- REFERRAL SYSTEM --------------------------------------------------
// How many referrals a user must make to earn one free day pass
const REFS_PER_UNLOCK = 5;
// Maximum free day passes earnable via referrals
const MAX_REFERRAL_UNLOCKS = 10;

export const getReferralInfo = async (req, res) => {
    try {
        const dbUser = await User.findById(req.user._id);
        if (!dbUser) return res.json({ success: false, message: 'User not found' });

        // Generate referral code if missing (for users created before referral system)
        if (!dbUser.referralCode) {
            const crypto = await import('crypto');
            const hash = crypto.createHash('sha256').update(dbUser._id + Date.now().toString()).digest('hex');
            dbUser.referralCode = 'PS' + hash.substring(0, 6).toUpperCase();
            await dbUser.save();
        }

        const available = (dbUser.referralUnlocks || 0) - (dbUser.referralUnlocksUsed || 0);
        const referralCount = dbUser.referralCount || 0;
        const refsUntilNextUnlock = REFS_PER_UNLOCK - (referralCount % REFS_PER_UNLOCK);
        res.json({
            success: true,
            referralCode: dbUser.referralCode,
            referralCount,
            referralUnlocks: dbUser.referralUnlocks || 0,
            referralUnlocksUsed: dbUser.referralUnlocksUsed || 0,
            referralUnlocksAvailable: Math.max(0, available),
            refsPerUnlock: REFS_PER_UNLOCK,
            refsUntilNextUnlock: available > 0 ? 0 : refsUntilNextUnlock,
            maxReferralUnlocks: MAX_REFERRAL_UNLOCKS
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Apply a referral code (called after signup when localStorage has a referral code)
export const applyReferral = async (req, res) => {
    try {
        const { referralCode } = req.body;
        if (!referralCode) return res.json({ success: false, message: 'No referral code provided' });

        const currentUser = await User.findById(req.user._id);
        if (!currentUser) return res.json({ success: false, message: 'User not found' });

        // Already referred by someone
        if (currentUser.referredBy) {
            return res.json({ success: true, message: 'Referral already applied', alreadyReferred: true });
        }

        // Can't refer yourself
        const referrer = await User.findOne({ referralCode });
        if (!referrer) return res.json({ success: false, message: 'Invalid referral code' });
        if (referrer._id === currentUser._id) return res.json({ success: false, message: 'Cannot refer yourself' });

        // Apply referral
        currentUser.referredBy = referrer._id;
        await currentUser.save();

        // Credit the referrer — one free day pass every REFS_PER_UNLOCK referrals
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        const newCount = referrer.referralCount;
        if (newCount % REFS_PER_UNLOCK === 0 && (referrer.referralUnlocks || 0) < MAX_REFERRAL_UNLOCKS) {
            referrer.referralUnlocks = (referrer.referralUnlocks || 0) + 1;
        }
        await referrer.save();

        const refsUntilNext = REFS_PER_UNLOCK - (newCount % REFS_PER_UNLOCK || REFS_PER_UNLOCK);
        const earnedUnlock = newCount % REFS_PER_UNLOCK === 0;
        res.json({ success: true, message: earnedUnlock
            ? `Referral counted! Your friend earned a free day pass (${newCount} referrals total).`
            : `Referral counted! ${refsUntilNext} more friend${refsUntilNext > 1 ? 's' : ''} needed to earn a free day pass.` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
