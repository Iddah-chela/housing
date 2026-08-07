import mongoose from 'mongoose';

const caretakerApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: String, // Clerk user ID
      required: true,
      index: true,
      unique: true,
    },
    firstName: String,
    lastName: String,
    email: String,
    phone: {
      type: String,
      required: true,
    },
    idNumber: {
      type: String,
      required: true,
    },
    idDocument: {
      type: String, // Cloudinary URL
      required: true,
    },
    yearsExperience: {
      type: Number,
      required: true,
      min: 0,
    },
    areasManaged: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: String,
    reviewedBy: String,
    reviewedAt: Date,
    welcomeNotifiedAt: Date,
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('CaretakerApplication', caretakerApplicationSchema);
