import AgentVacancy from '../models/agentVacancy.js';
import AgentLead from '../models/agentLead.js';
import AgentChat from '../models/agentChat.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs/promises';
import { hasRole } from '../utils/roleUtils.js';
import User from '../models/user.js';
import { sendEmail } from '../utils/mailer.js';
import { resolveCoordinates, normalizeCoordinates, mapsUrlFromLocation } from '../utils/geoUtils.js';
import {
  buildPublicAgentReputation,
  agentReputationSelect,
  agentReputationScore,
} from '../utils/agentReputation.js';
import { sendPushNotification } from '../utils/pushNotifier.js';

const toUserId = (value) => value?.toString?.() || String(value || '');

const farFutureDate = () => new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);

const uploadAgentMedia = async (file, folder) => {
  if (!file) return null;
  console.info('[AgentUpload] starting upload', {
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    folder,
  });
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
    });

    console.info('[AgentUpload] cloudinary response', {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });

    await fs.unlink(file.path).catch((e) => {
      console.warn('[AgentUpload] failed to unlink temp file', file.path, e?.message || e);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnail: result.resource_type === 'video' ? result.thumbnail_url || '' : '',
      resourceType: result.resource_type,
    };
  } catch (err) {
    console.error('[AgentUpload] cloudinary upload failed', {
      filename: file.originalname,
      mimetype: file.mimetype,
      path: file.path,
      error: err?.message || err,
    });
    // Attempt to remove temp file even on failure
    await fs.unlink(file.path).catch(() => {});
    throw err;
  }
};

export const uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    const mediaType = String(req.body?.mediaType || '').toLowerCase();

    console.info('[AgentUpload] request', {
      userId: req.user?._id,
      contentType: req.headers['content-type'] || req.headers['Content-Type'],
      bodyKeys: Object.keys(req.body || {}),
      hasFile: !!file,
    });

    if (!file) {
      console.warn('[AgentUpload] no file in request');
      return res.status(400).json({ message: 'No file provided' });
    }

    const folder = mediaType === 'video' || file.mimetype.startsWith('video/')
      ? 'agent_vacancies/videos'
      : 'agent_vacancies/photos';

    try {
      const media = await uploadAgentMedia(file, folder);
      return res.json({ success: true, media });
    } catch (err) {
      console.error('[AgentUpload] uploadAgentMedia threw', err?.message || err);
      return res.status(500).json({ success: false, message: 'Upload failed', error: err?.message || 'unknown' });
    }
  } catch (error) {
    console.error('Agent media upload error:', error?.message || error);
    return res.status(500).json({ success: false, message: error?.message || 'Agent upload error' });
  }
};

// POST: Create a new vacancy
export const postVacancy = async (req, res) => {
  try {
    const {
      title,
      location,
      rent,
      roomType,
      availableRooms,
      description,
      amenities,
      photos,
      videos,
      buildings,
      googleMapsUrl,
      moveInDate,
      availabilityFrom,
      availabilityTo,
      minBookingLeadDays,
      contactPhone,
      whatsappNumber,
    } = req.body;

    const agentId = toUserId(req.user._id);

    if (!location?.area || !location?.city || !rent?.min || !rent?.max || !roomType || !availableRooms) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (Number(rent.min) < 0 || Number(rent.max) < 0 || Number(rent.min) > Number(rent.max)) {
      return res.status(400).json({ message: 'Invalid rent range' });
    }

    if (Number(availableRooms) < 1) {
      return res.status(400).json({ message: 'Available rooms must be at least 1' });
    }

    const resolvedCoords = resolveCoordinates({
      coordinates: location?.coordinates,
      googleMapsUrl,
    });
    if (!resolvedCoords) {
      return res.status(400).json({
        message: 'Please drop an accurate map pin for this vacancy. Exact location is shared only after a viewing is confirmed.',
      });
    }
    const locationPayload = {
      area: location.area,
      city: location.city,
      coordinates: resolvedCoords,
    };

    // Parse buildings if provided as JSON string
    let parsedBuildings = [];
    if (buildings) {
      try {
        parsedBuildings = typeof buildings === 'string' ? (buildings.trim() ? JSON.parse(buildings) : []) : buildings;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid buildings JSON' });
      }
    }

    const vacancy = new AgentVacancy({
      agent: agentId,
      title: String(title || '').trim(),
      location: locationPayload,
      rent: {
        min: Number(rent.min),
        max: Number(rent.max),
      },
      roomType,
      availableRooms: Number(availableRooms),
      description: description || '',
      amenities: amenities || [],
      photos: photos || [],
      videos: videos || [],
      buildings: parsedBuildings,
      googleMapsUrl: String(googleMapsUrl || '').trim() || mapsUrlFromLocation({ coordinates: resolvedCoords }) || '',
      moveInDate: moveInDate ? new Date(moveInDate) : undefined,
      availabilityFrom: availabilityFrom ? new Date(availabilityFrom) : undefined,
      availabilityTo: availabilityTo ? new Date(availabilityTo) : undefined,
      minBookingLeadDays: Number.isFinite(Number(minBookingLeadDays)) ? Number(minBookingLeadDays) : 2,
      contactPhone: String(contactPhone || '').trim(),
      whatsappNumber: String(whatsappNumber || '').trim(),
      expiresAt: farFutureDate(),
    });

    await vacancy.save();

    res.status(201).json({
      message: 'Vacancy posted successfully',
      vacancy,
    });
  } catch (error) {
    console.error('Error posting vacancy:', error);
    res.status(500).json({ message: 'Error posting vacancy', error: error.message });
  }
};

// GET: Get all agent's vacancies
export const getAgentVacancies = async (req, res) => {
  try {
    const agentId = toUserId(req.user._id);
    const { status = 'all', page = 1, limit = 10 } = req.query;

    const query = { agent: agentId };
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const skip = (Number(page) - 1) * Number(limit);
    const vacancies = await AgentVacancy.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AgentVacancy.countDocuments(query);

    res.json({
      vacancies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching agent vacancies:', error);
    res.status(500).json({ message: 'Error fetching vacancies', error: error.message });
  }
};

// GET: Get single vacancy by ID
export const getVacancyById = async (req, res) => {
  try {
    const vacancy = await AgentVacancy.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate('agent', 'firstName lastName email phone');

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    res.json(vacancy);
  } catch (error) {
    console.error('Error fetching vacancy:', error);
    res.status(500).json({ message: 'Error fetching vacancy', error: error.message });
  }
};

// GET: Agent-only vacancy details for management/editing (includes inactive/old records)
export const getVacancyForAgent = async (req, res) => {
  try {
    const vacancy = await AgentVacancy.findById(req.params.id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    const agentId = toUserId(req.user._id);
    const ownerId = toUserId(vacancy.agent?._id || vacancy.agent);
    if (ownerId !== agentId && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized to access this vacancy' });
    }

    return res.json(vacancy);
  } catch (error) {
    console.error('Error fetching agent vacancy:', error);
    return res.status(500).json({ message: 'Error fetching vacancy', error: error.message });
  }
};

// PUT: Update vacancy
export const updateVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);
    const { title, location, rent, roomType, availableRooms, description, amenities, photos, videos, buildings, googleMapsUrl, moveInDate, availabilityFrom, availabilityTo, minBookingLeadDays } = req.body;

    const vacancy = await AgentVacancy.findById(id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    if (vacancy.agent.toString() !== agentId.toString() && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized to update this vacancy' });
    }

    if (location) {
      const resolvedCoords = resolveCoordinates({
        coordinates: location.coordinates !== undefined
          ? location.coordinates
          : vacancy.location?.coordinates,
        googleMapsUrl: googleMapsUrl !== undefined ? googleMapsUrl : vacancy.googleMapsUrl,
      });
      if (!resolvedCoords) {
        return res.status(400).json({
          message: 'Please drop an accurate map pin for this vacancy. Exact location is shared only after a viewing is confirmed.',
        });
      }
      vacancy.location = {
        area: location.area ?? vacancy.location?.area,
        city: location.city ?? vacancy.location?.city,
        coordinates: resolvedCoords,
      };
    } else if (googleMapsUrl !== undefined) {
      const resolvedCoords = resolveCoordinates({
        coordinates: vacancy.location?.coordinates,
        googleMapsUrl,
      });
      if (!resolvedCoords) {
        return res.status(400).json({
          message: 'Please drop an accurate map pin for this vacancy. Exact location is shared only after a viewing is confirmed.',
        });
      }
      vacancy.location = {
        ...(vacancy.location?.toObject?.() || vacancy.location || {}),
        coordinates: resolvedCoords,
      };
    }
    if (title !== undefined) vacancy.title = String(title || '').trim();
    if (rent) {
      if (Number(rent.min) < 0 || Number(rent.max) < 0 || Number(rent.min) > Number(rent.max)) {
        return res.status(400).json({ message: 'Invalid rent range' });
      }
      vacancy.rent = { min: Number(rent.min), max: Number(rent.max) };
    }
    if (roomType) vacancy.roomType = roomType;
    if (availableRooms !== undefined) {
      if (Number(availableRooms) < 1) {
        return res.status(400).json({ message: 'Available rooms must be at least 1' });
      }
      vacancy.availableRooms = Number(availableRooms);
    }
    if (description !== undefined) vacancy.description = description;
    if (amenities) vacancy.amenities = amenities;
    if (photos) vacancy.photos = photos;
    if (videos) vacancy.videos = videos;
    if (googleMapsUrl !== undefined) vacancy.googleMapsUrl = String(googleMapsUrl || '').trim();
    if (buildings !== undefined) {
      try {
        vacancy.buildings = typeof buildings === 'string' ? (buildings.trim() ? JSON.parse(buildings) : []) : buildings;
      } catch (e) {
        return res.status(400).json({ message: 'Invalid buildings JSON' });
      }
    }
    if (moveInDate !== undefined) vacancy.moveInDate = moveInDate ? new Date(moveInDate) : undefined;
    if (availabilityFrom !== undefined) vacancy.availabilityFrom = availabilityFrom ? new Date(availabilityFrom) : undefined;
    if (availabilityTo !== undefined) {
      vacancy.availabilityTo = availabilityTo ? new Date(availabilityTo) : undefined;
    }
    if (minBookingLeadDays !== undefined) vacancy.minBookingLeadDays = Number(minBookingLeadDays);
    if (req.body.contactPhone !== undefined) vacancy.contactPhone = String(req.body.contactPhone || '').trim();
    if (req.body.whatsappNumber !== undefined) vacancy.whatsappNumber = String(req.body.whatsappNumber || '').trim();

    // Editing a vacancy should also refresh/reactivate it like a landlord listing.
    vacancy.isActive = true;
    vacancy.status = 'open';
    vacancy.contactedAt = null;
    vacancy.expiresAt = farFutureDate();

    await vacancy.save();
    res.json({ message: 'Vacancy updated successfully', vacancy });
  } catch (error) {
    console.error('Error updating vacancy:', error);
    res.status(500).json({ message: 'Error updating vacancy', error: error.message });
  }
};

// DELETE: Deactivate vacancy (soft delete)
export const deleteVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);

    const vacancy = await AgentVacancy.findById(id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    if (toUserId(vacancy.agent) !== agentId && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized to delete this vacancy' });
    }

    vacancy.isActive = false;
    await vacancy.save();

    res.json({ message: 'Vacancy deactivated successfully' });
  } catch (error) {
    console.error('Error deleting vacancy:', error);
    res.status(500).json({ message: 'Error deleting vacancy', error: error.message });
  }
};

// PUT: Refresh/re-open a vacancy back to active/open
export const reopenVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);

    const vacancy = await AgentVacancy.findById(id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    if (toUserId(vacancy.agent) !== agentId && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    vacancy.isActive = true;
    vacancy.status = 'open';
    vacancy.contactedAt = null;
    vacancy.expiresAt = farFutureDate();
    await vacancy.save();
    res.json({ message: 'Vacancy refreshed successfully', vacancy });
  } catch (error) {
    console.error('Error reopening vacancy:', error);
    res.status(500).json({ message: 'Error refreshing vacancy', error: error.message });
  }
};

// PUT: Mark vacancy as occupied (removes from feed, sets status to occupied)
export const markVacancyOccupied = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);

    const vacancy = await AgentVacancy.findById(id);

    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    if (toUserId(vacancy.agent) !== agentId && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    vacancy.isActive = false;
    vacancy.status = 'occupied';
    await vacancy.save();

    res.json({ message: 'Vacancy marked as occupied', vacancy });
  } catch (error) {
    console.error('Error marking vacancy as occupied:', error);
    res.status(500).json({ message: 'Error marking vacancy as occupied', error: error.message });
  }
};

// GET: Get all leads for agent
export const getAgentLeads = async (req, res) => {
  try {
    const agentId = toUserId(req.user._id);
    const { status = 'all', page = 1, limit = 10, unreadOnly = false } = req.query;

    const query = { agent: agentId };
    if (status !== 'all') {
      query.status = status;
    }
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const leads = await AgentLead.find(query)
      .populate('student', 'username email phoneNumber image')
      .populate('vacancy', 'title roomType rent location availabilityFrom availabilityTo minBookingLeadDays')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AgentLead.countDocuments(query);

    // Also fetch anonymized agent chats and merge into the results so agents see chats alongside leads
    const chatQuery = { agent: agentId };
    if (unreadOnly === 'true') {
      chatQuery['messages.read'] = false; // simplistic unread filter
    }
    const chats = await AgentChat.find(chatQuery)
      .populate('tenant', 'username email phoneNumber image')
      .populate('vacancy', 'title roomType rent location')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Map chats into a unified shape similar to leads so frontend can render both
    const chatItems = chats.map((c) => ({
      _id: `chat_${c._id}`,
      type: 'chat',
      chat: c,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    const leadItems = leads.map((l) => ({
      _id: l._id,
      type: 'lead',
      lead: l,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));

    // Merge and sort by updatedAt desc
    const merged = [...leadItems, ...chatItems].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    console.log('[agentController] getAgentLeads returning', leadItems.length, 'leads and', chatItems.length, 'chats');
    chatItems.forEach(item => console.log('[agentController] chat item:', item._id, 'actual _id:', item.chat._id));

    res.json({
      leads: merged,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching agent leads:', error);
    res.status(500).json({ message: 'Error fetching leads', error: error.message });
  }
};

// GET: Get single lead
export const getLeadById = async (req, res) => {
  try {
    console.log('[agentController] getLeadById request id=', req.params.id);
    const lead = await AgentLead.findById(req.params.id)
      .populate('student', 'username email phoneNumber image')
      .populate('vacancy', 'title roomType rent location description amenities photos availabilityFrom availabilityTo minBookingLeadDays')
      .populate('agent', 'username email phoneNumber');

    if (!lead) {
      console.warn('[agentController] lead not found for id=', req.params.id);
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.agent.toString() !== req.user._id.toString() && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized to view this lead' });
    }

    if (!lead.isRead) {
      lead.isRead = true;
      await lead.save();
    }

    console.log('[agentController] returning lead id=', lead._id);
    res.json({ success: true, lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    // Include stack trace in logs and return concise message for client
    console.error(error.stack);
    res.status(500).json({ message: 'Error fetching lead', error: error.message });
  }
};

// PUT: Update lead status and add agent notes
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);
    const { status, agentNotes, contactMethod, lastContactedAt } = req.body;

    const lead = await AgentLead.findById(id).populate('vacancy');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.agent.toString() !== agentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this lead' });
    }

    const prevStatus = lead.status;
    if (status) lead.status = status;
    if (agentNotes !== undefined) lead.agentNotes = agentNotes;
    if (contactMethod) lead.contactMethod = contactMethod;
    if (lastContactedAt) lead.lastContactedAt = new Date(lastContactedAt);

    await lead.save();

    // When agent confirms a viewing appointment, unlock exact location for the tenant
    const justConfirmedViewing =
      lead.leadType === 'viewing' &&
      status === 'contacted' &&
      prevStatus !== 'contacted';

    if (justConfirmedViewing) {
      (async () => {
        try {
          const tenant = lead.student ? await User.findById(lead.student) : null;
          const vacancy = lead.vacancy;
          const mapsUrl = mapsUrlFromLocation({
            coordinates: vacancy?.location?.coordinates,
            googleMapsUrl: vacancy?.googleMapsUrl,
          });
          const listingTitle = vacancy?.title || 'the listing';
          const areaLabel = [vacancy?.location?.area, vacancy?.location?.city].filter(Boolean).join(', ');
          const agentUser = await User.findById(agentId).select('phoneNumber username').lean();
          const contactPhone = String(vacancy?.contactPhone || vacancy?.whatsappNumber || agentUser?.phoneNumber || '').trim();
          const hasPin = !!mapsUrl;

          if (tenant?.email) {
            sendEmail(
              tenant.email,
              `Viewing confirmed — ${listingTitle}`,
              `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                <div style="background:#16a34a;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                  <h2 style="color:#fff;margin:0;font-size:20px;">Viewing Confirmed</h2>
                </div>
                <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                  <p style="font-size:15px;line-height:1.6;">Your viewing for <strong>${listingTitle}</strong> has been confirmed.</p>
                  ${areaLabel ? `<p style="font-size:14px;color:#555;"><strong>Area:</strong> ${areaLabel}</p>` : ''}
                  ${lead.preferredViewingDate ? `<p style="font-size:14px;color:#555;"><strong>Date:</strong> ${new Date(lead.preferredViewingDate).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                  ${lead.preferredViewingTimeRange ? `<p style="font-size:14px;color:#555;"><strong>Time:</strong> ${lead.preferredViewingTimeRange}</p>` : ''}
                  ${contactPhone ? `<p style="font-size:14px;color:#555;"><strong>Agent contact:</strong> ${contactPhone}</p>` : ''}
                  ${hasPin
                    ? `<div style="text-align:center;margin:16px 0;"><a href="${mapsUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open exact location in Maps</a></div>`
                    : `<p style="font-size:14px;color:#555;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;">No map pin on this listing yet — use the agent contact above to get directions for your viewing.</p>`}
                  <p style="text-align:center;margin-top:12px;"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-viewings" style="color:#4F46E5;">View in My Viewings</a></p>
                </div>
              </div>`
            ).catch(() => {});
          }

          if (lead.student) {
            sendPushNotification(lead.student, {
              title: 'Viewing confirmed',
              body: hasPin
                ? `Exact location for ${listingTitle} is now available`
                : `Your viewing for ${listingTitle} is confirmed — check My Viewings for contact details`,
              url: `/my-viewings?leadId=${lead._id}`,
              tag: `agent-viewing-confirmed-${lead._id}`,
              type: 'viewing',
              style: 'success',
            }).catch(() => {});
          }
        } catch (_) {
          // ignore notification errors
        }
      })();
    }

    res.json({ message: 'Lead updated successfully', lead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ message: 'Error updating lead', error: error.message });
  }
};

// PUT: Mark lead outcome
export const markLeadOutcome = async (req, res) => {
  try {
    const { id } = req.params;
    const agentId = toUserId(req.user._id);
    const { outcome } = req.body;

    if (!outcome || !['viewed', 'booked', 'not-fit', 'no-response'].includes(outcome)) {
      return res.status(400).json({ message: 'Invalid outcome' });
    }

    const lead = await AgentLead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    if (lead.agent.toString() !== agentId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to mark outcome' });
    }

    lead.outcome = outcome;
    lead.outcomeMarkedAt = new Date();
    lead.markedBy = agentId;
    // If agent marks as booked, finalize booking inventory and ask tenant to confirm placement
    if (outcome === 'booked') {
      lead.status = 'booked';
      lead.provisionalHoldUntil = undefined;
      lead.placementConfirmStatus = 'awaiting_tenant';
      lead.placementConfirmRequestedAt = new Date();
      lead.placementNudgeCount = 0;
      await lead.save();

      try {
        const vacancy = await AgentVacancy.findById(lead.vacancy);
        if (vacancy) {
          // decrement availableRooms safely
          if (typeof vacancy.availableRooms === 'number' && vacancy.availableRooms > 0) {
            vacancy.availableRooms = Math.max(0, vacancy.availableRooms - 1);
          }

          // If this lead had roomDetails, mark that cell as booked in the buildings grid
          if (lead.roomDetails && vacancy.buildings && Array.isArray(vacancy.buildings)) {
            const bIndex = vacancy.buildings.findIndex(b => String(b.id) === String(lead.roomDetails.buildingId));
            if (bIndex !== -1) {
              const r = Number(lead.roomDetails.row || 0);
              const c = Number(lead.roomDetails.col || 0);
              if (vacancy.buildings[bIndex].grid && vacancy.buildings[bIndex].grid[r] && vacancy.buildings[bIndex].grid[r][c]) {
                vacancy.buildings[bIndex].grid[r][c].isBooked = true;
                vacancy.buildings[bIndex].grid[r][c].isVacant = false;
              }
            }
          }

          // If no available rooms left, mark vacancy as booked
          if (typeof vacancy.availableRooms === 'number' && vacancy.availableRooms <= 0) {
            vacancy.status = 'booked';
          }

          // increment leadCount stat
          vacancy.stats = vacancy.stats || {};
          vacancy.stats.leadCount = (vacancy.stats.leadCount || 0) + 1;

          await vacancy.save();
        }
      } catch (err) {
        console.error('Error finalizing booking on vacancy:', err);
      }

      // Ask tenant to confirm so reputation can count
      if (lead.student) {
        const vacancy = await AgentVacancy.findById(lead.vacancy).select('title').lean().catch(() => null);
        const title = vacancy?.title || 'the listing';
        sendPushNotification(lead.student, {
          title: 'Booking accepted — confirm placement',
          body: `The agent marked you as booked for ${title}. Confirm so it counts, and you can leave a rating.`,
          url: `/placement-confirm/${lead._id}`,
          type: 'booking',
          style: 'info',
        }).catch(() => {});
        try {
          const tenant = await User.findById(lead.student).select('email username').lean();
          if (tenant?.email) {
            sendEmail(
              tenant.email,
              `Booking accepted — ${title}`,
              `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                <div style="background:#16a34a;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                  <h2 style="color:#fff;margin:0;">Booking accepted</h2>
                </div>
                <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                  <p>The agent accepted your booking for <strong>${title}</strong>.</p>
                  <p>Please confirm you got the house so their reputation can update.</p>
                  <p style="text-align:center;margin-top:20px;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/placement-confirm/${lead._id}"
                       style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm placement</a>
                  </p>
                </div>
              </div>`
            ).catch(() => {});
          }
        } catch (_) {}
      }

      res.json({ message: 'Outcome marked successfully. Waiting for tenant confirmation.', lead });
      return;
    }

    // Decline / no-response / viewed — tell the tenant what happened
    lead.status = outcome;
    await lead.save();

    if (lead.student && (outcome === 'not-fit' || outcome === 'no-response' || outcome === 'viewed')) {
      (async () => {
        try {
          const vacancy = await AgentVacancy.findById(lead.vacancy).select('title').lean();
          const title = vacancy?.title || 'the listing';
          const tenant = await User.findById(lead.student).select('email').lean();
          const isDecline = outcome === 'not-fit' || outcome === 'no-response';
          const pushTitle = isDecline
            ? (lead.leadType === 'viewing' ? 'Viewing declined' : lead.leadType === 'booking' ? 'Booking declined' : 'Request declined')
            : 'Viewing marked as completed';
          const pushBody = isDecline
            ? `Your ${lead.leadType || 'request'} for ${title} was not taken forward.`
            : `The agent marked your viewing for ${title} as completed.`;

          sendPushNotification(lead.student, {
            title: pushTitle,
            body: pushBody,
            url: '/my-viewings',
            tag: `agent-outcome-${lead._id}-${outcome}`,
            type: lead.leadType === 'booking' ? 'booking' : 'viewing',
            style: isDecline ? 'critical' : 'info',
          }).catch(() => {});

          if (tenant?.email && isDecline) {
            sendEmail(
              tenant.email,
              `${pushTitle} — ${title}`,
              `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
                <div style="background:#dc2626;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                  <h2 style="color:#fff;margin:0;">${pushTitle}</h2>
                </div>
                <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                  <p>${pushBody}</p>
                  <p style="text-align:center;margin-top:16px;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/rooms" style="color:#4F46E5;">Browse more houses</a>
                  </p>
                </div>
              </div>`
            ).catch(() => {});
          }
        } catch (_) {}
      })();
    }

    res.json({ message: 'Outcome marked successfully', lead });
  } catch (error) {
    console.error('Error marking outcome:', error);
    res.status(500).json({ message: 'Error marking outcome', error: error.message });
  }
};

// PUT: Cancel a provisional hold (tenant can cancel their booking hold)
export const cancelProvisionalHold = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = toUserId(req.user._id);

    const lead = await AgentLead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const isTenant = String(lead.student) === String(userId);
    const isAgent = String(lead.agent) === String(userId);
    if (!isTenant && !isAgent && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized to cancel this hold' });
    }

    if (lead.leadType !== 'booking' || !lead.provisionalHoldUntil) {
      return res.status(400).json({ message: 'No active provisional hold to cancel' });
    }

    lead.provisionalHoldUntil = undefined;
    lead.status = 'no-response';
    await lead.save();

    // Optionally notify other users via AgentChat
    try {
      const chat = await AgentChat.findOne({ tenant: lead.student, vacancy: lead.vacancy });
      if (chat) {
        chat.messages.push({ sender: 'system', content: 'Your reservation was cancelled.', timestamp: new Date(), read: false });
        await chat.save();
      }
    } catch (_) {}

    res.json({ success: true, message: 'Provisional hold cancelled', lead });
  } catch (error) {
    console.error('Error cancelling provisional hold:', error);
    res.status(500).json({ message: 'Error cancelling hold', error: error.message });
  }
};

/**
 * GET /api/agent/leaderboard
 * Public, privacy-aware ranking of agents by confirmed placements + tenant ratings.
 * Hidden-name agents still rank, but appear under their display name with no photo.
 */
export const getAgentLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const agents = await User.find({
      $or: [{ role: 'agent' }, { roles: 'agent' }],
    })
      .select(agentReputationSelect)
      .lean();

    const ranked = agents
      .map((user) => {
        const rep = buildPublicAgentReputation(user);
        return { id: String(user._id), rep };
      })
      .filter((entry) => entry.rep && entry.rep.score > 0)
      .sort((a, b) => {
        if (b.rep.score !== a.rep.score) return b.rep.score - a.rep.score;
        if (b.rep.successfulPlacements !== a.rep.successfulPlacements) {
          return b.rep.successfulPlacements - a.rep.successfulPlacements;
        }
        return (b.rep.ratingAvg || 0) - (a.rep.ratingAvg || 0);
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const viewerId = req.user?._id ? toUserId(req.user._id) : null;

    const toPublicEntry = (entry) => ({
      rank: entry.rank,
      name: entry.rep.name,
      image: entry.rep.image,
      successfulPlacements: entry.rep.successfulPlacements,
      ratingAvg: entry.rep.ratingAvg,
      ratingCount: entry.rep.ratingCount,
      tier: entry.rep.tier,
      tierLabel: entry.rep.tierLabel,
      isVerifiedAgent: true,
      hideRealName: entry.rep.hideRealName,
      isYou: viewerId ? entry.id === viewerId : false,
    });

    const top = ranked.slice(0, limit).map(toPublicEntry);

    // Always let a signed-in agent see where they stand, even outside the top N
    let you = null;
    if (viewerId) {
      const mine = ranked.find((entry) => entry.id === viewerId);
      if (mine) {
        you = { ...toPublicEntry(mine), totalRanked: ranked.length };
      }
    }

    res.json({ success: true, leaderboard: top, you, totalRanked: ranked.length });
  } catch (error) {
    console.error('getAgentLeaderboard error:', error);
    res.status(500).json({ success: false, message: 'Error loading leaderboard' });
  }
};

// GET: Agent dashboard stats
export const getAgentStats = async (req, res) => {
  try {
    const agentId = toUserId(req.user._id);

    const activeVacancies = await AgentVacancy.countDocuments({
      agent: agentId,
      isActive: true,
    });

    const totalLeads = await AgentLead.countDocuments({ agent: agentId });

    const unreadLeads = await AgentLead.countDocuments({
      agent: agentId,
      isRead: false,
    });

    const leadTypeCounts = await AgentLead.aggregate([
      { $match: { agent: agentId } },
      { $group: { _id: '$leadType', count: { $sum: 1 } } },
    ]);

    const leadTypeStats = {
      contact: 0,
      viewing: 0,
      booking: 0,
    };

    leadTypeCounts.forEach((item) => {
      if (item._id && leadTypeStats[item._id] !== undefined) leadTypeStats[item._id] = item.count;
    });

    const agentUser = await User.findById(agentId).select(agentReputationSelect).lean();
    const awaitingConfirm = await AgentLead.countDocuments({
      agent: agentId,
      placementConfirmStatus: 'awaiting_tenant',
    });

    // Where this agent stands against other agents (drives the leaderboard callout)
    let ranking = null;
    try {
      const myScore = agentReputationScore(agentUser?.agentReputation || {});
      const peers = await User.find({ $or: [{ role: 'agent' }, { roles: 'agent' }] })
        .select('agentReputation')
        .lean();
      const scored = peers
        .map((p) => agentReputationScore(p.agentReputation || {}))
        .filter((score) => score > 0);
      if (myScore > 0) {
        const ahead = scored.filter((score) => score > myScore).length;
        ranking = { rank: ahead + 1, totalRanked: scored.length };
      } else {
        ranking = { rank: null, totalRanked: scored.length };
      }
    } catch (_) {
      // ranking is a nice-to-have; never fail the dashboard for it
    }

    res.json({
      activeVacancies,
      totalLeads,
      unreadLeads,
      leadTypeStats,
      awaitingTenantConfirm: awaitingConfirm,
      reputation: buildPublicAgentReputation(agentUser),
      ranking,
      settings: {
        displayName: agentUser?.agentReputation?.displayName || '',
        hideRealName: !!agentUser?.agentReputation?.hideRealName,
      },
    });
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

// GET: Public - active booking holds for a vacancy (non-sensitive)
export const getVacancyHolds = async (req, res) => {
  try {
    const vacancyId = req.params.id;
    const now = new Date();
    const holds = await AgentLead.find({
      vacancy: vacancyId,
      leadType: 'booking',
      provisionalHoldUntil: { $gt: now },
    }).select('roomDetails provisionalHoldUntil -_id').lean();

    const mapped = (holds || []).map(h => ({
      roomDetails: h.roomDetails || null,
      provisionalHoldUntil: h.provisionalHoldUntil,
    }));

    res.json({ success: true, holds: mapped });
  } catch (error) {
    console.error('Error fetching vacancy holds:', error);
    res.status(500).json({ success: false, message: 'Error fetching holds' });
  }
};

// POST: Create lead (user expresses interest in vacancy)
export const createLead = async (req, res) => {
  try {
    const { vacancyId, leadType = 'contact', message, preferredMoveInDate, preferredViewingDate, preferredRoomType, viewingTimeRange } = req.body;

    const vacancy = await AgentVacancy.findOne({
      _id: vacancyId,
      isActive: true,
    });
    if (!vacancy) {
      return res.status(404).json({ message: 'Vacancy not found' });
    }

    // Accept phone from request body (frontend) or fall back to authenticated user
    const providedPhone = (req.body?.phone) || (req.body?.studentInfo?.phone) || req.user.phone || '';
    if (!providedPhone || String(providedPhone).trim() === '') {
      return res.status(400).json({ message: 'Phone number is required to contact the agent' });
    }

    const studentInfo = {
      name:
        String(req.user.username || '').trim() ||
        `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() ||
        (req.body?.studentInfo?.name || 'Tenant'),
      phone: String(providedPhone).trim(),
      email: req.user.email || (req.body?.studentInfo?.email || ''),
    };

    // Include optional roomDetails for booking/reserve flows
    const roomDetails = req.body?.roomDetails || undefined;

    // If booking/reserve, enforce roomDetails and check existing provisional holds
    // Hold stays open until agent confirms placement or cancels (no auto-expiry)
    let provisionalHoldUntil = undefined;
    if (leadType === 'booking') {
      if (!roomDetails || !roomDetails.buildingId) {
        return res.status(400).json({ message: 'Room details required to reserve a room' });
      }

      // Check for existing active provisional holds on this vacancy + room
      const now = new Date();
      const conflict = await AgentLead.findOne({
        vacancy: vacancyId,
        'roomDetails.buildingId': String(roomDetails.buildingId),
        'roomDetails.row': Number(roomDetails.row || 0),
        'roomDetails.col': Number(roomDetails.col || 0),
        provisionalHoldUntil: { $gt: now },
        leadType: 'booking',
        status: { $nin: ['booked', 'not-fit', 'no-response'] },
      });
      if (conflict) {
        return res.status(409).json({ message: 'Room is currently held by another reservation. Try again later.' });
      }

      provisionalHoldUntil = farFutureDate();
    }

    const lead = new AgentLead({
      agent: vacancy.agent,
      vacancy: vacancyId,
      student: toUserId(req.user._id),
      studentInfo,
      message: message || '',
      leadType,
      preferredMoveInDate: preferredMoveInDate ? new Date(preferredMoveInDate) : undefined,
      preferredViewingDate: preferredViewingDate ? new Date(preferredViewingDate) : undefined,
      preferredViewingTimeRange: viewingTimeRange || req.body.preferredViewingTimeRange || undefined,
      preferredRoomType: preferredRoomType || '',
      roomDetails: roomDetails ? {
        buildingId: String(roomDetails.buildingId),
        row: Number.isFinite(Number(roomDetails.row)) ? Number(roomDetails.row) : undefined,
        col: Number.isFinite(Number(roomDetails.col)) ? Number(roomDetails.col) : undefined,
        roomType: roomDetails.roomType || (preferredRoomType || ''),
      } : undefined,
      provisionalHoldUntil,
    });

    await lead.save();

    // Mark vacancy as "contacted" if it's currently "open" (first lead)
    const updatePayload = { $inc: { 'stats.leadCount': 1 } };
    if (vacancy.status === 'open') {
      updatePayload.status = 'contacted';
      updatePayload.contactedAt = new Date();
    }

    await AgentVacancy.findByIdAndUpdate(vacancyId, updatePayload);

    // Notify agent (email + in-app/push) — contact / viewing / booking all share this path
    (async () => {
      try {
        const agentUser = await User.findById(vacancy.agent).select('username email phoneNumber').lean();
        const studentContact = `${studentInfo.name} (${studentInfo.phone})`;
        const listingTitle = vacancy.title || vacancy.roomType || 'an agent listing';
        const leadLabel =
          leadType === 'viewing' ? 'Viewing request'
            : leadType === 'booking' ? 'Booking / reserve request'
              : 'Contact request';
        const dashUrl =
          leadType === 'viewing' ? '/agent/viewings'
            : leadType === 'booking' ? '/agent/bookings'
              : '/agent/leads';

        const html = `<div style="font-family:Arial,sans-serif;color:#222;max-width:520px;margin:auto;">
            <h2 style="background:#4F46E5;color:#fff;padding:12px;border-radius:6px;margin:0 0 12px;">${leadLabel} — ${listingTitle}</h2>
            <p style="margin:0 0 8px;">Tenant: <strong>${studentContact}</strong></p>
            ${leadType === 'viewing' && preferredViewingDate ? `<p style="margin:0 0 8px;">Preferred date: ${new Date(preferredViewingDate).toLocaleDateString('en-KE')}</p>` : ''}
            ${leadType === 'booking' && preferredMoveInDate ? `<p style="margin:0 0 8px;">Preferred move-in: ${new Date(preferredMoveInDate).toLocaleDateString('en-KE')}</p>` : ''}
            <p style="margin:0 0 8px;">Message: ${message ? `<em>${message}</em>` : '—'}</p>
            <p style="margin:16px 0 0;"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}${dashUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Open in dashboard</a></p>
          </div>`;

        if (agentUser?.email) {
          sendEmail(agentUser.email, `${leadLabel} — ${listingTitle} — PataKeja`, html).catch(() => {});
        }
        sendPushNotification(vacancy.agent, {
          title: leadLabel,
          body: `${studentInfo.name} is interested in ${listingTitle}`,
          url: dashUrl,
          tag: `agent-lead-${lead._id}`,
          type: leadType === 'booking' ? 'booking' : leadType === 'viewing' ? 'viewing' : 'message',
          style: 'info',
        }).catch(() => {});
      } catch (_) {
        // ignore notification errors
      }
    })();

    res.status(201).json({
      message: 'Interest expressed successfully',
      lead,
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Error expressing interest', error: error.message });
  }
};

const viewingLocationUnlocked = (lead) => {
  const status = String(lead?.status || '').toLowerCase();
  const outcome = String(lead?.outcome || '').toLowerCase();
  return ['contacted', 'viewed', 'booked'].includes(status)
    || ['viewed', 'booked'].includes(outcome);
};

/** GET: Tenant — their own agent leads (exact pin only after viewing confirmed). */
export const getMyLeads = async (req, res) => {
  try {
    const userId = toUserId(req.user._id);
    const leads = await AgentLead.find({ student: userId })
      .populate('vacancy', 'title location googleMapsUrl rent roomType photos contactPhone whatsappNumber')
      .populate('agent', 'username phoneNumber image agentReputation')
      .sort({ createdAt: -1 })
      .lean();

    const items = leads.map((lead) => {
      const unlocked = viewingLocationUnlocked(lead);
      const vacancy = lead.vacancy ? { ...lead.vacancy } : null;
      let exactLocation = null;
      let agentContact = null;

      if (vacancy) {
        if (unlocked) {
          const coords = normalizeCoordinates(vacancy.location?.coordinates);
          exactLocation = {
            area: vacancy.location?.area || '',
            city: vacancy.location?.city || '',
            coordinates: coords,
            mapsUrl: mapsUrlFromLocation({
              coordinates: coords,
              googleMapsUrl: vacancy.googleMapsUrl,
            }),
          };
          const phone = String(
            vacancy.contactPhone || vacancy.whatsappNumber || lead.agent?.phoneNumber || ''
          ).trim();
          const whatsapp = String(vacancy.whatsappNumber || vacancy.contactPhone || lead.agent?.phoneNumber || '').trim();
          agentContact = {
            name: buildPublicAgentReputation(lead.agent)?.name || lead.agent?.username || 'Agent',
            phone: phone || null,
            whatsapp: whatsapp || null,
          };
        } else if (vacancy.location) {
          delete vacancy.location.coordinates;
          delete vacancy.googleMapsUrl;
        }
        // Never expose listing contact publicly before confirm
        delete vacancy.contactPhone;
        delete vacancy.whatsappNumber;
      }

      return {
        ...lead,
        vacancy,
        exactLocation,
        agentContact,
        locationUnlocked: unlocked,
        hasExactPin: !!(exactLocation?.mapsUrl),
      };
    });

    res.json({ success: true, leads: items });
  } catch (error) {
    console.error('getMyLeads error:', error);
    res.status(500).json({ success: false, message: 'Error fetching your leads' });
  }
};

// GET: Agent reputation privacy settings
export const getReputationSettings = async (req, res) => {
  try {
    const agentId = toUserId(req.user._id);
    const user = await User.findById(agentId).select(agentReputationSelect).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      success: true,
      settings: {
        displayName: user.agentReputation?.displayName || '',
        hideRealName: !!user.agentReputation?.hideRealName,
      },
      reputation: buildPublicAgentReputation(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT: Update agent reputation privacy settings
export const updateReputationSettings = async (req, res) => {
  try {
    const agentId = toUserId(req.user._id);
    const displayName = String(req.body?.displayName ?? '').trim().slice(0, 80);
    const hideRealName = !!req.body?.hideRealName;

    const user = await User.findById(agentId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const nextRep = {
      displayName,
      hideRealName,
      successfulPlacements: Number(user.agentReputation?.successfulPlacements || 0),
      ratingAvg: Number(user.agentReputation?.ratingAvg || 0),
      ratingCount: Number(user.agentReputation?.ratingCount || 0),
    };
    user.set('agentReputation', nextRep);
    user.markModified('agentReputation');
    await user.save();

    res.json({
      success: true,
      message: 'Reputation settings updated',
      settings: {
        displayName: nextRep.displayName,
        hideRealName: nextRep.hideRealName,
      },
      reputation: buildPublicAgentReputation(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET: Tenant — leads awaiting placement confirmation
export const getPendingPlacementConfirmations = async (req, res) => {
  try {
    const userId = toUserId(req.user._id);
    const leads = await AgentLead.find({
      student: userId,
      placementConfirmStatus: 'awaiting_tenant',
    })
      .populate('vacancy', 'title location rent')
      .sort({ placementConfirmRequestedAt: -1 })
      .lean();

    res.json({ success: true, leads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET: Tenant — single placement confirmation detail
export const getPlacementConfirmation = async (req, res) => {
  try {
    const userId = toUserId(req.user._id);
    const lead = await AgentLead.findById(req.params.id)
      .populate('vacancy', 'title location rent photos')
      .lean();

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const isTenant = String(lead.student) === String(userId);
    const isAgent = String(lead.agent) === String(userId);
    if (!isTenant && !isAgent && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const agentUser = await User.findById(lead.agent).select(agentReputationSelect).lean();

    res.json({
      success: true,
      lead,
      agent: buildPublicAgentReputation(agentUser),
      canConfirm: isTenant && lead.placementConfirmStatus === 'awaiting_tenant',
      canRate: isTenant
        && lead.placementConfirmStatus === 'confirmed'
        && !lead.rating?.stars,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST: Tenant confirms or denies placement
export const confirmPlacement = async (req, res) => {
  try {
    const userId = toUserId(req.user._id);
    const confirmed = req.body?.confirmed === true || req.body?.confirmed === 'true';

    const lead = await AgentLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (String(lead.student) !== String(userId) && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Only the tenant can confirm this placement' });
    }

    if (lead.placementConfirmStatus !== 'awaiting_tenant') {
      return res.status(400).json({
        message: lead.placementConfirmStatus === 'confirmed'
          ? 'Placement already confirmed'
          : 'This placement is not awaiting confirmation',
      });
    }

    lead.placementConfirmRespondedAt = new Date();

    if (!confirmed) {
      lead.placementConfirmStatus = 'denied';
      await lead.save();
      return res.json({
        success: true,
        message: 'Thanks — this placement will not count toward the agent’s reputation.',
        lead,
        canRate: false,
      });
    }

    lead.placementConfirmStatus = 'confirmed';
    await lead.save();

    // Increment agent successful placements
    await User.findByIdAndUpdate(lead.agent, {
      $inc: { 'agentReputation.successfulPlacements': 1 },
    });

    res.json({
      success: true,
      message: 'Placement confirmed! You can leave a rating for this agent.',
      lead,
      canRate: true,
    });
  } catch (error) {
    console.error('confirmPlacement error:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST: Tenant rates agent after confirmed placement
export const rateAgentPlacement = async (req, res) => {
  try {
    const userId = toUserId(req.user._id);
    const stars = Number(req.body?.stars);
    const comment = String(req.body?.comment || '').trim().slice(0, 500);

    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5 stars' });
    }

    const lead = await AgentLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (String(lead.student) !== String(userId) && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ message: 'Only the tenant can rate this placement' });
    }

    if (lead.placementConfirmStatus !== 'confirmed') {
      return res.status(400).json({ message: 'Confirm the placement before rating' });
    }

    if (lead.rating?.stars) {
      return res.status(400).json({ message: 'You already rated this placement' });
    }

    lead.rating = { stars, comment, ratedAt: new Date() };
    await lead.save();

    const agent = await User.findById(lead.agent);
    if (agent) {
      agent.agentReputation = agent.agentReputation || {};
      const prevCount = Number(agent.agentReputation.ratingCount || 0);
      const prevAvg = Number(agent.agentReputation.ratingAvg || 0);
      const nextCount = prevCount + 1;
      const nextAvg = ((prevAvg * prevCount) + stars) / nextCount;
      agent.agentReputation.ratingCount = nextCount;
      agent.agentReputation.ratingAvg = Number(nextAvg.toFixed(2));
      await agent.save();
    }

    res.json({
      success: true,
      message: 'Thanks for your rating!',
      reputation: buildPublicAgentReputation(agent),
    });
  } catch (error) {
    console.error('rateAgentPlacement error:', error);
    res.status(500).json({ message: error.message });
  }
};
