import Feedback from '../models/feedback.js';

// Submit feedback (authenticated users)
export const submitFeedback = async (req, res) => {
  try {
    const { category, rating, message } = req.body;
    const userId = req.user._id;

    if (!rating || !message) {
      return res.json({ success: false, message: 'Rating and message are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    if (message.length > 1000) {
      return res.json({ success: false, message: 'Message must be under 1000 characters' });
    }

    const feedback = await Feedback.create({
      user: userId,
      username: req.user?.username || 'Anonymous',
      userImage: req.user?.image || '',
      category: category || 'general',
      rating,
      message
    });

    res.json({ success: true, message: 'Thank you for your feedback!', feedback });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get all feedback (admin only)
export const getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .lean();

    // Compute stats
    const total = feedback.length;
    const avgRating = total > 0 ? (feedback.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1) : 0;
    const categoryBreakdown = {};
    const statusBreakdown = { new: 0, reviewed: 0, resolved: 0 };

    feedback.forEach(f => {
      categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + 1;
      statusBreakdown[f.status] = (statusBreakdown[f.status] || 0) + 1;
    });

    res.json({
      success: true,
      feedback,
      stats: { total, avgRating, categoryBreakdown, statusBreakdown }
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Update feedback status (admin only)
export const updateFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId, status, adminNote } = req.body;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.json({ success: false, message: 'Feedback not found' });
    }

    if (status) feedback.status = status;
    if (adminNote !== undefined) feedback.adminNote = adminNote;
    await feedback.save();

    res.json({ success: true, message: 'Feedback updated', feedback });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Delete feedback (admin only)
export const deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    await Feedback.findByIdAndDelete(feedbackId);
    res.json({ success: true, message: 'Feedback deleted' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
