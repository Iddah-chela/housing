import mongoose from "mongoose";

// Tracks per-room water/electricity readings and billing each month.
// Caretakers and owners can record meter readings and mark costs as paid/unpaid.

const utilityEntrySchema = new mongoose.Schema({
  property: {
    type: String,
    ref: 'Property',
    required: true,
    index: true
  },
  buildingId: {
    type: String,
    required: true
  },
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  type: {
    type: String,
    enum: ['electricity', 'water'],
    required: true
  },
  month: { type: Number, required: true, min: 1, max: 12 },
  year:  { type: Number, required: true },
  // Meter readings (optional — useful for post-pay shared utilities)
  previousReading: { type: Number, default: null },
  currentReading:  { type: Number, default: null },
  unitsUsed: {
    type: Number,
    default: null
    // auto-computed on save if both readings are present
  },
  // Amount owed by tenant for this room this month
  amountDue:  { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  paidAt: { type: Date, default: null },
  note: { type: String, default: '', maxlength: 300 },
  recordedBy: { type: String, ref: 'User' }
}, { timestamps: true });

// One record per room per utility type per month/year
utilityEntrySchema.index(
  { property: 1, buildingId: 1, row: 1, col: 1, type: 1, month: 1, year: 1 },
  { unique: true }
);

// Auto-compute unitsUsed and status before save
utilityEntrySchema.pre('save', function (next) {
  if (this.previousReading !== null && this.currentReading !== null) {
    this.unitsUsed = Math.max(0, this.currentReading - this.previousReading);
  }
  if (this.amountDue > 0) {
    if (this.amountPaid >= this.amountDue) this.status = 'paid';
    else if (this.amountPaid > 0) this.status = 'partial';
    else this.status = 'unpaid';
  }
  next();
});

const UtilityEntry = mongoose.model('UtilityEntry', utilityEntrySchema);
export default UtilityEntry;
