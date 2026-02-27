import LandlordApplication from '../models/landlordApplication.js';
import User from '../models/user.js';
import { clerkClient } from '@clerk/express';

// Submit landlord application
export const submitApplication = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Check if user already has an application
        const existingApplication = await LandlordApplication.findOne({ userId });
        
        if (existingApplication) {
            if (existingApplication.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'You already have a pending application. Please wait for admin review.'
                });
            }
            
            if (existingApplication.status === 'approved') {
                return res.status(400).json({
                    success: false,
                    message: 'Your application has already been approved. You are now a landlord!'
                });
            }
        }
        
        const {
            fullName,
            phoneNumber,
            idNumber,
            idDocument,
            ownershipProof,
            numberOfProperties,
            totalRooms,
            propertiesLocation,
            notes
        } = req.body;
        
        // Validation
        if (!fullName || !phoneNumber || !idNumber || !idDocument || !numberOfProperties || !totalRooms || !propertiesLocation) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }
        
        // Create new application
        const application = await LandlordApplication.create({
            userId,
            fullName,
            phoneNumber,
            idNumber,
            idDocument,
            ownershipProof: ownershipProof || null,
            numberOfProperties,
            totalRooms,
            propertiesLocation,
            notes: notes || '',
            status: 'pending'
        });
        
        res.status(201).json({
            success: true,
            message: 'Application submitted successfully! We will review it within 24 hours.',
            application
        });
        
    } catch (error) {
        console.error('Error submitting landlord application:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user's application status
export const getMyApplication = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const application = await LandlordApplication.findOne({ userId }).sort({ createdAt: -1 });
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'No application found'
            });
        }
        
        res.status(200).json({
            success: true,
            application
        });
        
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all applications (Admin only)
export const getAllApplications = async (req, res) => {
    try {
        const { status } = req.query;
        
        const filter = status ? { status } : {};
        
        const applications = await LandlordApplication.find(filter)
            .populate('userId', 'username email image')
            .populate('reviewedBy', 'username email')
            .sort({ createdAt: -1 })
            .lean();
        
        res.status(200).json({
            success: true,
            count: applications.length,
            applications
        });
        
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Approve application (Admin only)
export const approveApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const adminId = req.user._id;
        
        const application = await LandlordApplication.findById(applicationId);
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        if (application.status === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Application already approved'
            });
        }
        
        // Update application status
        application.status = 'approved';
        application.reviewedBy = adminId;
        application.reviewedAt = new Date();
        await application.save();
        
        // Update user role in MongoDB
        await User.findByIdAndUpdate(application.userId, {
            role: 'houseOwner',
            phoneNumber: application.phoneNumber,
            idDocument: application.idDocument,
            isPhoneVerified: true,
            isIdVerified: true
        });
        
        // Respond immediately — don't block on the Clerk API call
        res.status(200).json({
            success: true,
            message: 'Application approved! User is now a landlord.',
            application
        });

        // Update Clerk metadata in background (non-blocking)
        clerkClient.users.updateUser(application.userId, {
            publicMetadata: { role: 'houseOwner' }
        })
            .then(() => console.log('✅ Updated Clerk role to houseOwner for:', application.userId))
            .catch((err) => console.error('❌ Error updating Clerk metadata:', err.message));
        
    } catch (error) {
        console.error('Error approving application:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Reject application (Admin only)
export const rejectApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { reason } = req.body;
        const adminId = req.user._id;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a rejection reason'
            });
        }
        
        const application = await LandlordApplication.findById(applicationId);
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        if (application.status === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'Application already rejected'
            });
        }
        
        // Update application status
        application.status = 'rejected';
        application.rejectionReason = reason;
        application.reviewedBy = adminId;
        application.reviewedAt = new Date();
        await application.save();
        
        res.status(200).json({
            success: true,
            message: 'Application rejected.',
            application
        });
        
    } catch (error) {
        console.error('Error rejecting application:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
