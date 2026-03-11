import RentPayment from '../models/rentPayment.js';
import Property from '../models/property.js';

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
        paidAt: new Date(),
        note: note || '',
        recordedBy: userId
      });
    } else {
      // Toggle
      payment.paid = !payment.paid;
      payment.paidAt = payment.paid ? new Date() : null;
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
