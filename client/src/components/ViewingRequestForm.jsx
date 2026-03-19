import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';

const ViewingRequestForm = ({ room, propertyId, ownerId, onClose, onSuccess, isDirectApply = false }) => {
  const { axios, getToken, user } = useAppContext();
  const [viewingDate, setViewingDate] = useState('');
  const [viewingTimeRange, setViewingTimeRange] = useState('');
  const [message, setMessage] = useState('');
  const [preferredMoveInDate, setPreferredMoveInDate] = useState('');
  const [loading, setLoading] = useState(false);

  const timeRanges = [
    'Morning (9AM-12PM)',
    'Afternoon (12PM-5PM)',
    'Evening (5PM-8PM)'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!user) {
      toast.error('Please sign in to request a viewing');
      setLoading(false);
      return;
    }

    if (!preferredMoveInDate) {
      toast.error('Please select your preferred move-in date');
      setLoading(false);
      return;
    }

    // Validate dates for available-soon rooms
    if (room.isMoveOutSoon && room.availableFrom) {
      const availableDate = new Date(room.availableFrom);
      const moveInDate = new Date(preferredMoveInDate);
      const viewDate = viewingDate ? new Date(viewingDate) : null;
      
      if (!isDirectApply && viewDate && viewDate < availableDate) {
        toast.error(`You cannot schedule a viewing before ${availableDate.toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}`);
        setLoading(false);
        return;
      }
      
      if (moveInDate < availableDate) {
        toast.error(`The room will not be available until ${availableDate.toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}. Please select a move-in date on or after that date.`);
        setLoading(false);
        return;
      }
    }

    try {
      const token = await getToken();
      const { data } = await axios.post(
        isDirectApply ? '/api/viewing/direct-apply' : '/api/viewing/create',
        {
        propertyId: propertyId,
        roomDetails: {
          buildingId: room.buildingId,
          buildingName: room.buildingName,
          row: room.row,
          col: room.col,
          roomType: room.roomType
        },
        ownerId: ownerId,
        ...(isDirectApply ? {} : { viewingDate, viewingTimeRange }),
        message,
        preferredMoveInDate: preferredMoveInDate || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        toast.success('Viewing request sent successfully!');
        onSuccess && onSuccess(data.viewingRequest);
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md my-auto max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">{isDirectApply ? 'Apply Directly' : 'Request Viewing'}</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          {room.isMoveOutSoon && room.availableFrom && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300">⏳ This room will be <strong>available from {new Date(room.availableFrom).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}</strong>.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isDirectApply && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Date
              </label>
              <input
                type="date"
                value={viewingDate}
                onChange={(e) => setViewingDate(e.target.value)}
                min={room.isMoveOutSoon && room.availableFrom ? new Date(room.availableFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-primary dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            )}

            {!isDirectApply && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Time
              </label>
              <select
                value={viewingTimeRange}
                onChange={(e) => setViewingTimeRange(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-primary dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Select time range</option>
                {timeRanges.map((range) => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the owner a bit about yourself..."
                rows="4"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-primary dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preferred Move-in Date <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">If you like the room, we'll use this date to book it for you automatically.</p>
              <input
                type="date"
                value={preferredMoveInDate}
                onChange={(e) => setPreferredMoveInDate(e.target.value)}
                min={room.isMoveOutSoon && room.availableFrom ? new Date(room.availableFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 outline-none focus:border-primary dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dull transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : isDirectApply ? 'Submit Application' : 'Send Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ViewingRequestForm;
