import React, {useState, useEffect} from 'react'
import Title from '../components/Title'
import { assets} from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { BookingRowSkeleton } from '../components/Skeletons'
import { useSearchParams } from 'react-router-dom'

const getBookingRent = (booking) => {
    if (booking?.roomDetails?.pricePerMonth) return booking.roomDetails.pricePerMonth
    if (booking?.roomDetails?.price) return booking.roomDetails.price
    try {
        const b = booking?.property?.buildings?.find(x => String(x.id) === String(booking?.roomDetails?.buildingId))
        const cell = b?.grid?.[booking?.roomDetails?.row]?.[booking?.roomDetails?.col]
        return cell?.pricePerMonth || cell?.price || 0
    } catch {
        return 0
    }
}

const MyBooking = () => {
    const { axios, getToken, user } = useAppContext()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchParams] = useSearchParams()
    const [noticeDates, setNoticeDates] = useState({}) // bookingId -> date string
    const [givingNotice, setGivingNotice] = useState(null)
    const [confirmingMoveOut, setConfirmingMoveOut] = useState(null)

    useEffect(() => {
        if (searchParams.get('moved') === '1') {
            toast.success('Move-in confirmed! Welcome home 🎉')
        }
        if (searchParams.get('movedOut') === '1') {
            toast.success('Move-out confirmed. The room is now marked vacant.')
        }
        if (searchParams.get('moveOut') === 'no') {
            toast('Noted. You are still in the room - set a new move-out date when ready.')
        }
    }, [])

    useEffect(() => {
        if (user) {
            fetchBookings()
        }
    }, [user])

    useEffect(() => {
        const bookingId = searchParams.get('bookingId')
        const token = searchParams.get('token')
        const answer = searchParams.get('moveOutAction')
        if (!bookingId || !token || !['yes', 'no'].includes(answer || '')) return

        const run = async () => {
            try {
                const { data } = await axios.get('/api/bookings/move-out-action', {
                    params: { id: bookingId, token, answer }
                })
                if (data?.success) toast.success(data.message || 'Move-out action recorded')
                else toast.error(data?.message || 'Move-out action failed')
            } catch {
                toast.error('Move-out action failed')
            } finally {
                fetchBookings()
            }
        }

        run()
    }, [searchParams])

    const handleMoveOutNow = async (bookingId) => {
        if (!confirm('Confirm you have now moved out? This will mark the room as vacant.')) return
        setConfirmingMoveOut(bookingId)
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/bookings/confirm-move-out', { bookingId, completeNow: true }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (data.success) {
                toast.success(data.message || 'Move-out confirmed')
                fetchBookings()
            } else {
                toast.error(data.message || 'Failed to confirm move-out')
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to confirm move-out')
        } finally {
            setConfirmingMoveOut(null)
        }
    }

    const handleGiveNotice = async (bookingId) => {
        const moveOutDate = noticeDates[bookingId]
        if (!moveOutDate) { toast.error('Please select your expected move-out date'); return }
        if (!confirm(`Give notice to vacate on ${new Date(moveOutDate).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}?`)) return
        setGivingNotice(bookingId)
        try {
            const token = await getToken();
            const { data } = await axios.post('/api/bookings/give-notice', { bookingId, moveOutDate }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) { toast.success('Notice sent. Owner and caretaker have been notified.'); fetchBookings(); }
            else toast.error(data.message);
        } catch { toast.error('Failed to give notice'); }
        finally { setGivingNotice(null); }
    };

    const handleMoveIn = async (bookingId) => {
        if (!confirm('Confirm that you have moved in?')) return;
        try {
            const token = await getToken();
            const { data } = await axios.post('/api/bookings/move-in', { bookingId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) { toast.success('Move-in confirmed!'); fetchBookings(); }
            else toast.error(data.message);
        } catch (error) { toast.error('Failed to confirm move-in'); }
    };

    const fetchBookings = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/bookings/user', {
                headers: { Authorization: `Bearer ${token}` }
            })
            
            if (data.success) {
                setBookings(data.bookings || [])
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error('Failed to fetch bookings')
        } finally {
            setLoading(false)
        }
    }


  return (
    <div className='py-28 md:pb-35 md:pt-32 px-4 md:px-16 lg:px-24 xl:px-32'>
        <Title title='My Bookings' subTitle='Track your active rental bookings and move-in status.' align='left'/>

        {loading ? (
            <div className='max-w-6xl mt-8 w-full'>
              {[...Array(3)].map((_, i) => <BookingRowSkeleton key={i} />)}
            </div>
        ) : bookings.length === 0 ? (
            <div className='text-center py-12 text-gray-500'>No active bookings yet</div>
        ) : (
            <div className='max-w-6xl mt-8 w-full text-gray-800 dark:text-gray-200'>
                <div className='hidden md:grid md:grid-cols-[3fr_2fr_1fr] w-full border-b border-gray-300 dark:border-gray-700 font-medium text-base py-3'>
                    <div>Property Details</div>
                    <div>Move-In Status</div>
                    <div>Booking Status</div>
                </div>

                {bookings.map((booking)=>(
                    <div key={booking._id} className='grid grid-cols-1 md:grid-cols-[3fr_2fr_1fr] w-full border-b border-gray-300 dark:border-gray-700 py-6 first:border-t gap-4'>

                        {/*Property Details*/}
                        <div className='flex flex-col md:flex-row gap-4'>
                            {booking.property?.images?.[0] && (
                                <img src={booking.property.images[0]} alt="" className='w-full md:w-44 h-32 rounded shadow object-cover'/>
                            )}
                            <div className='flex flex-col gap-1.5'>
                                <p className='font-playfair text-2xl'>{booking.property?.name || 'Property'}
                                    <span className='font-inter text-sm'> ({booking.roomDetails?.roomType})</span>
                                </p>
                                <div className='flex items-center gap-1 text-sm text-gray-500'>
                                    <img src={assets.locationIcon} alt="" className='w-4 h-4' />
                                    <span>{booking.property?.estate}, {booking.property?.place}</span>
                                </div>
                                <div className='flex items-center gap-2 text-sm mt-2'>
                                    <span className='px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium'>
                                        Ksh {getBookingRent(booking).toLocaleString()}/month
                                    </span>
                                </div>
                                <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                                    Building: {booking.roomDetails?.buildingName}
                                </p>
                            </div>
                        </div>

                        {/*Move-In Status*/}
                        <div className='flex flex-col justify-center gap-2'>
                            <div>
                                <p className='font-medium text-sm'>Move-In Date:</p>
                                <p className='text-gray-600 dark:text-gray-400 text-sm'>
                                    {booking.moveInDate ? new Date(booking.moveInDate).toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' }) : 'Not set'}
                                </p>
                            </div>
                            <div className='flex items-center gap-2 mt-1'>
                                <div className={`h-3 w-3 rounded-full ${booking.moveOutStatus === 'completed' ? "bg-blue-500" : booking.hasMoved ? "bg-green-500" : "bg-yellow-500" }`}></div>
                                <p className={`text-sm font-medium ${booking.moveOutStatus === 'completed' ? "text-blue-600" : booking.hasMoved ? "text-green-600" : "text-yellow-600" }`}>
                                    {booking.moveOutStatus === 'completed' ? "Moved Out" : booking.hasMoved ? "Moved In" : "Not Moved In"}
                                </p>
                            </div>
                            {booking.status === 'confirmed' && !booking.hasMoved && (() => {
                                const moveInDate = booking.moveInDate ? new Date(booking.moveInDate) : null;
                                const isToday = moveInDate && moveInDate <= new Date();
                                return isToday ? (
                                    <div className='mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl'>
                                        <p className='text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2'>🏠 Is today your move-in day?</p>
                                        <div className='flex gap-2'>
                                            <button
                                                onClick={() => handleMoveIn(booking._id)}
                                                className='flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors'
                                            >
                                                ✓ I Moved In!
                                            </button>
                                            <button
                                                className='flex-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors'
                                                onClick={() => toast('No worries — confirm when you move in.')}
                                            >
                                                Not Yet
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleMoveIn(booking._id)}
                                        className='mt-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors'
                                    >
                                        Confirm Move-In
                                    </button>
                                );
                            })()}
                            {/* Give / update move-out notice (available anytime after move-in until completed) */}
                            {booking.hasMoved && booking.moveOutStatus !== 'completed' && (
                                <div className='mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl'>
                                    <p className='text-xs font-semibold text-orange-700 dark:text-orange-300 mb-2'>Planning to move out? Set or update your expected move-out date.</p>
                                    <div className='flex gap-2 items-center'>
                                        <input
                                            type='date'
                                            value={noticeDates[booking._id] || (booking.moveOutDate ? new Date(booking.moveOutDate).toISOString().split('T')[0] : '')}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={e => setNoticeDates(prev => ({ ...prev, [booking._id]: e.target.value }))}
                                            className='flex-1 border border-orange-300 dark:border-orange-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 outline-orange-500'
                                        />
                                        <button
                                            onClick={() => handleGiveNotice(booking._id)}
                                            disabled={givingNotice === booking._id}
                                            className='px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap'
                                        >
                                            {givingNotice === booking._id ? 'Sending...' : (booking.moveOutStatus === 'none' ? 'Give Notice' : 'Update Notice')}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {booking.moveOutStatus === 'notice_given' && (
                                <div className='mt-3 p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg'>
                                    <p className='text-xs text-orange-700 dark:text-orange-300 font-medium'>Move-out notice sent - awaiting owner/caretaker confirmation{booking.moveOutDate ? ` (${new Date(booking.moveOutDate).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' })})` : ''}</p>
                                </div>
                            )}
                            {booking.moveOutStatus === 'scheduled' && (
                                <div className='mt-3 p-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg'>
                                    <p className='text-xs text-amber-700 dark:text-amber-300 font-medium'>Available soon: owner/caretaker confirmed your move-out date{booking.moveOutDate ? ` (${new Date(booking.moveOutDate).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' })})` : ''}. You'll be asked to confirm on that day.</p>
                                </div>
                            )}
                            {booking.moveOutStatus === 'scheduled' && booking.moveOutDate && new Date(booking.moveOutDate) <= new Date() && (
                                <button
                                    onClick={() => handleMoveOutNow(booking._id)}
                                    disabled={confirmingMoveOut === booking._id}
                                    className='mt-2 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-lg hover:bg-orange-700 disabled:opacity-60 transition-colors'
                                >
                                    {confirmingMoveOut === booking._id ? 'Confirming...' : 'I Moved Out'}
                                </button>
                            )}
                        </div>

                        {/*Booking Status*/}
                        <div className='flex flex-col justify-center'>
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium text-center ${
                                booking.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                booking.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                booking.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                        </div>

                    </div>
                ))}
            </div>
        )}

    </div>
  )
}

export default MyBooking
