import mongoose, { mongo } from "mongoose";

const userSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },

    username: {
        type: String,
        required: true,
    },

    email: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: [
            "user",
            "houseOwner",
            "admin"
        ],
        default: "user"
    },
    
    isSuspended: {
        type: Boolean,
        default: false
    },
    suspensionReason: {
        type: String,
        required: false
    },
    
    // Verification fields
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    phoneNumber: {
        type: String,
        required: false
    },
    isIdVerified: {
        type: Boolean,
        default: false
    },
    idDocument: {
        type: String, // Cloudinary URL (private)
        required: false
    },
    
    // Behavior tracking
    averageResponseTime: {
        type: Number, // in hours
        default: null
    },
    totalCancellations: {
        type: Number,
        default: 0
    },
    totalCompletedBookings: {
        type: Number,
        default: 0
    },
    
    recentSearchedPlaces: [{
        type: String,
        required: false,
    }],
    
    // Referral system
    referralCode: {
        type: String,
        unique: true,
        sparse: true  // allow null/undefined but enforce unique when set
    },
    referredBy: {
        type: String,  // userId of referrer
        default: null
    },
    referralCount: {
        type: Number,
        default: 0  // how many people signed up with this user's code
    },
    referralUnlocks: {
        type: Number,
        default: 0  // free unlocks earned from referrals (max 5)
    },
    referralUnlocksUsed: {
        type: Number,
        default: 0  // how many referral unlocks have been redeemed
    }
    
},{timestamps: true});

const User = mongoose.model("User", userSchema)

export default User;