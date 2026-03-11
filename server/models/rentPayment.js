import mongoose from "mongoose";

const rentPaymentSchema = new mongoose.Schema({
  property: {
    type: String,
    ref: 'Property',
    required: true
  },
  buildingId: {
    type: String,
    required: true
  },
  row: {
    type: Number,
    required: true
  },
  col: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  paid: {
    type: Boolean,
    default: false
  },
  // Partial payment tracking
  amountDue: {
    type: Number,
    default: null   // null = not set (simple paid/unpaid mode)
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'full'],
    default: 'unpaid'
  },
  paidAt: {
    type: Date,
    default: null
  },
  note: {
    type: String,
    default: '',
    maxlength: 200
  },
  recordedBy: {
    type: String,
    ref: 'User'
  }
}, { timestamps: true });

// Unique: one record per room per month/year
rentPaymentSchema.index({ property: 1, buildingId: 1, row: 1, col: 1, month: 1, year: 1 }, { unique: true });

const RentPayment = mongoose.model('RentPayment', rentPaymentSchema);
export default RentPayment;
