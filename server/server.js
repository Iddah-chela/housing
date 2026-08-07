import express from "express"
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import connectDB from "./config/db.js";
import { clerkMiddleware } from '@clerk/express'
import clerkWebhooks from "./controllers/clerkWebhooks.js";
import userRouter from "./routes/userRoutes.js";
import houseRouter from "./routes/houseRoutes.js";
import propertyRouter from "./routes/propertyRoutes.js";
import { connectCloudinary } from "./config/cloudinary.js";
import roomRouter from "./routes/roomRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import agentChatRouter from "./routes/agentChatRoutes.js";
import viewingRouter from "./routes/viewingRoutes.js";
import reportRouter from "./routes/reportRoutes.js";
import feedbackRouter from "./routes/feedbackRoutes.js";
import rentPaymentRouter from "./routes/rentPaymentRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import landlordApplicationRouter from "./routes/landlordApplicationRoutes.js";
import profileRouter from "./routes/profileRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import newsletterRouter from "./routes/newsletterRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import announcementRouter from "./routes/announcementRoutes.js";
import utilityRouter from "./routes/utilityRoutes.js";
import analyticsRouter from "./routes/analyticsRoutes.js";
import agentRouter from "./routes/agentRoutes.js";
import agentApplicationRouter from "./routes/agentApplicationRoutes.js";
import caretakerApplicationRouter from "./routes/caretakerApplicationRoutes.js";
import mapRouter from "./routes/mapRoutes.js";
import multer from 'multer';
import upload from './middleware/uploadMiddleware.js';
import * as agentController from './controllers/agentController.js';
import { expireViewingRequests } from "./utils/expirationHandler.js";
import { expireProvisionalHolds } from "./utils/expirationHandler.js";
import { checkListingFreshness, checkUnlockAutoRefunds, sendPostViewingNudges, sendViewingReminders, sendMoveInNudges, sendMoveOutNudges, sendWeeklyPropertyUpdateReminders, processPlacementConfirmations } from "./utils/cronJobs.js";
import mongoose from 'mongoose';
import { runAgentVacancyMigration } from './utils/agentVacancyMigration.js';


connectDB()
connectCloudinary();

const waitForMongoConnection = async (maxWaitMs = 60000) => {
    const start = Date.now();
    while (mongoose.connection.readyState !== 1 && Date.now() - start < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return mongoose.connection.readyState === 1;
};

const maybeRunAgentVacancyMigrationOnStartup = async () => {
    const enabled = String(process.env.RUN_AGENT_VACANCY_MIGRATION || '').toLowerCase() === 'true';
    if (!enabled) return;

    const connected = await waitForMongoConnection();
    if (!connected) {
        console.warn('[AgentVacancyMigration] Skipped: MongoDB not connected within timeout');
        return;
    }

    const olderThanDaysRaw = process.env.AGENT_VACANCY_MIGRATION_OLDER_THAN_DAYS;
    const olderThanDays = olderThanDaysRaw ? Number(olderThanDaysRaw) : null;

    try {
        const result = await runAgentVacancyMigration({
            applyChanges: true,
            olderThanDays,
            dropTtlIndexes: true,
        });

        console.log('[AgentVacancyMigration] completed', {
            matchingCount: result.matchingCount,
            modifiedCount: result.modifiedCount,
            droppedIndexes: result.droppedIndexes,
            failedDrops: result.failedDrops,
        });
        console.log('[AgentVacancyMigration] Set RUN_AGENT_VACANCY_MIGRATION=false after successful deploy to avoid reruns.');
    } catch (error) {
        console.error('[AgentVacancyMigration] failed', error?.message || error);
    }
};

maybeRunAgentVacancyMigrationOnStartup();

const app = express()

// Trust Railway/Render/Vercel reverse proxies so rate-limit can read real IPs
app.set('trust proxy', 1)

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow Cloudinary images
    contentSecurityPolicy: false, // CSP can break frontend; leave off for now
}));

// ── CORS — only allow your frontend origins ──────────────────────────────────
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://patakejaa.co.ke',
    'https://www.patakejaa.co.ke',
    'https://patakejaa.vercel.app',
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Disabled in development — only active in production
const isDev = process.env.NODE_ENV !== 'production'

// General: 300 requests per 15 min per IP
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 10_000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
});

// Auth-sensitive routes: stricter (60 per 15 min in prod)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 10_000 : 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, please try again later' },
});

// STK push routes: very strict (5 per 5 min) to prevent M-Pesa spam to third parties
const stkLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: isDev ? 10_000 : 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many payment attempts. Please wait before trying again.' },
});

// ── Body parsing — small default, large only where needed ─────────────────────
const largeBodyPrefixes = ['/api/properties', '/api/rooms', '/api/profile', '/api/landlord-application', '/api/caretaker-applications']
app.use((req, res, next) => {
    if (largeBodyPrefixes.some(prefix => req.path.startsWith(prefix))) return next()
    return express.json({ limit: '1mb' })(req, res, next)
})
app.use((req, res, next) => {
    if (largeBodyPrefixes.some(prefix => req.path.startsWith(prefix))) return next()
    return express.urlencoded({ limit: '1mb', extended: true })(req, res, next)
})

// ── NoSQL injection sanitization ─────────────────────────────────────────────
// Express 5 makes req.query a read-only getter, so we can't use mongoSanitize() globally.
// Instead, manually sanitize only the writable fields: body and params.
app.use((req, res, next) => {
    if (req.body) req.body = mongoSanitize.sanitize(req.body)
    if (req.params) req.params = mongoSanitize.sanitize(req.params)
    next()
})

// Webhook must come before clerkMiddleware (needs raw body)
app.use("/api/clerk", clerkWebhooks)
app.use(clerkMiddleware())

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res)=> res.send("Api is working"))
app.get('/api/health', (req, res)=> res.json({ status: 'ok', ts: Date.now() }))

// Auth-sensitive routes get stricter rate limit
app.use('/api/payment', authLimiter, paymentRouter)
app.use('/api/admin', authLimiter, adminRouter)

// Property routes get larger body limit for base64 image uploads
app.use('/api/properties', express.json({ limit: '50mb' }), propertyRouter)
app.use('/api/rooms', express.json({ limit: '50mb' }), roomRouter)
app.use('/api/profile', express.json({ limit: '10mb' }), profileRouter)
app.use('/api/landlord-application', express.json({ limit: '20mb' }), authLimiter, landlordApplicationRouter)

// All other routes get general rate limit
app.use('/api/user', generalLimiter, userRouter)
app.use('/api/houses', generalLimiter, houseRouter)
app.use('/api/bookings', generalLimiter, bookingRouter)
app.use('/api/chat', generalLimiter, chatRouter)
app.use('/api/agent-chat', generalLimiter, agentChatRouter)
app.use('/api/viewing', generalLimiter, viewingRouter)
app.use('/api/reports', authLimiter, reportRouter)
app.use('/api/feedback', generalLimiter, feedbackRouter)
app.use('/api/rent-payment', generalLimiter, rentPaymentRouter)
app.use('/api/utility', generalLimiter, utilityRouter)
app.use('/api/newsletter', generalLimiter, newsletterRouter)
app.use('/api/notifications', generalLimiter, notificationRouter)
app.use('/api/announcements', generalLimiter, announcementRouter)
app.use('/api/site', generalLimiter, analyticsRouter)
app.use('/api/visit', generalLimiter, analyticsRouter)
app.use('/api/analytics', generalLimiter, analyticsRouter)
app.use('/api/agent', generalLimiter, agentRouter)
app.use('/api/agent-applications', generalLimiter, agentApplicationRouter)
app.use('/api/caretaker-applications', generalLimiter, caretakerApplicationRouter)
app.use('/api/map', generalLimiter, mapRouter)

// Dev-only: debug upload endpoint to test multipart handling without Cloudinary/auth
if (isDev) {
    const debugUpload = multer({ storage: multer.diskStorage({}) });
    app.post('/api/debug/upload-test', debugUpload.single('file'), (req, res) => {
        console.log('[DebugUpload] headers:', { 'content-type': req.headers['content-type'] });
        console.log('[DebugUpload] body keys:', Object.keys(req.body || {}));
        console.log('[DebugUpload] file:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        } : null);
        res.json({ success: true, hasFile: !!req.file, file: req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        } : null, body: req.body });
    });
    // Also expose a dev-only route that calls the real agent upload handler without auth
    app.post('/api/debug/agent-upload-test', upload.single('file'), async (req, res) => {
        // Provide a fake agent user for the handler
        req.user = { _id: 'debug-agent-id' };
        try {
            await agentController.uploadMedia(req, res);
        } catch (e) {
            console.error('[DebugAgentUpload] handler error', e?.message || e);
            res.status(500).json({ success: false, message: e?.message || 'handler error' });
        }
    });
}


const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));

// ── Scheduled Jobs ────────────────────────────────────────────────────────────

// Hourly: expire old viewing requests + check unlock auto-refunds
setInterval(async () => {
    await expireViewingRequests();
    await checkUnlockAutoRefunds();
}, 60 * 60 * 1000);

// Daily: check listing freshness (14-day warn, 30-day expire)
setInterval(async () => {
    await checkListingFreshness();
}, 24 * 60 * 60 * 1000);

// Every 5 min: send post-viewing nudges to renters
setInterval(async () => {
    await sendPostViewingNudges();
}, 5 * 60 * 1000);

// Every 5 min: expire provisional booking holds
setInterval(async () => {
    await expireProvisionalHolds();
}, 5 * 60 * 1000);

// Every 6 hours: move-in confirmation nudges
setInterval(async () => {
    await sendMoveInNudges();
}, 6 * 60 * 60 * 1000);

// Every 6 hours: move-out date confirmations
setInterval(async () => {
    await sendMoveOutNudges();
}, 6 * 60 * 60 * 1000);

// Every 6 hours: agent placement confirmation nudges / 7-day expiry
setInterval(async () => {
    await processPlacementConfirmations();
}, 6 * 60 * 60 * 1000);

// Daily: send viewing reminders (day-before reminder push + email)
setInterval(async () => {
    await sendViewingReminders();
}, 24 * 60 * 60 * 1000);

// Weekly: remind landlord/caretaker to refresh property details
setInterval(async () => {
    await sendWeeklyPropertyUpdateReminders();
}, 7 * 24 * 60 * 60 * 1000);

// Run all jobs once shortly after startup
setTimeout(async () => {
    await expireViewingRequests();
    await checkListingFreshness();
    await checkUnlockAutoRefunds();
    await sendPostViewingNudges();
    await sendViewingReminders();
    await sendMoveInNudges();
    await sendMoveOutNudges();
    await sendWeeklyPropertyUpdateReminders();
    await expireProvisionalHolds();
    await processPlacementConfirmations();
}, 5000);





























