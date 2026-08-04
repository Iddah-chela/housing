import { sendEmail } from './mailer.js';
import { sendPushNotification } from './pushNotifier.js';

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

/**
 * Email + in-app/push welcome when someone becomes an agent.
 * Emphasizes that they can post vacancies now.
 */
export const notifyAgentApproved = async ({ userId, email, username, applicationId } = {}) => {
  const name = String(username || '').trim() || 'there';
  const dashboardUrl = `${CLIENT_URL}/agent`;
  const postUrl = `${CLIENT_URL}/agent/post-vacancy`;
  const tagId = applicationId || userId || 'new';

  if (email) {
    await sendEmail(
      email,
      'You are now a PataKeja agent — you can post vacancies!',
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
        <div style="background:#4F46E5;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;">You're approved as an agent</h2>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
          <p style="font-size:15px;line-height:1.6;">
            Your PataKeja agent application has been <strong style="color:#16a34a;">approved</strong>.
            You can now <strong>post vacancies</strong>, manage viewing requests, and share listing links with tenants.
          </p>
          <ol style="font-size:14px;color:#374151;line-height:1.7;padding-left:18px;">
            <li>Open your Agent Dashboard</li>
            <li>Tap <strong>Post Vacancy</strong></li>
            <li>Add photos, rent, and an accurate map pin</li>
          </ol>
          <div style="text-align:center;margin:24px 0;display:flex;flex-direction:column;gap:10px;align-items:center;">
            <a href="${postUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Post your first vacancy</a>
            <a href="${dashboardUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Open Agent Dashboard</a>
          </div>
          <p style="font-size:13px;color:#6b7280;">
            Refresh the site (or sign out and back in) if you don’t see the Agent Dashboard button yet.
            Tip: add a map pin when posting — tenants get exact directions after you confirm a viewing.
          </p>
        </div>
      </div>`
    );
  }

  if (userId) {
    await sendPushNotification(userId, {
      title: 'You can post vacancies now!',
      body: 'Your agent application was approved. Open your dashboard and post your first vacancy.',
      url: '/agent/post-vacancy',
      tag: `agent-approved-${tagId}`,
      type: 'system',
      style: 'info',
    });
  }
};
