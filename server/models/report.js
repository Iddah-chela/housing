import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reportedBy: {
        type: String,
        ref: "User",
        required: true
    },
    reportType: {
        type: String,
        enum: ["listing", "user"],
        required: true
    },
    reportedItemId: {
        type: String, // Can be roomId or userId
        required: true
    },
    reportedUserId: {
        type: String,
        ref: "User",
        required: false
    },
    reason: {
        type: String,
        enum: [
            "fake_listing",
            "already_taken",
            "payment_outside",
            "harassment",
            "spam",
            "other"
        ],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "reviewed", "resolved", "dismissed"],
        default: "pending"
    },
    adminNotes: {
        type: String,
        required: false
    },
    actionTaken: {
        type: String,
        enum: ["none", "warning", "suspended", "removed", "verified"],
        default: "none"
    },
    reviewedBy: {
        type: String,
        ref: "User",
        required: false
    },
    reviewedAt: {
        type: Date,
        required: false
    }
}, {timestamps: true});

const Report = mongoose.model("Report", reportSchema);

export default Report;
