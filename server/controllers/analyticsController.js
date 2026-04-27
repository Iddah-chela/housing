import SiteVisit from "../models/siteVisit.js";

const BOT_UA_REGEX = /bot|spider|crawler|headless|preview|slurp|bingpreview/i;

const parseClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || "";
};

export const trackVisit = async (req, res) => {
    try {
        const { path, sessionId, visitorId, referrer } = req.body || {};

        if (!path || !sessionId || !visitorId) {
            return res.status(400).json({ success: false, message: "Missing required visit fields" });
        }

        const ua = String(req.headers["user-agent"] || "");
        if (BOT_UA_REGEX.test(ua)) {
            return res.json({ success: true, skipped: true });
        }

        const cleanPath = String(path).slice(0, 512);
        const cleanSessionId = String(sessionId).slice(0, 128);
        const cleanVisitorId = String(visitorId).slice(0, 128);
        const cleanReferrer = String(referrer || "").slice(0, 1024);
        const ip = String(parseClientIp(req) || "").slice(0, 128);

        // De-duplicate rapid repeats from the same page/session refresh burst.
        const dedupeCutoff = new Date(Date.now() - 15 * 1000);
        const existing = await SiteVisit.findOne({
            path: cleanPath,
            sessionId: cleanSessionId,
            createdAt: { $gte: dedupeCutoff },
        }).lean();

        if (existing) {
            return res.json({ success: true, deduped: true });
        }

        await SiteVisit.create({
            path: cleanPath,
            sessionId: cleanSessionId,
            visitorId: cleanVisitorId,
            referrer: cleanReferrer,
            userAgent: ua.slice(0, 1024),
            ip,
        });

        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
