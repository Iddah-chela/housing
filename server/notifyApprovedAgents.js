/**
 * One-time backfill: email + notify agents already approved who never got the welcome.
 * Safe to re-run — skips applications with welcomeNotifiedAt set.
 *
 * Usage (from server/):
 *   node notifyApprovedAgents.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Must load env BEFORE importing mailer/resend
dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing in server/.env');
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY && !process.env.EMAIL_API_KEY) {
    console.warn('Warning: email API key may be missing — check RESEND_API_KEY in server/.env');
  }

  const mongoose = (await import('mongoose')).default;
  const AgentApplication = (await import('./models/agentApplication.js')).default;
  const User = (await import('./models/user.js')).default;
  const { notifyAgentApproved } = await import('./utils/notifyAgentApproved.js');

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 60000,
  });
  console.log('Connected to MongoDB');

  const apps = await AgentApplication.find({
    status: 'approved',
    $or: [
      { welcomeNotifiedAt: { $exists: false } },
      { welcomeNotifiedAt: null },
    ],
  }).lean();

  console.log(`Found ${apps.length} approved agent(s) without welcome notification`);

  let sent = 0;
  let skipped = 0;

  for (const app of apps) {
    try {
      const user = await User.findById(app.user).select('email username roles role').lean();
      if (!user) {
        console.warn(`  skip ${app.user} — user not found`);
        skipped += 1;
        continue;
      }

      await notifyAgentApproved({
        userId: app.user,
        email: user.email || app.email,
        username: user.username || [app.firstName, app.lastName].filter(Boolean).join(' '),
        applicationId: app._id,
      });

      await AgentApplication.updateOne(
        { _id: app._id },
        { $set: { welcomeNotifiedAt: new Date() } }
      );

      console.log(`  notified ${user.email || app.email || app.user}`);
      sent += 1;
    } catch (err) {
      console.error(`  failed ${app.user}:`, err.message);
      skipped += 1;
    }
  }

  console.log(`Done. Sent: ${sent}, skipped/failed: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
