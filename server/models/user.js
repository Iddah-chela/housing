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
    }]
    
},{timestamps: true});

const User = mongoose.model("User", userSchema)

export default User;