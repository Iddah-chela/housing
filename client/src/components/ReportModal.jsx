import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';

const ReportModal = ({ type, itemId, userId, onClose }) => {
  const { axios, getToken, user } = useAppContext();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = {
    listing: [
      { value: 'fake_listing', label: 'Fake listing' },
      { value: 'already_taken', label: 'Already taken' },
      { value: 'payment_outside', label: 'Asked for payment outside platform' },
      { value: 'other', label: 'Other' }
    ],
    user: [
      { value: 'harassment', label: 'Harassment' },
      { value: 'spam', label: 'Spam' },
      { value: 'fake_listing', label: 'Posting fake listings' },
      { value: 'other', label: 'Other' }
    ]
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to report');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/reports/create', {
        reportType: type,
        reportedItemId: itemId,
        reportedUserId: userId,
        reason,
        description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        toast.success('Report submitted successfully');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md my-auto max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Report {type}</h2>
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
                Reason for report
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-primary"
              >
                <option value="">Select a reason</option>
                {reasons[type].map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Please provide more information..."
                rows="5"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">
                Your report will be reviewed by our team. False reports may result in account suspension.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
