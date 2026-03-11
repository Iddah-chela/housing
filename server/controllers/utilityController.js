import UtilityEntry from '../models/utilityEntry.js';
import Property from '../models/property.js';
import Booking from '../models/booking.js';
import { sendPushNotification } from '../utils/pushNotifier.js';

// Helper: check if caller is owner or caretaker of the property
const canManage = async (propertyId, userEmail, userId) => {
  const property = await Property.findById(propertyId).lean();
  if (!property) return false;
  const isOwner = property.owner?.toString() === userId?.toString();
  const isCaretaker = property.caretakers?.some(e => e.toLowerCase() === userEmail?.toLowerCase());
  return isOwner || isCaretaker;
};

// GET /api/utility/:propertyId?month=X&year=Y&type=electricity|water
export const getUtilityEntries = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();

    const allowed = await canManage(propertyId, req.user?.email, req.user?._id);
    if (!allowed) return res.json({ success: false, message: 'Access denied' });

    const filter = { property: propertyId, month, year };
    if (req.query.type) filter.type = req.query.type;

    const entries = await UtilityEntry.find(filter).lean();
    res.json({ success: true, entries });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// POST /api/utility/record
// Creates or updates a utility entry for a room.
// Body: { propertyId, buildingId, row, col, type, month, year,
//         previousReading, currentReading, amountDue, amountPaid, note }
export const recordUtility = async (req, res) => {
  try {
    const {
      propertyId, buildingId, row, col, type,
      month, year,
      previousReading, currentReading,
      amountDue, amountPaid,
      note
    } = req.body;

    if (!propertyId || buildingId == null || row == null || col == null || !type) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    const m = month || new Date().getMonth() + 1;
    const y = year  || new Date().getFullYear();

    const allowed = await canManage(propertyId, req.user?.email, req.user?._id);
    if (!allowed) return res.json({ success: false, message: 'Access denied' });

    const updateData = {
      ...(previousReading != null && { previousReading: Number(previousReading) }),
      ...(currentReading  != null && { currentReading:  Number(currentReading)  }),
      ...(amountDue  != null && { amountDue:  Number(amountDue)  }),
      ...(amountPaid != null && { amountPaid: Number(amountPaid) }),
      ...(note !== undefined && { note }),
      recordedBy: req.user._id
    };

    const entry = await UtilityEntry.findOneAndUpdate(
      { property: propertyId, buildingId, row, col, type, month: m, year: y },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, entry });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// POST /api/utility/mark-paid
// Quickly mark a utility bill as paid (full amount).
export const markUtilityPaid = async (req, res) => {
  try {
    const { propertyId, buildingId, row, col, type, month, year } = req.body;

    const m = month || new Date().getMonth() + 1;
    const y = year  || new Date().getFullYear();

    const allowed = await canManage(propertyId, req.user?.email, req.user?._id);
    if (!allowed) return res.json({ success: false, message: 'Access denied' });

    let entry = await UtilityEntry.findOne({ property: propertyId, buildingId, row, col, type, month: m, year: y });
    if (!entry) return res.json({ success: false, message: 'No utility record found. Use /record first.' });

    entry.amountPaid = entry.amountDue;
    entry.status = 'paid';
    entry.paidAt = new Date();
    entry.recordedBy = req.user._id;
    await entry.save();

    res.json({ success: true, entry });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// POST /api/utility/settings
// Update per-property utility billing settings (who pays water/electricity).
// Body: { propertyId, waterPaidBy, electricityPaidBy, electricityRatePerUnit, waterRatePerUnit, reminderNote }
export const updateUtilitySettings = async (req, res) => {
  try {
    const { propertyId, waterPaidBy, electricityPaidBy, electricityRatePerUnit, waterRatePerUnit, reminderNote } = req.body;

    const allowed = await canManage(propertyId, req.user?.email, req.user?._id);
    if (!allowed) return res.json({ success: false, message: 'Access denied' });

    const update = {};
    if (waterPaidBy)       update['utilitySettings.waterPaidBy']       = waterPaidBy;
    if (electricityPaidBy) update['utilitySettings.electricityPaidBy'] = electricityPaidBy;
    if (electricityRatePerUnit != null) update['utilitySettings.electricityRatePerUnit'] = Number(electricityRatePerUnit);
    if (waterRatePerUnit != null)       update['utilitySettings.waterRatePerUnit']       = Number(waterRatePerUnit);
    if (reminderNote !== undefined)     update['utilitySettings.reminderNote']           = reminderNote;

    const property = await Property.findByIdAndUpdate(propertyId, { $set: update }, { new: true });
    res.json({ success: true, utilitySettings: property.utilitySettings });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// POST /api/utility/remind
// Send a push notification reminder to the tenant in a specific room about an unpaid utility bill.
// Body: { propertyId, buildingId, row, col, type, month, year }
export const sendUtilityReminder = async (req, res) => {
  try {
    const { propertyId, buildingId, row, col, type, month, year } = req.body;

    const allowed = await canManage(propertyId, req.user?.email, req.user?._id);
    if (!allowed) return res.json({ success: false, message: 'Access denied' });

    // Find the active confirmed booking for this exact room
    const booking = await Booking.findOne({
      property: propertyId,
      'roomDetails.buildingId': buildingId,
      'roomDetails.row': row,
      'roomDetails.col': col,
      status: 'confirmed',
      hasMoved: true
    });

    if (!booking) {
      return res.json({ success: false, message: 'No active tenant found in this room' });
    }

    const property = await Property.findById(propertyId).lean();
    const m = month || new Date().getMonth() + 1;
    const y = year  || new Date().getFullYear();
    const monthName = new Date(y, m - 1, 1).toLocaleString('en-KE', { month: 'long', year: 'numeric' });

    const entry = await UtilityEntry.findOne({ property: propertyId, buildingId, row, col, type, month: m, year: y }).lean();
    const outstanding = entry ? Math.max(0, (entry.amountDue || 0) - (entry.amountPaid || 0)) : null;

    const baseNote = property?.utilitySettings?.reminderNote ? `\n${property.utilitySettings.reminderNote}` : '';
    const amountText = outstanding != null ? ` Ksh ${outstanding.toLocaleString()} outstanding.` : '';

    sendPushNotification(booking.user, {
      title: `Utility Reminder — ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      body: `${monthName}${amountText} Please settle your ${type} bill for ${property?.name || 'your property'}.${baseNote}`,
      url: '/my-bookings'
    });

    res.json({ success: true, message: `Reminder sent to tenant in room (${row + 1}, ${col + 1})` });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
