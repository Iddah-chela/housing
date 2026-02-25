import mongoose from "mongoose";

// A global browsing pass — once purchased, user can view ALL property contact
// details for the duration of the pass. No per-property unlocks needed.

const userPassSchema = new mongoose.Schema({
    user: {
        type: String, // Clerk user ID
        ref: "User",
        required: true,
        index: true
    },
    passType: {
        type: String,
        enum: ['7day', '30day'],
        required: true
    },
    amount: {
        type: Number,
        required: true  // 0 (free trial), 200 (7-day), 400 (30-day)
    },
    isFree: {
        type: Boolean,
        default: false
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "pending"
    },
    phoneNumber: {
        type: String,
        required: true
    },
    transactionRef: {
        type: String,
        unique: true,
        sparse: true
    },
    payHeroOrderId: {
        type: String,
        sparse: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    }
}, { timestamps: true });

userPassSchema.methods.isActive = function () {
    return this.paymentStatus === 'completed' && this.expiresAt > new Date();
};

const UserPass = mongoose.model("UserPass", userPassSchema);
export default UserPass;
