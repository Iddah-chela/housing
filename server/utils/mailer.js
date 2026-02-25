import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS   // Gmail App Password (not your account password)
    }
});

/**
 * Send an email.
 * @param {string|string[]} to - recipient(s)
 * @param {string} subject
 * @param {string} html
 */
export const sendEmail = async (to, subject, html) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('[Mailer] EMAIL_USER / EMAIL_PASS not set — skipping email send.');
        return;
    }
    try {
        await transporter.sendMail({
            from: `"QuickStay Rentals" <${process.env.EMAIL_USER}>`,
            to: Array.isArray(to) ? to.join(',') : to,
            subject,
            html
        });
    } catch (err) {
        console.error('[Mailer] Failed to send email:', err.message);
    }
};

/**
 * Send a new-listing notification email to all subscribers.
 */
export const sendNewListingAlert = async (subscribers, property) => {
    if (!subscribers.length) return;

    const listingUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/rooms/${property._id}`;

    const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#222;">
            <div style="background:#4F46E5;padding:24px 32px;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:22px;">🏠 New Listing on QuickStay</h1>
            </div>
            <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                <p style="font-size:16px;">A new property just went live that matches your interests:</p>

                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                    <h2 style="margin:0 0 8px;font-size:18px;color:#4F46E5;">${property.name}</h2>
                    <p style="margin:4px 0;color:#555;">📍 ${property.estate}, ${property.place}</p>
                    <p style="margin:4px 0;color:#555;">🏢 ${property.propertyType}</p>
                    <p style="margin:4px 0;color:#555;">✅ ${property.vacantRooms} vacant room${property.vacantRooms !== 1 ? 's' : ''} available</p>
                </div>

                <a href="${listingUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
                    View Listing →
                </a>

                <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;" />
                <p style="font-size:12px;color:#9ca3af;">
                    You're receiving this because you subscribed to QuickStay listing alerts.<br/>
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/unsubscribe?email=EMAIL_PLACEHOLDER" style="color:#9ca3af;">Unsubscribe</a>
                </p>
            </div>
        </div>
    `;

    // Send individual emails so each has their unsubscribe link
    await Promise.allSettled(
        subscribers.map(sub =>
            sendEmail(
                sub.email,
                `🏠 New listing: ${property.name} in ${property.estate}`,
                html.replace('EMAIL_PLACEHOLDER', encodeURIComponent(sub.email))
            )
        )
    );
};
