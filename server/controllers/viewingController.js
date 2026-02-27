import ViewingRequest from "../models/viewingRequest.js";
import Property from "../models/property.js";
import User from "../models/user.js";
import UserPass from "../models/userPass.js";
import { sendEmail } from "../utils/mailer.js";

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

        // Require active pass to request viewing
        const activePass = await UserPass.findOne({
            user: renterId,
            paymentStatus: 'completed',
            expiresAt: { $gt: new Date() }
        });
        if (!activePass) {
            return res.json({ success: false, message: "You need an active pass to request a viewing. Please unlock this property first." });
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

        // Notify landlord via email (non-blocking)
        const ownerUser = await User.findById(ownerId);
        if (ownerUser?.email) {
            const renterUser = await User.findById(renterId);
            const dateStr = new Date(viewingDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            sendEmail(
                ownerUser.email,
                `New Viewing Request for ${property.name}`,
                `<div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;color:#222;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <style>
                        @keyframes slideDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
                        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                        @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
                    </style>
                    <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px;text-align:center;">
                        <div style="animation:slideDown 0.6s ease-out;">
                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:10px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <h2 style="color:#fff;margin:0;font-size:22px;font-weight:700;">New Viewing Request</h2>
                        </div>
                    </div>
                    <div style="padding:24px 28px;background:#fff;animation:fadeIn 0.8s ease-out;">
                        <p style="font-size:15px;line-height:1.6;"><strong>${renterUser?.username || 'A tenant'}</strong> wants to view a room at <strong style="color:#4F46E5;">${property.name}</strong>.</p>
                        <div style="background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #e0e7ff;border-radius:12px;padding:16px;margin:16px 0;">
                            <table style="width:100%;border-collapse:collapse;">
                                <tr>
                                    <td style="padding:6px 0;font-size:14px;color:#555;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>
                                        <strong>Room:</strong> ${roomDetails.roomType} in ${roomDetails.buildingName || 'Building'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0;font-size:14px;color:#555;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                        <strong>Date:</strong> ${dateStr}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0;font-size:14px;color:#555;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        <strong>Time:</strong> ${viewingTimeRange}
                                    </td>
                                </tr>
                                ${message ? `<tr><td style="padding:6px 0;font-size:14px;color:#555;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><strong>Message:</strong> ${message}</td></tr>` : ''}
                            </table>
                        </div>
                        <div style="text-align:center;animation:pulse 2s infinite;">
                            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/owner/viewing-requests" style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(79,70,229,0.3);">View &amp; Respond</a>
                        </div>
                    </div>
                </div>`
            ).catch(() => {});
        }

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

        // Send email notification to renter about the response
        const renterUser = await User.findById(viewingRequest.renter);
        const property = await Property.findById(viewingRequest.property);
        if (renterUser?.email && property) {
            const isApproved = status === 'approved';
            const dateStr = new Date(viewingRequest.viewingDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const mapsLink = property.googleMapsUrl 
                ? `<div style="text-align:center;margin-top:16px;"><a href="${property.googleMapsUrl}" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(22,163,74,0.3);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" style="vertical-align:middle;margin-right:6px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Open in Google Maps</a></div>`
                : `<p style="margin-top:12px;color:#666;font-size:14px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="vertical-align:middle;margin-right:6px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Location: ${property.address}, ${property.estate}, ${property.place}</p>`;  
            
            sendEmail(
                renterUser.email,
                isApproved 
                    ? `Viewing Approved — ${property.name}` 
                    : `Viewing Update — ${property.name}`,
                `<div style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:auto;color:#222;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <style>
                        @keyframes slideDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
                        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                        @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
                        @keyframes checkPop { 0% { transform:scale(0); } 60% { transform:scale(1.2); } 100% { transform:scale(1); } }
                    </style>
                    <div style="background:linear-gradient(135deg,${isApproved ? '#16a34a,#15803d' : '#dc2626,#b91c1c'});padding:32px;text-align:center;">
                        <div style="animation:slideDown 0.6s ease-out;">
                            ${isApproved 
                                ? '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;animation:checkPop 0.6s ease-out;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
                                : '<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:12px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
                            }
                            <h2 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${isApproved ? 'Viewing Approved!' : 'Viewing Declined'}</h2>
                        </div>
                    </div>
                    <div style="padding:24px 28px;background:#fff;animation:fadeIn 0.8s ease-out;">
                        <p style="font-size:15px;line-height:1.6;">Your viewing request for <strong style="color:#4F46E5;">${property.name}</strong> has been <strong style="color:${isApproved ? '#16a34a' : '#dc2626'};">${isApproved ? 'approved' : 'declined'}</strong>.</p>
                        ${isApproved ? `
                            <div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #bbf7d0;border-radius:12px;padding:18px;margin:16px 0;">
                                <table style="width:100%;border-collapse:collapse;">
                                    <tr>
                                        <td style="padding:6px 0;font-size:14px;color:#555;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                            <strong>Property:</strong> ${property.name}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:14px;color:#555;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>
                                            <strong>Room:</strong> ${viewingRequest.roomDetails?.roomType || 'Room'} in ${viewingRequest.roomDetails?.buildingName || 'Building'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:14px;color:#555;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            <strong>Date:</strong> ${dateStr}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:14px;color:#555;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            <strong>Time:</strong> ${viewingRequest.viewingTimeRange}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:14px;color:#555;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                            <strong>Address:</strong> ${property.address}, ${property.estate}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding:6px 0;font-size:14px;color:#555;">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                            <strong>Contact:</strong> ${property.contact}
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            ${mapsLink}
                        ` : `
                            ${ownerResponse ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#555;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" style="vertical-align:middle;margin-right:8px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><strong>Reason:</strong> ${ownerResponse}</p></div>` : ''}
                        `}
                        <div style="text-align:center;margin-top:20px;animation:pulse 2s infinite;">
                            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-viewings" style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(79,70,229,0.3);">View My Viewings</a>
                        </div>
                    </div>
                </div>`
            ).catch(() => {});
        }

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

// Get viewing requests for the logged-in owner
export const getOwnerViewingRequests = async (req, res) => {
    try {
        const ownerId = req.user._id;
        const requests = await ViewingRequest.find({ owner: ownerId })
            .populate('renter', 'username image')
            .populate('property', 'name')
            .sort({ createdAt: -1 });

        res.json({ success: true, viewingRequests: requests });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
