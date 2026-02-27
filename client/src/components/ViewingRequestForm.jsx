import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';

const ViewingRequestForm = ({ room, propertyId, ownerId, onClose, onSuccess }) => {
  const { axios, getToken, user } = useAppContext();
  const [viewingDate, setViewingDate] = useState('');
  const [viewingTimeRange, setViewingTimeRange] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const timeRanges = [
    'Morning (9AM-12PM)',
    'Afternoon (12PM-5PM)',
    'Evening (5PM-8PM)'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to request a viewing');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/viewing/create', {
        propertyId: propertyId,
        roomDetails: {
          buildingId: room.buildingId,
          buildingName: room.buildingName,
          row: room.row,
          col: room.col,
          roomType: room.roomType
        },
        ownerId: ownerId,
        viewingDate,
        viewingTimeRange,
        message
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
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md my-auto max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Request Viewing</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Date
              </label>
              <input
                type="date"
                value={viewingDate}
                onChange={(e) => setViewingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Time
              </label>
              <select
                value={viewingTimeRange}
                onChange={(e) => setViewingTimeRange(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-primary"
              >
                <option value="">Select time range</option>
                {timeRanges.map((range) => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the owner a bit about yourself..."
                rows="4"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-primary resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dull transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ViewingRequestForm;
