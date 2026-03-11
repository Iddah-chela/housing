import React, { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import { ViewingSkeleton } from '../components/Skeletons';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';

const MyViewings = () => {
  const { axios, getToken, user, isOwner, navigate } = useAppContext();
  const [viewings, setViewings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightRef = useRef(null);
  const [decidingId, setDecidingId] = useState(null);

  const handleRenterDecision = async (viewingId, answer) => {
    setDecidingId(viewingId);
    try {
      const { data } = await axios.post(`/api/viewing/${viewingId}/renter-decision?answer=${answer}`, {}, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      if (data.success) {
        toast.success(data.message);
        if (answer === 'yes') navigate('/my-bookings');
        else setViewings(prev => prev.map(v => v._id === viewingId ? { ...v, status: 'completed' } : v));
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDecidingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchViewings();
    }
  }, [user]);

  // Deep-link: scroll to a specific viewing from notification
  useEffect(() => {
    const viewingId = searchParams.get('viewingId');
    if (viewingId && viewings.length > 0 && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchParams.delete('viewingId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [viewings, searchParams]);

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
      toast.error('Could not load viewings. Please try again.');
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
      toast.error('Something went wrong. Please try again.');
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
        toast.success('Room booked! Redirecting to My Bookings...');
        setBookingViewingId(null);
        setMoveInDate('');
        setTimeout(() => navigate('/my-bookings'), 1200);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
      confirmed: { text: 'Confirmed', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
      declined: { text: 'Declined', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
      completed: { text: 'Completed', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
      expired: { text: 'Expired', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
      booked: { text: 'Booked', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' }
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
        <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded w-56 mb-8 animate-pulse' />
        <div className='space-y-4'>
          {[...Array(4)].map((_, i) => <ViewingSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="py-28 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen">
      <h1 className="text-3xl font-medium mb-8">
        {isOwner ? 'Viewing Requests' : 'My Viewing Requests'}
      </h1>

      {viewings.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No viewing requests yet</p>
          <p className="text-gray-400 dark:text-gray-500 mt-2">
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
                ref={viewing._id === searchParams.get('viewingId') ? highlightRef : null}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${viewing._id === searchParams.get('viewingId') ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={otherUser.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(otherUser.username || 'U') + '&background=6366f1&color=fff'}
                        alt={otherUser.username}
                        onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(otherUser.username || 'U') + '&background=6366f1&color=fff' }}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium">{otherUser.username}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isRenter ? 'House Owner' : 'Renter'}
                          </p>
                          {viewing.isDirectApply && (
                            <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-medium rounded-full">Direct Apply</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Property:</span> {viewing.property?.name || 'N/A'}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Room:</span> {viewing.roomDetails?.roomType || 'N/A'}{viewing.roomDetails?.buildingName ? ` (${viewing.roomDetails.buildingName})` : ''}
                      </p>
                      {viewing.viewingDate && (
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Date:</span> {formatDate(viewing.viewingDate)}
                        </p>
                      )}
                      {viewing.viewingTimeRange && (
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Time:</span> {viewing.viewingTimeRange}
                        </p>
                      )}
                      {viewing.preferredMoveInDate && (
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Preferred Move-in:</span> {formatDate(viewing.preferredMoveInDate)}
                        </p>
                      )}
                      {viewing.message && (
                        <p className="text-gray-700 dark:text-gray-300 mt-3">
                          <span className="font-medium">Message:</span>
                          <br />
                          <span className="text-gray-600 dark:text-gray-400">{viewing.message}</span>
                        </p>
                      )}
                      {viewing.ownerResponse && (
                        <p className="text-gray-700 dark:text-gray-300 mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="font-medium">Owner's response:</span>
                          <br />
                          <span className="text-gray-600 dark:text-gray-400">{viewing.ownerResponse}</span>
                        </p>
                      )}

                      {/* Show map link after viewing is confirmed */}
                      {isRenter && viewing.status === 'confirmed' && (viewing.property?.googleMapsUrl || viewing.property?.address) && (
                        <div className='mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg'>
                          <p className='text-xs font-semibold text-green-700 dark:text-green-300 mb-1.5 flex items-center gap-1.5'>
                            <MapPin className='w-3.5 h-3.5' /> Property Location
                          </p>
                          {viewing.property?.address && (
                            <p className='text-sm text-gray-700 dark:text-gray-300 mb-1.5'>{viewing.property.address}{viewing.property.estate ? `, ${viewing.property.estate}` : ''}</p>
                          )}
                          {viewing.property?.googleMapsUrl && (
                            <a
                              href={viewing.property.googleMapsUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-all'
                            >
                              <Navigation className='w-3.5 h-3.5' /> Open in Google Maps
                            </a>
                          )}
                        </div>
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

                    {/* Nudge / booking status — renter only */}
                    {isRenter && viewing.status === 'confirmed' && !viewing.isDirectApply && (() => {
                      const viewingPassed = viewing.viewingDate && new Date(viewing.viewingDate) < new Date();
                      return viewingPassed ? (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold mb-2">How did the viewing go?</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">Did you like the room? You can book it instantly or let us know it wasn't for you.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRenterDecision(viewing._id, 'yes')}
                              disabled={decidingId === viewing._id}
                              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
                            >
                              {decidingId === viewing._id ? 'Processing...' : '✓ Book This Room'}
                            </button>
                            <button
                              onClick={() => handleRenterDecision(viewing._id, 'no')}
                              disabled={decidingId === viewing._id}
                              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 text-gray-700 dark:text-gray-200 text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
                            >
                              Not for me
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                          <p className="text-sm text-green-700 dark:text-green-300 font-medium">Viewing confirmed!</p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">After your visit, we'll email you a one-tap option to book this room.</p>
                        </div>
                      );
                    })()}

                    {isRenter && viewing.status === 'confirmed' && viewing.isDirectApply && (
                      <div className="mt-2 p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700 rounded-lg">
                        <p className="text-sm text-sky-700 dark:text-sky-300 font-medium">Application approved!</p>
                        <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">Your booking is being set up. Check My Bookings shortly.</p>
                      </div>
                    )}

                    {isRenter && viewing.status === 'booked' && (
                      <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">🎉 Booking confirmed!</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                          <button onClick={() => navigate('/my-bookings')} className="underline hover:no-underline">View your booking →</button>
                        </p>
                      </div>
                    )}

                    {isRenter && viewing.isDirectApply && viewing.status === 'pending' && (
                      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Application under review</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">The house owner is reviewing your direct application.</p>
                      </div>
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
