import PushSubscription from "../models/pushSubscription.js";
import Notification from "../models/notification.js";

// Subscribe — save push subscription for the authenticated user
export const subscribePush = async (req, res) => {
    try {
        const userId = req.user._id;
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.json({ success: false, message: "Invalid subscription data" });
        }

        // Upsert: update if same endpoint exists, otherwise create
        await PushSubscription.findOneAndUpdate(
            { user: userId, endpoint },
            { user: userId, endpoint, keys },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "Push subscription saved" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unsubscribe — remove push subscription
export const unsubscribePush = async (req, res) => {
    try {
        const userId = req.user._id;
        const { endpoint } = req.body;

        if (!endpoint) {
            return res.json({ success: false, message: "Endpoint required" });
        }

        await PushSubscription.deleteOne({ user: userId, endpoint });
        res.json({ success: true, message: "Push subscription removed" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get VAPID public key (no auth required)
export const getVapidPublicKey = async (req, res) => {
    res.json({
        success: true,
        publicKey: process.env.VAPID_PUBLIC_KEY || null
    });
};

// Get recent in-app notifications for the authenticated user
export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();

        const unreadCount = notifications.filter(n => !n.read).length;

        res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Mark notifications as read (pass ids array, or empty to mark all)
export const markNotificationsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const { ids } = req.body; // optional array of specific IDs

        if (ids && ids.length > 0) {
            await Notification.updateMany(
                { _id: { $in: ids }, user: userId },
                { $set: { read: true } }
            );
        } else {
            // Mark all as read
            await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });
        }

        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
