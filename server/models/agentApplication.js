import mongoose from 'mongoose';

const agentApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: String, // Clerk user ID
      required: true,
      index: true,
      unique: true, // One application per user
    },
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    
    // Agent-specific info
    yearsExperience: {
      type: Number,
      required: true,
      min: 0,
    },
    areasServed: [String], // e.g., ['Westlands', 'Karen', 'Kilimani']
    referenceLink: String, // Portfolio/LinkedIn/website
    bio: {
      type: String,
      maxlength: 500,
    },
    
    // Application tracking
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: String,
    reviewedBy: {
      type: String, // Clerk user ID of admin who reviewed
    },
    reviewedAt: Date,
    // Set when welcome email/push was sent (so backfill won't spam twice)
    welcomeNotifiedAt: Date,

    // Metadata
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('AgentApplication', agentApplicationSchema);
