import Booking from "../models/booking.js";
import Property from "../models/property.js";
import ViewingRequest from "../models/viewingRequest.js";
import User from "../models/user.js";
import { sendEmail } from "../utils/mailer.js";
import { sendPushNotification } from "../utils/pushNotifier.js";

// api to create a new booking
//Post /api/bookings/book
export const createBooking = async (req, res)=>{
    try {
        const {propertyId, roomDetails, moveInDate, viewingRequestId} = req.body;
        const user = req.user._id;

        // Verify property exists
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.json({success: false, message: "Property not found"});
        }

        // Prevent duplicate bookings for same room
        const existing = await Booking.findOne({
            property: propertyId,
            'roomDetails.buildingId': roomDetails.buildingId,
            'roomDetails.row': roomDetails.row,
            'roomDetails.col': roomDetails.col,
            status: { $ne: 'cancelled' }
        });
        if (existing) {
            return res.json({ success: false, message: 'This room is already booked' });
        }

        // Create booking
        await Booking.create({
            user, 
            property: propertyId,
            roomDetails: {
                buildingId: roomDetails.buildingId,
                buildingName: roomDetails.buildingName,
                row: roomDetails.row,
                col: roomDetails.col,
                roomType: roomDetails.roomType,
                pricePerMonth: roomDetails.pricePerMonth
            },
            moveInDate,
            status: "confirmed",
            ...(viewingRequestId && { viewingRequestId })
        })
        // Mark cell as booked in property grid
        try {
            const building = property.buildings?.find(b => b.id === roomDetails.buildingId);
            if (building && building.grid?.[roomDetails.row]?.[roomDetails.col]) {
                building.grid[roomDetails.row][roomDetails.col].isBooked = true;
                property.markModified('buildings');
                await property.save();
            }
        } catch (_) {}

        // Mark viewing request as booked so "Book This Room" button hides
        if (viewingRequestId) {
            try {
                await ViewingRequest.findByIdAndUpdate(viewingRequestId, { status: 'booked' });
            } catch (_) {}
        }

        res.json({success: true, message: "Booking Created successfully"})
    } catch (error) {
        console.log(error);
        res.json({success: false, message: "Failed to create Booking"})
    }
};

// Api to get all bookings for a user
// Get /api/bookings/user
export const getUserBookings = async (req, res) => {
    try {
        const user = req.user._id;
        const bookings = await Booking.find({user}).populate("property").sort({createdAt: -1})
        res.json({success: true, bookings})
    } catch (error) {
        res.json({success: false, message: "Failed to fetch bookings"});
    }
}

// Confirm move-in — tenant marks they've moved in
// POST /api/bookings/move-in
export const confirmMoveIn = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.json({ success: false, message: 'Booking not found' });
        if (String(booking.user) !== String(req.user._id))
            return res.json({ success: false, message: 'Unauthorized' });
        if (booking.status !== 'confirmed')
            return res.json({ success: false, message: 'Booking must be confirmed first' });

        booking.hasMoved = true;
        await booking.save();

        // Mark cell as occupied in property grid
        try {
            const property = await Property.findById(booking.property);
            if (property) {
                const building = property.buildings?.find(b => b.id === booking.roomDetails.buildingId);
                if (building && building.grid?.[booking.roomDetails.row]?.[booking.roomDetails.col]) {
                    building.grid[booking.roomDetails.row][booking.roomDetails.col].isVacant = false;
                    building.grid[booking.roomDetails.row][booking.roomDetails.col].isBooked = false;
                    property.markModified('buildings');
                    await property.save();
                }
            }
        } catch (_) {}

        res.json({ success: true, message: 'Move-in confirmed' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Token / authenticated move-in action — GET /api/bookings/move-in-action
// Used by email links: ?id=X&answer=yes|no|owner-yes|owner-no&token=Y
export const handleMoveInAction = async (req, res) => {
    try {
        const { id, answer, token } = req.query;
        const bg   = req.query.bg === '1'; // called silently by service worker
        const BASE = process.env.CLIENT_URL || 'http://localhost:5173';

        const booking = await Booking.findById(id).populate('property');
        if (!booking) return res.status(404).send('<h2>Booking not found.</h2>');

        const property = booking.property;

        if (answer === 'yes') {
            // Renter confirms move-in
            if (booking.hasMoved) {
                if (bg) return res.json({ success: true, message: 'Already confirmed' });
                return res.redirect(`${BASE}/my-bookings`);
            }
            booking.hasMoved = true;
            await booking.save();
            // Update grid cell
            try {
                if (property) {
                    const building = property.buildings?.find(b => b.id === booking.roomDetails.buildingId);
                    if (building?.grid?.[booking.roomDetails.row]?.[booking.roomDetails.col]) {
                        building.grid[booking.roomDetails.row][booking.roomDetails.col].isVacant = false;
                        building.grid[booking.roomDetails.row][booking.roomDetails.col].isBooked = false;
                        property.markModified('buildings');
                        await property.save();
                    }
                    // Notify owner
                    const renterUser = await User.findById(booking.user);
                    const ownerUser = await User.findById(property.owner);
                    if (ownerUser) {
                        sendPushNotification(property.owner, {
                            title: 'Move-in confirmed!',
                            body: `${renterUser?.username || 'Your tenant'} has confirmed they moved into ${property.name}`,
                            url: '/owner/bookings',
                            tag: `movein-confirmed-${booking._id}`
                        });
                    }
                }
            } catch (_) {}
            if (bg) return res.json({ success: true, message: 'Move-in confirmed!' });
            return res.redirect(`${BASE}/my-bookings?moved=1`);
        }

        if (answer === 'no') {
            // Renter says not yet — just redirect to app
            if (bg) return res.json({ success: true });
            return res.redirect(`${BASE}/my-bookings`);
        }

        if (answer === 'owner-yes' && token && booking.moveInOwnerToken === token) {
            // Owner confirms renter moved in
            booking.hasMoved = true;
            booking.moveInOwnerToken = null;
            await booking.save();
            try {
                if (property) {
                    const building = property.buildings?.find(b => b.id === booking.roomDetails.buildingId);
                    if (building?.grid?.[booking.roomDetails.row]?.[booking.roomDetails.col]) {
                        building.grid[booking.roomDetails.row][booking.roomDetails.col].isVacant = false;
                        building.grid[booking.roomDetails.row][booking.roomDetails.col].isBooked = false;
                        property.markModified('buildings');
                        await property.save();
                    }
                }
                // Tell renter
                sendPushNotification(booking.user, {
                    title: 'Move-in confirmed',
                    body: `Your move-in at ${property?.name} has been confirmed by the owner`,
                    url: '/my-bookings',
                    tag: `movein-owner-confirmed-${booking._id}`
                });
            } catch (_) {}
            if (bg) return res.json({ success: true });
            return res.send(`<html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;"><h2 style="color:#16a34a;">✓ Move-in recorded</h2><p>Thank you. The tenant's move-in has been confirmed.</p><a href="${BASE}/owner/bookings" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a></body></html>`);
        }

        if (answer === 'owner-no' && token && booking.moveInOwnerToken === token) {
            // Owner says renter hasn't moved in — flag for review
            booking.moveInOwnerToken = null;
            await booking.save();
            try {
                sendPushNotification(booking.user, {
                    title: 'Move-in issue',
                    body: `Your caretaker reported you haven't moved in yet at ${property?.name}. Please contact them.`,
                    url: '/my-bookings',
                    tag: `movein-issue-${booking._id}`
                });
            } catch (_) {}
            if (bg) return res.json({ success: true });
            return res.send(`<html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;"><h2 style="color:#d97706;">Noted</h2><p>We've notified the tenant to follow up. Both parties should be in contact to resolve this.</p><a href="${BASE}/owner/bookings" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a></body></html>`);
        }

        return res.status(400).send('<h2>Invalid or expired link.</h2>');
    } catch (error) {
        console.error('[MoveInAction]', error.message);
        res.status(500).send('<h2>Something went wrong.</h2>');
    }
};

// Owner marks a tenant as moved-in (from OwnerBookings page)
export const confirmMoveInAsOwner = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId).populate('property');
        if (!booking) return res.json({ success: false, message: 'Booking not found' });
        const property = booking.property;
        if (!property || String(property.owner) !== String(req.user._id))
            return res.json({ success: false, message: 'Unauthorized' });
        if (booking.hasMoved) return res.json({ success: true, message: 'Already marked as moved in' });

        booking.hasMoved = true;
        await booking.save();

        // Update grid cell
        try {
            const building = property.buildings?.find(b => b.id === booking.roomDetails.buildingId);
            if (building?.grid?.[booking.roomDetails.row]?.[booking.roomDetails.col]) {
                building.grid[booking.roomDetails.row][booking.roomDetails.col].isVacant = false;
                building.grid[booking.roomDetails.row][booking.roomDetails.col].isBooked = false;
                property.markModified('buildings');
                await property.save();
            }
        } catch (_) {}

        // Notify renter
        sendPushNotification(booking.user, {
            title: 'Move-in confirmed ✓',
            body: `Your move-in at ${property.name} has been confirmed by the owner/caretaker`,
            url: '/my-bookings',
            tag: `movein-owner-confirmed-${booking._id}`
        });

        res.json({ success: true, message: 'Move-in confirmed' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export const getPropertyBookings = async (req, res) => {
   try {
    const userEmail = req.user.email;
    const [ownedProperties, caretakerProperties] = await Promise.all([
      Property.find({ owner: req.user._id }).select('_id'),
      Property.find({ caretakers: { $elemMatch: { $regex: new RegExp(`^${userEmail}$`, 'i') } } }).select('_id')
    ]);
    const propertyIds = [
      ...ownedProperties.map(p => p._id),
      ...caretakerProperties.map(p => p._id)
    ];
    if (!propertyIds.length) {
        return res.json({ success: true, totalBookings: 0, bookings: [] });
    }
    const bookings = await Booking.find({
      property: { $in: propertyIds },
      status: { $ne: 'cancelled' }
    }).populate('user', 'username image email').sort({ createdAt: -1 });
    const totalBookings = bookings.length;
    res.json({ success: true, totalBookings, bookings });
   } catch (error) {
    res.json({ success: false, message: 'Failed to fetch bookings' });
   } 
}