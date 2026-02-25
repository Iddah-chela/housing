import mongoose from "mongoose";

const propertyUnlockSchema = new mongoose.Schema({
    user: {
        type: String, // Clerk user ID
        ref: "User",
        required: true,
        index: true
    },
    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        default: 200 // Ksh 200
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "completed", "failed", "refunded"],
        default: "pending"
    },
    paymentMethod: {
        type: String,
        default: "M-Pesa"
    },
    phoneNumber: {
        type: String,
        required: true
    },
    transactionRef: {
        type: String,
        unique: true,
        sparse: true // Allows null values while maintaining uniqueness for non-null
    },
    payHeroOrderId: {
        type: String,
        sparse: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    refundRequested: {
        type: Boolean,
        default: false
    },
    refundReason: {
        type: String
    }
}, {timestamps: true});

// Compound index for checking if user has unlocked a property
propertyUnlockSchema.index({ user: 1, property: 1 });

// Method to check if unlock is still valid
propertyUnlockSchema.methods.isValid = function() {
    return this.paymentStatus === 'completed' && this.expiresAt > new Date();
};

const PropertyUnlock = mongoose.model("PropertyUnlock", propertyUnlockSchema);

export default PropertyUnlock;
