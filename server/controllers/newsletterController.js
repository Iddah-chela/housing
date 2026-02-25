import Subscriber from '../models/subscriber.js';
import { sendEmail } from '../utils/mailer.js';

// POST /api/newsletter/subscribe
export const subscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.json({ success: false, message: 'Please enter a valid email address.' });
        }

        const existing = await Subscriber.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.json({ success: false, message: 'This email is already subscribed.' });
        }

        await Subscriber.create({ email: email.toLowerCase() });

        // Send a welcome email (non-blocking)
        sendEmail(
            email,
            '🏠 You\'re subscribed to QuickStay listing alerts!',
            `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#222;">
                <div style="background:#4F46E5;padding:24px 32px;border-radius:12px 12px 0 0;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">Welcome to QuickStay Alerts 🎉</h1>
                </div>
                <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                    <p>You'll now receive alerts whenever new verified rental listings become available.</p>
                    <p>We'll notify you about:</p>
                    <ul>
                        <li>New properties in your area</li>
                        <li>Price drops on existing listings</li>
                        <li>Verified landlord listings</li>
                    </ul>
                    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
                    <p style="font-size:12px;color:#9ca3af;">
                        Want to stop receiving emails? 
                        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#9ca3af;">Unsubscribe here</a>
                    </p>
                </div>
            </div>
            `
        );

        res.json({ success: true, message: 'Subscribed! Check your email for a confirmation.' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// POST /api/newsletter/unsubscribe
export const unsubscribe = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.json({ success: false, message: 'Email required.' });

        await Subscriber.findOneAndDelete({ email: email.toLowerCase() });
        res.json({ success: true, message: 'You have been unsubscribed.' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// GET /api/newsletter/subscribers (admin only — just for reference)
export const getSubscribers = async (req, res) => {
    try {
        const count = await Subscriber.countDocuments();
        res.json({ success: true, count });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
