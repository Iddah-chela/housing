import Report from "../models/report.js";
import User from "../models/user.js";
import Property from "../models/property.js";
import Room from "../models/room.js";
import { sendEmail } from "../utils/mailer.js";

// Create a report
export const createReport = async (req, res) => {
    try {
        const { reportType, reportedItemId, reportedUserId, reason, description } = req.body;
        const reportedBy = req.user._id;

        const report = await Report.create({
            reportedBy,
            reportType,
            reportedItemId,
            reportedUserId,
            reason,
            description,
            status: "pending"
        });

        res.json({ success: true, report });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get all reports (admin only)
export const getAllReports = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.json({ success: false, message: "Unauthorized" });
        }

        const { status } = req.query;
        const filter = status ? { status } : {};

        const reports = await Report.find(filter)
            .populate('reportedBy', 'username email image')
            .populate('reportedUserId', 'username email image isSuspended')
            .sort({ createdAt: -1 })
            .lean();

        // Enrich listing reports with property/room info
        for (const report of reports) {
            if (report.reportType === 'listing' && report.reportedItemId) {
                // Try as property first
                const property = await Property.findById(report.reportedItemId)
                    .select('name address place estate isVerified owner')
                    .lean();
                if (property) {
                    report.listingInfo = { type: 'property', ...property };
                } else {
                    // Try as room
                    const room = await Room.findById(report.reportedItemId)
                        .select('roomType pricePerMonth isAvailable isVerified house')
                        .lean();
                    if (room) {
                        report.listingInfo = { type: 'room', ...room };
                    }
                }
            }
        }

        res.json({ success: true, reports });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Update report status (admin only)
export const updateReportStatus = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.json({ success: false, message: "Unauthorized" });
        }

        const { reportId, status, adminNotes, actionTaken } = req.body;

        const report = await Report.findById(reportId);
        if (!report) {
            return res.json({ success: false, message: "Report not found" });
        }

        report.status = status;
        report.adminNotes = adminNotes;
        report.actionTaken = actionTaken || report.actionTaken;
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();

        await report.save();

        res.json({ success: true, report });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ── Enforcement actions ────────────────────────────────────────────────

// Suspend a user
export const suspendUser = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.json({ success: false, message: "Unauthorized" });
        }

        const { userId, reason } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        user.isSuspended = true;
        user.suspensionReason = reason || "Violation of community guidelines";
        await user.save();

        // Email the user
        try {
            await sendEmail(
                user.email,
                "Account Suspended — CampusCrib",
                `<div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;color:#222;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px;text-align:center;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 12px;display:block;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Account Suspended</h1>
                        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Action required on your CampusCrib account</p>
                    </div>
                    <div style="padding:28px 32px;background:#fff;">
                        <p style="font-size:15px;line-height:1.7;">Hi <strong>${user.username}</strong>,</p>
                        <p style="font-size:15px;line-height:1.7;">Your CampusCrib account has been <strong style="color:#dc2626;">suspended</strong> due to a violation of our community guidelines.</p>
                        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:16px 0;">
                            <p style="margin:0;font-size:14px;"><strong>Reason:</strong></p>
                            <p style="margin:6px 0 0;font-size:14px;color:#991b1b;">${user.suspensionReason}</p>
                        </div>
                        <p style="font-size:14px;line-height:1.7;color:#555;">While suspended, you will not be able to access most features on CampusCrib. If you believe this was a mistake, please reply to this email and we will review your case.</p>
                    </div>
                    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;">CampusCrib — Student Housing Made Easy</p>
                    </div>
                </div>`
            );
        } catch (e) { console.warn("Failed to send suspension email:", e.message); }

        res.json({ success: true, message: `User ${user.username} suspended` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unsuspend a user
export const unsuspendUser = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.json({ success: false, message: "Unauthorized" });
        }

        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        user.isSuspended = false;
        user.suspensionReason = "";
        await user.save();

        res.json({ success: true, message: `User ${user.username} unsuspended` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Remove a listing (property or room)
export const removeListing = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.json({ success: false, message: "Unauthorized" });
        }

        const { listingId, listingType } = req.body;

        if (listingType === "property") {
            const property = await Property.findById(listingId);
            if (!property) return res.json({ success: false, message: "Property not found" });

            // Notify owner
            const owner = await User.findById(property.owner);
            if (owner) {
                try {
                    await sendEmail(
                        owner.email,
                        "Listing Removed — CampusCrib",
                        `<div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;color:#222;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                            <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px;text-align:center;">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 12px;display:block;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Listing Removed</h1>
                                <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">A property has been removed from CampusCrib</p>
                            </div>
                            <div style="padding:28px 32px;background:#fff;">
                                <p style="font-size:15px;line-height:1.7;">Hi <strong>${owner.username}</strong>,</p>
                                <p style="font-size:15px;line-height:1.7;">Your property listing has been <strong style="color:#dc2626;">removed</strong> from CampusCrib due to a report violation.</p>
                                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:16px 0;">
                                    <p style="margin:0;font-size:14px;"><strong>Property:</strong></p>
                                    <p style="margin:6px 0 0;font-size:14px;color:#991b1b;">${property.name}</p>
                                </div>
                                <p style="font-size:14px;line-height:1.7;color:#555;">This action was taken after reviewing a report filed against your listing. If you believe this was a mistake, please reply to this email and we will review your case.</p>
                            </div>
                            <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                                <p style="margin:0;font-size:12px;color:#9ca3af;">CampusCrib — Student Housing Made Easy</p>
                            </div>
                        </div>`
                    );
                } catch (e) { console.warn("Failed to send removal email:", e.message); }
            }

            await Property.findByIdAndDelete(listingId);
            res.json({ success: true, message: `Property "${property.name}" removed` });
        } else {
            const room = await Room.findById(listingId);
            if (!room) return res.json({ success: false, message: "Room not found" });

            await Room.findByIdAndDelete(listingId);
            res.json({ success: true, message: "Room removed" });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unverify a listing
export const unverifyListing = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.json({ success: false, message: "Unauthorized" });
        }

        const { listingId, listingType } = req.body;

        if (listingType === "property") {
            const property = await Property.findByIdAndUpdate(
                listingId,
                { isVerified: false },
                { new: true }
            );
            if (!property) return res.json({ success: false, message: "Property not found" });
            res.json({ success: true, message: `Property "${property.name}" unverified` });
        } else {
            const room = await Room.findByIdAndUpdate(
                listingId,
                { isVerified: false },
                { new: true }
            );
            if (!room) return res.json({ success: false, message: "Room not found" });
            res.json({ success: true, message: "Room unverified" });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Warn a user (email only, no suspension)
export const warnUser = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.json({ success: false, message: "Unauthorized" });
        }

        const { userId, reason } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        try {
            await sendEmail(
                user.email,
                "Warning — CampusCrib",
                `<div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;color:#222;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 12px;display:block;"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Account Warning</h1>
                        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Please review your activity on CampusCrib</p>
                    </div>
                    <div style="padding:28px 32px;background:#fff;">
                        <p style="font-size:15px;line-height:1.7;">Hi <strong>${user.username}</strong>,</p>
                        <p style="font-size:15px;line-height:1.7;">This is a <strong style="color:#d97706;">warning</strong> regarding your recent activity on CampusCrib.</p>
                        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:16px 0;">
                            <p style="margin:0;font-size:14px;"><strong>Reason:</strong></p>
                            <p style="margin:6px 0 0;font-size:14px;color:#92400e;">${reason || "Violation of community guidelines"}</p>
                        </div>
                        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 16px;margin:16px 0;">
                            <p style="margin:0;font-size:13px;color:#991b1b;"><strong>Please note:</strong> Continued violations may result in your account being <strong>suspended</strong>.</p>
                        </div>
                        <p style="font-size:14px;line-height:1.7;color:#555;">We encourage all users to follow our community guidelines to keep CampusCrib safe for everyone. If you have questions, please reply to this email.</p>
                    </div>
                    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#9ca3af;">CampusCrib — Student Housing Made Easy</p>
                    </div>
                </div>`
            );
        } catch (e) { console.warn("Failed to send warning email:", e.message); }

        res.json({ success: true, message: `Warning sent to ${user.username}` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get user's reports
export const getUserReports = async (req, res) => {
    try {
        const userId = req.user._id;

        const reports = await Report.find({ reportedBy: userId })
            .sort({ createdAt: -1 });

        res.json({ success: true, reports });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
