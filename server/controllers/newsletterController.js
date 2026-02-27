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
            'Welcome to CampusCrib listing alerts!',
            `
            <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;color:#222;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <style>
                    @keyframes slideDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
                    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                    @keyframes bounceIn { 0% { opacity:0; transform:scale(0.3); } 50% { transform:scale(1.05); } 70% { transform:scale(0.9); } 100% { opacity:1; transform:scale(1); } }
                </style>
                <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:36px 32px;text-align:center;">
                    <div style="animation:bounceIn 0.8s ease-out;">
                        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:14px;"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
                        <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">You're In!</h1>
                        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Welcome to CampusCrib alerts</p>
                    </div>
                </div>
                <div style="padding:28px 32px;background:#fff;animation:fadeIn 0.8s ease-out;">
                    <p style="font-size:15px;color:#374151;line-height:1.6;">You'll now receive alerts whenever new verified rental listings become available.</p>
                    <p style="font-size:15px;color:#374151;font-weight:600;margin-bottom:8px;">We'll notify you about:</p>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px 0;font-size:14px;color:#555;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" stroke-width="2" style="vertical-align:middle;margin-right:10px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                New properties in your area
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;font-size:14px;color:#555;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="vertical-align:middle;margin-right:10px;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                Price drops on existing listings
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;font-size:14px;color:#555;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" style="vertical-align:middle;margin-right:10px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                Verified landlord listings
                            </td>
                        </tr>
                    </table>
                    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
                    <p style="font-size:12px;color:#9ca3af;text-align:center;">
                        Want to stop receiving emails? 
                        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#6366f1;">Unsubscribe here</a>
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
