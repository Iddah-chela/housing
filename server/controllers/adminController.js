import User from "../models/user.js";
import Room from "../models/room.js";
import House from "../models/house.js";
import Report from "../models/report.js";
import Property from "../models/property.js";
import PropertyClaim from "../models/propertyClaim.js";
import SiteVisit from "../models/siteVisit.js";
import Booking from "../models/booking.js";
import xlsx from "xlsx";
import { applyAutoListingLifecycle, evaluateListingReadiness } from "../utils/listingLifecycle.js";
import { sendEmail } from "../utils/mailer.js";
import { sendPushNotification } from "../utils/pushNotifier.js";

// Middleware to check if user is admin
export const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized - Admin access required' });
    }
    next();
};

// Suspend user
export const suspendUser = async (req, res) => {
    try {
        const { userId, reason } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        user.isSuspended = true;
        user.suspensionReason = reason;
        await user.save();

        res.json({ success: true, message: 'User suspended successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Delete user account
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, message: 'User not found' });
        await User.findByIdAndDelete(userId);
        res.json({ success: true, message: 'User account deleted' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unsuspend user
export const unsuspendUser = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        user.isSuspended = false;
        user.suspensionReason = null;
        await user.save();

        res.json({ success: true, message: 'User unsuspended successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Revoke landlord status
export const revokeHouseOwner = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, message: 'User not found' });
        user.role = 'user';
        await user.save();
        // Delist all their properties
        await Property.updateMany({ owner: userId }, { isExpired: true });
        res.json({ success: true, message: 'Landlord status revoked and listings delisted' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Transfer property ownership to any registered user (auto-upgrades them to houseOwner)
export const transferProperty = async (req, res) => {
    try {
        const { propertyId, newOwnerEmail } = req.body;
        if (!propertyId || !newOwnerEmail) {
            return res.json({ success: false, message: 'Property ID and new owner email are required' });
        }
        const newOwner = await User.findOne({ email: newOwnerEmail.toLowerCase().trim() });
        if (!newOwner) {
            return res.json({ success: false, message: 'No user found with that email. Ask them to sign up first.' });
        }
        const property = await Property.findByIdAndUpdate(
            propertyId,
            { owner: newOwner._id },
            { new: true }
        );
        if (!property) return res.json({ success: false, message: 'Property not found' });
        // Upgrade user to houseOwner if they aren't already
        if (!['houseOwner', 'admin'].includes(newOwner.role)) {
            newOwner.role = 'houseOwner';
            await newOwner.save();
        }
        res.json({ success: true, message: `Property transferred to ${newOwner.username} (${newOwner.email})` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unverify listing
export const unverifyListing = async (req, res) => {
    try {
        const { roomId } = req.body;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.json({ success: false, message: 'Room not found' });
        }

        room.isVerified = false;
        await room.save();

        res.json({ success: true, message: 'Listing unverified successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Hide room
export const hideRoom = async (req, res) => {
    try {
        const { roomId } = req.body;

        const room = await Room.findById(roomId);
        if (!room) {
            return res.json({ success: false, message: 'Room not found' });
        }

        room.availabilityStatus = 'booked'; // Hidden by setting as booked
        await room.save();

        res.json({ success: true, message: 'Room hidden successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Verify user
export const verifyUser = async (req, res) => {
    try {
        const { userId, verificationType } = req.body; // 'phone' or 'id'

        const user = await User.findById(userId);
        if (!user) {
            return res.json({ success: false, message: 'User not found' });
        }

        if (verificationType === 'phone') {
            user.isPhoneVerified = true;
        } else if (verificationType === 'id') {
            user.isIdVerified = true;
        }

        await user.save();

        res.json({ success: true, message: `User ${verificationType} verified successfully` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Verify house
export const verifyHouse = async (req, res) => {
    try {
        const { houseId } = req.body;

        const house = await House.findById(houseId);
        if (!house) {
            return res.json({ success: false, message: 'House not found' });
        }

        house.isVerified = true;
        await house.save();

        // Also verify all rooms in this house
        await Room.updateMany(
            { house: houseId },
            { isVerified: true }
        );

        res.json({ success: true, message: 'House and all rooms verified successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get all users
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get all rooms
export const getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find()
            .populate('house')
            .sort({ createdAt: -1 });
        res.json({ success: true, rooms });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get all properties
export const getAllProperties = async (req, res) => {
    try {
        const properties = await Property.find()
            .populate('owner', 'username email image role')
            .sort({ createdAt: -1 });
        res.json({ success: true, properties });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Delist (hide) a property
export const delistProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });
        property.isExpired = true;
        await property.save();
        res.json({ success: true, message: 'Property delisted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Re-list a delisted property
export const relistProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });
        property.isExpired = false;
        await property.save();
        res.json({ success: true, message: 'Property re-listed' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Verify a property
export const verifyProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });
        property.isVerified = true;
        await property.save();
        res.json({ success: true, message: 'Property verified' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Unverify a property
export const unverifyProperty = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });
        property.isVerified = false;
        await property.save();
        res.json({ success: true, message: 'Property unverified' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Promote a listing to LIVE after required details are present.
export const promotePropertyToLive = async (req, res) => {
    try {
        const { propertyId } = req.body;
        if (!propertyId) return res.json({ success: false, message: 'Property ID is required' });

        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });

        const { checklist, missing, readyForLive } = evaluateListingReadiness(property);

        if (!readyForLive) {
            return res.json({
                success: false,
                message: 'Listing is not ready for live promotion',
                checklist,
                missing,
            });
        }

        property.listingTier = 'live';
        applyAutoListingLifecycle(property);
        if (property.claimStatus === 'none') property.claimStatus = 'verified';
        await property.save();

        return res.json({
            success: true,
            message: 'Listing promoted to LIVE successfully',
            checklist,
            property,
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            totalOwners,
            totalProperties,
            activeListings,
            verifiedListings,
            totalReports,
            suspendedUsers,
            users,
            caretakerEmailRows,
            totalVisits,
            todayVisits,
            weekVisits,
            monthVisits,
            uniqueVisitors30d,
            topPages,
            visitsByHourRows,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'houseOwner' }),
            Property.countDocuments(),
            Property.countDocuments({ isExpired: { $ne: true } }),
            Property.countDocuments({ isVerified: true }),
            Report.countDocuments({ status: 'pending' }),
            User.countDocuments({ isSuspended: true }),
            User.find().select('_id role email').lean(),
            Property.aggregate([
                { $project: { caretakers: { $ifNull: ['$caretakers', []] } } },
                { $unwind: '$caretakers' },
                { $project: { email: { $toLower: '$caretakers' } } },
                { $match: { email: { $ne: '' } } },
                { $group: { _id: '$email' } },
            ]),
            SiteVisit.countDocuments(),
            SiteVisit.countDocuments({ createdAt: { $gte: startOfDay } }),
            SiteVisit.countDocuments({ createdAt: { $gte: startOfWeek } }),
            SiteVisit.countDocuments({ createdAt: { $gte: startOfMonth } }),
            SiteVisit.distinct('visitorId', { createdAt: { $gte: last30Days } }).then((rows) => rows.length),
            SiteVisit.aggregate([
                { $match: { createdAt: { $gte: last30Days } } },
                { $group: { _id: '$path', visits: { $sum: 1 } } },
                { $sort: { visits: -1 } },
                { $limit: 5 },
                { $project: { _id: 0, path: '$_id', visits: 1 } },
            ]),
            SiteVisit.aggregate([
                { $match: { createdAt: { $gte: last7Days } } },
                {
                    $group: {
                        _id: { $hour: { date: '$createdAt', timezone: 'Africa/Nairobi' } },
                        visits: { $sum: 1 },
                    }
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        const visitByHourMap = new Map(visitsByHourRows.map((row) => [row._id, row.visits]));
        const visitByHour = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            visits: visitByHourMap.get(hour) || 0,
        }));

        const peakVisitHour = visitByHour.reduce((peak, row) => {
            if (row.visits > peak.visits) return row;
            return peak;
        }, { hour: 0, visits: 0 });

        const caretakerEmailSet = new Set(caretakerEmailRows.map((row) => String(row._id || '').toLowerCase()).filter(Boolean));

        const userRoleDistribution = users.reduce((acc, user) => {
            const role = String(user.role || '').toLowerCase();
            const email = String(user.email || '').toLowerCase();

            if (role === 'admin') {
                acc.admin += 1;
            } else if (role === 'houseowner') {
                acc.houseOwner += 1;
            } else if (caretakerEmailSet.has(email)) {
                acc.caretaker += 1;
            } else {
                acc.user += 1;
            }

            return acc;
        }, { user: 0, houseOwner: 0, caretaker: 0, admin: 0 });

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalOwners,
                totalProperties,
                activeListings,
                verifiedListings,
                pendingReports: totalReports,
                suspendedUsers,
                totalVisits,
                todayVisits,
                weekVisits,
                monthVisits,
                uniqueVisitors30d,
                topPages,
                visitByHour,
                peakVisitHour,
                userRoleDistribution,
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get claim requests (admin)
export const getPropertyClaims = async (req, res) => {
    try {
        const { status = 'pending' } = req.query;
        const filter = status === 'all' ? {} : { status };

        const claims = await PropertyClaim.find(filter)
            .populate('property', 'name estate place listingTier claimStatus isClaimed')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, claims });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const formatDateValue = (value) => (value ? new Date(value).toISOString() : '');

const buildReportRows = async ({ dataset, from, to }) => {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ? new Date(to) : new Date();

    if (dataset === 'bookings') {
        const bookings = await Booking.find({ createdAt: { $gte: start, $lte: end } })
            .populate('property', 'name estate place')
            .populate('user', 'username email')
            .sort({ createdAt: -1 })
            .lean();

        return bookings.map((booking) => ({
            id: booking._id,
            createdAt: formatDateValue(booking.createdAt),
            status: booking.status,
            moveInDate: formatDateValue(booking.moveInDate),
            property: booking.property?.name || '',
            location: [booking.property?.estate, booking.property?.place].filter(Boolean).join(', '),
            roomType: booking.roomDetails?.roomType || '',
            pricePerMonth: booking.roomDetails?.pricePerMonth || '',
            user: booking.user?.username || '',
            email: booking.user?.email || '',
        }));
    }

    if (dataset === 'logins') {
        const users = await User.find({ lastLoginAt: { $gte: start, $lte: end } })
            .sort({ lastLoginAt: -1 })
            .lean();

        return users.map((user) => ({
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLoginAt: formatDateValue(user.lastLoginAt),
            lastSeenAt: formatDateValue(user.lastSeenAt),
            suspended: user.isSuspended ? 'yes' : 'no',
        }));
    }

    if (dataset === 'users') {
        const users = await User.find({ createdAt: { $gte: start, $lte: end } })
            .sort({ createdAt: -1 })
            .lean();

        return users.map((user) => ({
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: formatDateValue(user.createdAt),
            lastLoginAt: formatDateValue(user.lastLoginAt),
            lastSeenAt: formatDateValue(user.lastSeenAt),
            suspended: user.isSuspended ? 'yes' : 'no',
        }));
    }

    if (dataset === 'properties') {
        const properties = await Property.find({ createdAt: { $gte: start, $lte: end } })
            .populate('owner', 'username email role')
            .sort({ createdAt: -1 })
            .lean();

        return properties.map((property) => ({
            propertyId: property._id,
            name: property.name,
            place: property.place,
            estate: property.estate,
            owner: property.owner?.username || '',
            ownerEmail: property.owner?.email || '',
            listingTier: property.listingTier,
            vacancyStatus: property.vacancyStatus,
            isVerified: property.isVerified ? 'yes' : 'no',
            createdAt: formatDateValue(property.createdAt),
            lastVerifiedAt: formatDateValue(property.lastVerifiedAt),
            claimStatus: property.claimStatus,
        }));
    }

    if (dataset === 'visits') {
        const visits = await SiteVisit.find({ createdAt: { $gte: start, $lte: end } })
            .sort({ createdAt: -1 })
            .limit(5000)
            .lean();

        return visits.map((visit) => ({
            visitId: visit._id,
            createdAt: formatDateValue(visit.createdAt),
            path: visit.path,
            referrer: visit.referrer || '',
            visitorId: visit.visitorId,
            sessionId: visit.sessionId,
            ip: visit.ip || '',
        }));
    }

    if (dataset === 'reports') {
        const reports = await Report.find({ createdAt: { $gte: start, $lte: end } })
            .populate('reportedBy', 'username email')
            .populate('reportedUserId', 'username email')
            .sort({ createdAt: -1 })
            .lean();

        return reports.map((report) => ({
            reportId: report._id,
            createdAt: formatDateValue(report.createdAt),
            status: report.status,
            reportType: report.reportType,
            reason: report.reason,
            description: report.description,
            reportedBy: report.reportedBy?.username || '',
            reportedByEmail: report.reportedBy?.email || '',
            reportedUser: report.reportedUserId?.username || '',
            reportedUserEmail: report.reportedUserId?.email || '',
            actionTaken: report.actionTaken || '',
        }));
    }

    throw new Error('Unsupported report dataset');
};

export const exportAdminReport = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const dataset = String(req.query.dataset || 'bookings');
        const format = String(req.query.format || 'xlsx').toLowerCase();
        const from = req.query.from;
        const to = req.query.to;

        const rows = await buildReportRows({ dataset, from, to });
        const exportDate = new Date().toISOString().slice(0, 10);
        const fileBase = `patakeja-${dataset}-report-${exportDate}`;

        if (format === 'csv') {
            const worksheet = xlsx.utils.json_to_sheet(rows);
            const csv = xlsx.utils.sheet_to_csv(worksheet);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.csv"`);
            return res.send(csv);
        }

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, dataset.slice(0, 31) || 'report');
        const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileBase}.xlsx"`);
        return res.send(buffer);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Approve claim request (admin)
export const approvePropertyClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { reviewNote = '' } = req.body;

        const claim = await PropertyClaim.findById(claimId);
        if (!claim) return res.json({ success: false, message: 'Claim not found' });
        if (claim.status === 'approved') return res.json({ success: true, message: 'Claim already approved' });

        const property = await Property.findById(claim.property);
        if (!property) return res.json({ success: false, message: 'Property not found for this claim' });

        const claimantUser = await User.findById(claim.claimant);
        if (!claimantUser) {
            return res.json({ success: false, message: 'Claimant account no longer exists' });
        }

        claim.status = 'approved';
        claim.reviewNote = String(reviewNote || '').trim();
        claim.reviewedBy = req.user._id;
        claim.reviewedAt = new Date();
        await claim.save();

        // Any other pending claims for this property are auto-rejected.
        await PropertyClaim.updateMany(
            { _id: { $ne: claim._id }, property: claim.property, status: 'pending' },
            { $set: { status: 'rejected', reviewNote: 'Another claim was approved for this listing', reviewedBy: req.user._id, reviewedAt: new Date() } }
        );

        property.isClaimed = true;
        property.claimStatus = 'verified';
        property.claimedBy = claim.claimant;
        property.claimedByEmail = claim.claimantEmail;
        property.claimRole = claim.claimRole;
        property.claimPhone = claim.claimPhone || '';

        // Ownership transfer is only for verified owner claims.
        // Caretaker claims grant stewardship access without replacing the owner account.
        if (claim.claimRole === 'owner') {
            property.owner = claim.claimant;
        }

        if (claim.claimRole === 'caretaker') {
            const normalizedEmail = String(claim.claimantEmail || '').trim().toLowerCase();
            if (normalizedEmail && !property.caretakers.includes(normalizedEmail)) {
                property.caretakers.push(normalizedEmail);
            }
        }
        property.claimReviewedAt = new Date();
        property.claimReviewNote = claim.reviewNote || '';
        property.lastConfirmedAt = new Date();
        if (property.listingTier === 'directory') property.listingTier = 'claimed';
        const lifecycle = applyAutoListingLifecycle(property);
        await property.save();

        if (claim.claimRole === 'owner' && !['houseOwner', 'admin'].includes(claimantUser.role)) {
            claimantUser.role = 'houseOwner';
            await claimantUser.save();
        }

        const message = lifecycle.readyForLive
            ? 'Claim approved. Listing met minimum viability and was auto-promoted to LIVE.'
            : 'Claim approved. Steward can now update listing in Owner Dashboard to reach live minimums.';

        const roleNote = claim.claimRole === 'caretaker'
            ? 'Caretaker approved: ownership remains unchanged.'
            : 'Owner approved: ownership transferred to claimant.';

        const nextSteps = (lifecycle.missing || []).length
            ? `To go live, complete: ${(lifecycle.missing || []).join(', ')}.`
            : 'Your listing now meets live requirements.';

        const isCaretakerClaim = claim.claimRole === 'caretaker';
        const manageUrl = isCaretakerClaim ? '/managed-properties' : '/owner/list-room';
        const manageLabel = isCaretakerClaim ? 'Manage Houses' : 'My Listings';

        await sendPushNotification(claim.claimant, {
            title: 'Property claim approved',
            body: `${nextSteps} Open ${manageLabel} to continue managing this property.`,
            url: manageUrl,
            type: 'system',
            tag: `claim-approved-${property._id}`,
        });

        const claimantEmail = claim.claimantEmail || claimantUser.email;
        if (claimantEmail) {
            sendEmail(
                claimantEmail,
                'Your PataKeja property claim was approved',
                `<p>Your claim for <strong>${property.name}</strong> has been approved.</p>
                 <p>${nextSteps}</p>
                 <p>Open <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}${manageUrl}">${manageLabel}</a> to update and manage it.</p>`
            ).catch((err) => {
                console.warn('Claim approval email failed:', err?.message || err);
            });
        }

        res.json({
            success: true,
            message: `${message} ${roleNote}`,
            lifecycle,
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Reject claim request (admin)
export const rejectPropertyClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { reviewNote = '' } = req.body;

        const claim = await PropertyClaim.findById(claimId);
        if (!claim) return res.json({ success: false, message: 'Claim not found' });

        claim.status = 'rejected';
        claim.reviewNote = String(reviewNote || '').trim();
        claim.reviewedBy = req.user._id;
        claim.reviewedAt = new Date();
        await claim.save();

        const property = await Property.findById(claim.property);
        if (property) {
            property.claimStatus = 'rejected';
            property.claimReviewedAt = new Date();
            property.claimReviewNote = claim.reviewNote || '';
            await property.save();
        }

        res.json({ success: true, message: 'Claim rejected' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Reset listing claim state back to unclaimed (admin)
export const resetPropertyClaimState = async (req, res) => {
    try {
        const { propertyId, removeCaretakers = true } = req.body;
        if (!propertyId) return res.json({ success: false, message: 'Property ID is required' });

        const property = await Property.findById(propertyId);
        if (!property) return res.json({ success: false, message: 'Property not found' });

        property.isClaimed = false;
        property.claimedBy = null;
        property.claimedByEmail = '';
        property.claimRole = '';
        property.claimPhone = '';
        property.claimStatus = 'none';
        property.claimReviewNote = '';
        property.claimReviewedAt = null;
        property.claimSubmittedAt = null;
        if (removeCaretakers) {
            property.caretakers = [];
        }

        property.listingTier = 'directory';
        property.actionability = 'info_only';
        await property.save();

        await PropertyClaim.updateMany(
            { property: propertyId, status: { $in: ['pending', 'approved', 'more_info_required'] } },
            { $set: { status: 'rejected', reviewNote: 'Claim reset by admin', reviewedBy: req.user._id, reviewedAt: new Date() } }
        );

        return res.json({ success: true, message: 'Listing claim state reset to unclaimed', property });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
