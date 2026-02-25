import Property from "../models/property.js";
import PropertyUnlock from "../models/propertyUnlock.js";
import ViewingRequest from "../models/viewingRequest.js";

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
            console.log(`[Freshness] ${staleResult.modifiedCount} marked needsRefresh, ${expiredResult.modifiedCount} expired`);
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
            console.log(`[Auto-refund] ${flagged} unlock(s) flagged for refund`);
        }
    } catch (error) {
        console.error('[Auto-refund cron error]', error.message);
    }
};
