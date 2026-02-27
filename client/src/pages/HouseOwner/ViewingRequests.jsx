import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { Check, XCircle, Eye } from 'lucide-react';

const ViewingRequests = () => {
  const { axios, getToken } = useAppContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/viewing/user-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setRequests(data.viewingRequests);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, status) => {
    const responses = {
      confirmed: 'Thank you for your interest! Looking forward to showing you the property.',
      declined: 'Sorry, this time slot is not available. Please request another time.'
    };

    try {
      const token = await getToken();
      const { data } = await axios.post('/api/viewing/respond', {
        requestId,
        status,
        ownerResponse: responses[status]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        toast.success(`Viewing request ${status}`);
        fetchRequests();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleMarkCompleted = async (requestId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/viewing/mark-completed', { requestId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) { toast.success('Viewing marked as completed'); fetchRequests(); }
      else toast.error(data.message);
    } catch (error) { toast.error(error.message); }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      declined: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      expired: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return <div className="p-8">Loading viewing requests...</div>;
  }

  return (
    <div className="p-6 md:p-8 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Viewing Requests</h1>
        <p className="text-gray-600">Manage viewing requests from potential renters</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['pending', 'confirmed', 'declined', 'completed', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              filter === status
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-2 text-xs">
                ({requests.filter(r => r.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No {filter !== 'all' ? filter : ''} viewing requests</p>
          <p className="text-gray-400 mt-2 text-sm">
            Requests from renters will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request._id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Renter Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={request.renter.image}
                      alt={request.renter.username}
                      className="w-14 h-14 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{request.renter.username}</h3>
                      <p className="text-sm text-gray-500">{request.renter.email}</p>
                    </div>
                    <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  {/* Property Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Property</p>
                      <p className="font-medium">{request.house?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Room Type</p>
                      <p className="font-medium">{request.room?.roomType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Viewing Date</p>
                      <p className="font-medium">{formatDate(request.viewingDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Time</p>
                      <p className="font-medium">{request.viewingTimeRange}</p>
                    </div>
                  </div>

                  {/* Renter Message */}
                  {request.message && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Renter's Message:</p>
                      <p className="text-gray-700 p-3 bg-blue-50 rounded-lg text-sm">
                        {request.message}
                      </p>
                    </div>
                  )}

                  {/* Owner Response */}
                  {request.ownerResponse && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Your Response:</p>
                      <p className="text-gray-700 p-3 bg-green-50 rounded-lg text-sm">
                        {request.ownerResponse}
                      </p>
                    </div>
                  )}

                  {/* Request Time */}
                  <p className="text-xs text-gray-400 mt-4">
                    Requested {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex lg:flex-col gap-3">
                    <button
                      onClick={() => handleResponse(request._id, 'confirmed')}
                      className="flex-1 lg:flex-none px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
                    >
                      <span className='flex items-center justify-center gap-1'><Check className='w-4 h-4' /> Confirm</span>
                    </button>
                    <button
                      onClick={() => handleResponse(request._id, 'declined')}
                      className="flex-1 lg:flex-none px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
                    >
                      <span className='flex items-center justify-center gap-1'><XCircle className='w-4 h-4' /> Decline</span>
                    </button>
                  </div>
                )}
                {request.status === 'confirmed' && (
                  <div className="flex lg:flex-col gap-3">
                    <button
                      onClick={() => handleMarkCompleted(request._id)}
                      className="flex-1 lg:flex-none px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium"
                    >
                      <span className='flex items-center justify-center gap-1'><Eye className='w-4 h-4' /> Mark Viewed</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewingRequests;
