import React, {useState, useEffect} from 'react'
import Title from '../components/Title'
import { assets} from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'

const MyBooking = () => {
    const { axios, getToken, user } = useAppContext()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            fetchBookings()
        }
    }, [user])

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
            console.error('Error fetching bookings:', error)
            toast.error('Failed to fetch bookings')
        } finally {
            setLoading(false)
        }
    }


  return (
    <div className='py-28 md:pb-35 md:pt-32 px-4 md:px-16 lg:px-24 xl:px-32'>
        <Title title='My Rentals' subTitle='Track your active rental bookings and move-in status.' align='left'/>

        {loading ? (
            <div className='text-center py-12'>Loading your bookings...</div>
        ) : bookings.length === 0 ? (
            <div className='text-center py-12 text-gray-500'>No active bookings yet</div>
        ) : (
            <div className='max-w-6xl mt-8 w-full text-gray-800'>
                <div className='hidden md:grid md:grid-cols-[3fr_2fr_1fr] w-full border-b border-gray-300 font-medium text-base py-3'>
                    <div>Property Details</div>
                    <div>Move-In Status</div>
                    <div>Booking Status</div>
                </div>

                {bookings.map((booking)=>(
                    <div key={booking._id} className='grid grid-cols-1 md:grid-cols-[3fr_2fr_1fr] w-full border-b border-gray-300 py-6 first:border-t gap-4'>

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
                                    <span className='px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium'>
                                        Ksh {booking.roomDetails?.pricePerMonth?.toLocaleString()}/month
                                    </span>
                                </div>
                                <p className='text-sm text-gray-600 mt-1'>
                                    Building: {booking.roomDetails?.buildingName}
                                </p>
                            </div>
                        </div>

                        {/*Move-In Status*/}
                        <div className='flex flex-col justify-center gap-2'>
                            <div>
                                <p className='font-medium text-sm'>Move-In Date:</p>
                                <p className='text-gray-600 text-sm'>
                                    {new Date(booking.moveInDate).toDateString()}
                                </p>
                            </div>
                            <div className='flex items-center gap-2 mt-1'>
                                <div className={`h-3 w-3 rounded-full ${booking.hasMoved ? "bg-green-500" : "bg-yellow-500" }`}></div>
                                <p className={`text-sm font-medium ${booking.hasMoved ? "text-green-600" : "text-yellow-600" }`}>
                                    {booking.hasMoved ? "Moved In" : "Not Moved In"}
                                </p>
                            </div>
                            {booking.status === 'confirmed' && !booking.hasMoved && (
                                <button
                                    onClick={() => handleMoveIn(booking._id)}
                                    className='mt-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors'
                                >
                                    Confirm Move-In
                                </button>
                            )}
                        </div>

                        {/*Booking Status*/}
                        <div className='flex flex-col justify-center'>
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium text-center ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
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