import Booking from "../models/booking.js";
import Property from "../models/property.js";
import ViewingRequest from "../models/viewingRequest.js";
import User from "../models/user.js";
import { sendEmail } from "../utils/mailer.js";
import { sendPushNotification } from "../utils/pushNotifier.js";

const CLIENT_BASE = process.env.CLIENT_URL || 'http://localhost:5173';

const setRoomMoveOutState = async (property, roomDetails, state = {}) => {
    if (!property) return;
    const building = property.buildings?.find(b => String(b.id) === String(roomDetails?.buildingId));
    const cell = building?.grid?.[roomDetails?.row]?.[roomDetails?.col];
    if (!cell || cell.type !== 'room') return;

    if (typeof state.isVacant === 'boolean') cell.isVacant = state.isVacant;
    if (typeof state.isBooked === 'boolean') cell.isBooked = state.isBooked;
    if (typeof state.isMoveOutSoon === 'boolean') cell.isMoveOutSoon = state.isMoveOutSoon;
    if (Object.prototype.hasOwnProperty.call(state, 'availableFrom')) {
        cell.availableFrom = state.availableFrom;
    }

    property.markModified('buildings');
    await property.save();
};

const getCaretakerUsers = async (property) => {
    const caretakerEmails = (property?.caretakers || []).filter(Boolean);
    if (!caretakerEmails.length) return [];
    return User.find({
        email: { $in: caretakerEmails.map(e => new RegExp(`^${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) }
    }).select('_id username email');
};

const notifyOwnerAndCaretakers = async ({ property, title, body, url = '/owner/bookings', emailSubject, emailHtml }) => {
    if (!property) return;
    const ownerUser = await User.findById(property.owner);
    const caretakerUsers = await getCaretakerUsers(property);

    if (ownerUser?._id) {
        sendPushNotification(ownerUser._id, { title, body, url, tag: `moveout-owner-${property._id}` });
    }
    caretakerUsers.forEach(c => {
        sendPushNotification(c._id, { title, body, url, tag: `moveout-caretaker-${property._id}` });
    });

    if (emailSubject && emailHtml) {
        const recipients = [ownerUser?.email, ...caretakerUsers.map(c => c.email)].filter(Boolean);
        if (recipients.length) {
            sendEmail(recipients, emailSubject, emailHtml).catch(() => {});
        }
    }
};

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

        const requestedMoveInDate = new Date(moveInDate);

        // Prevent conflicting bookings for same room.
        // Allow future booking if current tenant has a scheduled move-out and requested move-in is on/after available date.
        const existing = await Booking.find({
            property: propertyId,
            'roomDetails.buildingId': roomDetails.buildingId,
            'roomDetails.row': roomDetails.row,
            'roomDetails.col': roomDetails.col,
            status: { $ne: 'cancelled' }
        });

        const blocking = existing.find(b => {
            if (b.moveOutStatus === 'completed') return false;
            if (b.hasMoved && b.moveOutStatus === 'scheduled' && b.moveOutDate) {
                return requestedMoveInDate < new Date(b.moveOutDate);
            }
            return true;
        });
        if (blocking) {
            if (blocking.moveOutStatus === 'scheduled' && blocking.moveOutDate) {
                return res.json({
                    success: false,
                    message: `This room is occupied until ${new Date(blocking.moveOutDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}. Choose a move-in date after that.`
                });
            }
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
        // Mark cell as booked in property grid for upcoming booking.
        try {
            await setRoomMoveOutState(property, roomDetails, {
                isBooked: true
            });
        } catch (_) {}

        // Mark viewing request as booked so "Book This Room" button hides
        if (viewingRequestId) {
            try {
                await ViewingRequest.findByIdAndUpdate(viewingRequestId, { status: 'booked' });
            } catch (_) {}
        }

        res.json({success: true, message: "Booking Created successfully"})
    } catch (error) {
        console.error('[Booking] Create error:', error.message);
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
        booking.status = 'completed';
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
            booking.status = 'completed';
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
            booking.status = 'completed';
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
        if (bg) return res.status(500).json({ success: false, message: error.message });
        res.status(500).send('<h2>Something went wrong.</h2>');
    }
};

// Owner marks a tenant as moved-in (from OwnerBookings page)
// Also allows caretakers of the property
export const confirmMoveInAsOwner = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId).populate('property');
        if (!booking) return res.json({ success: false, message: 'Booking not found' });
        const property = booking.property;

        // Allow owner or caretaker
        const isOwner = property && String(property.owner) === String(req.user._id);
        const isCaretaker = property?.caretakers?.some(
            e => e.toLowerCase() === req.user?.email?.toLowerCase()
        );
        if (!isOwner && !isCaretaker)
            return res.json({ success: false, message: 'Unauthorized' });

        if (booking.hasMoved) return res.json({ success: true, message: 'Already marked as moved in' });

        booking.hasMoved = true;
        booking.status = 'completed';
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
        })
            .populate('user', 'username image email')
            .populate('property', 'name estate place images buildings')
            .sort({ createdAt: -1 });
    const totalBookings = bookings.length;
    res.json({ success: true, totalBookings, bookings });
   } catch (error) {
    res.json({ success: false, message: 'Failed to fetch bookings' });
   } 
}

// ─── MOVE-OUT FLOW ────────────────────────────────────────────────────────────

// Tenant gives notice of intent to move out.
// POST /api/bookings/give-notice
// Body: { bookingId, moveOutDate }
export const giveNotice = async (req, res) => {
    try {
        const { bookingId, moveOutDate } = req.body;
        if (!moveOutDate) return res.json({ success: false, message: 'Move-out date is required' });

        const booking = await Booking.findById(bookingId).populate('property');
        if (!booking) return res.json({ success: false, message: 'Booking not found' });
        if (String(booking.user) !== String(req.user._id))
            return res.json({ success: false, message: 'Unauthorized' });
        if (!booking.hasMoved && booking.status !== 'completed')
            return res.json({ success: false, message: 'You must have moved in before giving notice' });
        if (booking.moveOutStatus === 'completed')
            return res.json({ success: false, message: 'This booking is already marked as moved out' });

        const parsedMoveOutDate = new Date(moveOutDate);
        if (Number.isNaN(parsedMoveOutDate.getTime())) {
            return res.json({ success: false, message: 'Invalid move-out date' });
        }

        booking.moveOutDate = parsedMoveOutDate;
        booking.moveOutStatus = 'notice_given';
        booking.moveOutInitiatedBy = req.user._id;
        booking.moveOutConfirmedBy = null;
        booking.moveOutNudgeSentAt = null;
        booking.moveOutToken = null;
        await booking.save();

        // Notify owner + caretakers and keep room occupied until notice is confirmed.
        const property = booking.property;
        if (property) {
            const renter = await User.findById(booking.user);
            const dateText = parsedMoveOutDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });

            await notifyOwnerAndCaretakers({
                property,
                title: 'Tenant gave move-out notice',
                body: `${renter?.username || 'A tenant'} plans to move out of ${property.name} on ${dateText}. Confirm to mark as available soon.`,
                emailSubject: `Move-out notice - ${property.name}`,
                emailHtml: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;"><h2>Tenant Move-out Notice</h2><p><strong>${renter?.username || 'A tenant'}</strong> has given notice to move out on <strong>${dateText}</strong>.</p><p>Please open Owner Bookings and confirm this move-out plan to mark the room as <strong>Available Soon</strong>.</p><p><a href="${CLIENT_BASE}/owner/bookings" style="background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Open Owner Bookings</a></p></div>`
            });
        }

        res.json({ success: true, message: 'Move-out notice submitted. Owner and caretaker have been notified.' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Owner or caretaker confirms that tenant has moved out; room becomes vacant again.
// POST /api/bookings/confirm-move-out
// Body: { bookingId }
export const confirmMoveOut = async (req, res) => {
    try {
        const { bookingId, completeNow } = req.body;
        const booking = await Booking.findById(bookingId).populate('property');
        if (!booking) return res.json({ success: false, message: 'Booking not found' });

        const property = booking.property;
        const isOwner = property && String(property.owner) === String(req.user._id);
        const isCaretaker = property?.caretakers?.some(
            e => e.toLowerCase() === req.user?.email?.toLowerCase()
        );
        // Also allow the tenant themselves to confirm move-out if no notice flow was used
        const isTenant = String(booking.user) === String(req.user._id);
        if (!isOwner && !isCaretaker && !isTenant)
            return res.json({ success: false, message: 'Unauthorized' });

        if (!booking.moveOutDate) {
            return res.json({ success: false, message: 'Tenant has not provided a move-out date yet' });
        }
        if (booking.moveOutStatus === 'completed') {
            return res.json({ success: true, message: 'Move-out already completed' });
        }

        if (completeNow) {
            const today = new Date();
            const dueDate = new Date(booking.moveOutDate);
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate > today) {
                return res.json({
                    success: false,
                    message: `You can confirm move-out on or after ${dueDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}`
                });
            }

            booking.moveOutStatus = 'completed';
            booking.moveOutToken = null;
            booking.moveOutNudgeSentAt = new Date();
            booking.moveOutConfirmedBy = req.user._id;
            await booking.save();

            try {
                if (property) {
                    await setRoomMoveOutState(property, booking.roomDetails, {
                        isVacant: true,
                        isBooked: false,
                        isMoveOutSoon: false,
                        availableFrom: null
                    });
                }
            } catch (_) {}

            if (property) {
                await notifyOwnerAndCaretakers({
                    property,
                    title: 'Tenant moved out',
                    body: `Move-out at ${property.name} has been confirmed. Room is now vacant.`,
                    url: '/owner/bookings'
                });
            }

            return res.json({ success: true, message: 'Move-out confirmed. Room is now vacant.' });
        }

        // This confirms the planned move-out (available soon), not the physical vacate yet.
        booking.moveOutStatus = 'scheduled';
        booking.moveOutConfirmedBy = req.user._id;
        await booking.save();

        // Mark room as occupied but available soon from the move-out date.
        try {
            if (property) {
                await setRoomMoveOutState(property, booking.roomDetails, {
                    isVacant: false,
                    isBooked: false,
                    isMoveOutSoon: true,
                    availableFrom: booking.moveOutDate
                });
            }
        } catch (_) {}

        // Notify tenant and confirm to owner/caretaker.
        if (!isTenant) {
            sendPushNotification(booking.user, {
                title: 'Move-out date confirmed',
                body: `Your move-out date at ${property?.name} is confirmed for ${new Date(booking.moveOutDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
                url: '/my-bookings',
                tag: `move-out-scheduled-${booking._id}`
            });
        } else if (property) {
            await notifyOwnerAndCaretakers({
                property,
                title: 'Move-out schedule confirmed',
                body: `A tenant move-out schedule at ${property.name} has been confirmed and marked as available soon.`,
                url: '/owner/bookings',
                emailSubject: `Move-out schedule confirmed - ${property.name}`,
                emailHtml: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;"><h2>Move-out schedule confirmed</h2><p>A room has been marked as <strong>Available Soon</strong> from <strong>${new Date(booking.moveOutDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p><p><a href="${CLIENT_BASE}/owner/bookings" style="background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Open Owner Bookings</a></p></div>`
            });
        }

        res.json({ success: true, message: 'Move-out plan confirmed. Room is now marked as available soon.' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Token / authenticated move-out action — GET /api/bookings/move-out-action
// Used by reminders on the move-out date: ?id=X&answer=yes|no&token=Y
export const handleMoveOutAction = async (req, res) => {
    try {
        const { id, answer, token } = req.query;
        const bg = req.query.bg === '1';
        const booking = await Booking.findById(id).populate('property');
        if (!booking) {
            if (bg) return res.status(404).json({ success: false, message: 'Booking not found' });
            return res.status(404).send('<h2>Booking not found.</h2>');
        }
        if (!token || booking.moveOutToken !== token) {
            if (bg) return res.status(400).json({ success: false, message: 'Invalid or expired token' });
            return res.status(400).send('<h2>Invalid or expired link.</h2>');
        }

        const property = booking.property;

        if (answer === 'yes') {
            booking.moveOutStatus = 'completed';
            booking.moveOutToken = null;
            booking.moveOutNudgeSentAt = new Date();
            await booking.save();

            try {
                await setRoomMoveOutState(property, booking.roomDetails, {
                    isVacant: true,
                    isBooked: false,
                    isMoveOutSoon: false,
                    availableFrom: null
                });
            } catch (_) {}

            await notifyOwnerAndCaretakers({
                property,
                title: 'Tenant moved out',
                body: `Move-out at ${property?.name} has been confirmed. Room is now vacant.`,
                url: '/owner/bookings'
            });

            if (bg) return res.json({ success: true, message: 'Move-out confirmed. Room is now vacant.' });
            return res.redirect(`${CLIENT_BASE}/my-bookings?movedOut=1`);
        }

        if (answer === 'no') {
            booking.moveOutStatus = 'none';
            booking.moveOutDate = null;
            booking.moveOutToken = null;
            booking.moveOutNudgeSentAt = new Date();
            await booking.save();

            try {
                await setRoomMoveOutState(property, booking.roomDetails, {
                    isVacant: false,
                    isMoveOutSoon: false,
                    availableFrom: null
                });
            } catch (_) {}

            await notifyOwnerAndCaretakers({
                property,
                title: 'Move-out postponed',
                body: `Tenant at ${property?.name} did not move out yet. Waiting for a new move-out date.`,
                url: '/owner/bookings'
            });

            if (bg) return res.json({ success: true, message: 'Noted. Please set a new move-out date in My Bookings.' });
            return res.redirect(`${CLIENT_BASE}/my-bookings?moveOut=no`);
        }

        if (bg) return res.status(400).json({ success: false, message: 'Invalid answer' });
        return res.status(400).send('<h2>Invalid response.</h2>');
    } catch (error) {
        if (req.query.bg === '1') return res.status(500).json({ success: false, message: error.message });
        return res.status(500).send('<h2>Something went wrong.</h2>');
    }
};

// Authenticated explicit move-out confirmation from app
// POST /api/bookings/move-out-now
// Body: { bookingId }
export const confirmMoveOutNow = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId).populate('property');
        if (!booking) return res.json({ success: false, message: 'Booking not found' });

        const property = booking.property;
        const isOwner = property && String(property.owner) === String(req.user._id);
        const isCaretaker = property?.caretakers?.some(
            e => e.toLowerCase() === req.user?.email?.toLowerCase()
        );
        const isTenant = String(booking.user) === String(req.user._id);
        if (!isOwner && !isCaretaker && !isTenant) {
            return res.json({ success: false, message: 'Unauthorized' });
        }

        if (!booking.moveOutDate) {
            return res.json({ success: false, message: 'No move-out date set for this booking' });
        }
        if (booking.moveOutStatus === 'completed') {
            return res.json({ success: true, message: 'Move-out already completed' });
        }

        const today = new Date();
        const dueDate = new Date(booking.moveOutDate);
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate > today) {
            return res.json({
                success: false,
                message: `You can confirm move-out on or after ${dueDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}`
            });
        }

        booking.moveOutStatus = 'completed';
        booking.moveOutToken = null;
        booking.moveOutNudgeSentAt = new Date();
        await booking.save();

        try {
            await setRoomMoveOutState(property, booking.roomDetails, {
                isVacant: true,
                isBooked: false,
                isMoveOutSoon: false,
                availableFrom: null
            });
        } catch (_) {}

        if (property) {
            await notifyOwnerAndCaretakers({
                property,
                title: 'Tenant moved out',
                body: `Move-out at ${property.name} has been confirmed. Room is now vacant.`,
                url: '/owner/bookings'
            });
        }

        return res.json({ success: true, message: 'Move-out confirmed. Room is now vacant.' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};