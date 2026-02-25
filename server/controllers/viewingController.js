import ViewingRequest from "../models/viewingRequest.js";
import Property from "../models/property.js";
import User from "../models/user.js";

// Create a viewing request
export const createViewingRequest = async (req, res) => {
    try {
        const { propertyId, roomDetails, ownerId, viewingDate, viewingTimeRange, message } = req.body;
        const renterId = req.user._id;

        // Check if property exists
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.json({ success: false, message: "Property not found" });
        }

        // Check for active viewing request for this specific room
        const activeRequest = await ViewingRequest.findOne({
            property: propertyId,
            'roomDetails.buildingId': roomDetails.buildingId,
            'roomDetails.row': roomDetails.row,
            'roomDetails.col': roomDetails.col,
            status: "pending"
        });

        if (activeRequest) {
            return res.json({ success: false, message: "This room already has a pending viewing request" });
        }

        // Create viewing request
        const viewingRequest = await ViewingRequest.create({
            renter: renterId,
            property: propertyId,
            roomDetails: {
                buildingId: roomDetails.buildingId,
                buildingName: roomDetails.buildingName,
                row: roomDetails.row,
                col: roomDetails.col,
                roomType: roomDetails.roomType
            },
            owner: ownerId,
            viewingDate,
            viewingTimeRange,
            message,
            status: "pending"
        });

        const populatedRequest = await ViewingRequest.findById(viewingRequest._id)
            .populate('renter owner property');

        res.json({ success: true, viewingRequest: populatedRequest });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Respond to viewing request (owner only)
export const respondToViewingRequest = async (req, res) => {
    try {
        const { requestId, status, ownerResponse } = req.body;
        const ownerId = req.user._id;

        const viewingRequest = await ViewingRequest.findById(requestId);
        if (!viewingRequest) {
            return res.json({ success: false, message: "Request not found" });
        }

        // Verify owner
        if (viewingRequest.owner !== ownerId) {
            return res.json({ success: false, message: "Unauthorized" });
        }

        viewingRequest.status = status;
        viewingRequest.ownerResponse = ownerResponse;
        viewingRequest.responseTime = new Date();
        await viewingRequest.save();

        const updatedRequest = await ViewingRequest.findById(requestId)
            .populate('renter owner property');

        res.json({ success: true, viewingRequest: updatedRequest });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get user's viewing requests
export const getUserViewingRequests = async (req, res) => {
    try {
        const userId = req.user._id;

        const requests = await ViewingRequest.find({
            $or: [
                { renter: userId },
                { owner: userId }
            ]
        }).populate('renter owner property').sort({ createdAt: -1 });

        res.json({ success: true, viewingRequests: requests });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Mark viewing as completed
export const markViewingCompleted = async (req, res) => {
    try {
        const { requestId } = req.body;
        const userId = req.user._id;

        const viewingRequest = await ViewingRequest.findById(requestId);
        if (!viewingRequest) {
            return res.json({ success: false, message: "Request not found" });
        }

        // Verify user is owner or renter
        if (viewingRequest.owner !== userId && viewingRequest.renter !== userId) {
            return res.json({ success: false, message: "Unauthorized" });
        }

        viewingRequest.status = "completed";
        await viewingRequest.save();

        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
