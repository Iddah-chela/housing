import webPush from "web-push";
import PushSubscription from "../models/pushSubscription.js";
import Notification from "../models/notification.js";

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
        `mailto:${process.env.EMAIL_USER || 'PataKeja@gmail.com'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

/**
 * Send a push notification AND save it as an in-app notification.
 * In-app notification always saved (failsafe when push is blocked/denied).
 */
export const sendPushNotification = async (userId, payload) => {
    // Always save in-app notification regardless of push status
    try {
        await Notification.create({
            user: userId,
            title: payload.title || 'PataKeja',
            body: payload.body || '',
            url: payload.url || '/',
            type: payload.type || 'system',
        });
    } catch (dbErr) {
        console.warn('[Notification] Failed to save in-app notification:', dbErr.message);
    }

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        return; // Push not configured — in-app already saved above
    }

    try {
        const subscriptions = await PushSubscription.find({ user: userId });
        if (!subscriptions.length) {
            return;
        }

        const data = JSON.stringify({
            title: payload.title || 'PataKeja',
            body: payload.body || '',
            url: payload.url || '/',
            icon: payload.icon || '/icons/icon-192.png',
            tag: payload.tag || undefined,
            ...(payload.actions   ? { actions: payload.actions }     : {}),
            ...(payload.actionUrls ? { actionUrls: payload.actionUrls } : {})
        });

        const results = await Promise.allSettled(
            subscriptions.map(sub =>
                webPush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
                    data
                ).catch(async (err) => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await PushSubscription.deleteOne({ _id: sub._id });
                    } else {
                        console.warn(`[Push] Failed to send to user ${userId}:`, err.statusCode || err.message);
                    }
                })
            )
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        if (sent > 0) {
        }
    } catch (err) {
        console.warn('[Push] Error sending notification:', err.message);
    }
};

/**
 * Send push notification to multiple users at once.
 * @param {string[]} userIds
 * @param {object} payload - same as sendPushNotification
 */
export const sendPushToMany = async (userIds, payload) => {
    await Promise.allSettled(
        userIds.map(id => sendPushNotification(id, payload))
    );
};
