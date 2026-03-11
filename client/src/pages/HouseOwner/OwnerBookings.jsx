import React, { useEffect, useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { BookingRowSkeleton } from '../../components/Skeletons'
import { MapPin, CalendarDays, User, CheckCircle2, LogOut } from 'lucide-react'

const statusColors = {
    confirmed:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    pending:    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    cancelled:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    completed:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
}

const OwnerBookings = () => {
    const { axios, getToken, toast } = useAppContext()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [confirming, setConfirming] = useState(null) // bookingId being confirmed
    const [movingOut, setMovingOut] = useState(null) // bookingId for move-out confirm

    useEffect(() => {
        fetchBookings()
    }, [])

    const confirmMoveOut = async (bookingId) => {
        if (!confirm('Confirm this tenant has vacated the room?')) return
        setMovingOut(bookingId)
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/bookings/confirm-move-out', { bookingId }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (data.success) {
                toast.success('Move-out confirmed — room is now vacant')
                setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, moveOutStatus: 'completed' } : b))
            } else {
                toast.error(data.message)
            }
        } catch {
            toast.error('Failed to confirm move-out')
        } finally {
            setMovingOut(null)
        }
    }

    const fetchBookings = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/bookings/property', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (data.success) setBookings(data.bookings || [])
            else toast.error(data.message)
        } catch {
            toast.error('Failed to load bookings')
        } finally {
            setLoading(false)
        }
    }

    const markMovedIn = async (bookingId) => {
        setConfirming(bookingId)
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/bookings/move-in-as-owner', { bookingId }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (data.success) {
                toast.success('Move-in confirmed — tenant has been notified')
                setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, hasMoved: true } : b))
            } else {
                toast.error(data.message)
            }
        } catch {
            toast.error('Failed to confirm move-in')
        } finally {
            setConfirming(null)
        }
    }

    const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

    return (
        <div>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6'>
                <div>
                    <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Tenant Bookings</h1>
                    <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>{bookings.length} total booking{bookings.length !== 1 ? 's' : ''}</p>
                </div>
                <div className='flex gap-2 flex-wrap'>
                    {['all','confirmed','pending','completed','cancelled'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                                filter === f
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className='space-y-2'>{[...Array(4)].map((_, i) => <BookingRowSkeleton key={i} />)}</div>
            ) : filtered.length === 0 ? (
                <div className='text-center py-16 text-gray-400 dark:text-gray-500'>
                    <CalendarDays className='w-10 h-10 mx-auto mb-3 opacity-40' />
                    <p>No {filter !== 'all' ? filter : ''} bookings yet</p>
                </div>
            ) : (
                <div className='space-y-4'>
                    {filtered.map(booking => {
                        const moveInDate = booking.moveInDate ? new Date(booking.moveInDate) : null
                        const isPast = moveInDate && moveInDate <= new Date()
                        return (
                            <div key={booking._id} className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row gap-4'>

                                {/* Property image */}
                                {booking.property?.images?.[0] && (
                                    <img
                                        src={booking.property.images[0]}
                                        alt=""
                                        className='w-full sm:w-32 h-24 object-cover rounded-lg flex-shrink-0'
                                    />
                                )}

                                {/* Main info */}
                                <div className='flex-1 min-w-0'>
                                    <div className='flex flex-wrap items-start justify-between gap-2'>
                                        <div>
                                            <p className='font-semibold text-gray-900 dark:text-white truncate'>
                                                {booking.property?.name || 'Property'}
                                                <span className='font-normal text-sm text-gray-500 dark:text-gray-400 ml-1.5'>
                                                    ({booking.roomDetails?.roomType})
                                                </span>
                                            </p>
                                            <div className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                                                <MapPin className='w-3 h-3' />
                                                {booking.property?.estate}, {booking.property?.place}
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[booking.status] || statusColors.pending}`}>
                                            {booking.status}
                                        </span>
                                    </div>

                                    <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300'>
                                        <span className='flex items-center gap-1'>
                                            <User className='w-3.5 h-3.5' />
                                            {booking.user?.username || booking.user?.email || 'Tenant'}
                                        </span>
                                        {moveInDate && (
                                            <span className='flex items-center gap-1'>
                                                <CalendarDays className='w-3.5 h-3.5' />
                                                Move-in: {moveInDate.toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' })}
                                            </span>
                                        )}
                                        <span className='text-indigo-600 dark:text-indigo-400 font-medium'>
                                            Ksh {booking.roomDetails?.pricePerMonth?.toLocaleString()}/mo
                                        </span>
                                    </div>

                                    {/* Move-in status badge */}
                                    <div className='mt-2 flex items-center gap-2 flex-wrap'>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                            booking.hasMoved
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${booking.hasMoved ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                            {booking.hasMoved ? 'Moved In' : 'Not Yet Moved In'}
                                        </span>
                                        {booking.status === 'confirmed' && !booking.hasMoved && isPast && (
                                            <span className='text-xs text-orange-600 dark:text-orange-400 font-medium'>
                                                ⚠ Move-in date has passed — awaiting confirmation
                                            </span>
                                        )}
                                    </div>

                                    {/* Owner action: mark moved in */}
                                    {booking.status === 'confirmed' && !booking.hasMoved && (
                                        <button
                                            onClick={() => markMovedIn(booking._id)}
                                            disabled={confirming === booking._id}
                                            className='mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors'
                                        >
                                            <CheckCircle2 className='w-3.5 h-3.5' />
                                            {confirming === booking._id ? 'Confirming…' : 'Confirm Tenant Moved In'}
                                        </button>
                                    )}
                                    {/* Owner action: confirm move-out when tenant has given notice */}
                                    {booking.moveOutStatus === 'notice_given' && (
                                        <button
                                            onClick={() => confirmMoveOut(booking._id)}
                                            disabled={movingOut === booking._id}
                                            className='mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors'
                                        >
                                            <LogOut className='w-3.5 h-3.5' />
                                            {movingOut === booking._id ? 'Confirming…' : `Confirm Tenant Vacated${booking.moveOutDate ? ' · ' + new Date(booking.moveOutDate).toLocaleDateString('en-KE', { day:'numeric', month:'short' }) : ''}`}
                                        </button>
                                    )}

                                    <div className='mt-1 text-xs text-gray-400 dark:text-gray-500'>
                                        Building: {booking.roomDetails?.buildingName} · Booked {new Date(booking.createdAt).toLocaleDateString('en-KE')}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default OwnerBookings
