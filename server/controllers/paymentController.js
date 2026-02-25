import UserPass from "../models/userPass.js";

const PASS_PRICES = { '7day': 200, '30day': 400 };
const PASS_DAYS   = { '7day': 7,   '30day': 30  };

const activePassForUser = (userId) =>
    UserPass.findOne({ user: userId, paymentStatus: 'completed', expiresAt: { $gt: new Date() } });

const priorCompletedCount = (userId) =>
    UserPass.countDocuments({ user: userId, paymentStatus: 'completed' });

// Check if this will be user's first (free) pass
export const checkFirstUnlock = async (req, res) => {
    try {
        const count = await priorCompletedCount(req.user._id);
        res.json({ success: true, isFree: count === 0 });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Purchase / activate a pass
export const initiateUnlock = async (req, res) => {
    try {
        const { phoneNumber, passType = '7day' } = req.body;
        const userId = req.user._id;

        if (!PASS_PRICES[passType]) {
            return res.json({ success: false, message: "Invalid pass type" });
        }

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

        // ── FIRST PASS IS FREE (7-day) ────────────────────────────────────
        const priorCount = await priorCompletedCount(userId);
        if (priorCount === 0) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            const freePass = await UserPass.create({
                user: userId, passType: '7day', amount: 0, isFree: true,
                phoneNumber: phoneNumber || '0000', paymentStatus: 'completed',
                transactionRef: 'FREE_' + Date.now(), expiresAt
            });
            return res.json({
                success: true, isFree: true,
                message: "Your first 7-day pass is free! Browse all listings freely.",
                unlock: { passType: '7day', expiresAt: freePass.expiresAt, daysRemaining: 7 },
                unlockId: freePass._id
            });
        }
        // ─────────────────────────────────────────────────────────────────

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

        const transactionRef = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substring(7);

        // TODO: Replace stub with actual PayHero API call when credentials available
        // await axios.post('https://backend.payhero.co.ke/api/v2/payments', { amount, ... });

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

// PayHero webhook
export const paymentWebhook = async (req, res) => {
    try {
        const { transaction_ref, status } = req.body;
        console.log('PayHero Webhook:', req.body);
        const pass = await UserPass.findOne({ transactionRef: transaction_ref });
        if (!pass) return res.status(404).json({ success: false, message: "Pass record not found" });
        if (status === 'success' || status === 'completed') {
            pass.paymentStatus = 'completed'; await pass.save();
            console.log('✅ Pass activated:', pass._id);
        } else if (status === 'failed') {
            pass.paymentStatus = 'failed'; await pass.save();
        }
        res.json({ success: true, message: "Webhook processed" });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Manual confirm (testing / fallback until webhook is live)
export const confirmPayment = async (req, res) => {
    try {
        const { unlockId } = req.body;
        const pass = await UserPass.findOne({ _id: unlockId, user: req.user._id });
        if (!pass) return res.json({ success: false, message: "Pass record not found" });
        pass.paymentStatus = 'completed';
        await pass.save();
        res.json({
            success: true,
            message: `Payment confirmed! Your ${pass.passType} pass is now active.`,
            unlock: {
                passType: pass.passType, expiresAt: pass.expiresAt,
                daysRemaining: Math.ceil((pass.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
            }
        });
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
