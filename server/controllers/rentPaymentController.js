import RentPayment from '../models/rentPayment.js';
import Property from '../models/property.js';
import Booking from '../models/booking.js';
import RoomContact from '../models/roomContact.js';
import User from '../models/user.js';
import { sendPushNotification } from '../utils/pushNotifier.js';
import { sendEmail } from '../utils/mailer.js';

// Helper: check if caller is owner or caretaker of the property
const canManageProperty = async (propertyId, userEmail, userId) => {
  const property = await Property.findById(propertyId).lean();
  if (!property) return false;
  const isOwner = property.owner?.toString() === userId?.toString();
  const isCaretaker = property.caretakers?.some(e => e.toLowerCase() === userEmail?.toLowerCase());
  return isOwner || isCaretaker;
};

// GET /api/rent-payment/:propertyId?month=X&year=Y
export const getRentPayments = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const userEmail = req.user?.email;
    const userId = req.user?._id;

    const allowed = await canManageProperty(propertyId, userEmail, userId);
    if (!allowed) {
      return res.json({ success: false, message: 'Access denied' });
    }

    const payments = await RentPayment.find({ property: propertyId, month, year }).lean();
    res.json({ success: true, payments });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// POST /api/rent-payment/toggle
export const toggleRentPayment = async (req, res) => {
  try {
    const { propertyId, buildingId, row, col, month, year, note } = req.body;

    const userEmail = req.user?.email;
    const userId = req.user?._id;

    if (!propertyId || buildingId == null || row == null || col == null) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const allowed = await canManageProperty(propertyId, userEmail, userId);
    if (!allowed) {
      return res.json({ success: false, message: 'Access denied' });
    }

    // Find or create the payment record
    let payment = await RentPayment.findOne({ property: propertyId, buildingId, row, col, month: m, year: y });

    if (!payment) {
      // Create as PAID (first toggle = mark paid)
      payment = await RentPayment.create({
        property: propertyId,
        buildingId,
        row,
        col,
        month: m,
        year: y,
        paid: true,
        paymentStatus: 'full',
        paidAt: new Date(),
        note: note || '',
        recordedBy: userId
      });
    } else {
      // Toggle
      payment.paid = !payment.paid;
      payment.paymentStatus = payment.paid ? 'full' : 'unpaid';
      payment.paidAt = payment.paid ? new Date() : null;
      if (!payment.paid) payment.amountPaid = 0;
      if (note !== undefined) payment.note = note;
      payment.recordedBy = userId;
      await payment.save();
    }

    res.json({ success: true, payment });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// POST /api/rent-payment/set-amount
// Record exact amounts (for partial payments, cash receipts, etc.)
// Body: { propertyId, buildingId, row, col, month, year, amountDue, amountPaid, note }
export const setPaymentAmount = async (req, res) => {
  try {
    const { propertyId, buildingId, row, col, month, year, amountDue, amountPaid, note } = req.body;

    const userEmail = req.user?.email;
    const userId = req.user?._id;

    if (!propertyId || buildingId == null || row == null || col == null) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    const m = month || new Date().getMonth() + 1;
    const y = year  || new Date().getFullYear();

    const allowed = await canManageProperty(propertyId, userEmail, userId);
    if (!allowed) return res.json({ success: false, message: 'Access denied' });

    const due  = amountDue  != null ? Number(amountDue)  : null;
    const paid = amountPaid != null ? Number(amountPaid) : 0;

    let paymentStatus = 'unpaid';
    if (due !== null) {
      if (paid >= due) paymentStatus = 'full';
      else if (paid > 0) paymentStatus = 'partial';
    }

    let payment = await RentPayment.findOne({ property: propertyId, buildingId, row, col, month: m, year: y });
    if (!payment) {
      payment = await RentPayment.create({
        property: propertyId, buildingId, row, col, month: m, year: y,
        paid: paymentStatus === 'full',
        paidAt: paymentStatus === 'full' ? new Date() : null,
        amountDue: due, amountPaid: paid, paymentStatus,
        note: note || '',
        recordedBy: userId
      });
    } else {
      if (due !== null) payment.amountDue = due;
      payment.amountPaid = paid;
      payment.paymentStatus = paymentStatus;
      payment.paid = paymentStatus === 'full';
      payment.paidAt = paymentStatus === 'full' ? (payment.paidAt || new Date()) : null;
      if (note !== undefined) payment.note = note;
      payment.recordedBy = userId;
      await payment.save();
    }

    res.json({ success: true, payment });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// GET /api/rent-payment/owner/summary?month=X&year=Y
export const getRentSummary = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();
    const userId = req.user?._id;

    const properties = await Property.find({ owner: userId }).select('_id').lean();
    const propertyIds = properties.map(p => p._id);

    if (!propertyIds.length) {
      return res.json({ success: true, totalCollected: 0, totalDue: 0, fullCount: 0, partialCount: 0 });
    }

    const payments = await RentPayment.find({ property: { $in: propertyIds }, month, year }).lean();

    const totalCollected = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalDue       = payments.reduce((sum, p) => sum + (p.amountDue  || 0), 0);
    const fullCount      = payments.filter(p => p.paymentStatus === 'full'    || (p.paid && !p.paymentStatus)).length;
    const partialCount   = payments.filter(p => p.paymentStatus === 'partial').length;

    res.json({ success: true, totalCollected, totalDue, fullCount, partialCount, month, year });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// POST /api/rent-payment/remind
// Body: { propertyId, buildingId, row, col, month, year }
export const sendRentReminder = async (req, res) => {
  try {
    const { propertyId, buildingId, row, col, month, year } = req.body;
    const userEmail = req.user?.email;
    const userId    = req.user?._id;

    const allowed = await canManageProperty(propertyId, userEmail, userId);
    if (!allowed) return res.json({ success: false, message: 'Access denied' });

    const property = await Property.findById(propertyId).lean();
    const m = month || new Date().getMonth() + 1;
    const y = year  || new Date().getFullYear();
    const monthName = new Date(y, m - 1, 1).toLocaleString('en-KE', { month: 'long', year: 'numeric' });

    const payment = await RentPayment.findOne({ property: propertyId, buildingId, row, col, month: m, year: y }).lean();
    const outstanding = payment?.amountDue > 0
      ? Math.max(0, payment.amountDue - (payment.amountPaid || 0))
      : null;
    const amountText = outstanding != null
      ? `Ksh ${outstanding.toLocaleString()} outstanding`
      : 'rent outstanding';
    const propName = property?.name || 'your property';

    const msgBody = `Hi, this is a reminder that your ${monthName} rent for ${propName} has ${amountText}. Please pay to your caretaker at your earliest. - PataKeja`;

    // 1️⃣  Try platform tenant first (confirmed + moved-in booking)
    const booking = await Booking.findOne({
      property: propertyId,
      'roomDetails.buildingId': buildingId,
      'roomDetails.row': row,
      'roomDetails.col': col,
      status: 'confirmed',
      hasMoved: true
    });

    if (booking) {
      sendPushNotification(booking.user, {
        title: `Rent Reminder — ${monthName}`,
        body: `${amountText} for ${propName}. Please pay to your caretaker.`,
        url: '/my-bookings',
        type: 'rent'
      });
      return res.json({ success: true, via: 'push', message: `Reminder sent to tenant` });
    }

    // 2️⃣  Check manually stored contact
    const contact = await RoomContact.findOne({ property: propertyId, buildingId, row, col }).lean();

    if (!contact) {
      return res.json({
        success: false, noTenant: true, hasContact: false,
        message: 'No tenant linked — save their contact to send reminders'
      });
    }

    const deliveries = [];

    // Try push via email match
    if (contact.email) {
      const user = await User.findOne({ email: contact.email }).lean();
      if (user) {
        sendPushNotification(user._id, {
          title: `Rent Reminder — ${monthName}`,
          body: `${amountText} for ${propName}. Please pay to your caretaker.`,
          url: '/my-bookings',
          type: 'rent'
        });
        deliveries.push('push');
      }

      // Always also send email if we have an address
      await sendEmail(
        contact.email,
        `Rent Reminder — ${monthName} | ${propName}`,
        `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;">
          <h2 style="color:#4F46E5;margin-bottom:8px;">Rent Reminder</h2>
          <p style="color:#374151;font-size:15px;">${msgBody}</p>
          <p style="color:#6B7280;font-size:12px;margin-top:24px;">Sent via <a href="https://patakejaa.co.ke" style="color:#4F46E5;">PataKeja</a></p>
        </div>`
      );
      deliveries.push('email');
    }

    // SMS — not in v1; reserved for future

    if (!deliveries.length) {
      return res.json({
        success: false, noTenant: true, hasContact: true, notSignedUp: true,
        contact: { name: contact.name, phone: contact.phone, email: contact.email },
        message: 'Tenant not on platform yet and no delivery channel worked'
      });
    }

    return res.json({
      success: true,
      via: deliveries.join('+'),
      message: `Reminder sent via ${deliveries.join(' & ')} to ${contact.name || contact.phone || contact.email}`
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
