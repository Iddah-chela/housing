/**
 * One-time backfill: email + notify agents already approved who never got the welcome.
 * Safe to re-run — skips applications with welcomeNotifiedAt set.
 *
 * Usage (from server/):
 *   node notifyApprovedAgents.js
 *
 * If you see queryTxt ETIMEOUT locally, your DNS can't resolve mongodb+srv TXT records.
 * This script falls back to SRV host lookup + a standard mongodb:// URI when that happens.
 * Or run on Railway: railway run node notifyApprovedAgents.js
 */
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

try {
  // Prefer public DNS for Atlas lookups
  const dnsSync = await import('dns');
  dnsSync.default.setServers(['1.1.1.1', '8.8.8.8', '8.8.4.4']);
} catch (_) {}

/** Convert mongodb+srv:// to mongodb:// using SRV records (skips flaky TXT lookup). */
const srvToStandardUri = async (uri) => {
  if (!uri.startsWith('mongodb+srv://')) return uri;

  const withoutProtocol = uri.slice('mongodb+srv://'.length);
  const at = withoutProtocol.lastIndexOf('@');
  if (at < 0) throw new Error('Invalid MONGODB_URI (missing @)');

  const auth = withoutProtocol.slice(0, at);
  const hostAndRest = withoutProtocol.slice(at + 1);
  const slash = hostAndRest.indexOf('/');
  const hostPart = slash >= 0 ? hostAndRest.slice(0, slash) : hostAndRest;
  const pathAndQuery = slash >= 0 ? hostAndRest.slice(slash) : '/';
  const hostname = hostPart.split('?')[0].split(':')[0];

  const records = await dns.resolveSrv(`_mongodb._tcp.${hostname}`);
  if (!records?.length) throw new Error(`No SRV records for ${hostname}`);

  const hosts = records
    .map((r) => `${r.name.replace(/\.$/, '')}:${r.port || 27017}`)
    .join(',');

  // Drop srv-only query params; keep authSource/retryWrites if present in path
  let pathOnly = pathAndQuery.split('?')[0] || '/';
  const existingQuery = pathAndQuery.includes('?') ? pathAndQuery.split('?')[1] : '';
  const params = new URLSearchParams(existingQuery);
  params.delete('ssl'); // use tls=
  if (!params.has('tls')) params.set('tls', 'true');
  if (!params.has('authSource')) params.set('authSource', 'admin');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');

  return `mongodb://${auth}@${hosts}${pathOnly}?${params.toString()}`;
};

const connectMongo = async (mongoose) => {
  const original = process.env.MONGODB_URI;
  const opts = {
    serverSelectionTimeoutMS: 120000,
    connectTimeoutMS: 120000,
    socketTimeoutMS: 120000,
    family: 4,
  };

  try {
    console.log('Connecting via mongodb+srv...');
    await mongoose.connect(original, opts);
    return;
  } catch (err) {
    if (!String(err.code || err.message).includes('ETIMEOUT') && !String(err.message).includes('queryTxt')) {
      throw err;
    }
    console.warn('SRV/TXT DNS timed out. Falling back to standard mongodb:// hosts...');
  }

  const standard = await srvToStandardUri(original);
  await mongoose.connect(standard, opts);
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing in server/.env');
    process.exit(1);
  }

  const mongoose = (await import('mongoose')).default;
  const AgentApplication = (await import('./models/agentApplication.js')).default;
  const User = (await import('./models/user.js')).default;
  const { notifyAgentApproved } = await import('./utils/notifyAgentApproved.js');

  await connectMongo(mongoose);
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
