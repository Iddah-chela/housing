import Announcement from '../models/announcement.js';
import Notification from '../models/notification.js';
import Property from '../models/property.js';
import User from '../models/user.js';
import Booking from '../models/booking.js';
import Report from '../models/report.js';
import cloudinary from '../config/cloudinary.js';
import { sendEmail } from '../utils/mailer.js';
import { sendPushNotification } from '../utils/pushNotifier.js';

const uploadToCloudinary = async (file, folder) => {
  if (!file) return '';
  const result = await cloudinary.uploader.upload(file.path, { folder });
  return result.secure_url;
};

const normalizeChannels = (channels) => {
  if (Array.isArray(channels)) return channels.filter(Boolean);
  if (typeof channels === 'string') {
    try {
      const parsed = JSON.parse(channels);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return channels.split(',').map((value) => value.trim()).filter(Boolean);
    }
  }
  return ['inApp'];
};

const normalizeTokens = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildDefaultWhatsAppMessage = ({ title, body }) => {
  const safeTitle = String(title || '').trim();
  const safeBody = String(body || '').trim();
  const bodySnippet = safeBody ? safeBody.slice(0, 180) : '';
  return [
    'Hello, I saw this announcement on PataKeja.',
    safeTitle ? `Title: ${safeTitle}` : '',
    bodySnippet ? `Message: ${bodySnippet}` : '',
  ].filter(Boolean).join('\n');
};

const normalizeWhatsAppComposeUrl = ({ value, title, body }) => {
  const raw = String(value || '').trim();
  const fallbackMessage = buildDefaultWhatsAppMessage({ title, body });
  let message = '';

  if (raw) {
    const looksLikePhoneNumber = /^[+()\d\s-]+$/.test(raw);

    if (!looksLikePhoneNumber) {
      try {
        const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        const host = parsed.hostname.toLowerCase();
        if (host.includes('wa.me') || host.includes('whatsapp.com') || host.includes('api.whatsapp.com')) {
          const extractedText = parsed.searchParams.get('text');
          message = extractedText ? extractedText.trim() : '';
        } else {
          message = raw;
        }
      } catch {
        message = raw;
      }
    }
  }

  const finalMessage = (message || fallbackMessage).trim();
  return `https://wa.me/?text=${encodeURIComponent(finalMessage)}`;
};

const resolveCaretakerEmails = async () => {
  const properties = await Property.find({ caretakers: { $exists: true, $ne: [] } })
    .select('caretakers')
    .lean();

  const emailSet = new Set();
  properties.forEach((property) => {
    (property.caretakers || []).forEach((email) => {
      const normalized = String(email || '').trim().toLowerCase();
      if (normalized) emailSet.add(normalized);
    });
  });

  return Array.from(emailSet);
};

const resolveRecipients = async ({ audience, recipientTokens }) => {
  const normalizedAudience = String(audience || 'all').trim();
  const tokens = normalizeTokens(recipientTokens);

  if (normalizedAudience === 'specific' && tokens.length === 0) {
    throw new Error('Provide at least one user ID or email for specific recipients');
  }

  if (normalizedAudience === 'all') {
    return await User.find().select('_id username email role image').lean();
  }

  if (normalizedAudience === 'users') {
    return await User.find({ role: 'user' }).select('_id username email role image').lean();
  }

  if (normalizedAudience === 'houseOwner') {
    return await User.find({ role: 'houseOwner' }).select('_id username email role image').lean();
  }

  if (normalizedAudience === 'admin') {
    return await User.find({ role: 'admin' }).select('_id username email role image').lean();
  }

  if (normalizedAudience === 'caretaker') {
    const caretakerEmails = await resolveCaretakerEmails();
    if (!caretakerEmails.length) return [];
    return await User.find({ email: { $in: caretakerEmails } }).select('_id username email role image').lean();
  }

  if (normalizedAudience === 'specific') {
    const ids = tokens.filter((value) => !value.includes('@'));
    const emails = tokens.filter((value) => value.includes('@')).map((value) => value.toLowerCase());

    const usersById = ids.length
      ? await User.find({ _id: { $in: ids } }).select('_id username email role image').lean()
      : [];
    const usersByEmail = emails.length
      ? await User.find({ email: { $in: emails } }).select('_id username email role image').lean()
      : [];

    const map = new Map();
    [...usersById, ...usersByEmail].forEach((user) => {
      if (user?._id) map.set(String(user._id), user);
    });
    return Array.from(map.values());
  }

  throw new Error('Unsupported audience selection');
};

const deliverAnnouncement = async ({ announcement, recipients, sendEmailToRecipients = true }) => {
  let sentCount = 0;
  const expiresAt = announcement.expiresAt || undefined;
  const bannerUrl = announcement.ctaUrl || '/';

  for (const recipient of recipients) {
    if (!recipient?._id || !recipient.email) continue;

    if (announcement.channels.includes('inApp') || announcement.channels.includes('push')) {
      await sendPushNotification(recipient._id, {
        broadcastId: String(announcement._id),
        title: announcement.title,
        body: announcement.body,
        url: bannerUrl,
        type: 'system',
        channel: announcement.channels.includes('push') ? 'push' : 'inApp',
        style: announcement.bannerStyle,
        imageUrl: announcement.imageUrl || '',
        linkLabel: announcement.linkLabel || '',
        linkUrl: announcement.linkUrl || '',
        linkType: announcement.linkType || 'regular',
        expiresAt,
      });
    }

    if (sendEmailToRecipients && announcement.channels.includes('email')) {
      const ctaButton = announcement.ctaLabel ? `<a href="${bannerUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;margin-right:12px;">${announcement.ctaLabel}</a>` : '';
      const linkButton = announcement.linkLabel ? `<a href="${announcement.linkUrl}" style="display:inline-block;background:${announcement.linkType === 'whatsapp' ? '#25d366' : '#4f46e5'};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">${announcement.linkLabel}</a>` : '';
      const buttonGroup = ctaButton || linkButton ? `<div style="margin-top:20px;">${ctaButton}${linkButton}</div>` : '';
      
      await sendEmail(
        recipient.email,
        announcement.title,
        `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222;">
          <div style="padding:24px;border-radius:12px;background:${announcement.bannerStyle === 'critical' ? '#fee2e2' : announcement.bannerStyle === 'general' ? '#eff6ff' : '#ecfeff'};border:1px solid ${announcement.bannerStyle === 'critical' ? '#fca5a5' : announcement.bannerStyle === 'general' ? '#bfdbfe' : '#a5f3fc'};">
            ${announcement.imageUrl ? `<img src="${announcement.imageUrl}" alt="${announcement.title}" style="max-width:100%;border-radius:12px;margin-bottom:16px;" />` : ''}
            <h2 style="margin:0 0 12px;font-size:22px;">${announcement.title}</h2>
            <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${announcement.body}</p>
            ${buttonGroup}
          </div>
        </div>`
      );
    }

    sentCount++;
  }

  await Announcement.findByIdAndUpdate(announcement._id, {
    sentCount,
    lastSentAt: new Date(),
  });

  return sentCount;
};

export const getActiveAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      active: true,
      channels: 'banner',
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({ success: true, announcements });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, announcements });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const imageFile = req.file;
    const imageUrl = imageFile ? await uploadToCloudinary(imageFile, 'announcements') : String(req.body.imageUrl || '').trim();
    const channels = normalizeChannels(req.body.channels);
    const recipients = await resolveRecipients({
      audience: req.body.audience,
      recipientTokens: req.body.recipientTokens,
    });

    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    const linkType = String(req.body.linkType || 'regular').trim();
    let linkUrl = String(req.body.linkUrl || '').trim();

    // For WhatsApp links, always open compose mode without preselecting a number.
    if (linkType === 'whatsapp') {
      linkUrl = normalizeWhatsAppComposeUrl({
        value: linkUrl,
        title: req.body.title,
        body: req.body.body,
      });
    }

    const announcement = await Announcement.create({
      title: String(req.body.title || '').trim(),
      body: String(req.body.body || '').trim(),
      audience: req.body.audience || 'all',
      recipientIds: recipients.map((user) => String(user._id)),
      recipientEmails: recipients.map((user) => String(user.email || '').toLowerCase()),
      channels,
      bannerStyle: req.body.bannerStyle || 'info',
      type: req.body.type || 'info',
      imageUrl,
      ctaLabel: String(req.body.ctaLabel || '').trim(),
      ctaUrl: String(req.body.ctaUrl || '').trim(),
      linkLabel: String(req.body.linkLabel || '').trim(),
      linkUrl,
      linkType,
      expiresAt,
      active: true,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await deliverAnnouncement({ announcement, recipients });

    res.json({ success: true, announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { announcementId } = req.params;
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const imageFile = req.file;
    const imageUrl = imageFile ? await uploadToCloudinary(imageFile, 'announcements') : req.body.imageUrl;
    const channels = req.body.channels ? normalizeChannels(req.body.channels) : announcement.channels;
    const audience = req.body.audience || announcement.audience;
    const recipientTokens = req.body.recipientTokens ?? announcement.recipientEmails;
    const recipients = await resolveRecipients({ audience, recipientTokens });

    const linkType = req.body.linkType ?? announcement.linkType;
    let linkUrl = req.body.linkUrl ?? announcement.linkUrl;

    // For WhatsApp links, always open compose mode without preselecting a number.
    if (linkType === 'whatsapp') {
      linkUrl = normalizeWhatsAppComposeUrl({
        value: linkUrl,
        title: req.body.title ?? announcement.title,
        body: req.body.body ?? announcement.body,
      });
    }

    announcement.title = req.body.title ?? announcement.title;
    announcement.body = req.body.body ?? announcement.body;
    announcement.audience = audience;
    announcement.recipientIds = recipients.map((user) => String(user._id));
    announcement.recipientEmails = recipients.map((user) => String(user.email || '').toLowerCase());
    announcement.channels = channels;
    announcement.bannerStyle = req.body.bannerStyle ?? announcement.bannerStyle;
    announcement.type = req.body.type ?? announcement.type;
    announcement.imageUrl = typeof imageUrl === 'string' ? imageUrl : announcement.imageUrl;
    announcement.ctaLabel = req.body.ctaLabel ?? announcement.ctaLabel;
    announcement.ctaUrl = req.body.ctaUrl ?? announcement.ctaUrl;
    announcement.linkLabel = req.body.linkLabel ?? announcement.linkLabel;
    announcement.linkUrl = linkUrl;
    announcement.linkType = linkType;
    announcement.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : announcement.expiresAt;
    announcement.active = req.body.active === undefined ? announcement.active : String(req.body.active) === 'true';
    if (announcement.active) {
      announcement.killedAt = null;
      announcement.killedBy = null;
    }
    announcement.updatedBy = req.user._id;
    await announcement.save();

    const notificationSet = {
      title: announcement.title,
      body: announcement.body,
      url: announcement.ctaUrl || '/',
      channel: announcement.channels.includes('push') ? 'push' : 'inApp',
      style: announcement.bannerStyle,
      imageUrl: announcement.imageUrl || '',
      expiresAt: announcement.expiresAt || undefined,
    };

    if (announcement.active) {
      notificationSet.revokedAt = null;
    }

    await Notification.updateMany(
      announcement.active
        ? { broadcastId: String(announcement._id) }
        : { broadcastId: String(announcement._id), revokedAt: null },
      { $set: notificationSet }
    );

    res.json({ success: true, announcement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { announcementId } = req.params;
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    announcement.active = false;
    announcement.killedAt = new Date();
    announcement.killedBy = req.user._id;
    announcement.updatedBy = req.user._id;
    await announcement.save();

    await Notification.updateMany(
      { broadcastId: String(announcement._id) },
      { $set: { revokedAt: new Date() } }
    );

    res.json({ success: true, message: 'Announcement deleted (can be restored by editing and updating)' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteAnnouncementForever = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { announcementId } = req.params;
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await Notification.deleteMany({ broadcastId: String(announcement._id) });
    await Announcement.findByIdAndDelete(announcement._id);

    res.json({ success: true, message: 'Announcement permanently deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const previewAnnouncementRecipients = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const recipients = await resolveRecipients({
      audience: req.query.audience,
      recipientTokens: req.query.recipientTokens,
    });

    res.json({
      success: true,
      count: recipients.length,
      sample: recipients.slice(0, 5),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
