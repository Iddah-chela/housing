import User from "../models/user.js";
import Room from "../models/room.js";
import House from "../models/house.js";
import Report from "../models/report.js";
import Property from "../models/property.js";

// Middleware to check if user is admin
export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized - Admin access required' });
    }
    next();
};

// Suspend user
export const suspendUser = async (req, res) => {
    try {
        const { userId, reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        user.isSuspended = true;
        user.suspensionReason = reason;
        await user.save();

        res.json({ success: true, message: 'User suspended successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Delete user account
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, message: 'User not found' });
        await User.findByIdAndDelete(userId);
        res.json({ success: true, message: 'User account deleted' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unsuspend user
export const unsuspendUser = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        user.isSuspended = false;
        user.suspensionReason = null;
        await user.save();

        res.json({ success: true, message: 'User unsuspended successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Revoke landlord status
export const revokeHouseOwner = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, message: 'User not found' });
        user.role = 'user';
        await user.save();
        // Delist all their properties
        await Property.updateMany({ owner: userId }, { isExpired: true });
        res.json({ success: true, message: 'Landlord status revoked and listings delisted' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Transfer property ownership to any registered user (auto-upgrades them to houseOwner)
export const transferProperty = async (req, res) => {
    try {
        const { propertyId, newOwnerEmail } = req.body;
        if (!propertyId || !newOwnerEmail) {
            return res.json({ success: false, message: 'Property ID and new owner email are required' });
        }
        const newOwner = await User.findOne({ email: newOwnerEmail.toLowerCase().trim() });
        if (!newOwner) {
            return res.json({ success: false, message: 'No user found with that email. Ask them to sign up first.' });
        }
        const property = await Property.findByIdAndUpdate(
            propertyId,
            { owner: newOwner._id },
            { new: true }
        );
        if (!property) return res.json({ success: false, message: 'Property not found' });
        // Upgrade user to houseOwner if they aren't already
        if (!['houseOwner', 'admin'].includes(newOwner.role)) {
            newOwner.role = 'houseOwner';
            await newOwner.save();
        }
        res.json({ success: true, message: `Property transferred to ${newOwner.username} (${newOwner.email})` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unverify listing
export const unverifyListing = async (req, res) => {
    try {
        const { roomId } = req.body;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.json({ success: false, message: 'Room not found' });
        }

        room.isVerified = false;
        await room.save();

        res.json({ success: true, message: 'Listing unverified successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Hide room
export const hideRoom = async (req, res) => {
    try {
        const { roomId } = req.body;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.json({ success: false, message: 'Room not found' });
        }

        room.availabilityStatus = 'booked'; // Hidden by setting as booked
        await room.save();

        res.json({ success: true, message: 'Room hidden successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Verify user
export const verifyUser = async (req, res) => {
    try {
        const { userId, verificationType } = req.body; // 'phone' or 'id'

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (verificationType === 'phone') {
            user.isPhoneVerified = true;
        } else if (verificationType === 'id') {
            user.isIdVerified = true;
        }

        await user.save();

        res.json({ success: true, message: `User ${verificationType} verified successfully` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Verify house
export const verifyHouse = async (req, res) => {
    try {
        const { houseId } = req.body;

        const house = await House.findById(houseId);
        if (!house) {
            return res.json({ success: false, message: 'House not found' });
        }

        house.isVerified = true;
        await house.save();

        // Also verify all rooms in this house
        await Room.updateMany(
            { house: houseId },
            { isVerified: true }
        );

        res.json({ success: true, message: 'House and all rooms verified successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get all users
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get all rooms
export const getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find()
            .populate('house')
            .sort({ createdAt: -1 });
        res.json({ success: true, rooms });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get all properties
export const getAllProperties = async (req, res) => {
    try {
        const properties = await Property.find()
            .populate('owner', 'username email image role')
            .sort({ createdAt: -1 });
        res.json({ success: true, properties });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Delist (hide) a property
export const delistProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });
        property.isExpired = true;
        await property.save();
        res.json({ success: true, message: 'Property delisted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Re-list a delisted property
export const relistProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });
        property.isExpired = false;
        await property.save();
        res.json({ success: true, message: 'Property re-listed' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Verify a property
export const verifyProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });
        property.isVerified = true;
        await property.save();
        res.json({ success: true, message: 'Property verified' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unverify a property
export const unverifyProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });
        property.isVerified = false;
        await property.save();
        res.json({ success: true, message: 'Property unverified' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalOwners = await User.countDocuments({ role: 'houseOwner' });
        const totalProperties = await Property.countDocuments();
        const activeListings = await Property.countDocuments({ isExpired: { $ne: true } });
        const verifiedListings = await Property.countDocuments({ isVerified: true });
        const totalReports = await Report.countDocuments({ status: 'pending' });
        const suspendedUsers = await User.countDocuments({ isSuspended: true });

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalOwners,
                totalProperties,
                activeListings,
                verifiedListings,
                pendingReports: totalReports,
                suspendedUsers
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
