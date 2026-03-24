import React, { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { Shield, Building2, ArrowLeft, LayoutGrid, DollarSign, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Zap, Clock, Bell } from 'lucide-react'
import { ManagedPropertySkeleton } from '../components/Skeletons'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import UtilityManager from './HouseOwner/UtilityManager'
import PropertyListingModal from '../components/PropertyListingModal'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const ManagedProperties = () => {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('availability')
  const [bookingMap, setBookingMap] = useState({}) // key: `${propId}-${bid}-${row}-${col}` → booking
  // Rent tracker state
  const [trackerMonth, setTrackerMonth] = useState(new Date().getMonth() + 1)
  const [trackerYear, setTrackerYear] = useState(new Date().getFullYear())
  const [rentPayments, setRentPayments] = useState({}) // { propertyId: [payment...] }
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [togglingRoom, setTogglingRoom] = useState(null) // key = `${propId}-${bid}-${r}-${c}`
  const [paymentModal, setPaymentModal] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ amountDue: '', amountPaid: '', note: '' })
  const [savingPayment, setSavingPayment] = useState(false)
  // Rent reminders
  const [remindingRoom, setRemindingRoom]   = useState(null) // key string
  const [roomContacts, setRoomContacts]     = useState({})   // { 'propId-bid-r-c': contact }
  const [rentInviteRoom, setRentInviteRoom] = useState(null) // { propertyId, buildingId, row, col, roomNum }
  const [rentInviteForm, setRentInviteForm] = useState({ name: '', phone: '', email: '' })
  const [savingRentContact, setSavingRentContact] = useState(false)
  const [confirmingMoveOut, setConfirmingMoveOut] = useState(null)
  const [editingProperty, setEditingProperty] = useState(null)

  const { user, getToken, axios } = useAppContext()
  const navigate = useNavigate()

  const fetchManagedProperties = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const [propRes, bookRes] = await Promise.all([
        axios.get('/api/properties/managed', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/bookings/property', { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (propRes.data.success) setProperties(propRes.data.properties)
      if (bookRes.data.success) {
        const map = {}
        bookRes.data.bookings.forEach(b => {
          const propId = b?.property?._id || b?.property
          const key = `${propId}-${b.roomDetails.buildingId}-${b.roomDetails.row}-${b.roomDetails.col}`
          map[key] = b
        })
        setBookingMap(map)
      }
    } catch {
      toast.error('Failed to load managed properties')
    } finally {
      setLoading(false)
    }
  }

  const fetchRentPayments = async (month = trackerMonth, year = trackerYear) => {
    if (!properties.length) return
    setLoadingPayments(true)
    try {
      const token = await getToken()
      const results = await Promise.all(
        properties.map(p =>
          axios.get(`/api/rent-payment/${p._id}?month=${month}&year=${year}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      )
      const map = {}
      results.forEach((res, i) => {
        if (res.data.success) map[properties[i]._id] = res.data.payments
      })
      setRentPayments(map)
    } catch {
      toast.error('Failed to load rent payments')
    } finally {
      setLoadingPayments(false)
    }
  }

  const toggleAvailability = async (propertyId, buildingId, row, col) => {
    try {
      const response = await axios.post('/api/properties/caretaker-toggle-room', {
        propertyId, buildingId, row, col
      }, { headers: { Authorization: `Bearer ${await getToken()}` } })
      if (response.data.success) {
        toast.success(response.data.message)
        // Update only the toggled cell locally — no full refetch
        setProperties(prev => prev.map(p => {
          if (p._id !== propertyId) return p
          return {
            ...p,
            buildings: p.buildings.map(b => {
              if (b.id !== buildingId) return b
              const newGrid = b.grid.map((r, ri) =>
                r.map((cell, ci) => {
                  if (ri === row && ci === col) {
                    return {
                      ...cell,
                      isVacant: !cell.isVacant,
                      isBooked: false,
                      isMoveOutSoon: false,
                      availableFrom: null
                    }
                  }
                  return cell
                })
              )
              return { ...b, grid: newGrid }
            })
          }
        }))
      } else {
        toast.error(response.data.message)
      }
    } catch {
      toast.error('Failed to update room availability')
    }
  }

  const confirmMoveOut = async (bookingId) => {
    if (!confirm('Confirm this tenant move-out plan? This marks the room as available soon.')) return
    setConfirmingMoveOut(bookingId)
    try {
      const token = await getToken()
      const { data } = await axios.post('/api/bookings/confirm-move-out', { bookingId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        toast.success('Move-out schedule confirmed')
        setBookingMap(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(prev).map(([key, val]) => [
              key,
              val?._id === bookingId ? { ...val, moveOutStatus: 'scheduled' } : val
            ])
          )
        }))
        fetchManagedProperties()
      } else {
        toast.error(data.message || 'Failed to confirm move-out')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to confirm move-out')
    } finally {
      setConfirmingMoveOut(null)
    }
  }

  const togglePayment = async (propertyId, buildingId, row, col) => {
    const key = `${propertyId}-${buildingId}-${row}-${col}`
    setTogglingRoom(key)
    try {
      const response = await axios.post('/api/rent-payment/toggle', {
        propertyId, buildingId, row, col, month: trackerMonth, year: trackerYear
      }, { headers: { Authorization: `Bearer ${await getToken()}` } })
      if (response.data.success) {
        const p = response.data.payment
        setRentPayments(prev => {
          const existing = [...(prev[propertyId] || [])]
          const idx = existing.findIndex(x => x.buildingId === buildingId && x.row === row && x.col === col)
          if (idx >= 0) existing[idx] = p
          else existing.push(p)
          return { ...prev, [propertyId]: existing }
        })
        toast.success(p.paid ? 'Marked as paid' : 'Marked as unpaid')
      } else {
        toast.error(response.data.message)
      }
    } catch {
      toast.error('Failed to update payment')
    } finally {
      setTogglingRoom(null)
    }
  }

  const getPayStatus = (propertyId, buildingId, row, col) => {
    const list = rentPayments[propertyId] || []
    const rec = list.find(x => x.buildingId === buildingId && x.row === row && x.col === col)
    if (!rec) return 'unpaid'
    return rec.paymentStatus || (rec.paid ? 'full' : 'unpaid')
  }

  const isPaid = (propertyId, buildingId, row, col) =>
    getPayStatus(propertyId, buildingId, row, col) === 'full'

  const markFullyPaid = async (propertyId, buildingId, row, col, payRec, roomRent) => {
    const key = `${propertyId}-${buildingId}-${row}-${col}`
    setTogglingRoom(key)
    try {
      const due = payRec?.amountDue ?? roomRent
      const response = await axios.post('/api/rent-payment/set-amount', {
        propertyId, buildingId, row, col,
        month: trackerMonth, year: trackerYear,
        amountDue: due,
        amountPaid: due,
        note: payRec?.note
      }, { headers: { Authorization: `Bearer ${await getToken()}` } })
      if (response.data.success) {
        const p = response.data.payment
        setRentPayments(prev => {
          const existing = [...(prev[propertyId] || [])]
          const idx = existing.findIndex(x => x.buildingId === buildingId && x.row === row && x.col === col)
          if (idx >= 0) existing[idx] = p; else existing.push(p)
          return { ...prev, [propertyId]: existing }
        })
        toast.success('Marked as fully paid ✓')
      } else {
        toast.error(response.data.message)
      }
    } catch {
      toast.error('Failed to update payment')
    } finally {
      setTogglingRoom(null)
    }
  }

  const setRentAmount = async () => {
    const { propertyId, buildingId, row, col } = paymentModal
    setSavingPayment(true)
    try {
      const response = await axios.post('/api/rent-payment/set-amount', {
        propertyId, buildingId, row, col,
        month: trackerMonth, year: trackerYear,
        amountDue:  paymentForm.amountDue  !== '' ? Number(paymentForm.amountDue)  : undefined,
        amountPaid: paymentForm.amountPaid !== '' ? Number(paymentForm.amountPaid) : undefined,
        note: paymentForm.note
      }, { headers: { Authorization: `Bearer ${await getToken()}` } })
      if (response.data.success) {
        const p = response.data.payment
        setRentPayments(prev => {
          const existing = [...(prev[propertyId] || [])]
          const idx = existing.findIndex(x => x.buildingId === buildingId && x.row === row && x.col === col)
          if (idx >= 0) existing[idx] = p
          else existing.push(p)
          return { ...prev, [propertyId]: existing }
        })
        toast.success('Payment recorded')
        setPaymentModal(null)
      } else {
        toast.error(response.data.message)
      }
    } catch {
      toast.error('Failed to save payment')
    } finally {
      setSavingPayment(false)
    }
  }

  const sendRentReminder = async (propertyId, buildingId, row, col, roomNum) => {
    const key = `${propertyId}-${buildingId}-${row}-${col}`
    setRemindingRoom(key)
    try {
      const response = await axios.post('/api/rent-payment/remind', {
        propertyId, buildingId, row, col, month: trackerMonth, year: trackerYear
      }, { headers: { Authorization: `Bearer ${await getToken()}` } })
      if (response.data.success) {
        const via = response.data.via || ''
        const label = via.includes('sms') ? 'SMS' : via.includes('email') ? 'email' : 'notification'
        toast.success(`Reminder sent via ${label}`)
      } else if (response.data.noTenant) {
        const existing = response.data.contact || roomContacts[key] || {}
        setRentInviteRoom({ propertyId, buildingId, row, col, roomNum })
        setRentInviteForm({ name: existing.name || '', phone: existing.phone || '', email: existing.email || '' })
      } else {
        toast.error(response.data.message)
      }
    } catch {
      toast.error('Failed to send reminder')
    } finally {
      setRemindingRoom(null)
    }
  }

  const saveRentContact = async () => {
    if (!rentInviteRoom) return
    setSavingRentContact(true)
    try {
      const { propertyId, buildingId, row, col } = rentInviteRoom
      const response = await axios.post('/api/utility/room-contact', {
        propertyId, buildingId, row, col,
        name:  rentInviteForm.name.trim(),
        phone: rentInviteForm.phone.trim(),
        email: rentInviteForm.email.trim()
      }, { headers: { Authorization: `Bearer ${await getToken()}` } })
      if (response.data.success) {
        const key = `${propertyId}-${buildingId}-${row}-${col}`
        setRoomContacts(prev => ({ ...prev, [key]: response.data.contact }))
        toast.success('Contact saved! Next reminder will reach them automatically.')
        setRentInviteRoom(null)
      } else {
        toast.error(response.data.message)
      }
    } catch {
      toast.error('Failed to save contact')
    } finally {
      setSavingRentContact(false)
    }
  }

  const changeMonth = (delta) => {
    let m = trackerMonth + delta
    let y = trackerYear
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setTrackerMonth(m)
    setTrackerYear(y)
  }

  useEffect(() => { if (user) fetchManagedProperties() }, [user])
  useEffect(() => { if (activeTab === 'tracker' && properties.length) fetchRentPayments(trackerMonth, trackerYear) }, [activeTab, properties])
  useEffect(() => { if (activeTab === 'tracker' && properties.length) fetchRentPayments(trackerMonth, trackerYear) }, [trackerMonth, trackerYear])

  // Collect all occupied rooms across all buildings for a property
  const getOccupiedRooms = (property) => {
    const rooms = []
    property.buildings?.forEach(building => {
      building.grid?.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell.type === 'room' && !cell.isVacant) {
            let roomNum = 0
            let count = 0
            building.grid.forEach((r, ri) => r.forEach((c, ci) => {
              if (c.type === 'room') { count++; if (ri === rowIndex && ci === colIndex) roomNum = count }
            }))
            rooms.push({ building, buildingId: building.id, row: rowIndex, col: colIndex, roomNum, cell })
          }
        })
      })
    })
    return rooms
  }

  const movingOutBookings = Object.values(bookingMap).filter(b =>
    b?.hasMoved && (b.moveOutStatus === 'notice_given' || b.moveOutStatus === 'scheduled')
  )

  const getBookingRoomNumber = (property, roomDetails) => {
    try {
      const building = property?.buildings?.find(b => String(b.id) === String(roomDetails?.buildingId))
      if (!building?.grid) return null
      let count = 0
      for (let r = 0; r < building.grid.length; r++) {
        for (let c = 0; c < (building.grid[r] || []).length; c++) {
          if (building.grid[r][c]?.type === 'room') {
            count++
            if (r === roomDetails?.row && c === roomDetails?.col) return count
          }
        }
      }
      return null
    } catch {
      return null
    }
  }

  return (
    <>
      <Navbar />
      <div className='py-28 md:py-32 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-6'>
          <button onClick={() => navigate(-1)} className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg'>
            <ArrowLeft className='w-5 h-5' />
          </button>
          <div>
            <div className='flex items-center gap-2'>
              <Shield className='w-6 h-6 text-indigo-600' />
              <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100'>Manage Properties</h1>
            </div>
            <p className='text-gray-500 text-sm mt-1'>Properties you manage as a caretaker</p>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit'>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'availability' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <LayoutGrid className='w-4 h-4' /> Room Availability
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tracker' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <DollarSign className='w-4 h-4' /> Rent Tracker
          </button>
          <button
            onClick={() => setActiveTab('utilities')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'utilities' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Zap className='w-4 h-4' /> Utilities
          </button>
        </div>

        {loading ? (
          <div className='grid gap-6'>
            {[...Array(2)].map((_, i) => <ManagedPropertySkeleton key={i} />)}
          </div>
        ) : properties.length === 0 ? (
          <div className='text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-xl'>
            <Building2 className='w-12 h-12 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-500 text-lg mb-2'>No managed properties</p>
            <p className='text-gray-400 text-sm'>When a house owner adds your email as a caretaker, their properties will appear here.</p>
          </div>
        ) : activeTab === 'utilities' ? (
          <UtilityManager initialProperties={properties} />
        ) : activeTab === 'availability' ? (
          /* ── Room Availability Tab ── */
          <div className='grid gap-6'>
            {movingOutBookings.length > 0 && (
              <div className='border border-amber-200 dark:border-amber-700 rounded-xl p-4 bg-amber-50/80 dark:bg-amber-900/20'>
                <h3 className='font-semibold text-amber-800 dark:text-amber-300 mb-3'>Moving Out Tenants</h3>
                <div className='grid gap-2'>
                  {movingOutBookings.map((booking) => (
                    <div key={booking._id} className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 rounded-lg p-3'>
                      {(() => {
                        const roomNum = getBookingRoomNumber(booking.property, booking.roomDetails)
                        const roomLabel = roomNum
                          ? `R${roomNum}`
                          : `R${(booking.roomDetails?.row ?? 0) + 1}-${(booking.roomDetails?.col ?? 0) + 1}`
                        return (
                      <div className='text-sm text-gray-700 dark:text-gray-200'>
                        <span className='font-semibold'>{booking.user?.username || booking.user?.email || 'Tenant'}</span>
                        <span className='mx-1.5 text-gray-400'>-</span>
                        <span>{booking.property?.name || 'Property'} · {booking.roomDetails?.buildingName || 'Building'} · {roomLabel}</span>
                        <span className='mx-1.5 text-gray-400'>-</span>
                        <span>Move-out: {booking.moveOutDate ? new Date(booking.moveOutDate).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : 'date not set'}</span>
                      </div>
                        )
                      })()}
                      {booking.moveOutStatus === 'notice_given' ? (
                        <button
                          onClick={() => confirmMoveOut(booking._id)}
                          disabled={confirmingMoveOut === booking._id}
                          className='px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white transition-colors'
                        >
                          {confirmingMoveOut === booking._id ? 'Confirming...' : 'Confirm Plan'}
                        </button>
                      ) : (
                        <span className='px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'>Scheduled</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {properties.map((property) => (
              <div key={property._id} className='border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800 shadow-sm overflow-hidden'>
                <div className='flex flex-col sm:flex-row justify-between items-start gap-3 mb-4'>
                  <div className='min-w-0'>
                    <h4 className='text-xl font-bold text-gray-800 dark:text-gray-100'>{property.name}</h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>{property.address}, {property.estate}</p>
                    <p className='text-sm text-gray-500 dark:text-gray-500'>{property.place} • {property.propertyType}</p>
                    {property.owner && <p className='text-xs text-indigo-600 mt-1'>Owner: {property.owner.username}</p>}
                  </div>
                  <div className='flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full'>
                    <Shield className='w-3.5 h-3.5 text-indigo-600' />
                    <span className='text-xs font-medium text-indigo-700 dark:text-indigo-300'>Caretaker Access</span>
                  </div>
                </div>
                <div className='mb-4'>
                  <button
                    onClick={() => setEditingProperty(property)}
                    className='px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors'
                  >
                    Edit Listing Details
                  </button>
                </div>
                <div className='flex gap-4 mb-4 text-sm flex-wrap'>
                  <div className='px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-medium'>{property.vacantRooms} Vacant</div>
                  <div className='px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg font-medium'>{property.totalRooms - property.vacantRooms} Occupied</div>
                  <div className='px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium'>{property.totalRooms} Total</div>
                </div>
                {property.buildings.map((building) => {
                  const CELL = 52
                  const getRoomNumber = (grid, rowIndex, colIndex) => {
                    let count = 0
                    for (let r = 0; r < grid.length; r++) {
                      for (let c = 0; c < grid[r].length; c++) {
                        if (grid[r][c].type === 'room') { count++; if (r === rowIndex && c === colIndex) return count }
                      }
                    }
                    return 0
                  }
                  return (
                    <div key={building.id} className='mt-4 border-t dark:border-gray-700 pt-4'>
                      <h5 className='font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm'>{building.name}</h5>
                      <div className='overflow-x-auto'>
                        <div className='inline-block pb-2'>
                          <div className='flex justify-center'>
                            <svg width={building.cols * CELL} height='22'>
                              <polygon points={`0,22 ${(building.cols * CELL) / 2},0 ${building.cols * CELL},22`} fill='#7c3aed' stroke='#4c1d95' strokeWidth='2' />
                            </svg>
                          </div>
                          <div className='bg-white dark:bg-gray-800 shadow border-2 border-indigo-400'>
                            {building.grid.map((row, rowIndex) => (
                              <div key={rowIndex} className='flex'>
                                {row.map((cell, colIndex) => {
                                  const roomBooking = bookingMap[`${property._id}-${building.id}-${rowIndex}-${colIndex}`]
                                  if (cell.type === 'empty') return <div key={colIndex} style={{width: CELL, height: CELL}} className='border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700' />
                                  if (cell.type === 'common') return (
                                    <div key={colIndex} style={{width: CELL, height: CELL}} className='border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 flex items-center justify-center'>
                                      <span className='text-[8px] text-gray-400 dark:text-gray-300'>C</span>
                                    </div>
                                  )
                                  return (
                                    <div key={colIndex} style={{width: CELL, height: CELL}} className={`relative border border-gray-200 dark:border-gray-600 overflow-hidden group ${cell.isBooked ? 'bg-yellow-50 dark:bg-yellow-900/40' : cell.isMoveOutSoon ? 'bg-amber-50 dark:bg-amber-900/30' : cell.isVacant ? 'bg-green-50 dark:bg-green-900/40' : 'bg-red-50 dark:bg-red-900/40'}`}>
                                      <div className='flex items-center justify-center h-full'>
                                        <span className='font-extrabold text-gray-700 dark:text-gray-200' style={{fontSize: '10px'}}>R{getRoomNumber(building.grid, rowIndex, colIndex)}</span>
                                      </div>
                                      <div className='absolute bottom-0 left-1/2 -translate-x-1/2' style={{width: '20%', height: '18%', background: '#7c2d12', borderRadius: '2px 2px 0 0', minHeight: '5px', minWidth: '6px'}}></div>
                                      {/* Hover overlay: show who booked, or toggle */}
                                      {cell.isBooked && roomBooking ? (() => {
                                        const bk = roomBooking
                                        return (
                                          <div className='absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-yellow-700/90 text-white p-0.5 gap-0.5'>
                                            {bk.user?.image && <img src={bk.user.image} className='w-5 h-5 rounded-full' alt=''/>}
                                            <span style={{fontSize: '8px'}} className='font-bold text-center leading-tight line-clamp-1'>{bk.user?.username || 'Booked'}</span>
                                            <button
                                              onClick={() => toggleAvailability(property._id, building.id, rowIndex, colIndex)}
                                              style={{fontSize: '7px'}} className='bg-white/20 rounded px-1 hover:bg-white/40 transition-all'
                                            >Move in</button>
                                          </div>
                                        )
                                      })() : (
                                        <button
                                          onClick={() => toggleAvailability(property._id, building.id, rowIndex, colIndex)}
                                          className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white font-bold ${cell.isVacant ? 'bg-green-600/85' : 'bg-red-600/85'}`}
                                          style={{fontSize: '9px'}}
                                        >
                                          {cell.isVacant ? 'Mark\nOccupied' : 'Mark\nVacant'}
                                        </button>
                                      )}
                                      {cell.isMoveOutSoon && roomBooking && (
                                        <div className='absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-amber-700/90 text-white p-0.5 gap-0.5'>
                                          <span style={{fontSize: '8px'}} className='font-bold text-center leading-tight line-clamp-1'>Available soon</span>
                                          <span style={{fontSize: '7px'}} className='text-amber-100'>From {roomBooking.moveOutDate ? new Date(roomBooking.moveOutDate).toLocaleDateString('en-KE', { day:'numeric', month:'short' }) : 'scheduled date'}</span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>
                          <div className='h-1.5 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                        </div>
                      </div>
                      <p className='text-xs text-gray-400 mt-1'>Hover any room to toggle availability</p>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ) : (
          /* ── Rent Tracker Tab ── */
          <div>
            {/* Month / Year Navigator */}
            <div className='flex items-center gap-3 mb-6'>
              <button onClick={() => changeMonth(-1)} className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all'>
                <ChevronLeft className='w-5 h-5' />
              </button>
              <span className='text-lg font-semibold text-gray-800 dark:text-gray-100 min-w-[160px] text-center'>
                {MONTHS[trackerMonth - 1]} {trackerYear}
              </span>
              <button onClick={() => changeMonth(1)} className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all'>
                <ChevronRight className='w-5 h-5' />
              </button>
              {loadingPayments && <span className='text-xs text-gray-400 ml-2'>Loading...</span>}
            </div>

            <div className='grid gap-6'>
              {properties.map((property) => {
                const occupiedRooms = getOccupiedRooms(property)
                const paidCount = occupiedRooms.filter(r => isPaid(property._id, r.buildingId, r.row, r.col)).length
                const partialCount = occupiedRooms.filter(r => getPayStatus(property._id, r.buildingId, r.row, r.col) === 'partial').length
                const total = occupiedRooms.length

                return (
                  <div key={property._id} className='border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden'>
                    {/* Property header */}
                    <div className='flex flex-col sm:flex-row justify-between items-start gap-3 p-6 pb-4'>
                      <div>
                        <h4 className='text-lg font-bold text-gray-800 dark:text-gray-100'>{property.name}</h4>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>{property.address}, {property.estate}</p>
                      </div>
                      <div className='flex gap-3 text-sm flex-wrap'>
                        <div className='px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg'>
                          <span className='text-green-700 dark:text-green-300 font-semibold'>{paidCount}</span>
                          <span className='text-green-600 dark:text-green-400 ml-1'>paid</span>
                        </div>
                        {partialCount > 0 && (
                          <div className='px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg'>
                            <span className='text-yellow-700 dark:text-yellow-300 font-semibold'>{partialCount}</span>
                            <span className='text-yellow-600 dark:text-yellow-400 ml-1'>partial</span>
                          </div>
                        )}
                        <div className='px-3 py-1.5 bg-red-50 dark:bg-red-900/30 rounded-lg'>
                          <span className='text-red-700 dark:text-red-300 font-semibold'>{total - paidCount - partialCount}</span>
                          <span className='text-red-600 dark:text-red-400 ml-1'>unpaid</span>
                        </div>
                        <div className='px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg'>
                          <span className='text-gray-700 dark:text-gray-300 font-semibold'>{total}</span>
                          <span className='text-gray-500 dark:text-gray-400 ml-1'>occupied</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {total > 0 && (
                      <div className='px-6 pb-4'>
                        <div className='w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2'>
                          <div
                            className='bg-green-500 h-2 rounded-full transition-all duration-500'
                            style={{ width: `${Math.round((paidCount / total) * 100)}%` }}
                          />
                        </div>
                        <p className='text-xs text-gray-400 mt-1'>{Math.round((paidCount / total) * 100)}% of occupied rooms have paid rent this month</p>
                      </div>
                    )}

                    {occupiedRooms.length === 0 ? (
                      <div className='px-6 pb-6 text-center text-gray-400 text-sm'>No occupied rooms to track.</div>
                    ) : (
                      <div className='border-t dark:border-gray-700'>
                        {/* Group by building */}
                        {property.buildings?.map(building => {
                          const bRooms = occupiedRooms.filter(r => r.buildingId === building.id)
                          if (!bRooms.length) return null
                          return (
                            <div key={building.id}>
                              <div className='px-6 py-2 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700'>
                                <span className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide'>{building.name}</span>
                              </div>
                              <div className='divide-y dark:divide-gray-700'>
                                {bRooms.map(r => {
                                  const status = getPayStatus(property._id, r.buildingId, r.row, r.col)
                                  const paid = status === 'full'
                                  const partial = status === 'partial'
                                  const key = `${property._id}-${r.buildingId}-${r.row}-${r.col}`
                                  const toggling = togglingRoom === key
                                  const payRec = (rentPayments[property._id] || []).find(x => x.buildingId === r.buildingId && x.row === r.row && x.col === r.col)

                                  return (
                                    <div key={key} className='flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors'>
                                      <div className='flex items-center gap-3'>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                          paid ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                          : partial ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                          : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                          R{r.roomNum}
                                        </div>
                                        <div>
                                          <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>Room {r.roomNum}</p>
                                          {payRec?.amountDue > 0 ? (
                                            <p className='text-xs text-gray-400'>Ksh {(payRec.amountPaid || 0).toLocaleString()} / {payRec.amountDue.toLocaleString()}</p>
                                          ) : payRec?.paidAt && paid ? (
                                            <p className='text-xs text-gray-400'>Paid {new Date(payRec.paidAt).toLocaleDateString()}</p>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className='flex items-center gap-1.5'>
                                        <button
                                          onClick={() => { setPaymentModal({ propertyId: property._id, buildingId: r.buildingId, row: r.row, col: r.col, roomNum: r.roomNum }); setPaymentForm({ amountDue: payRec?.amountDue ?? r.cell?.pricePerMonth ?? '', amountPaid: payRec?.amountPaid ?? '', note: payRec?.note ?? '' }) }}
                                          className='px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                                          title='Record amount'
                                        >Ksh</button>
                                        {!paid && (
                                          <button
                                            onClick={() => sendRentReminder(property._id, r.buildingId, r.row, r.col, r.roomNum)}
                                            disabled={remindingRoom === key}
                                            className='px-2.5 py-1.5 rounded-lg text-xs font-medium border border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 flex items-center gap-1'
                                            title={roomContacts[key] ? 'Contact saved — click to remind' : 'Send rent reminder'}
                                          >
                                            <Bell className='w-3 h-3' />
                                            {remindingRoom === key ? '…' : 'Remind'}
                                            {roomContacts[key] && <span className='w-1.5 h-1.5 rounded-full bg-orange-400' />}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => partial
                                            ? markFullyPaid(property._id, r.buildingId, r.row, r.col, payRec, r.cell?.pricePerMonth)
                                            : togglePayment(property._id, r.buildingId, r.row, r.col)}
                                          disabled={toggling}
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${
                                            paid ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60'
                                            : partial ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/60'
                                            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                                          }`}
                                        >
                                          {toggling ? (
                                            <div className='w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin' />
                                          ) : paid ? (
                                            <CheckCircle2 className='w-3.5 h-3.5' />
                                          ) : partial ? (
                                            <Clock className='w-3.5 h-3.5' />
                                          ) : (
                                            <XCircle className='w-3.5 h-3.5' />
                                          )}
                                          {toggling ? 'Saving...' : paid ? 'Paid' : partial ? 'Partial' : 'Unpaid'}
                                        </button>
                                      </div>                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Rent Payment Amount Modal ── */}
      {paymentModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4' onClick={() => setPaymentModal(null)}>
          <div className='bg-white dark:bg-gray-800 rounded-xl w-full max-w-xs p-5 shadow-2xl' onClick={e => e.stopPropagation()}>
            <h3 className='font-bold text-gray-900 dark:text-white mb-1'>Room {paymentModal.roomNum} — Rent</h3>
            <p className='text-xs text-gray-400 mb-4'>{MONTHS[trackerMonth - 1]} {trackerYear}</p>
            <div className='space-y-3'>
              <div>
                <label className='text-xs text-gray-500 block mb-1'>Rent Due (Ksh) <span className='text-gray-400 font-normal'>— from room rate</span></label>
                <input type='number' min='0' placeholder='e.g. 5000'
                  value={paymentForm.amountDue}
                  onChange={e => setPaymentForm(d => ({ ...d, amountDue: e.target.value }))}
                  className='w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/60 dark:text-gray-100 outline-indigo-500' />
              </div>
              <div>
                <label className='text-xs text-gray-500 block mb-1'>Amount Paid (Ksh)</label>
                <input type='number' min='0' placeholder='e.g. 3000'
                  value={paymentForm.amountPaid}
                  onChange={e => setPaymentForm(d => ({ ...d, amountPaid: e.target.value }))}
                  className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
              </div>
              {paymentForm.amountDue !== '' && paymentForm.amountPaid !== '' && Number(paymentForm.amountDue) > 0 && (
                <p className={`text-xs font-medium ${
                  Number(paymentForm.amountPaid) >= Number(paymentForm.amountDue) ? 'text-green-600 dark:text-green-400'
                  : Number(paymentForm.amountPaid) > 0 ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'}`}>
                  {Number(paymentForm.amountPaid) >= Number(paymentForm.amountDue)
                    ? '✓ Fully paid'
                    : Number(paymentForm.amountPaid) > 0
                    ? `Ksh ${(Number(paymentForm.amountDue) - Number(paymentForm.amountPaid)).toLocaleString()} still outstanding`
                    : 'Not paid'}
                </p>
              )}
              <div>
                <label className='text-xs text-gray-500 block mb-1'>Note (optional)</label>
                <input type='text' placeholder='e.g. Paid in two parts'
                  value={paymentForm.note}
                  onChange={e => setPaymentForm(d => ({ ...d, note: e.target.value }))}
                  className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
              </div>
            </div>
            <div className='flex gap-2 mt-4'>
              <button onClick={() => setPaymentModal(null)} className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'>
                Cancel
              </button>
              <button onClick={setRentAmount} disabled={savingPayment} className='flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm rounded-lg font-medium transition-colors'>
                {savingPayment ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Rent Reminder — Invite Tenant Modal ── */}
      {rentInviteRoom && (() => {
        const rentProp = properties.find(p => p._id === rentInviteRoom.propertyId)
        const propName = rentProp?.name || 'your property'
        const waMsg = `Hi ${rentInviteForm.name || 'there'}, I manage rent at ${propName} using PataKeja. Join for free at patakejaa.co.ke so you can track your payments and receive reminders automatically. Takes less than a minute!`
        const waPhone = rentInviteForm.phone ? rentInviteForm.phone.replace(/\s+/g, '').replace(/^\+/, '').replace(/^0/, '254') : ''
        const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}` : `https://wa.me/?text=${encodeURIComponent(waMsg)}`
        return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4' onClick={() => setRentInviteRoom(null)}>
          <div className='bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden' onClick={e => e.stopPropagation()}>
            <div className='bg-orange-50 dark:bg-orange-900/20 px-5 py-4 border-b border-orange-100 dark:border-orange-800'>
              <p className='font-bold text-gray-900 dark:text-white'>Room {rentInviteRoom.roomNum} — No tenant linked</p>
              <p className='text-xs text-orange-600 dark:text-orange-400 mt-0.5'>Send a WhatsApp reminder now, or save their contact for automatic reminders next time.</p>
            </div>
            <div className='px-5 py-4 space-y-3'>
              <div>
                <label className='text-xs text-gray-500 block mb-1'>Tenant name (optional)</label>
                <input type='text' placeholder='e.g. John Kamau'
                  value={rentInviteForm.name}
                  onChange={e => setRentInviteForm(d => ({ ...d, name: e.target.value }))}
                  className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
              </div>
              <div>
                <label className='text-xs text-gray-500 block mb-1'>Phone number <span className='text-gray-400'>(enter to send directly to them on WhatsApp)</span></label>
                <input type='tel' placeholder='0712 345 678'
                  value={rentInviteForm.phone}
                  onChange={e => setRentInviteForm(d => ({ ...d, phone: e.target.value }))}
                  className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
              </div>
              <div>
                <label className='text-xs text-gray-500 block mb-1'>Email <span className='text-gray-400 font-normal'>(optional — for automatic email reminders)</span></label>
                <input type='email' placeholder='e.g. john@gmail.com'
                  value={rentInviteForm.email}
                  onChange={e => setRentInviteForm(d => ({ ...d, email: e.target.value }))}
                  className='w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 outline-indigo-500' />
              </div>
              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400 italic'>
                "{waMsg}"
              </div>
            </div>
            <div className='px-5 pb-5 space-y-2'>
              <a href={waUrl} target='_blank' rel='noopener noreferrer'
                className='flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium transition-colors'>
                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'><path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z'/><path d='M12 0C5.373 0 0 5.373 0 12c0 2.125.553 4.122 1.523 5.854L0 24l6.29-1.498A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.6a9.548 9.548 0 01-4.87-1.336l-.35-.207-3.628.864.924-3.545-.228-.364A9.558 9.558 0 012.4 12c0-5.295 4.305-9.6 9.6-9.6s9.6 4.305 9.6 9.6-4.305 9.6-9.6 9.6z'/></svg>
                {waPhone ? 'Send via WhatsApp' : 'Open WhatsApp (pick contact)'}
              </a>
              <div className='flex gap-2'>
                <button onClick={() => setRentInviteRoom(null)}
                  className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'>
                  Skip
                </button>
                <button onClick={saveRentContact} disabled={savingRentContact || (!rentInviteForm.phone && !rentInviteForm.email)}
                  className='flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors'
                  title='Save to auto-send next time'>
                  {savingRentContact ? 'Saving…' : 'Save contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

      {editingProperty && (
        <PropertyListingModal
          existingProperty={editingProperty}
          onClose={() => {
            setEditingProperty(null)
            fetchManagedProperties()
          }}
        />
      )}
    </>
  )
}

export default ManagedProperties
