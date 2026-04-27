import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    broadcastId: {
        type: String,
        default: null,
        index: true,
    },
    user: {
        type: String, // Clerk user ID
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        default: '',
    },
    url: {
        type: String,
        default: '/',
    },
    type: {
        type: String,
        enum: ['message', 'viewing', 'booking', 'system', 'payment'],
        default: 'system',
    },
    channel: {
        type: String,
        enum: ['inApp', 'push', 'email', 'banner'],
        default: 'inApp',
    },
    style: {
        type: String,
        enum: ['info', 'general', 'critical'],
        default: 'info',
    },
    imageUrl: {
        type: String,
        default: '',
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    revokedAt: {
        type: Date,
        default: null,
    },
    read: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Auto-delete notifications when their expiry date passes.
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
