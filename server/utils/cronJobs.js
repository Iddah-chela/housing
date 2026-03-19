import crypto from "crypto";
import Property from "../models/property.js";
import PropertyUnlock from "../models/propertyUnlock.js";
import ViewingRequest from "../models/viewingRequest.js";
import Booking from "../models/booking.js";
import User from "../models/user.js";
import { sendEmail } from "./mailer.js";
import { sendPushNotification } from "./pushNotifier.js";

const DAYS_14 = 14 * 24 * 60 * 60 * 1000;
const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
const HOURS_48 = 48 * 60 * 60 * 1000;

// ── Run daily ─────────────────────────────────────────────────────────────────
// Marks listings as needsRefresh (14+ days) or isExpired (30+ days) since last
// time the landlord pressed "Refresh Listing".
export const checkListingFreshness = async () => {
    try {
        const now = new Date();

        // Properties that have NEVER been verified use createdAt as the baseline.
        const cutoff14 = new Date(now - DAYS_14);
        const cutoff30 = new Date(now - DAYS_30);

        // Mark as needsRefresh (14-29 days stale)
        const staleResult = await Property.updateMany(
            {
                isExpired: false,
                $or: [
                    { lastVerifiedAt: null, createdAt: { $lt: cutoff14, $gte: cutoff30 } },
                    { lastVerifiedAt: { $lt: cutoff14, $gte: cutoff30 } }
                ]
            },
            { $set: { needsRefresh: true } }
        );

        // Mark as isExpired (30+ days stale) — hide from public listings
        const expiredResult = await Property.updateMany(
            {
                isExpired: false,
                $or: [
                    { lastVerifiedAt: null, createdAt: { $lt: cutoff30 } },
                    { lastVerifiedAt: { $lt: cutoff30 } }
                ]
            },
            { $set: { isExpired: true, needsRefresh: false } }
        );

        if (staleResult.modifiedCount || expiredResult.modifiedCount) {
        }
    } catch (error) {
        console.error('[Freshness cron error]', error.message);
    }
};

// ── Run hourly ────────────────────────────────────────────────────────────────
// For each paid unlock older than 48 h: if the landlord has not responded to ANY
// viewing request that the same renter made for that property after the unlock,
// auto-flag the unlock for refund so admin can process it.
export const checkUnlockAutoRefunds = async () => {
    try {
        const cutoff48h = new Date(Date.now() - HOURS_48);

        // Paid unlocks that are > 48h old and haven't been flagged yet
        const staleUnlocks = await PropertyUnlock.find({
            paymentStatus: 'completed',
            amount: { $gt: 0 },          // skip free unlocks
            refundRequested: false,
            createdAt: { $lt: cutoff48h }
        });

        let flagged = 0;
        for (const unlock of staleUnlocks) {
            // Check if renter submitted any viewing request for this property after unlocking
            const viewingAfterUnlock = await ViewingRequest.findOne({
                renter: unlock.user,
                property: unlock.property,
                createdAt: { $gte: unlock.createdAt }
            });

            if (!viewingAfterUnlock) {
                // Renter didn't even make a viewing request — no auto-refund needed yet
                continue;
            }

            // Check if the landlord responded to any of those viewings
            const respondedViewing = await ViewingRequest.findOne({
                renter: unlock.user,
                property: unlock.property,
                createdAt: { $gte: unlock.createdAt },
                status: { $in: ['confirmed', 'declined', 'completed'] }
            });

            if (!respondedViewing) {
                // Landlord never responded within 48h → flag for auto-refund
                unlock.refundRequested = true;
                unlock.refundReason = 'Auto-flagged: landlord did not respond to viewing request within 48 hours';
                await unlock.save();
                flagged++;
            }
        }

        if (flagged > 0) {
        }
    } catch (error) {
        console.error('[Auto-refund cron error]', error.message);
    }
};

// ── Run every 30 minutes ──────────────────────────────────────────────────────
// For each confirmed viewing that happened 6+ hours ago with no nudge sent yet,
// send a "Want this room?" email + push to the renter.
const HOURS_6 = 6 * 60 * 60 * 1000;

export const sendPostViewingNudges = async () => {
    try {
        const cutoff = new Date(Date.now() - HOURS_6);

        const pendingNudges = await ViewingRequest.find({
            status: 'confirmed',
            isDirectApply: false,
            viewingDate: { $lt: cutoff },
            nudgeSentAt: null
        }).populate('property');

        let sent = 0;
        for (const viewing of pendingNudges) {
            try {
                const renterUser = await User.findById(viewing.renter);
                if (!renterUser) continue;

                const property = viewing.property;
                if (!property) continue;

                // Generate a one-tap token
                const token = crypto.randomUUID();
                viewing.nudgeToken = token;
                viewing.nudgeSentAt = new Date();
                await viewing.save();

                const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
                const yesUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/viewing/action?type=nudge&token=${token}&answer=yes`;
                const noUrl  = `${process.env.CLIENT_URL || 'http://localhost:5173'}/viewing/action?type=nudge&token=${token}&answer=no`;
                const roomLabel = `${viewing.roomDetails.roomType} in ${viewing.roomDetails.buildingName || 'Building'}`;

                sendEmail(
                    renterUser.email,
                    `How did the viewing go? — ${property.name}`,
                    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                        <div style="background:#4F46E5;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                            <h2 style="color:#fff;margin:0;font-size:20px;">Want this room?</h2>
                        </div>
                        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                            <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">Hi <strong>${renterUser.username}</strong>,</p>
                            <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">You recently visited a <strong>${roomLabel}</strong> at <strong>${property.name}</strong>. Did you like it?</p>
                            <div style="display:flex;gap:12px;justify-content:center;margin:24px 0;">
                                <a href="${yesUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Yes, book it!</a>
                                <a href="${noUrl}"  style="display:inline-block;background:#dc2626;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Not for me</a>
                            </div>
                            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">Clicking "Yes, book it!" will automatically create a booking for you using your preferred move-in date.</p>
                        </div>
                    </div>`
                ).catch(e => console.warn('[Nudge] Email failed:', e.message));

                const SERVER = process.env.SERVER_URL || process.env.BACKEND_URL || `https://housing-production-89b4.up.railway.app/`;
                sendPushNotification(viewing.renter, {
                    title: 'Want this room?',
                    body: `You visited ${roomLabel} at ${property.name}. Ready to book?`,
                    url: `/my-viewings`,
                    tag: `nudge-${viewing._id}`,
                    actions: [
                        { action: 'bg-yes', title: '✓ Book it!' },
                        { action: 'bg-no',  title: 'Not for me' }
                    ],
                    actionUrls: {
                        'bg-yes': `${SERVER}/api/viewing/nudge-response?token=${token}&answer=yes&bg=1`,
                        'bg-no':  `${SERVER}/api/viewing/nudge-response?token=${token}&answer=no&bg=1`
                    }
                });

                sent++;
            } catch (e) {
                console.warn('[Nudge] Failed for viewing', viewing._id, ':', e.message);
            }
        }

        if (sent > 0) {
        }
    } catch (error) {
        console.error('[Nudge cron error]', error.message);
    }
};

// ── Run daily ─────────────────────────────────────────────────────────────────
// For each confirmed viewing scheduled within the next 24 hours where no
// reminder has been sent yet, send a push + email reminder to the renter.
const HOURS_24 = 24 * 60 * 60 * 1000;

export const sendViewingReminders = async () => {
    try {
        const now = new Date();
        const in24h = new Date(now.getTime() + HOURS_24);

        const upcomingViewings = await ViewingRequest.find({
            status: 'confirmed',
            isDirectApply: false,
            viewingDate: { $gte: now, $lte: in24h },
            reminderSentAt: null
        }).populate('property');

        let sent = 0;
        for (const viewing of upcomingViewings) {
            try {
                const renterUser = await User.findById(viewing.renter);
                if (!renterUser) continue;

                const property = viewing.property;
                if (!property) continue;

                const dateStr = new Date(viewing.viewingDate).toLocaleDateString('en-KE', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
                const roomLabel = `${viewing.roomDetails.roomType} in ${viewing.roomDetails.buildingName || 'Building'}`;

                sendPushNotification(viewing.renter, {
                    title: 'Viewing Reminder',
                    body: `Your viewing of ${roomLabel} at ${property.name} is tomorrow — ${dateStr}`,
                    url: `/my-viewings`,
                    tag: `reminder-${viewing._id}`
                });

                sendEmail(
                    renterUser.email,
                    `Viewing Reminder — ${property.name}`,
                    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                        <div style="background:#f59e0b;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                            <h2 style="color:#fff;margin:0;font-size:20px;">Viewing Reminder</h2>
                        </div>
                        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                            <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">Hi <strong>${renterUser.username}</strong>,</p>
                            <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">This is a reminder that you have a viewing scheduled at <strong>${property.name}</strong>.</p>
                            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                                <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Room:</strong> ${roomLabel}</td></tr>
                                <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Date:</strong> ${dateStr}</td></tr>
                                <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Time:</strong> ${viewing.viewingTimeRange}</td></tr>
                                <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Address:</strong> ${property.address}, ${property.estate}</td></tr>
                                <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Contact:</strong> ${property.contact}</td></tr>
                            </table>
                            ${property.googleMapsUrl ? `<div style="text-align:center;margin-bottom:16px;"><a href="${property.googleMapsUrl}" style="display:inline-block;background:#f59e0b;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open in Google Maps</a></div>` : ''}
                            <div style="text-align:center;margin-top:12px;">
                                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-viewings" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View My Viewings</a>
                            </div>
                        </div>
                    </div>`
                ).catch(e => console.warn('[Reminder] Email failed:', e.message));

                viewing.reminderSentAt = new Date();
                await viewing.save();
                sent++;
            } catch (e) {
                console.warn('[Reminder] Failed for viewing', viewing._id, ':', e.message);
            }
        }

        if (sent > 0) {
        }
    } catch (error) {
        console.error('[Reminder cron error]', error.message);
    }
};

// ── Run every 6 hours ─────────────────────────────────────────────────────────
// Move-in confirmation nudge flow:
//  T+0h  (on move-in day): push + email renter "Did you move in?"
//  T+24h: second nudge to renter if still not confirmed
//  T+48h: notify owner/caretaker if renter still silent
export const sendMoveInNudges = async () => {
    try {
        const now = new Date();
        const BASE = process.env.CLIENT_URL || 'http://localhost:5173';

        // Confirmed bookings where move-in date has passed and renter hasn't confirmed
        const bookings = await Booking.find({
            status: 'confirmed',
            hasMoved: false,
            moveInDate: { $lte: now }
        }).populate('property');

        for (const booking of bookings) {
            try {
                const msDiff = now - new Date(booking.moveInDate);
                const hoursDiff = msDiff / (1000 * 60 * 60);
                const property = booking.property;
                if (!property) continue;

                const renterUser = await User.findById(booking.user);
                if (!renterUser) continue;

                const roomLabel = `${booking.roomDetails.roomType} in ${booking.roomDetails.buildingName}`;
                const moveInStr = new Date(booking.moveInDate).toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });

                // ── First nudge (0-24h, not yet sent) ──────────────────────
                if (!booking.moveInNudgeSentAt && hoursDiff >= 0) {
                    booking.moveInNudgeSentAt = new Date();
                    await booking.save();

                    const SERVER_BASE = process.env.SERVER_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
                    const yesUrl = `${SERVER_BASE}/api/bookings/move-in-action?id=${booking._id}&answer=yes`;
                    const noUrl  = `${SERVER_BASE}/api/bookings/move-in-action?id=${booking._id}&answer=no`;

                    sendEmail(renterUser.email,
                        `Did you move in? — ${property.name}`,
                        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                            <div style="background:#4F46E5;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                                <h2 style="color:#fff;margin:0;">Move-in day! 🏠</h2>
                            </div>
                            <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                                <p>Hi <strong>${renterUser.username}</strong>,</p>
                                <p>Today is your move-in day for your <strong>${roomLabel}</strong> at <strong>${property.name}</strong>.</p>
                                <p>Did everything go smoothly?</p>
                                <div style="display:flex;gap:12px;justify-content:center;margin:24px 0;">
                                    <a href="${yesUrl}" style="background:#16a34a;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;">✓ Yes, I moved in!</a>
                                    <a href="${noUrl}" style="background:#dc2626;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;">Not yet</a>
                                </div>
                                <p style="font-size:12px;color:#9ca3af;text-align:center;">You can also tap "Confirm Move-In" in the app under My Bookings.</p>
                            </div>
                        </div>`
                    ).catch(() => {});

                    sendPushNotification(booking.user, {
                        title: 'Move-in day! 🏠',
                        body: `Did you move into ${property.name}? Tap to confirm.`,
                        url: '/my-bookings',
                        tag: `movein-${booking._id}`,
                        actions: [{ action: 'bg-yes', title: '✓ Moved in!' }, { action: 'dismiss', title: 'Later' }],
                        actionUrls: { 'bg-yes': `${SERVER_BASE}/api/bookings/move-in-action?id=${booking._id}&answer=yes&bg=1` }
                    });
                }

                // ── Second nudge (24-48h after move-in date) ───────────────
                else if (booking.moveInNudgeSentAt && !booking.moveInOwnerNudgeSentAt && hoursDiff >= 24 && hoursDiff < 48) {
                    const hoursSinceFirst = (now - new Date(booking.moveInNudgeSentAt)) / (1000 * 60 * 60);
                    if (hoursSinceFirst >= 20) { // at least 20h after first nudge
                        const SERVER_BASE2 = process.env.SERVER_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
                        sendPushNotification(booking.user, {
                            title: 'Reminder: Confirm your move-in',
                            body: `Still waiting for confirmation of your move-in at ${property.name}`,
                            url: '/my-bookings',
                            tag: `movein-nudge2-${booking._id}`,
                            actions: [{ action: 'bg-yes', title: '✓ Moved in!' }, { action: 'dismiss', title: 'Later' }],
                            actionUrls: { 'bg-yes': `${SERVER_BASE2}/api/bookings/move-in-action?id=${booking._id}&answer=yes&bg=1` }
                        });
                    }
                }

                // ── Owner nudge (48h+ no response from renter) ─────────────
                else if (hoursDiff >= 48 && !booking.moveInOwnerNudgeSentAt) {
                    const ownerUser = await User.findById(property.owner);
                    if (!ownerUser) continue;

                    const token = crypto.randomUUID();
                    booking.moveInOwnerToken = token;
                    booking.moveInOwnerNudgeSentAt = new Date();
                    await booking.save();

                    const ownerYes = `${SERVER}/api/bookings/move-in-action?id=${booking._id}&answer=owner-yes&token=${token}`;
                    const ownerNo  = `${SERVER}/api/bookings/move-in-action?id=${booking._id}&answer=owner-no&token=${token}`;

                    sendEmail(ownerUser.email,
                        `Did ${renterUser.username} move in? — ${property.name}`,
                        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                            <div style="background:#d97706;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                                <h2 style="color:#fff;margin:0;">Move-in check</h2>
                            </div>
                            <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                                <p>Hi <strong>${ownerUser.username}</strong>,</p>
                                <p><strong>${renterUser.username}</strong> was scheduled to move into a <strong>${roomLabel}</strong> at <strong>${property.name}</strong> on <strong>${moveInStr}</strong>, but hasn't confirmed yet.</p>
                                <p>Did they move in?</p>
                                <div style="display:flex;gap:12px;justify-content:center;margin:24px 0;">
                                    <a href="${ownerYes}" style="background:#16a34a;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;">✓ Yes, they moved in</a>
                                    <a href="${ownerNo}" style="background:#dc2626;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;">✗ No, they haven't</a>
                                </div>
                            </div>
                        </div>`
                    ).catch(() => {});

                    const SERVER = process.env.SERVER_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
                    sendPushNotification(property.owner, {
                        title: '🏠 Move-in check',
                        body: `Did ${renterUser.username} move into ${property.name}?`,
                        url: '/owner/bookings',
                        tag: `movein-owner-${booking._id}`,
                        actions: [
                            { action: 'bg-yes', title: '✓ Yes, moved in' },
                            { action: 'bg-no',  title: '✗ Not yet' }
                        ],
                        actionUrls: {
                            'bg-yes': `${SERVER}/api/bookings/move-in-action?id=${booking._id}&answer=owner-yes&token=${token}&bg=1`,
                            'bg-no':  `${SERVER}/api/bookings/move-in-action?id=${booking._id}&answer=owner-no&token=${token}&bg=1`
                        }
                    });
                }
            } catch (e) {
                console.warn('[MoveIn] Failed for booking', booking._id, ':', e.message);
            }
        }
    } catch (error) {
        console.error('[MoveIn cron error]', error.message);
    }
};

// ── Run every 6 hours ─────────────────────────────────────────────────────────
// On/after move-out date (for scheduled notices):
//  - Ask tenant if they actually moved out
//  - If yes: room becomes vacant
//  - If no: keep occupied and ask tenant to set a new date in My Bookings
export const sendMoveOutNudges = async () => {
    try {
        const now = new Date();
        const BASE = process.env.CLIENT_URL || 'http://localhost:5173';
        const SERVER = process.env.SERVER_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

        const due = await Booking.find({
            hasMoved: true,
            moveOutStatus: { $in: ['notice_given', 'scheduled'] },
            moveOutDate: { $lte: now },
            moveOutNudgeSentAt: null
        }).populate('property');

        for (const booking of due) {
            try {
                const renter = await User.findById(booking.user);
                if (!renter || !booking.property) continue;

                booking.moveOutNudgeSentAt = new Date();
                booking.moveOutToken = crypto.randomUUID();
                await booking.save();

                const yesUrl = `${SERVER}/api/bookings/move-out-action?id=${booking._id}&answer=yes&token=${booking.moveOutToken}`;
                const noUrl = `${SERVER}/api/bookings/move-out-action?id=${booking._id}&answer=no&token=${booking.moveOutToken}`;

                sendEmail(
                    renter.email,
                    `Move-out check - ${booking.property.name}`,
                    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                        <div style="background:#ea580c;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                            <h2 style="color:#fff;margin:0;">Move-out day check</h2>
                        </div>
                        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                            <p>Hi <strong>${renter.username || 'Tenant'}</strong>,</p>
                            <p>Did you move out from <strong>${booking.property.name}</strong> today?</p>
                            <div style="display:flex;gap:12px;justify-content:center;margin:24px 0;">
                                <a href="${yesUrl}" style="background:#16a34a;color:#fff;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:700;">Yes, I moved out</a>
                                <a href="${noUrl}" style="background:#dc2626;color:#fff;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:700;">Not yet</a>
                            </div>
                            <p style="font-size:12px;color:#6b7280;">If not yet, we'll keep your room occupied and you'll be able to set a new move-out date in My Bookings.</p>
                        </div>
                    </div>`
                ).catch(() => {});

                sendPushNotification(booking.user, {
                    title: 'Move-out check',
                    body: `Did you move out from ${booking.property.name}?`,
                    url: '/my-bookings',
                    tag: `moveout-${booking._id}`,
                    actions: [
                        { action: 'bg-yes', title: 'Yes, moved out' },
                        { action: 'bg-no', title: 'Not yet' }
                    ],
                    actionUrls: {
                        'bg-yes': `${SERVER}/api/bookings/move-out-action?id=${booking._id}&answer=yes&token=${booking.moveOutToken}&bg=1`,
                        'bg-no': `${SERVER}/api/bookings/move-out-action?id=${booking._id}&answer=no&token=${booking.moveOutToken}&bg=1`
                    }
                });
            } catch (e) {
                console.warn('[MoveOut] Failed for booking', booking._id, ':', e.message);
            }
        }
    } catch (error) {
        console.error('[MoveOut cron error]', error.message);
    }
};
