import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140,
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4000,
  },
  audience: {
    type: String,
    enum: ['all', 'users', 'houseOwner', 'caretaker', 'admin', 'specific'],
    default: 'all',
    index: true,
  },
  recipientIds: {
    type: [String],
    default: [],
  },
  recipientEmails: {
    type: [String],
    default: [],
  },
  channels: {
    type: [String],
    enum: ['inApp', 'push', 'email', 'banner'],
    default: ['inApp'],
  },
  bannerStyle: {
    type: String,
    enum: ['info', 'general', 'critical'],
    default: 'info',
  },
  type: {
    type: String,
    enum: ['info', 'update', 'warning', 'critical', 'general'],
    default: 'info',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  ctaLabel: {
    type: String,
    default: '',
    maxlength: 80,
  },
  ctaUrl: {
    type: String,
    default: '',
    maxlength: 1024,
  },
  expiresAt: {
    type: Date,
    default: null,
    index: true,
  },
  active: {
    type: Boolean,
    default: true,
    index: true,
  },
  killedAt: {
    type: Date,
    default: null,
  },
  killedBy: {
    type: String,
    ref: 'User',
    default: null,
  },
  createdBy: {
    type: String,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: String,
    ref: 'User',
    default: null,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  lastSentAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;
