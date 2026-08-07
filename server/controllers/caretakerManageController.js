import Property from '../models/property.js';
import User from '../models/user.js';
import CaretakerManageRequest from '../models/caretakerManageRequest.js';
import { hasRole } from '../utils/roleUtils.js';
import { sendEmail } from '../utils/mailer.js';
import { sendPushNotification } from '../utils/pushNotifier.js';

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

const phoneDigits = (value) => String(value || '').replace(/\D/g, '');

/** Approved caretaker requests to manage an existing listing */
export const requestManageProperty = async (req, res) => {
  try {
    if (!hasRole(req.user, 'caretaker') && !hasRole(req.user, 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only approved caretakers can request to manage a listing. Apply via Become Caretaker first.',
        requiresCaretakerApplication: true,
      });
    }

    const { id } = req.params;
    const message = String(req.body.message || '').trim().slice(0, 500);
    const requesterPhone = String(req.body.phone || req.user.phoneNumber || '').trim();

    const property = await Property.findById(id);
    if (!property) {
      return res.json({ success: false, message: 'Property not found' });
    }

    const email = String(req.user.email || '').trim().toLowerCase();
    if (String(property.owner) === String(req.user._id)) {
      return res.json({ success: false, message: 'You already own this listing' });
    }
    if (email && (property.caretakers || []).some((e) => String(e).toLowerCase() === email)) {
      return res.json({ success: false, message: 'You already manage this listing' });
    }

    const existingPending = await CaretakerManageRequest.findOne({
      property: id,
      requester: req.user._id,
      status: 'pending',
    });
    if (existingPending) {
      return res.json({ success: false, message: 'You already have a pending request for this listing' });
    }

    const request = await CaretakerManageRequest.create({
      property: id,
      requester: req.user._id,
      requesterEmail: email,
      requesterName: req.user.username || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      requesterPhone,
      message,
    });

    // Notify property owner
    const ownerId = property.owner;
    sendPushNotification(ownerId, {
      title: 'Caretaker wants to manage your house',
      body: `${request.requesterName || 'Someone'} says they are the caretaker for ${property.name}. Approve or decline.`,
      url: '/owner',
      tag: `caretaker-manage-${request._id}`,
      type: 'system',
      style: 'info',
    }).catch(() => {});

    (async () => {
      try {
        const owner = await User.findById(ownerId).select('email username').lean();
        if (owner?.email) {
          sendEmail(
            owner.email,
            `Caretaker request — ${property.name}`,
            `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
              <div style="background:#0d9488;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;">Caretaker request</h2>
              </div>
              <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p><strong>${request.requesterName || 'A caretaker'}</strong> asked to manage <strong>${property.name}</strong>.</p>
                ${requesterPhone ? `<p>Their phone: ${requesterPhone}</p>` : ''}
                ${message ? `<p>Message: <em>${message}</em></p>` : ''}
                <p style="text-align:center;margin-top:16px;">
                  <a href="${CLIENT_URL}/owner" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Review in dashboard</a>
                </p>
              </div>
            </div>`
          ).catch(() => {});
        }
      } catch (_) {}
    })();

    res.status(201).json({
      success: true,
      message: 'Request sent to the landlord. They will approve or decline.',
      request,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.json({ success: false, message: 'You already have a pending request for this listing' });
    }
    console.error('requestManageProperty:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Landlord: pending manage requests for my properties */
export const getOwnerCaretakerRequests = async (req, res) => {
  try {
    const myProperties = await Property.find({ owner: req.user._id }).select('_id name').lean();
    const propertyIds = myProperties.map((p) => p._id);
    if (!propertyIds.length) {
      return res.json({ success: true, requests: [] });
    }

    const requests = await CaretakerManageRequest.find({
      property: { $in: propertyIds },
      status: 'pending',
    })
      .populate('property', 'name estate place images')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const respondCaretakerManageRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const answer = String(req.body.answer || '').toLowerCase();
    if (!['approve', 'decline'].includes(answer)) {
      return res.status(400).json({ success: false, message: 'answer must be approve or decline' });
    }

    const request = await CaretakerManageRequest.findById(requestId);
    if (!request) {
      return res.json({ success: false, message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.json({ success: false, message: `Request already ${request.status}` });
    }

    const property = await Property.findById(request.property);
    if (!property) {
      return res.json({ success: false, message: 'Property not found' });
    }
    if (String(property.owner) !== String(req.user._id) && !hasRole(req.user, 'admin')) {
      return res.status(403).json({ success: false, message: 'Only the property owner can respond' });
    }

    request.status = answer === 'approve' ? 'approved' : 'declined';
    request.reviewedAt = new Date();
    request.reviewedBy = req.user._id;
    await request.save();

    if (answer === 'approve') {
      const email = String(request.requesterEmail || '').toLowerCase();
      if (email && !(property.caretakers || []).some((e) => String(e).toLowerCase() === email)) {
        property.caretakers = [...(property.caretakers || []), email];
      }
      if (!property.claimRole) property.claimRole = 'caretaker';
      if (!property.claimedBy) {
        property.claimedBy = request.requester;
        property.claimedByEmail = email;
        property.isClaimed = true;
        property.claimStatus = 'verified';
      }
      await property.save();
    }

    const approved = answer === 'approve';
    sendPushNotification(request.requester, {
      title: approved ? 'Caretaker request approved' : 'Caretaker request declined',
      body: approved
        ? `You can now manage ${property.name}.`
        : `Your request to manage ${property.name} was declined.`,
      url: approved ? '/managed-properties' : '/rooms',
      tag: `caretaker-manage-${request._id}-${answer}`,
      type: 'system',
      style: approved ? 'info' : 'critical',
    }).catch(() => {});

    (async () => {
      try {
        const caretaker = await User.findById(request.requester).select('email username').lean();
        if (caretaker?.email) {
          sendEmail(
            caretaker.email,
            approved ? `Approved — manage ${property.name}` : `Declined — ${property.name}`,
            `<p>Hi ${caretaker.username || 'there'},</p>
             <p>Your request to manage <strong>${property.name}</strong> was <strong>${approved ? 'approved' : 'declined'}</strong>.</p>
             ${approved ? `<p><a href="${CLIENT_URL}/managed-properties">Open Manage Houses</a></p>` : ''}`
          ).catch(() => {});
        }
      } catch (_) {}
    })();

    res.json({
      success: true,
      message: approved ? 'Caretaker added to this property' : 'Request declined',
      request,
    });
  } catch (error) {
    console.error('respondCaretakerManageRequest:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Caretaker: my outgoing manage requests */
export const getMyManageRequests = async (req, res) => {
  try {
    const requests = await CaretakerManageRequest.find({ requester: req.user._id })
      .populate('property', 'name estate place images')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export { phoneDigits };
