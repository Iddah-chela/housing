import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import { assets } from '../assets/assets';
import { Star, Send, MessageSquareHeart, MessageCircle, Lightbulb, Bug, ThumbsDown } from 'lucide-react';

const FeedbackModal = ({ onClose }) => {
  const { axios, getToken } = useAppContext();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const categories = [
    { id: 'general', label: 'General', icon: MessageCircle },
    { id: 'praise', label: 'Praise', icon: Star },
    { id: 'feature', label: 'Feature Request', icon: Lightbulb },
    { id: 'bug', label: 'Bug Report', icon: Bug },
    { id: 'complaint', label: 'Complaint', icon: ThumbsDown },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/feedback/submit', {
        category,
        rating,
        message: message.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setSuccess(true);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div onClick={onClose} className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4'>
        <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl'>
          <div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
            <MessageSquareHeart className='w-8 h-8 text-green-600 dark:text-green-400' />
          </div>
          <h2 className='text-2xl font-bold mb-2'>Thank You!</h2>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>Your feedback helps us improve PataKeja for everyone.</p>
          <button
            onClick={onClose}
            className='w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition-all'
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4'>
      <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden'>
        {/* Header */}
        <div className='relative bg-gradient-to-r from-indigo-600 to-purple-600 p-6 dark:bg-gradient-to-r dark:from-indigo-700 dark:to-purple-700 flex items-center gap-4'>
          <img
            src={assets.closeIcon}
            alt="close"
            className='absolute top-4 right-4 h-4 w-4 cursor-pointer invert opacity-80 hover:opacity-100'
            onClick={onClose}
          />
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center'>
              <MessageSquareHeart className='w-6 h-6 text-white' />
            </div>
            <div>
              <h2 className='text-white text-xl font-bold'>Share Your Feedback</h2>
              <p className='text-white/80 text-sm'>Help us improve your experience</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6'>
          {/* Rating */}
          <div className='mb-5'>
            <label className='block text-sm font-medium mb-2'>How would you rate your experience?</label>
            <div className='flex gap-1 justify-center'>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type='button'
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className='p-1 transition-transform hover:scale-110'
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredStar || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className='text-center text-sm text-gray-500 dark:text-gray-400 mt-1'>
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
              </p>
            )}
          </div>

          {/* Category */}
          <div className='mb-5'>
            <label className='block text-sm font-medium mb-2'>Category</label>
            <div className='flex flex-wrap gap-2'>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type='button'
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    category === cat.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <cat.icon className='w-3.5 h-3.5' />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className='mb-5'>
            <label className='block text-sm font-medium mb-2'>
              Your Feedback <span className='text-red-500'>*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={4}
              className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-gray-100'
              placeholder='Tell us what you think — what do you love? What should we improve?'
            />
            <p className='text-xs text-gray-400 text-right mt-1'>{message.length}/1000</p>
          </div>

          {/* Submit */}
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {loading ? (
              <span className='flex items-center gap-2'>
                <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin'></div>
                Submitting...
              </span>
            ) : (
              <>
                <Send className='w-4 h-4' /> Submit Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
