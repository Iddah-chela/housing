import mongoose from 'mongoose';

const landlordApplicationSchema = new mongoose.Schema({
    userId: {
        type: String, // Clerk user ID
        required: true,
        ref: 'User'
    },
    
    // Personal Information
    fullName: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    idNumber: {
        type: String,
        required: true
    },
    
    // Documents
    idDocument: {
        type: String, // Cloudinary URL
        required: true
    },
    ownershipProof: {
        type: String, // Optional - land title, lease agreement, etc.
        required: false
    },
    
    // Business Details
    numberOfProperties: {
        type: Number,
        required: true,
        min: 1
    },
    totalRooms: {
        type: Number,
        required: true,
        min: 1
    },
    propertiesLocation: {
        type: String,
        required: true
    },
    
    // Application Status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    
    rejectionReason: {
        type: String,
        required: false
    },
    
    // Admin Action
    reviewedBy: {
        type: String, // Admin user ID
        ref: 'User',
        required: false
    },
    reviewedAt: {
        type: Date,
        required: false
    },
    
    // Additional Notes
    notes: {
        type: String,
        required: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries
landlordApplicationSchema.index({ userId: 1 });
landlordApplicationSchema.index({ status: 1 });

const LandlordApplication = mongoose.model('LandlordApplication', landlordApplicationSchema);

export default LandlordApplication;
