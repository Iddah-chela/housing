import mongoose from 'mongoose';

/**
 * Approved caretaker asks to manage an existing listing.
 * Property owner (landlord) approves or declines.
 */
const caretakerManageRequestSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    requester: {
      type: String, // Clerk user ID
      required: true,
      index: true,
    },
    requesterEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    requesterName: {
      type: String,
      default: '',
    },
    requesterPhone: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending',
      index: true,
    },
    reviewedAt: Date,
    reviewedBy: String, // owner user id
  },
  { timestamps: true }
);

caretakerManageRequestSchema.index(
  { property: 1, requester: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model('CaretakerManageRequest', caretakerManageRequestSchema);
