import mongoose from 'mongoose';

const propertyClaimSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  },
  claimant: {
    type: String,
    ref: 'User',
    required: true,
    index: true,
  },
  claimantEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  claimantName: {
    type: String,
    required: true,
    trim: true,
  },
  claimRole: {
    type: String,
    enum: ['owner', 'caretaker'],
    required: true,
  },
  claimPhone: {
    type: String,
    default: '',
    trim: true,
  },
  landlordPhone: {
    type: String,
    default: '',
    trim: true,
  },
  landlordEmail: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  evidenceUrls: {
    type: [String],
    default: [],
  },
  claimNotes: {
    type: String,
    default: '',
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'more_info_required'],
    default: 'pending',
    index: true,
  },
  reviewNote: {
    type: String,
    default: '',
    maxlength: 1000,
  },
  reviewedBy: {
    type: String,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Allow only one active pending claim per property to reduce conflicts.
propertyClaimSchema.index(
  { property: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

const PropertyClaim = mongoose.model('PropertyClaim', propertyClaimSchema);

export default PropertyClaim;
