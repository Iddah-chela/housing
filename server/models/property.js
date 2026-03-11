import mongoose from "mongoose";

const cellSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['empty', 'room', 'common'],
    default: 'empty'
  },
  roomType: String,
  pricePerMonth: Number,
  amenities: [String],
  isVacant: Boolean,
  isBooked: { type: Boolean, default: false }
}, { _id: false });

const buildingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  rows: {
    type: Number,
    required: true
  },
  cols: {
    type: Number,
    required: true
  },
  grid: [[cellSchema]], // 2D array of cells
  gatePosition: {
    row: Number,
    col: Number,
    side: { type: String, enum: ['top', 'bottom', 'left', 'right'], default: 'bottom' }
  }
}, { _id: false });

const propertySchema = new mongoose.Schema({
  owner: {
    type: String,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  whatsappNumber: {
    type: String
  },
  place: {
    type: String,
    required: true
  },
  estate: {
    type: String,
    required: true
  },
  propertyType: {
    type: String,
    required: true
  },
  googleMapsUrl: {
    type: String,
    default: ''
  },
  buildings: [buildingSchema],
  images: [String], // Cloudinary URLs
  compoundGate: {
    side: { type: String, enum: ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'], default: 'bottom' },
    layout: { type: String, enum: ['row', 'col'], default: 'row' }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  totalRooms: {
    type: Number,
    default: 0
  },
  vacantRooms: {
    type: Number,
    default: 0
  },
  // ── Freshness / Trust fields ─────────────────────────────────────────
  lastVerifiedAt: {
    type: Date,
    default: null   // null = never verified by landlord
  },
  isExpired: {
    type: Boolean,
    default: false  // auto-set true after 30 days without refresh
  },
  needsRefresh: {
    type: Boolean,
    default: false  // warn after 14 days without refresh
  },
  // ── Caretaker emails ──────────────────────────────────────────────────
  caretakers: {
    type: [String],   // array of email addresses
    default: []
  },
  // ── Admin-managed listings (landlord doesn't have an account) ─────────
  landlordName: {
    type: String,
    default: ''       // shown to tenants who unlock contact info, instead of owner username
  },
  // ── Utility billing settings ──────────────────────────────────────────
  utilitySettings: {
    waterPaidBy:       { type: String, enum: ['owner', 'tenant'], default: 'tenant' },
    electricityPaidBy: { type: String, enum: ['owner', 'tenant'], default: 'tenant' },
    // Per-unit cost (optional — for token/prepay systems)
    electricityRatePerUnit: { type: Number, default: null },
    waterRatePerUnit:       { type: Number, default: null },
    // Free-text reminder that gets prepended to all utility reminders sent
    reminderNote: { type: String, default: '', maxlength: 300 }
  }
}, { timestamps: true });

// Calculate total rooms and vacancy before saving
propertySchema.pre('save', function(next) {
  let totalRooms = 0;
  let vacantRooms = 0;
  
  this.buildings.forEach(building => {
    building.grid.forEach(row => {
      row.forEach(cell => {
        if (cell.type === 'room') {
          totalRooms++;
          if (cell.isVacant && !cell.isBooked) {
            vacantRooms++;
          }
        }
      });
    });
  });
  
  this.totalRooms = totalRooms;
  this.vacantRooms = vacantRooms;
  next();
});

const Property = mongoose.model("Property", propertySchema);

export default Property;
