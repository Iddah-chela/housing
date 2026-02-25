import Report from "../models/report.js";

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
        // Check if user is admin
        if (req.user.role !== "admin") {
            return res.json({ success: false, message: "Unauthorized" });
        }

        const { status } = req.query;
        const filter = status ? { status } : {};

        const reports = await Report.find(filter)
            .populate('reportedBy', 'username email image')
            .populate('reportedUserId', 'username email image')
            .sort({ createdAt: -1 });

        res.json({ success: true, reports });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Update report status (admin only)
export const updateReportStatus = async (req, res) => {
    try {
        // Check if user is admin
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
