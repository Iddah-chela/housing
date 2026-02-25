import express from "express"
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/db.js";
import { clerkMiddleware } from '@clerk/express'
import clerkWebhooks from "./controllers/clerkWebhooks.js";
import userRouter from "./routes/userRoutes.js";
import houseRouter from "./routes/houseRoutes.js";
import propertyRouter from "./routes/propertyRoutes.js";
import connectCloudinary from "./config/cloudinary.js";
import roomRouter from "./routes/roomRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import viewingRouter from "./routes/viewingRoutes.js";
import reportRouter from "./routes/reportRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import landlordApplicationRouter from "./routes/landlordApplicationRoutes.js";
import profileRouter from "./routes/profileRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import newsletterRouter from "./routes/newsletterRoutes.js";
import { expireViewingRequests } from "./utils/expirationHandler.js";
import { checkListingFreshness, checkUnlockAutoRefunds } from "./utils/cronJobs.js";


connectDB()
connectCloudinary();

const app = express()

app.use(cors())

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.use("/api/clerk", clerkWebhooks)
app.use(clerkMiddleware())

app.get('/', (req, res)=> res.send("Api is working"))
app.use('/api/user', userRouter)
app.use('/api/houses', houseRouter)
app.use('/api/properties', propertyRouter)
app.use('/api/rooms', roomRouter)
app.use('/api/bookings', bookingRouter )
app.use('/api/chat', chatRouter)
app.use('/api/viewing', viewingRouter)
app.use('/api/reports', reportRouter)
app.use('/api/admin', adminRouter)
app.use('/api/landlord-application', landlordApplicationRouter)
app.use('/api/profile', profileRouter)
app.use('/api/payment', paymentRouter)
app.use('/api/newsletter', newsletterRouter)


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

// Run all jobs once shortly after startup
setTimeout(async () => {
    await expireViewingRequests();
    await checkListingFreshness();
    await checkUnlockAutoRefunds();
}, 5000);





























