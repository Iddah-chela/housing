import React, { useEffect, useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { Home, Users, Eye, CalendarCheck, DollarSign, Clock, Building2, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Dashboard = () => {
    const { user, getToken, toast, axios } = useAppContext()
    const navigate = useNavigate()

    const [stats, setStats] = useState({
        totalProperties: 0,
        totalRooms: 0,
        vacantRooms: 0,
        occupiedRooms: 0,
        bookedRooms: 0,
        totalBookings: 0,
        totalRevenue: 0,
        rentCollected: 0,
        pendingViewings: 0,
        confirmedViewings: 0,
        recentBookings: [],
        movingOutBookings: [],
        recentViewings: [],
        properties: []
    })
    const [loading, setLoading] = useState(true)

    const fetchDashboard = async () => {
        try {
            const token = await getToken()
            const headers = { Authorization: `Bearer ${token}` }

            const [bookingsRes, propertiesRes, viewingsRes, rentRes] = await Promise.all([
                axios.get('/api/bookings/property', { headers }),
                axios.get('/api/properties/owner/my-properties', { headers }),
                axios.get('/api/viewing/owner', { headers }).catch(() => ({ data: { success: false } })),
                axios.get('/api/rent-payment/owner/summary', { headers }).catch(() => ({ data: { success: false } }))
            ])

            let totalRooms = 0, vacantRooms = 0, occupiedRooms = 0, bookedRooms = 0
            let monthlyRevenue = 0
            const properties = propertiesRes.data?.properties || []

            properties.forEach(prop => {
                (prop.buildings || []).forEach(building => {
                    (building.grid || []).forEach(row => {
                        row.forEach(cell => {
                            if (cell.type === 'room') {
                                totalRooms++
                                if (cell.isBooked) {
                                    bookedRooms++
                                    monthlyRevenue += (cell.pricePerMonth || 0)
                                } else if (cell.isVacant) {
                                    vacantRooms++
                                } else {
                                    // Occupied (moved-in tenant)
                                    occupiedRooms++
                                    monthlyRevenue += (cell.pricePerMonth || 0)
                                }
                            }
                        })
                    })
                })
            })

            const bookings = bookingsRes.data?.bookings || []
            const totalRevenue = monthlyRevenue
            const movingOutBookings = bookings
                .filter(b => b?.hasMoved && (b.moveOutStatus === 'notice_given' || b.moveOutStatus === 'scheduled'))
                .slice(0, 5)

            const viewings = viewingsRes.data?.viewingRequests || []
            const pendingViewings = viewings.filter(v => v.status === 'pending').length
            const confirmedViewings = viewings.filter(v => v.status === 'confirmed').length

            const rentCollected = rentRes.data?.success ? (rentRes.data.totalCollected || 0) : 0

            setStats({
                totalProperties: properties.length,
                totalRooms,
                vacantRooms,
                occupiedRooms,
                bookedRooms,
                totalBookings: bookings.length,
                totalRevenue,
                rentCollected,
                pendingViewings,
                confirmedViewings,
                recentBookings: bookings.slice(0, 5),
                movingOutBookings,
                recentViewings: viewings.filter(v => v.status === 'pending').slice(0, 5),
                properties
            })
        } catch (error) {
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) fetchDashboard()
    }, [user])

    if (loading) {
        return (
            <div className='flex items-center justify-center py-20'>
                <div className='animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full'></div>
            </div>
        )
    }

    const statCards = [
        { label: 'Properties', value: stats.totalProperties, icon: Building2, color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40' },
        { label: 'Total Rooms', value: stats.totalRooms, icon: Home, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600', iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
        { label: 'Vacant', value: stats.vacantRooms, icon: CheckCircle, color: 'bg-green-50 dark:bg-green-900/30 text-green-600', iconBg: 'bg-green-100 dark:bg-green-900/40' },
        { label: 'Occupied', value: stats.occupiedRooms, icon: XCircle, color: 'bg-red-50 dark:bg-red-900/30 text-red-600', iconBg: 'bg-red-100 dark:bg-red-900/40' },
        { label: 'Booked', value: stats.bookedRooms, icon: CalendarCheck, color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600', iconBg: 'bg-yellow-100 dark:bg-yellow-900/40' },
        { label: 'Total Bookings', value: stats.totalBookings, icon: Users, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600', iconBg: 'bg-purple-100 dark:bg-purple-900/40' },
        { label: 'Rent Collected', value: `Ksh ${stats.rentCollected.toLocaleString()}`, subtitle: `of Ksh ${stats.totalRevenue.toLocaleString()} due`, icon: DollarSign, color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
        { label: 'Pending Viewings', value: stats.pendingViewings, icon: Eye, color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600', iconBg: 'bg-orange-100 dark:bg-orange-900/40', onClick: () => navigate('/owner/viewing-requests') },
    ]

    return (
        <div className='pb-10'>
            <div className='mb-6'>
                <h1 className='text-2xl font-bold text-gray-900'>Dashboard</h1>
                <p className='text-gray-500 text-sm mt-1'>Overview of your properties, bookings, and viewings</p>
            </div>

            {/* Stats Grid */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
                {statCards.map((card, i) => (
                    <div
                        key={i}
                        onClick={card.onClick}
                        className={`${card.color} rounded-xl p-4 transition-all hover:shadow-md ${card.onClick ? 'cursor-pointer' : ''}`}
                    >
                        <div className='flex items-center justify-between mb-3'>
                            <div className={`${card.iconBg} w-10 h-10 rounded-lg flex items-center justify-center`}>
                                <card.icon className='w-5 h-5' />
                            </div>
                            {card.onClick && <span className='text-xs opacity-60'>Click to view</span>}
                        </div>
                        <p className='text-2xl font-bold'>{card.value}</p>
                        <p className='text-sm opacity-70 mt-0.5'>{card.label}</p>
                        {card.subtitle && <p className='text-xs opacity-50 mt-0.5'>{card.subtitle}</p>}
                    </div>
                ))}
            </div>

            <div className='grid lg:grid-cols-2 gap-6'>
                {/* Recent Bookings */}
                <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden'>
                    <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between'>
                        <h2 className='font-semibold text-gray-800 dark:text-gray-100'>Recent Bookings</h2>
                        <span className='text-xs text-gray-400'>{stats.totalBookings} total</span>
                    </div>
                    {stats.recentBookings.length === 0 ? (
                        <div className='p-8 text-center text-gray-400'>
                            <Users className='w-8 h-8 mx-auto mb-2 opacity-40' />
                            <p>No bookings yet</p>
                        </div>
                    ) : (
                        <div className='divide-y divide-gray-100'>
                            {stats.recentBookings.map((booking, i) => (
                                <div key={i} className='px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700'>
                                    <div className='flex items-center gap-3'>
                                        <img
                                            src={booking.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.user?.username || 'U')}&background=6366f1&color=fff&bold=true`}
                                            alt=''
                                            className='w-8 h-8 rounded-full object-cover'
                                            onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.user?.username || 'U')}&background=6366f1&color=fff&bold=true`; if (e.target.src !== fb) e.target.src = fb }}
                                        />
                                        <div>
                                            <p className='text-sm font-medium text-gray-800'>{booking.user?.username || 'Tenant'}</p>
                                            <p className='text-xs text-gray-500'>{booking.roomDetails?.roomType} — {booking.roomDetails?.buildingName}</p>
                                        </div>
                                    </div>
                                    <div className='text-right'>
                                        <p className='text-sm font-medium text-gray-700'>Ksh {booking.roomDetails?.pricePerMonth?.toLocaleString()}/mo</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                            booking.status === 'moved-in' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {booking.status === 'confirmed' ? 'Confirmed' : booking.status === 'moved-in' ? 'Moved In' : booking.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Viewing Requests */}
                <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden'>
                    <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between'>
                        <h2 className='font-semibold text-gray-800 dark:text-gray-100'>Pending Viewings</h2>
                        <button onClick={() => navigate('/owner/viewing-requests')} className='text-xs text-indigo-600 hover:underline'>View all</button>
                    </div>
                    {stats.recentViewings.length === 0 ? (
                        <div className='p-8 text-center text-gray-400'>
                            <Eye className='w-8 h-8 mx-auto mb-2 opacity-40' />
                            <p>No pending viewings</p>
                        </div>
                    ) : (
                        <div className='divide-y divide-gray-100'>
                            {stats.recentViewings.map((viewing, i) => (
                                <div key={i} className='px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700'>
                                    <div className='flex items-center gap-3'>
                                        <img
                                            src={viewing.renter?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewing.renter?.username || 'U')}&background=6366f1&color=fff&bold=true`}
                                            alt=''
                                            className='w-8 h-8 rounded-full object-cover'
                                            onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(viewing.renter?.username || 'U')}&background=6366f1&color=fff&bold=true`; if (e.target.src !== fb) e.target.src = fb }}
                                        />
                                        <div>
                                            <p className='text-sm font-medium text-gray-800'>{viewing.renter?.username || 'Tenant'}</p>
                                            <p className='text-xs text-gray-500'>{viewing.roomDetails?.roomType} — {new Date(viewing.viewingDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <span className='bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1'>
                                        <Clock className='w-3 h-3' /> Pending
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Moving Out Tenants */}
            <div className='mt-6 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-xl overflow-hidden'>
                <div className='px-5 py-4 border-b border-amber-100 dark:border-amber-800 flex items-center justify-between'>
                    <h2 className='font-semibold text-amber-800 dark:text-amber-300'>Moving Out Tenants</h2>
                    <button onClick={() => navigate('/owner/bookings')} className='text-xs text-indigo-600 hover:underline'>Manage in Bookings</button>
                </div>
                {stats.movingOutBookings.length === 0 ? (
                    <div className='p-6 text-center text-gray-400 text-sm'>No active move-out notices.</div>
                ) : (
                    <div className='divide-y divide-gray-100 dark:divide-gray-700'>
                        {stats.movingOutBookings.map((booking, i) => (
                            <div key={i} className='px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/40'>
                                <div>
                                    <p className='text-sm font-medium text-gray-800 dark:text-gray-100'>{booking.user?.username || booking.user?.email || 'Tenant'}</p>
                                    <p className='text-xs text-gray-500 dark:text-gray-400'>{booking.property?.name || 'Property'} - {booking.roomDetails?.buildingName || 'Building'} · {booking.roomDetails?.roomType || 'Room'}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${booking.moveOutStatus === 'scheduled' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'}`}>
                                    {booking.moveOutStatus === 'scheduled' ? 'Scheduled' : 'Notice Given'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Property Overview */}
            {stats.properties.length > 0 && (
                <div className='mt-8'>
                    <h2 className='font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                        <Building2 className='w-4 h-4 text-indigo-500' /> Your Properties
                    </h2>
                    <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {stats.properties.map((prop, i) => {
                            const rooms = []
                            ;(prop.buildings || []).forEach(b => (b.grid || []).forEach(r => r.forEach(c => { if (c.type === 'room') rooms.push(c) })))
                            const vacant = rooms.filter(r => r.isVacant && !r.isBooked).length
                            const booked = rooms.filter(r => r.isBooked).length
                            return (
                                <div key={i} onClick={() => navigate(`/rooms/${prop._id}`)} className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer'>
                                    {prop.images?.[0] && (
                                        <img src={prop.images[0]} alt='' className='w-full h-32 object-cover' />
                                    )}
                                    <div className='p-4'>
                                        <h3 className='font-semibold text-gray-800 truncate'>{prop.name}</h3>
                                        <p className='text-xs text-gray-500 mt-0.5'>{prop.estate}, {prop.place}</p>
                                        <div className='flex gap-2 mt-3'>
                                            <span className='text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full'>{vacant} vacant</span>
                                            <span className='text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full'>{booked} booked</span>
                                            <span className='text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full'>{rooms.length} total</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Dashboard
