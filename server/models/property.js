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
  isBooked: { type: Boolean, default: false },
  isMoveOutSoon: { type: Boolean, default: false },
  availableFrom: { type: Date, default: null }
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
  amenities: {
    type: [String],
    default: []
  },
  listedRentMin: {
    type: Number,
    default: null
  },
  listedRentMax: {
    type: Number,
    default: null
  },
  declaredUnits: {
    type: Number,
    default: null
  },
  listingTier: {
    type: String,
    enum: ['directory', 'claimed', 'live'],
    default: 'live',
    index: true
  },
  listingState: {
    type: String,
    enum: ['active', 'stale', 'archived', 'removed'],
    default: 'active',
    index: true
  },
  vacancyStatus: {
    type: String,
    enum: ['available', 'limited', 'full', 'unknown'],
    default: 'unknown',
    index: true
  },
  actionability: {
    type: String,
    enum: ['info_only', 'inquiry_only', 'full_transaction'],
    default: 'full_transaction'
  },
  sourceType: {
    type: String,
    enum: ['field_list', 'landlord_submitted', 'caretaker_submitted', 'community_submitted'],
    default: 'landlord_submitted'
  },
  sourceCollectedAt: {
    type: Date,
    default: null
  },
  lastConfirmedAt: {
    type: Date,
    default: null
  },
  hasImages: {
    type: Boolean,
    default: false
  },
  hasRoomLevelData: {
    type: Boolean,
    default: true
  },
  dataCompletenessScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isClaimed: {
    type: Boolean,
    default: false
  },
  claimStatus: {
    type: String,
    enum: ['none', 'pending', 'verified', 'rejected'],
    default: 'none'
  },
  contactDisplayMode: {
    type: String,
    enum: ['hidden', 'masked', 'public'],
    default: 'public'
  },
  consentStatus: {
    type: String,
    enum: ['unknown', 'implied', 'explicit'],
    default: 'unknown'
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
  
  (this.buildings || []).forEach(building => {
    (building.grid || []).forEach(row => {
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

  const hasImages = Array.isArray(this.images) && this.images.length > 0;
  this.hasImages = hasImages;

  const hasRoomLevelData = Array.isArray(this.buildings) && this.buildings.some(
    (building) => Array.isArray(building.grid) && building.grid.some(
      (row) => Array.isArray(row) && row.some((cell) => cell.type === 'room')
    )
  );
  this.hasRoomLevelData = hasRoomLevelData;

  // Keep listing state aligned with freshness flags.
  if (this.isExpired) {
    this.listingState = 'archived';
  } else if (this.needsRefresh) {
    this.listingState = 'stale';
  } else if (this.listingState !== 'removed') {
    this.listingState = 'active';
  }

  // Auto-map actionability from listing tier.
  if (this.listingTier === 'directory') this.actionability = 'info_only';
  if (this.listingTier === 'claimed') this.actionability = 'inquiry_only';
  if (this.listingTier === 'live') this.actionability = 'full_transaction';

  // Auto-derive vacancy status for live listings from room counts when possible.
  if (this.listingTier === 'live' && hasRoomLevelData) {
    if (vacantRooms > 3) this.vacancyStatus = 'available';
    else if (vacantRooms > 0) this.vacancyStatus = 'limited';
    else this.vacancyStatus = 'full';
  } else if (!this.vacancyStatus) {
    this.vacancyStatus = 'unknown';
  }

  // Lightweight completeness score for ranking/ops decisions.
  const score =
    (hasImages ? 30 : 0) +
    (this.vacancyStatus !== 'unknown' ? 25 : 0) +
    (hasRoomLevelData ? 20 : 0) +
    (this.claimStatus === 'verified' ? 15 : 0) +
    (this.lastConfirmedAt ? 10 : 0);
  this.dataCompletenessScore = Math.max(0, Math.min(100, score));

  next();
});

const Property = mongoose.model("Property", propertySchema);

export default Property;
