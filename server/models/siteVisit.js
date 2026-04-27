import mongoose from "mongoose";

const siteVisitSchema = new mongoose.Schema({
    path: {
        type: String,
        required: true,
        default: "/",
        maxlength: 512,
        index: true,
    },
    sessionId: {
        type: String,
        required: true,
        maxlength: 128,
        index: true,
    },
    visitorId: {
        type: String,
        required: true,
        maxlength: 128,
        index: true,
    },
    referrer: {
        type: String,
        default: "",
        maxlength: 1024,
    },
    userAgent: {
        type: String,
        default: "",
        maxlength: 1024,
    },
    ip: {
        type: String,
        default: "",
        maxlength: 128,
    },
}, { timestamps: true });

siteVisitSchema.index({ createdAt: -1 });
siteVisitSchema.index({ visitorId: 1, createdAt: -1 });
siteVisitSchema.index({ sessionId: 1, path: 1, createdAt: -1 });

const SiteVisit = mongoose.model("SiteVisit", siteVisitSchema);
export default SiteVisit;
