import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';

const MyViewings = () => {
  const { axios, getToken, user, isOwner, navigate } = useAppContext();
  const [viewings, setViewings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingViewingId, setBookingViewingId] = useState(null); // which viewing is being booked
  const [moveInDate, setMoveInDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchViewings();
    }
  }, [user]);

  const fetchViewings = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/viewing/user-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setViewings(data.viewingRequests);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, status, ownerResponse = '') => {
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/viewing/respond', {
        requestId,
        status,
        ownerResponse
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        toast.success(`Viewing request ${status}`);
        fetchViewings();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleBook = async (viewing) => {
    if (!moveInDate) {
      toast.error('Please select a move-in date');
      return;
    }
    setBookingLoading(true);
    try {
      // Try to get price from populated property buildings grid
      let pricePerMonth = 0;
      const buildings = viewing.property?.buildings;
      if (buildings) {
        const building = buildings.find(b => b.id === viewing.roomDetails?.buildingId);
        if (building) {
          pricePerMonth = building.grid?.[viewing.roomDetails?.row]?.[viewing.roomDetails?.col]?.pricePerMonth || 0;
        }
      }

      const token = await getToken();
      const { data } = await axios.post('/api/bookings/book', {
        propertyId: viewing.property._id,
        roomDetails: {
          buildingId: viewing.roomDetails.buildingId,
          buildingName: viewing.roomDetails.buildingName,
          row: viewing.roomDetails.row,
          col: viewing.roomDetails.col,
          roomType: viewing.roomDetails.roomType,
          pricePerMonth
        },
        moveInDate,
        viewingRequestId: viewing._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        toast.success('Room booked! Redirecting to My Rentals...');
        setBookingViewingId(null);
        setMoveInDate('');
        setTimeout(() => navigate('/my-bookings'), 1200);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { text: 'Confirmed', color: 'bg-green-100 text-green-800' },
      declined: { text: 'Declined', color: 'bg-red-100 text-red-800' },
      completed: { text: 'Completed', color: 'bg-blue-100 text-blue-800' },
      expired: { text: 'Expired', color: 'bg-gray-100 text-gray-800' }
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen">
        <p className="text-center">Loading your viewing requests...</p>
      </div>
    );
  }

  return (
    <div className="py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen">
      <h1 className="text-3xl font-medium mb-8">
        {isOwner ? 'Viewing Requests' : 'My Viewing Requests'}
      </h1>

      {viewings.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No viewing requests yet</p>
          <p className="text-gray-400 mt-2">
            {isOwner 
              ? 'Requests from renters will appear here' 
              : 'Start requesting viewings to find your next home!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {viewings.map((viewing) => {
            const isRenter = viewing.renter?._id === user?.id;
            const otherUser = isRenter ? viewing.owner : viewing.renter;
            if (!otherUser) return null;

            return (
              <div
                key={viewing._id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={otherUser.image}
                        alt={otherUser.username}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <h3 className="font-medium">{otherUser.username}</h3>
                        <p className="text-sm text-gray-500">
                          {isRenter ? 'House Owner' : 'Renter'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="text-gray-700">
                        <span className="font-medium">Property:</span> {viewing.property?.name || 'N/A'}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Room:</span> {viewing.roomDetails?.roomType || 'N/A'}{viewing.roomDetails?.buildingName ? ` (${viewing.roomDetails.buildingName})` : ''}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Date:</span> {formatDate(viewing.viewingDate)}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Time:</span> {viewing.viewingTimeRange}
                      </p>
                      {viewing.message && (
                        <p className="text-gray-700 mt-3">
                          <span className="font-medium">Message:</span>
                          <br />
                          <span className="text-gray-600">{viewing.message}</span>
                        </p>
                      )}
                      {viewing.ownerResponse && (
                        <p className="text-gray-700 mt-3 p-3 bg-gray-50 rounded">
                          <span className="font-medium">Owner's response:</span>
                          <br />
                          <span className="text-gray-600">{viewing.ownerResponse}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(viewing.status).color}`}>
                      {getStatusBadge(viewing.status).text}
                    </span>

                    {!isRenter && viewing.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResponse(viewing._id, 'confirmed', 'Looking forward to showing you the property!')}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleResponse(viewing._id, 'declined', 'Unfortunately this time slot is not available')}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Book This Room — renter only, after viewing is confirmed or completed */}
                    {isRenter && (viewing.status === 'confirmed' || viewing.status === 'completed') && (
                      bookingViewingId === viewing._id ? (
                        <div className="flex flex-col items-end gap-2 bg-indigo-50 border border-indigo-200 rounded-lg p-3 mt-1">
                          <p className="text-xs font-medium text-indigo-700">Select your move-in date</p>
                          <input
                            type="date"
                            value={moveInDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setMoveInDate(e.target.value)}
                            className="border border-indigo-300 rounded px-2 py-1 text-sm outline-indigo-500 w-full"
                          />
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={() => handleBook(viewing)}
                              disabled={bookingLoading}
                              className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-60"
                            >
                              {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                            </button>
                            <button
                              onClick={() => { setBookingViewingId(null); setMoveInDate('') }}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setBookingViewingId(viewing._id); setMoveInDate('') }}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-all font-medium"
                        >
                          Book This Room
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyViewings;
