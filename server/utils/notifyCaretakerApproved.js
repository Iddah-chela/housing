import { sendEmail } from './mailer.js';
import { sendPushNotification } from './pushNotifier.js';

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

/**
 * Email + push when someone is approved as a caretaker.
 */
export const notifyCaretakerApproved = async ({ userId, email, username, applicationId } = {}) => {
  const name = String(username || '').trim() || 'there';
  const manageUrl = `${CLIENT_URL}/managed-properties`;
  const tagId = applicationId || userId || 'new';

  if (email) {
    await sendEmail(
      email,
      'You are now a PataKeja caretaker — you can list and manage houses',
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
        <div style="background:#0d9488;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;">You're approved as a caretaker</h2>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
          <p style="font-size:15px;line-height:1.6;">
            Your caretaker application has been <strong style="color:#16a34a;">approved</strong>.
            You can now <strong>list houses you manage</strong> (even if the landlord is not on PataKeja yet)
            and <strong>request to manage</strong> listings already on the platform.
          </p>
          <ol style="font-size:14px;color:#374151;line-height:1.7;padding-left:18px;">
            <li>Open Manage Houses</li>
            <li>Tap <strong>List a house</strong> for a new property, or open an existing listing and request to manage it</li>
            <li>Optionally add the landlord's phone so they can confirm later</li>
          </ol>
          <div style="text-align:center;margin:24px 0;">
            <a href="${manageUrl}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Open Manage Houses</a>
          </div>
          <p style="font-size:13px;color:#6b7280;">
            Refresh the site (or sign out and back in) if you don’t see Manage Houses yet.
          </p>
        </div>
      </div>`
    );
  }

  if (userId) {
    await sendPushNotification(userId, {
      title: 'You are a caretaker now!',
      body: 'List houses you manage, or request to manage existing ones.',
      url: '/managed-properties',
      tag: `caretaker-approved-${tagId}`,
      type: 'system',
      style: 'info',
    });
  }
};
