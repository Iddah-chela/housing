import AgentApplication from '../models/agentApplication.js';
import User from '../models/user.js';
import { createClerkClient } from '@clerk/express';
import { derivePrimaryRole, mergeRoles } from '../utils/roleUtils.js';
import { sendEmail } from '../utils/mailer.js';
import { sendPushNotification } from '../utils/pushNotifier.js';
import { notifyAgentApproved } from '../utils/notifyAgentApproved.js';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

// POST: User submits agent application
export const submitAgentApplication = async (req, res) => {
  try {
    const { yearsExperience, areasServed, referenceLink, bio } = req.body;
    const userId = req.user._id;

    // Validation
    if (yearsExperience === undefined || !areasServed || areasServed.length === 0) {
      return res.status(400).json({
        message: 'Missing required fields: yearsExperience, areasServed',
      });
    }

    if (yearsExperience < 0) {
      return res.status(400).json({ message: 'Years of experience cannot be negative' });
    }

    // Check if user is already an agent by role
    const user = await User.findById(userId);
    const userRoles = mergeRoles(user?.roles, user?.role);
    if (user && userRoles.includes('agent')) {
      return res.status(409).json({
        message: 'You are already an agent! Access your dashboard at /agent',
      });
    }

    // Check if user already has an application
    const existing = await AgentApplication.findOne({ user: userId });

    if (existing) {
      const currentlyAgent = userRoles.includes('agent');

      if (existing.status === 'approved' && !currentlyAgent) {
        existing.yearsExperience = parseInt(yearsExperience);
        existing.areasServed = areasServed;
        existing.referenceLink = referenceLink || '';
        existing.bio = bio || '';
        existing.status = 'pending';
        existing.rejectionReason = undefined;
        existing.reviewedBy = undefined;
        existing.reviewedAt = undefined;

        await existing.save();

        return res.status(200).json({
          message: 'Previous approval is no longer active on your account. Application re-opened and sent for review.',
          application: existing,
        });
      }

      if (existing.status === 'rejected') {
        existing.yearsExperience = parseInt(yearsExperience);
        existing.areasServed = areasServed;
        existing.referenceLink = referenceLink || '';
        existing.bio = bio || '';
        existing.status = 'pending';
        existing.rejectionReason = undefined;
        existing.reviewedBy = undefined;
        existing.reviewedAt = undefined;

        await existing.save();

        return res.status(200).json({
          message: 'Application resubmitted successfully. Admin will review it shortly.',
          application: existing,
        });
      }

      return res.status(409).json({
        message:
          existing.status === 'approved'
            ? 'You are already an agent! Access your dashboard at /agent'
            : 'Application already submitted. Please wait for admin review.',
      });
    }

    // Create application
    const application = new AgentApplication({
      user: userId,
      firstName: req.user.firstName || '',
      lastName: req.user.lastName || '',
      email: req.user.email || '',
      phone: req.user.phone || '',
      yearsExperience: parseInt(yearsExperience),
      areasServed,
      referenceLink: referenceLink || '',
      bio: bio || '',
    });

    await application.save();

    res.status(201).json({
      message: 'Application submitted successfully. Admin will review it shortly.',
      application,
    });
  } catch (error) {
    console.error('Error submitting agent application:', error);
    res.status(500).json({
      message: 'Error submitting application',
      error: error.message,
    });
  }
};

// GET: Check user's application status
export const getMyApplicationStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    // First check if user is already an agent by role
    const user = await User.findById(userId);
    const userRoles = mergeRoles(user?.roles, user?.role);
    if (user && userRoles.includes('agent')) {
      return res.json({
        hasApplication: true,
        status: 'approved',
        isAgentByRole: true,
        message: 'You are already an active agent!',
      });
    }

    const application = await AgentApplication.findOne({ user: userId });

    if (application?.status === 'approved' && user && !userRoles.includes('agent')) {
      return res.json({
        hasApplication: false,
        status: null,
        canReapply: true,
        message: 'Your previous approval is not active on your current account role. You can apply again.',
      });
    }

    if (!application) {
      return res.json({
        hasApplication: false,
        status: null,
      });
    }

    res.json({
      hasApplication: true,
      status: application.status,
      application,
    });
  } catch (error) {
    console.error('Error fetching application status:', error);
    res.status(500).json({
      message: 'Error fetching application status',
      error: error.message,
    });
  }
};

// GET: Admin - List all agent applications
export const getAgentApplications = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const query = status === 'all' ? {} : { status };
    const skip = (page - 1) * limit;

    const applications = await AgentApplication.find(query)
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AgentApplication.countDocuments(query);

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching agent applications:', error);
    res.status(500).json({
      message: 'Error fetching applications',
      error: error.message,
    });
  }
};

// PUT: Admin - Approve agent application
export const approveAgentApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const adminId = req.user._id;

    console.log(`[Agent Approval] Starting approval for application: ${applicationId}`);

    const application = await AgentApplication.findById(applicationId);
    console.log(`[Agent Approval] Found application:`, application ? `yes, userId=${application.user}` : 'no');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot approve a ${application.status} application`,
      });
    }

    // Update MongoDB first so the approval is not blocked by Clerk sync issues.
    console.log(`[Agent Approval] Updating application status to approved`);
    application.status = 'approved';
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    await application.save();
    console.log(`[Agent Approval] Application saved successfully`);

    // Verify user exists in MongoDB before updating
    const userExists = await User.findById(application.user);
    if (!userExists) {
      console.error(`[Agent Approval] User ${application.user} NOT found in MongoDB!`);
      return res.status(500).json({
        message: 'User not found in database. User must have logged in at least once.',
        error: 'USER_NOT_IN_DB'
      });
    }

    console.log(`[Agent Approval] Updating user ${application.user} roles to include agent`);
    const existingUser = await User.findById(application.user).select('role roles');
    const existingRoles = mergeRoles(existingUser?.roles, existingUser?.role);
    const mergedRoles = mergeRoles(existingRoles, 'agent');
    const updateResult = await User.findByIdAndUpdate(
      application.user,
      {
        role: derivePrimaryRole(mergedRoles, existingUser?.role),
        roles: mergedRoles
      },
      { new: true }
    );
    console.log(`[Agent Approval] User update result: role=${updateResult?.role}`);

    res.json({
      message: 'Agent application approved successfully',
      application,
      updatedUser: {
        _id: updateResult?._id,
        role: updateResult?.role,
        username: updateResult?.username
      }
    });

    // Notify the new agent (email + in-app/push) so they know they can start posting
    (async () => {
      try {
        const applicant = await User.findById(application.user).select('email username').lean();
        await notifyAgentApproved({
          userId: application.user,
          email: applicant?.email,
          username: applicant?.username,
          applicationId: application._id,
        });
        application.welcomeNotifiedAt = new Date();
        await application.save();
      } catch (notifyErr) {
        console.error('[Agent Approval] notify failed:', notifyErr.message);
      }
    })();

    // Sync Clerk metadata (block on this so role is consistent)
    console.log(`[Agent Approval] Syncing Clerk metadata for user ${application.user}`);
    try {
      await clerk.users.updateUser(application.user, {
        publicMetadata: {
          role: 'agent',
          roles: mergedRoles,
        },
      });
      console.log(`[Agent Approval] Clerk metadata synced successfully`);
    } catch (clerkError) {
      console.error('Clerk metadata sync failed (non-blocking):', clerkError.message);
      // Don't fail the approval if Clerk is slow - MongoDB is already updated
    }
  } catch (error) {
    console.error('Error approving application:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      message: 'Error approving application',
      error: error.message,
    });
  }
};

// PUT: Admin - Reject agent application
export const rejectAgentApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const application = await AgentApplication.findById(applicationId);

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
      message: 'Agent application rejected',
      application,
    });

    (async () => {
      try {
        const applicant = await User.findById(application.user).select('email username').lean();
        const name = applicant?.username || 'there';
        if (applicant?.email) {
          sendEmail(
            applicant.email,
            'Update on your PataKeja agent application',
            `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;">
              <div style="background:#dc2626;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:20px;">Application update</h2>
              </div>
              <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
                <p style="font-size:15px;line-height:1.6;">Your agent application was not approved at this time.</p>
                ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#555;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
                <p style="font-size:14px;color:#6b7280;">You can update your details and apply again from the Become Agent page.</p>
                <p style="text-align:center;margin-top:16px;"><a href="${CLIENT_URL}/become-agent" style="color:#4F46E5;">View application status</a></p>
              </div>
            </div>`
          ).catch(() => {});
        }
        sendPushNotification(application.user, {
          title: 'Agent application update',
          body: reason ? `Not approved: ${reason}` : 'Your agent application was not approved.',
          url: '/become-agent',
          tag: `agent-rejected-${application._id}`,
          type: 'system',
          style: 'critical',
        }).catch(() => {});
      } catch (_) {}
    })();
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({
      message: 'Error rejecting application',
      error: error.message,
    });
  }
};
