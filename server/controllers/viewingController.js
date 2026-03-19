import crypto from "crypto";
import ViewingRequest from "../models/viewingRequest.js";
import Property from "../models/property.js";
import User from "../models/user.js";
import UserPass from "../models/userPass.js";
import Booking from "../models/booking.js";
import { sendEmail } from "../utils/mailer.js";
import { sendPushNotification } from "../utils/pushNotifier.js";

// Create a viewing request
export const createViewingRequest = async (req, res) => {
    try {
        const { propertyId, roomDetails, ownerId, viewingDate, viewingTimeRange, message, preferredMoveInDate } = req.body;
        const renterId = req.user._id;

        // Input validation
        if (message && (typeof message !== 'string' || message.length > 1000)) {
            return res.json({ success: false, message: "Message is too long (max 1000 characters)" });
        }

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
            preferredMoveInDate: preferredMoveInDate || null,
            status: "pending"
        });

        const populatedRequest = await ViewingRequest.findById(viewingRequest._id)
            .populate('renter owner property');

        // Send response immediately — don't make the user wait for notifications
        res.json({ success: true, viewingRequest: populatedRequest });

        // Fire-and-forget: email + push notifications
        (async () => {
            try {
                const ownerUser = await User.findById(ownerId);
                if (ownerUser?.email) {
                    const renterUser = await User.findById(renterId);
                    const dateStr = new Date(viewingDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                    // Generate owner action token for one-click email Accept/Decline
                    const ownerToken = crypto.randomUUID();
                    viewingRequest.ownerActionToken = ownerToken;
                    await viewingRequest.save();

                    const confirmUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/viewing/action?type=owner&token=${ownerToken}&answer=confirm`;
                    const declineUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/viewing/action?type=owner&token=${ownerToken}&answer=decline`;

                    sendEmail(
                        ownerUser.email,
                        `Viewing Request — ${property.name}`,
                        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                            <div style="background:#4F46E5;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                                <h2 style="color:#fff;margin:0;font-size:20px;">New Viewing Request</h2>
                            </div>
                            <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                                <p style="font-size:15px;line-height:1.6;margin:0 0 16px;"><strong>${renterUser?.username || 'A tenant'}</strong> wants to view a room at <strong>${property.name}</strong>.</p>
                                <table style="width:100%;border-collapse:collapse;">
                                    <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Room:</strong> ${roomDetails.roomType} in ${roomDetails.buildingName || 'Building'}</td></tr>
                                    <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Date:</strong> ${dateStr}</td></tr>
                                    <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Time:</strong> ${viewingTimeRange}</td></tr>
                                    ${message ? `<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Message:</strong> ${message}</td></tr>` : ''}
                                </table>
                                <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;">
                                    <a href="${confirmUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">✔ Accept</a>
                                    <a href="${declineUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">✖ Decline</a>
                                </div>
                                <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:12px;">Or <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/owner/viewing-requests?viewingId=${viewingRequest._id}" style="color:#6366f1;">view full details</a> in the app.</p>
                            </div>
                        </div>`
                    ).catch(e => console.warn('[Viewing] Email to landlord failed:', e.message));

                    const SERVER = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;
                    sendPushNotification(ownerId, {
                        title: 'New Viewing Request 👁',
                        body: `${renterUser?.username || 'A tenant'} wants to view ${roomDetails.roomType} at ${property.name}`,
                        url: `/owner/viewing-requests?viewingId=${viewingRequest._id}`,
                        tag: `viewing-${viewingRequest._id}`,
                        actions: [
                            { action: 'bg-confirm', title: '✔ Accept' },
                            { action: 'bg-decline', title: '✖ Decline' }
                        ],
                        actionUrls: {
                            'bg-confirm': `${SERVER}/api/viewing/owner-action?token=${ownerToken}&answer=confirm&bg=1`,
                            'bg-decline': `${SERVER}/api/viewing/owner-action?token=${ownerToken}&answer=decline&bg=1`
                        }
                    });
                }
            } catch (e) {
                console.warn('[Viewing] Notification error:', e.message);
            }
        })();
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

        // If this is a direct-apply being confirmed → auto-create the booking
        if (viewingRequest.isDirectApply && status === 'confirmed') {
            try {
                const property = await Property.findById(viewingRequest.property);
                if (property) {
                    let pricePerMonth = 0;
                    try {
                        const building = property.buildings?.find(b => b.id === viewingRequest.roomDetails.buildingId);
                        pricePerMonth = building?.grid?.[viewingRequest.roomDetails.row]?.[viewingRequest.roomDetails.col]?.pricePerMonth || 0;
                    } catch (_) {}

                    const moveInDate = viewingRequest.preferredMoveInDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    await Booking.create({
                        user: viewingRequest.renter,
                        property: property._id,
                        roomDetails: {
                            buildingId: viewingRequest.roomDetails.buildingId,
                            buildingName: viewingRequest.roomDetails.buildingName,
                            row: viewingRequest.roomDetails.row,
                            col: viewingRequest.roomDetails.col,
                            roomType: viewingRequest.roomDetails.roomType,
                            pricePerMonth
                        },
                        moveInDate,
                        status: 'confirmed',
                        viewingRequestId: viewingRequest._id
                    });

                    // Mark grid cell as booked
                    const building = property.buildings?.find(b => b.id === viewingRequest.roomDetails.buildingId);
                    if (building && building.grid?.[viewingRequest.roomDetails.row]?.[viewingRequest.roomDetails.col]) {
                        building.grid[viewingRequest.roomDetails.row][viewingRequest.roomDetails.col].isBooked = true;
                        property.markModified('buildings');
                        await property.save();
                    }

                    viewingRequest.status = 'booked';
                    await viewingRequest.save();
                }
            } catch (bookingErr) {
                console.warn('[DirectApply] Auto-booking failed:', bookingErr.message);
            }
        }

        const updatedRequest = await ViewingRequest.findById(requestId)
            .populate('renter owner property');

        // Send response immediately
        res.json({ success: true, viewingRequest: updatedRequest });

        // Fire-and-forget: email + push notifications to renter
        (async () => {
            try {
                const renterUser = await User.findById(viewingRequest.renter);
                const property = await Property.findById(viewingRequest.property);
                if (renterUser?.email && property) {
                    const isConfirmed = status === 'confirmed';
                    const isDirectApply = viewingRequest.isDirectApply;
                    const dateStr = viewingRequest.viewingDate ? new Date(viewingRequest.viewingDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : null;

                    // Label differs: direct-apply = "Application", viewing = "Viewing"
                    const reqLabel = isDirectApply ? 'Application' : 'Viewing';
                    const statusLabel = isConfirmed ? (isDirectApply ? 'Application Accepted!' : 'Viewing Confirmed!') : (isDirectApply ? 'Application Declined' : 'Viewing Declined');

                    sendEmail(
                        renterUser.email,
                        isConfirmed 
                            ? `${reqLabel} Confirmed — ${property.name}` 
                            : `${reqLabel} Update — ${property.name}`,
                        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                            <div style="background:${isConfirmed ? '#16a34a' : '#dc2626'};padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                                <h2 style="color:#fff;margin:0;font-size:20px;">${statusLabel}</h2>
                            </div>
                            <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                                <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Your ${reqLabel.toLowerCase()} for <strong>${property.name}</strong> has been <strong style="color:${isConfirmed ? '#16a34a' : '#dc2626'};">${isConfirmed ? 'confirmed' : 'declined'}</strong>.</p>
                                ${isConfirmed ? `
                                    <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
                                        <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Room:</strong> ${viewingRequest.roomDetails?.roomType || 'Room'} in ${viewingRequest.roomDetails?.buildingName || 'Building'}</td></tr>
                                        ${dateStr ? `<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Date:</strong> ${dateStr}</td></tr>` : ''}
                                        ${viewingRequest.viewingTimeRange ? `<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Time:</strong> ${viewingRequest.viewingTimeRange}</td></tr>` : ''}
                                        ${viewingRequest.preferredMoveInDate ? `<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Move-in Date:</strong> ${new Date(viewingRequest.preferredMoveInDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>` : ''}
                                        <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Address:</strong> ${property.address}, ${property.estate}</td></tr>
                                        <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Contact:</strong> ${property.contact}</td></tr>
                                    </table>
                                    ${property.googleMapsUrl ? `<div style="text-align:center;margin-bottom:16px;"><a href="${property.googleMapsUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open in Google Maps</a></div>` : ''}
                                ` : `
                                    ${ownerResponse ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:0 0 16px;"><p style="margin:0;font-size:14px;color:#555;"><strong>Reason:</strong> ${ownerResponse}</p></div>` : ''}
                                `}
                                <div style="text-align:center;">
                                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-viewings" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View My Viewings</a>
                                </div>
                            </div>
                        </div>`
                    ).catch(e => console.warn('[Viewing] Email to renter failed:', e.message));

                    sendPushNotification(viewingRequest.renter, {
                        title: isConfirmed ? (isDirectApply ? 'Application Accepted!' : 'Viewing Confirmed!') : (isDirectApply ? 'Application Declined' : 'Viewing Declined'),
                        body: isConfirmed
                            ? (isDirectApply ? `Your application to move in at ${property.name} was accepted!` : `Your viewing at ${property.name} has been confirmed${dateStr ? ' for ' + dateStr : ''}`)
                            : `Your ${isDirectApply ? 'application' : 'viewing request'} at ${property.name} was declined`,
                        url: `/my-viewings?viewingId=${requestId}`,
                        tag: `viewing-response-${requestId}`
                    });
                }
            } catch (e) {
                console.warn('[Viewing] Notification error:', e.message);
            }
        })();
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

// Create a direct-apply request (no viewing date required)
export const createDirectApply = async (req, res) => {
    try {
        const { propertyId, roomDetails, ownerId, message, preferredMoveInDate } = req.body;
        const renterId = req.user._id;

        if (message && (typeof message !== 'string' || message.length > 1000)) {
            return res.json({ success: false, message: "Message is too long (max 1000 characters)" });
        }

        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: "Property not found" });

        const activePass = await UserPass.findOne({
            user: renterId,
            paymentStatus: 'completed',
            expiresAt: { $gt: new Date() }
        });
        if (!activePass) {
            return res.json({ success: false, message: "You need an active pass to apply directly. Please unlock this property first." });
        }

        // Prevent duplicate pending direct-apply for same room
        const activeRequest = await ViewingRequest.findOne({
            property: propertyId,
            'roomDetails.buildingId': roomDetails.buildingId,
            'roomDetails.row': roomDetails.row,
            'roomDetails.col': roomDetails.col,
            status: "pending"
        });
        if (activeRequest) {
            return res.json({ success: false, message: "This room already has a pending application" });
        }

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
            message,
            preferredMoveInDate: preferredMoveInDate || null,
            isDirectApply: true,
            status: "pending",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7-day expiry for direct apply
        });

        const populatedRequest = await ViewingRequest.findById(viewingRequest._id)
            .populate('renter owner property');

        res.json({ success: true, viewingRequest: populatedRequest });

        // Fire-and-forget: notify owner
        (async () => {
            try {
                const ownerUser = await User.findById(ownerId);
                if (ownerUser?.email) {
                    const renterUser = await User.findById(renterId);
                    // Generate owner action token for one-click email Accept/Decline
                    const ownerToken = crypto.randomUUID();
                    viewingRequest.ownerActionToken = ownerToken;
                    await viewingRequest.save();

                    const confirmUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/viewing/action?type=owner&token=${ownerToken}&answer=confirm`;
                    const declineUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/viewing/action?type=owner&token=${ownerToken}&answer=decline`;

                    sendEmail(
                        ownerUser.email,
                        `Direct Application — ${property.name}`,
                        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                            <div style="background:#0ea5e9;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                                <h2 style="color:#fff;margin:0;font-size:20px;">New Direct Application</h2>
                            </div>
                            <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                                <p style="font-size:15px;line-height:1.6;margin:0 0 16px;"><strong>${renterUser?.username || 'A tenant'}</strong> wants to move into a room at <strong>${property.name}</strong> without a viewing.</p>
                                <table style="width:100%;border-collapse:collapse;">
                                    <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Room:</strong> ${roomDetails.roomType} in ${roomDetails.buildingName || 'Building'}</td></tr>
                                    ${preferredMoveInDate ? `<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Preferred Move-in:</strong> ${new Date(preferredMoveInDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>` : ''}
                                    ${message ? `<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Message:</strong> ${message}</td></tr>` : ''}
                                </table>
                                <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;">
                                    <a href="${confirmUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">✔ Accept</a>
                                    <a href="${declineUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">✖ Decline</a>
                                </div>
                                <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:12px;">Or <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/owner/viewing-requests?viewingId=${viewingRequest._id}" style="color:#6366f1;">view full details</a> in the app.</p>
                            </div>
                        </div>`
                    ).catch(e => console.warn('[DirectApply] Email to landlord failed:', e.message));

                    sendPushNotification(ownerId, {
                        title: 'New Direct Application',
                        body: `${renterUser?.username || 'A tenant'} wants to move in at ${property.name} without a viewing`,
                        url: `/owner/viewing-requests?viewingId=${viewingRequest._id}`,
                        tag: `direct-apply-${viewingRequest._id}`
                    });
                }
            } catch (e) {
                console.warn('[DirectApply] Notification error:', e.message);
            }
        })();
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Handle post-viewing nudge response from email link (no auth — token-based)
// GET /api/viewing/nudge-response?token=X&answer=yes|no
export const handleNudgeResponse = async (req, res) => {
    try {
        const { token, answer, json: jsonFlag, bg } = req.query;
        const wantJson = jsonFlag === '1' || bg === '1';
        if (!token || !['yes', 'no'].includes(answer)) {
            if (wantJson) return res.json({ success: false, message: 'Invalid or expired link.' });
            return res.status(400).send('<h2>Invalid or expired link.</h2>');
        }

        const viewing = await ViewingRequest.findOne({ nudgeToken: token })
            .populate('property');
        if (!viewing) {
            if (wantJson) return res.json({ success: false, message: 'This link has already been used or has expired.' });
            return res.status(404).send(`
                <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
                <h2>Link Expired</h2>
                <p>This link has already been used or has expired.</p>
                </body></html>`);
        }

        // Expire the token so it can't be reused
        viewing.nudgeToken = null;

        if (answer === 'no') {
            viewing.status = 'completed';
            await viewing.save();
            if (wantJson) return res.json({ success: true, message: "Got it! We'll keep looking for the right place for you." });
            return res.send(`
                <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
                <h2>Got it!</h2>
                <p>Thanks for letting us know. We'll keep looking for the right place for you.</p>
                </body></html>`);
        }

        // answer === 'yes' → auto-create a booking
        const property = viewing.property;
        if (!property) {
            await viewing.save();
            return res.status(404).send('<h2>Property not found.</h2>');
        }

        // Look up price from property grid
        let pricePerMonth = 0;
        try {
            const building = property.buildings?.find(b => b.id === viewing.roomDetails.buildingId);
            const cell = building?.grid?.[viewing.roomDetails.row]?.[viewing.roomDetails.col];
            pricePerMonth = cell?.pricePerMonth || 0;
        } catch (_) {}

        // Prevent duplicate bookings
        const existingBooking = await Booking.findOne({
            property: property._id,
            'roomDetails.buildingId': viewing.roomDetails.buildingId,
            'roomDetails.row': viewing.roomDetails.row,
            'roomDetails.col': viewing.roomDetails.col,
            status: { $ne: 'cancelled' }
        });
        if (existingBooking) {
            viewing.status = 'booked';
            await viewing.save();
            if (wantJson) return res.json({ success: false, message: 'Sorry, this room has already been booked by someone else.', propertyName: property?.name });
            return res.send(`
                <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
                <h2>Room Already Booked</h2>
                <p>Sorry, this room has already been booked by someone else.</p>
                </body></html>`);
        }

        const moveInDate = viewing.preferredMoveInDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await Booking.create({
            user: viewing.renter,
            property: property._id,
            roomDetails: {
                buildingId: viewing.roomDetails.buildingId,
                buildingName: viewing.roomDetails.buildingName,
                row: viewing.roomDetails.row,
                col: viewing.roomDetails.col,
                roomType: viewing.roomDetails.roomType,
                pricePerMonth
            },
            moveInDate,
            status: 'confirmed',
            viewingRequestId: viewing._id
        });

        // Mark grid cell as booked
        try {
            const building = property.buildings?.find(b => b.id === viewing.roomDetails.buildingId);
            if (building && building.grid?.[viewing.roomDetails.row]?.[viewing.roomDetails.col]) {
                building.grid[viewing.roomDetails.row][viewing.roomDetails.col].isBooked = true;
                property.markModified('buildings');
                await property.save();
            }
        } catch (_) {}

        viewing.status = 'booked';
        await viewing.save();

        // Send confirmation email to renter
        (async () => {
            try {
                const renterUser = await User.findById(viewing.renter);
                if (renterUser?.email) {
                    sendEmail(
                        renterUser.email,
                        `Booking Confirmed — ${property.name}`,
                        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                            <div style="background:#16a34a;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                                <h2 style="color:#fff;margin:0;font-size:20px;">You're booked! 🎉</h2>
                            </div>
                            <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                                <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Your booking for a ${viewing.roomDetails.roomType} at <strong>${property.name}</strong> has been confirmed.</p>
                                <table style="width:100%;border-collapse:collapse;">
                                    <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Move-in Date:</strong> ${new Date(moveInDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                                    <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Address:</strong> ${property.address}, ${property.estate}</td></tr>
                                    <tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Contact:</strong> ${property.contact}</td></tr>
                                </table>
                                <div style="text-align:center;margin-top:20px;">
                                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-bookings" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View My Bookings</a>
                                </div>
                            </div>
                        </div>`
                    ).catch(e => console.warn('[Nudge] Confirmation email failed:', e.message));

                    sendPushNotification(viewing.renter, {
                        title: 'Booking Confirmed!',
                        body: `Your room at ${property.name} has been booked`,
                        url: '/my-bookings',
                        tag: `booking-confirmed-${viewing._id}`
                    });
                }
            } catch (e) {
                console.warn('[Nudge] Post-booking notification error:', e.message);
            }
        })();

        if (wantJson) return res.json({ success: true, message: `Your room at ${property.name} has been booked!`, propertyName: property.name });
        return res.send(`
            <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
            <h2 style="color:#16a34a;">Booking Confirmed! 🎉</h2>
            <p>Your room at <strong>${property.name}</strong> has been booked.</p>
            <p>Move-in date: <strong>${new Date(moveInDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
            <p>Check your email for full details.</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-bookings" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">View My Bookings</a>
            </body></html>`);
    } catch (error) {
        console.error('[NudgeResponse]', error.message);
        res.status(500).send('<h2>Something went wrong. Please try again.</h2>');
    }
};

// Handle owner Accept/Decline from email link (no auth — token-based)
// GET /api/viewing/owner-action?token=X&answer=confirm|decline
export const handleOwnerAction = async (req, res) => {
    try {
        const { token, answer, json: jsonFlag, bg } = req.query;
        const wantJson = jsonFlag === '1' || bg === '1';
        if (!token || !['confirm', 'decline'].includes(answer)) {
            if (wantJson) return res.json({ success: false, message: 'Invalid link.' });
            return res.status(400).send('<html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;"><h2>Invalid link.</h2></body></html>');
        }

        const viewing = await ViewingRequest.findOne({ ownerActionToken: token })
            .populate('renter property');

        if (!viewing) {
            if (wantJson) return res.json({ success: false, message: 'This link has already been used or has expired.' });
            return res.status(404).send(`
                <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
                <h2>Link Expired</h2>
                <p>This link has already been used or has expired.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/owner/viewing-requests" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Go to Dashboard</a>
                </body></html>`);
        }

        if (viewing.status !== 'pending') {
            if (wantJson) return res.json({ success: false, message: `This request has already been ${viewing.status}.`, already: true });
            return res.send(`
                <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
                <h2>Already Responded</h2>
                <p>This request has already been ${viewing.status}.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/owner/viewing-requests" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Go to Dashboard</a>
                </body></html>`);
        }

        const newStatus = answer === 'confirm' ? 'confirmed' : 'declined';
        viewing.status = newStatus;
        viewing.ownerResponse = newStatus === 'confirmed'
            ? 'Thank you for your interest! Looking forward to showing you the property.'
            : 'Sorry, this request could not be accommodated at this time.';
        viewing.responseTime = new Date();
        viewing.ownerActionToken = null; // Invalidate token

        // If direct-apply confirmed → auto-create booking
        if (viewing.isDirectApply && newStatus === 'confirmed') {
            try {
                const property = viewing.property;
                if (property) {
                    let pricePerMonth = 0;
                    try {
                        const building = property.buildings?.find(b => b.id === viewing.roomDetails.buildingId);
                        pricePerMonth = building?.grid?.[viewing.roomDetails.row]?.[viewing.roomDetails.col]?.price || 0;
                    } catch (_) {}

                    const moveInDate = viewing.preferredMoveInDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    await Booking.create({
                        user: viewing.renter?._id || viewing.renter,
                        property: property._id,
                        roomDetails: {
                            buildingId: viewing.roomDetails.buildingId,
                            buildingName: viewing.roomDetails.buildingName,
                            row: viewing.roomDetails.row,
                            col: viewing.roomDetails.col,
                            roomType: viewing.roomDetails.roomType,
                            pricePerMonth
                        },
                        moveInDate,
                        status: 'confirmed',
                        viewingRequestId: viewing._id
                    });

                    const building = property.buildings?.find(b => b.id === viewing.roomDetails.buildingId);
                    if (building && building.grid?.[viewing.roomDetails.row]?.[viewing.roomDetails.col]) {
                        building.grid[viewing.roomDetails.row][viewing.roomDetails.col].isBooked = true;
                        property.markModified('buildings');
                        await property.save();
                    }
                    viewing.status = 'booked';
                }
            } catch (bookingErr) {
                console.warn('[OwnerAction] Auto-booking failed:', bookingErr.message);
            }
        }

        await viewing.save();

        // If confirmed + non-direct + viewing date already past → send nudge immediately
        if (newStatus === 'confirmed' && !viewing.isDirectApply && viewing.viewingDate && viewing.viewingDate <= new Date() && !viewing.nudgeSentAt) {
            (async () => {
                try {
                    const renterUser = await User.findById(viewing.renter?._id || viewing.renter);
                    const property = viewing.property;
                    if (renterUser && property) {
                        const token = crypto.randomUUID();
                        viewing.nudgeToken = token;
                        viewing.nudgeSentAt = new Date();
                        await viewing.save();
                        const yesUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/viewing/action?type=nudge&token=${token}&answer=yes`;
                        const noUrl  = `${process.env.CLIENT_URL || 'http://localhost:5173'}/viewing/action?type=nudge&token=${token}&answer=no`;
                        const roomLabel = `${viewing.roomDetails.roomType} in ${viewing.roomDetails.buildingName || 'Building'}`;
                        sendEmail(
                            renterUser.email,
                            `How did the viewing go? — ${property.name}`,
                            `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                                <div style="background:#4F46E5;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                                    <h2 style="color:#fff;margin:0;font-size:20px;">Want this room?</h2>
                                </div>
                                <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                                    <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">Hi <strong>${renterUser.username}</strong>,</p>
                                    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">You recently visited a <strong>${roomLabel}</strong> at <strong>${property.name}</strong>. Did you like it?</p>
                                    <div style="display:flex;gap:12px;justify-content:center;margin:24px 0;">
                                        <a href="${yesUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Yes, book it!</a>
                                        <a href="${noUrl}"  style="display:inline-block;background:#dc2626;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Not for me</a>
                                    </div>
                                    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">You can also book directly from your viewings page.</p>
                                </div>
                            </div>`
                        ).catch(e => console.warn('[OwnerAction] Nudge email failed:', e.message));
                        sendPushNotification(viewing.renter?._id || viewing.renter, {
                            title: 'Want this room?',
                            body: `You visited ${roomLabel} at ${property.name}. Ready to book?`,
                            url: `/my-viewings`,
                            tag: `nudge-${viewing._id}`,
                            actions: [
                                { action: 'yes', title: '✓ Book it!' },
                                { action: 'no', title: 'Not for me' }
                            ],
                            actionUrls: {
                                yes: yesUrl,
                                no: `/my-viewings`
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[OwnerAction] Immediate nudge failed:', e.message);
                }
            })();
        }

        // Notify renter
        (async () => {
            try {
                const renterUser = await User.findById(viewing.renter?._id || viewing.renter);
                const property = viewing.property;
                if (renterUser && property) {
                    const isConfirmed = newStatus === 'confirmed';
                    const isDirectApply = viewing.isDirectApply;
                    const reqLabel = isDirectApply ? 'application' : 'viewing';
                    sendPushNotification(renterUser._id, {
                        title: isConfirmed ? (isDirectApply ? 'Application Accepted!' : 'Viewing Confirmed!') : 'Request Declined',
                        body: isConfirmed
                            ? `Your ${reqLabel} at ${property.name} has been confirmed!`
                            : `Your ${reqLabel} request at ${property.name} was declined.`,
                        url: `/my-viewings?viewingId=${viewing._id}`,
                        tag: `owner-action-${viewing._id}`
                    });
                    sendEmail(
                        renterUser.email,
                        isConfirmed ? `${isDirectApply ? 'Application' : 'Viewing'} Confirmed — ${property.name}` : `Request Update — ${property.name}`,
                        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                            <div style="background:${isConfirmed ? '#16a34a' : '#dc2626'};padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                                <h2 style="color:#fff;margin:0;font-size:20px;">${isConfirmed ? (isDirectApply ? 'Application Accepted!' : 'Viewing Confirmed!') : 'Request Declined'}</h2>
                            </div>
                            <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                                <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Your ${reqLabel} request for <strong>${property.name}</strong> has been <strong style="color:${isConfirmed ? '#16a34a' : '#dc2626'};">${isConfirmed ? 'confirmed' : 'declined'}</strong>.</p>
                                ${isConfirmed && property.address ? `<p style="font-size:14px;color:#555;">Address: ${property.address}, ${property.estate || ''}</p>` : ''}
                                ${isConfirmed && property.contact ? `<p style="font-size:14px;color:#555;">Contact: ${property.contact}</p>` : ''}
                                <div style="text-align:center;margin-top:20px;">
                                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-viewings" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View My Viewings</a>
                                </div>
                            </div>
                        </div>`
                    ).catch(e => console.warn('[OwnerAction] Renter email failed:', e.message));
                }
            } catch (e) {
                console.warn('[OwnerAction] Notify renter failed:', e.message);
            }
        })();

        const isConfirmed = newStatus === 'confirmed';
        if (wantJson) return res.json({ success: true, message: isConfirmed ? 'The renter has been notified and will come for the viewing.' : 'The renter has been notified.', propertyName: viewing.property?.name });
        return res.send(`
            <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
            <h2 style="color:${isConfirmed ? '#16a34a' : '#dc2626'};">${isConfirmed ? '✓ Accepted!' : '✗ Declined'}</h2>
            <p>${isConfirmed ? 'The renter has been notified and will come for the viewing.' : 'The renter has been notified.'}</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/owner/viewing-requests" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Go to Dashboard</a>
            </body></html>`);
    } catch (error) {
        console.error('[OwnerAction]', error.message);
        res.status(500).send('<h2>Something went wrong. Please try again.</h2>');
    }
};

// Authenticated renter decision (book or decline) from dashboard — no token needed
// POST /api/viewing/:id/renter-decision?answer=yes|no
export const handleRenterDecision = async (req, res) => {
    try {
        const { id } = req.params;
        const { answer } = req.query;
        const renterId = req.user._id;

        if (!['yes', 'no'].includes(answer)) return res.json({ success: false, message: 'Invalid answer.' });

        const viewing = await ViewingRequest.findOne({ _id: id, renter: renterId }).populate('property');
        if (!viewing) return res.json({ success: false, message: 'Viewing not found.' });
        if (viewing.status !== 'confirmed') return res.json({ success: false, message: 'This viewing is not in a confirmable state.' });

        if (answer === 'no') {
            viewing.status = 'completed';
            viewing.nudgeToken = null;
            await viewing.save();
            return res.json({ success: true, message: "Got it! We'll keep looking for the right place for you." });
        }

        // answer === 'yes' → auto-create booking
        const property = viewing.property;
        if (!property) return res.json({ success: false, message: 'Property not found.' });

        let pricePerMonth = 0;
        try {
            const building = property.buildings?.find(b => b.id === viewing.roomDetails.buildingId);
            pricePerMonth = building?.grid?.[viewing.roomDetails.row]?.[viewing.roomDetails.col]?.price || 0;
        } catch (_) {}

        const existingBooking = await Booking.findOne({
            property: property._id,
            'roomDetails.buildingId': viewing.roomDetails.buildingId,
            'roomDetails.row': viewing.roomDetails.row,
            'roomDetails.col': viewing.roomDetails.col,
            status: { $ne: 'cancelled' }
        });
        if (existingBooking) {
            viewing.status = 'booked';
            await viewing.save();
            return res.json({ success: false, message: 'Sorry, this room has already been booked by someone else.' });
        }

        const moveInDate = viewing.preferredMoveInDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await Booking.create({
            user: renterId,
            property: property._id,
            roomDetails: {
                buildingId: viewing.roomDetails.buildingId,
                buildingName: viewing.roomDetails.buildingName,
                row: viewing.roomDetails.row,
                col: viewing.roomDetails.col,
                roomType: viewing.roomDetails.roomType,
                pricePerMonth
            },
            moveInDate,
            status: 'confirmed',
            viewingRequestId: viewing._id
        });

        try {
            const building = property.buildings?.find(b => b.id === viewing.roomDetails.buildingId);
            if (building?.grid?.[viewing.roomDetails.row]?.[viewing.roomDetails.col]) {
                building.grid[viewing.roomDetails.row][viewing.roomDetails.col].isBooked = true;
                property.markModified('buildings');
                await property.save();
            }
        } catch (_) {}

        viewing.status = 'booked';
        viewing.nudgeToken = null;
        await viewing.save();

        // Send confirmation email
        (async () => {
            try {
                const renterUser = await User.findById(renterId);
                if (renterUser?.email) {
                    sendEmail(renterUser.email, `Booking Confirmed — ${property.name}`,
                        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                            <div style="background:#16a34a;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                                <h2 style="color:#fff;margin:0;">You're booked! 🎉</h2>
                            </div>
                            <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                                <p>Your booking for a <strong>${viewing.roomDetails.roomType}</strong> at <strong>${property.name}</strong> is confirmed.</p>
                                <p><strong>Move-in:</strong> ${new Date(moveInDate).toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
                                <p><strong>Address:</strong> ${property.address}, ${property.estate}</p>
                                <p><strong>Contact:</strong> ${property.contact}</p>
                                <div style="text-align:center;margin-top:20px;">
                                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-bookings" style="background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">View My Bookings</a>
                                </div>
                            </div>
                        </div>`
                    ).catch(() => {});
                    sendPushNotification(renterId, {
                        title: 'Booking Confirmed!',
                        body: `Your room at ${property.name} has been booked`,
                        url: '/my-bookings',
                        tag: `booking-confirmed-${viewing._id}`
                    });
                }
            } catch (_) {}
        })();

        return res.json({ success: true, message: `Your room at ${property.name} has been booked!`, propertyName: property.name, moveInDate });
    } catch (error) {
        console.error('[RenterDecision]', error.message);
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
