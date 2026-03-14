import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email via Resend.
 * @param {string|string[]} to - recipient(s)
 * @param {string} subject
 * @param {string} html
 */
export const sendEmail = async (to, subject, html) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[Mailer] RESEND_API_KEY not set � skipping email send.');
        return;
    }
    if (!to) {
        console.warn('[Mailer] No recipient email provided � skipping.');
        return;
    }
    const recipient = Array.isArray(to) ? to : [to];
    try {
        await resend.emails.send({
            from: 'PataKeja <support@patakejaa.co.ke>',
            to: recipient,
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
        <div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;color:#222;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <style>
                @keyframes slideDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
            </style>
            <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px;text-align:center;">
                <div style="animation:slideDown 0.6s ease-out;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">New Listing on PataKeja</h1>
                    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">A new property just went live!</p>
                </div>
            </div>
            <div style="padding:28px 32px;background:#fff;animation:fadeIn 0.8s ease-out;">
                <div style="background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #e0e7ff;border-radius:12px;padding:20px;margin:0 0 20px;">
                    <h2 style="margin:0 0 12px;font-size:20px;color:#4F46E5;">${property.name}</h2>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:6px 0;color:#555;font-size:14px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                ${property.estate}, ${property.place}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#555;font-size:14px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>
                                ${property.propertyType}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:6px 0;color:#555;font-size:14px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                <strong style="color:#16a34a;">${property.vacantRooms}</strong> vacant room${property.vacantRooms !== 1 ? 's' : ''} available
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="text-align:center;animation:pulse 2s infinite;">
                    <a href="${listingUrl}" style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(79,70,229,0.3);">
                        View Listing
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" style="vertical-align:middle;margin-left:6px;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </a>
                </div>

                <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;" />
                <p style="font-size:12px;color:#9ca3af;text-align:center;">
                    You're receiving this because you subscribed to PataKeja listing alerts.<br/>
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/unsubscribe?email=EMAIL_PLACEHOLDER" style="color:#6366f1;">Unsubscribe</a>
                </p>
            </div>
        </div>
    `;

    // Send individual emails so each has their unsubscribe link
    await Promise.allSettled(
        subscribers.map(sub =>
            sendEmail(
                sub.email,
                `New listing: ${property.name} in ${property.estate}`,
                html.replace('EMAIL_PLACEHOLDER', encodeURIComponent(sub.email))
            )
        )
    );
};
