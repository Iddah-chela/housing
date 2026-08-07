import CaretakerApplication from '../models/caretakerApplication.js';
import User from '../models/user.js';
import { createClerkClient } from '@clerk/express';
import { derivePrimaryRole, mergeRoles, hasRole } from '../utils/roleUtils.js';
import { sendEmail } from '../utils/mailer.js';
import { sendPushNotification } from '../utils/pushNotifier.js';
import { notifyCaretakerApproved } from '../utils/notifyCaretakerApproved.js';
import { uploadSensitiveDocument, signedUrlForPublicId } from '../utils/sensitiveUpload.js';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

// POST: User submits caretaker application (multipart: idDocument + fields)
export const submitCaretakerApplication = async (req, res) => {
  try {
    const userId = req.user._id;
    const phone = String(req.body.phone || req.user.phoneNumber || '').trim();
    const idNumber = String(req.body.idNumber || '').trim();
    const yearsExperience = parseInt(req.body.yearsExperience, 10);
    const bio = String(req.body.bio || '').trim().slice(0, 500);
    let areasManaged = req.body.areasManaged;
    if (typeof areasManaged === 'string') {
      try {
        areasManaged = JSON.parse(areasManaged);
      } catch {
        areasManaged = areasManaged.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(areasManaged)) areasManaged = [];

    if (!phone || phone.replace(/\D/g, '').length < 9) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }
    if (!idNumber) {
      return res.status(400).json({ message: 'National ID / Passport number is required' });
    }
    if (Number.isNaN(yearsExperience) || yearsExperience < 0) {
      return res.status(400).json({ message: 'Years of experience is required' });
    }
    if (!areasManaged.length) {
      return res.status(400).json({ message: 'Add at least one area you manage' });
    }

    const idFile = req.files?.idDocument?.[0] || req.file;
    if (!idFile) {
      return res.status(400).json({ message: 'National ID / Passport photo is required' });
    }

    const user = await User.findById(userId);
    if (user && hasRole(user, 'caretaker')) {
      return res.status(409).json({
        message: 'You are already a caretaker. Open Manage Houses to list or claim properties.',
      });
    }

    const uploaded = await uploadSensitiveDocument(idFile, 'caretaker_applications/id');
    if (!uploaded?.publicId) {
      return res.status(500).json({ message: 'Failed to upload ID document' });
    }
    const idDocumentUrl = uploaded.publicId;

    const existing = await CaretakerApplication.findOne({ user: userId });
    const payload = {
      firstName: req.user.firstName || '',
      lastName: req.user.lastName || '',
      email: req.user.email || '',
      phone,
      idNumber,
      idDocument: idDocumentUrl,
      yearsExperience,
      areasManaged,
      bio,
      status: 'pending',
      rejectionReason: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      submittedAt: new Date(),
    };

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(409).json({
          message: 'Application already submitted. Please wait for admin review.',
        });
      }
      Object.assign(existing, payload);
      await existing.save();
      return res.status(200).json({
        message: 'Application resubmitted successfully. Admin will review it shortly.',
        application: existing,
      });
    }

    const application = await CaretakerApplication.create({
      user: userId,
      ...payload,
    });

    // Keep phone on user profile when missing
    if (user && !user.phoneNumber && phone) {
      user.phoneNumber = phone;
      await user.save();
    }

    res.status(201).json({
      message: 'Application submitted successfully. Admin will review it shortly.',
      application,
    });
  } catch (error) {
    console.error('Error submitting caretaker application:', error);
    res.status(500).json({
      message: 'Error submitting application',
      error: error.message,
    });
  }
};

export const getMyCaretakerApplicationStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (user && hasRole(user, 'caretaker')) {
      return res.json({
        hasApplication: true,
        status: 'approved',
        isCaretakerByRole: true,
        message: 'You are already an approved caretaker.',
      });
    }

    const application = await CaretakerApplication.findOne({ user: userId });
    if (!application) {
      return res.json({ hasApplication: false, status: null });
    }

    res.json({
      hasApplication: true,
      status: application.status,
      application,
      rejectionReason: application.rejectionReason,
    });
  } catch (error) {
    console.error('Error fetching caretaker application status:', error);
    res.status(500).json({
      message: 'Error fetching application status',
      error: error.message,
    });
  }
};

export const getCaretakerApplications = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const query = status === 'all' ? {} : { status };
    const skip = (page - 1) * limit;

    const applications = await CaretakerApplication.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    const withSignedDocs = applications.map((app) => ({
      ...app,
      idDocument: signedUrlForPublicId(app.idDocument) || app.idDocument,
    }));

    const total = await CaretakerApplication.countDocuments(query);

    res.json({
      applications: withSignedDocs,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching caretaker applications:', error);
    res.status(500).json({
      message: 'Error fetching applications',
      error: error.message,
    });
  }
};

export const approveCaretakerApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const adminId = req.user._id;

    const application = await CaretakerApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    if (application.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot approve a ${application.status} application`,
      });
    }

    application.status = 'approved';
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    await application.save();

    const existingUser = await User.findById(application.user).select('role roles email username phoneNumber');
    if (!existingUser) {
      return res.status(500).json({
        message: 'User not found in database. User must have logged in at least once.',
        error: 'USER_NOT_IN_DB',
      });
    }

    const mergedRoles = mergeRoles(existingUser.roles, existingUser.role, 'caretaker');
    const updateResult = await User.findByIdAndUpdate(
      application.user,
      {
        role: derivePrimaryRole(mergedRoles, existingUser.role),
        roles: mergedRoles,
        ...(application.phone && !existingUser.phoneNumber ? { phoneNumber: application.phone } : {}),
      },
      { new: true }
    );

    res.json({
      message: 'Caretaker application approved successfully',
      application,
      updatedUser: {
        _id: updateResult?._id,
        role: updateResult?.role,
        roles: updateResult?.roles,
      },
    });

    (async () => {
      try {
        await notifyCaretakerApproved({
          userId: application.user,
          email: existingUser.email,
          username: existingUser.username,
          applicationId: application._id,
        });
        application.welcomeNotifiedAt = new Date();
        await application.save();
      } catch (notifyErr) {
        console.error('[Caretaker Approval] notify failed:', notifyErr.message);
      }
    })();

    try {
      await clerk.users.updateUser(application.user, {
        publicMetadata: {
          role: derivePrimaryRole(mergedRoles, existingUser.role),
          roles: mergedRoles,
        },
      });
    } catch (clerkError) {
      console.error('Clerk metadata sync failed (non-blocking):', clerkError.message);
    }
  } catch (error) {
    console.error('Error approving caretaker application:', error);
    res.status(500).json({
      message: 'Error approving application',
      error: error.message,
    });
  }
};

export const rejectCaretakerApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const application = await CaretakerApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    if (application.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot reject a ${application.status} application`,
      });
    }

    application.status = 'rejected';
    application.rejectionReason = reason;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    await application.save();

    res.json({
      message: 'Caretaker application rejected',
      application,
    });

    (async () => {
      try {
        const applicant = await User.findById(application.user).select('email username').lean();
        const name = applicant?.username || 'there';
        if (applicant?.email) {
          sendEmail(
            applicant.email,
            'Update on your PataKeja caretaker application',
            `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
              <div style="background:#dc2626;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:20px;">Application update</h2>
              </div>
              <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
                <p style="font-size:15px;line-height:1.6;">Your caretaker application was not approved at this time.</p>
                ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#555;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
                <p style="text-align:center;margin-top:16px;"><a href="${CLIENT_URL}/become-caretaker" style="color:#0d9488;">View application status</a></p>
              </div>
            </div>`
          ).catch(() => {});
        }
        sendPushNotification(application.user, {
          title: 'Caretaker application update',
          body: reason ? `Not approved: ${reason}` : 'Your caretaker application was not approved.',
          url: '/become-caretaker',
          tag: `caretaker-rejected-${application._id}`,
          type: 'system',
          style: 'critical',
        }).catch(() => {});
      } catch (_) {}
    })();
  } catch (error) {
    console.error('Error rejecting caretaker application:', error);
    res.status(500).json({
      message: 'Error rejecting application',
      error: error.message,
    });
  }
};
