import Booking from "../models/booking.js";
import Property from "../models/property.js";
import ViewingRequest from "../models/viewingRequest.js";

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

export const getPropertyBookings = async (req, res) => {
   try {
     const properties = await Property.find({ owner: req.user._id }).select('_id');
    if (!properties.length) {
        return res.json({ success: true, totalBookings: 0, bookings: [] });
    }
    const propertyIds = properties.map(p => p._id);
     const bookings = await Booking.find({ property: { $in: propertyIds } }).populate('property user').sort({ createdAt: -1 });
     const totalBookings = bookings.length;

     res.json({ success: true, totalBookings, bookings });
   } catch (error) {
    res.json({ success: false, message: 'Failed to fetch bookings' });
   } 
}