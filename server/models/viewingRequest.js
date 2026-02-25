import mongoose from "mongoose";

const viewingRequestSchema = new mongoose.Schema({
    renter: {
        type: String, 
        ref: "User",
        required: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Property",
        required: true
    },
    roomDetails: {
        buildingId: { type: String, required: true },
        buildingName: { type: String, required: true },
        row: { type: Number, required: true },
        col: { type: Number, required: true },
        roomType: { type: String, required: true }
    },
    owner: {
        type: String, 
        ref: "User",
        required: true
    },
    viewingDate: {
        type: Date, 
        required: true
    },
    viewingTimeRange: {
        type: String, // e.g. "Morning (9AM-12PM)", "Afternoon (12PM-5PM)", "Evening (5PM-8PM)"
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "declined", "completed", "expired"],
        default: "pending"
    },
    message: {
        type: String,
        required: false
    },
    ownerResponse: {
        type: String,
        required: false
    },
    responseTime: {
        type: Date,
        required: false
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    }
}, {timestamps: true});

// Index to auto-expire old requests
viewingRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ViewingRequest = mongoose.model("ViewingRequest", viewingRequestSchema);

export default ViewingRequest;
