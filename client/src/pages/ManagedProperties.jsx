import React, { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { Shield, Building2, ArrowLeft, LayoutGrid, DollarSign, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { ManagedPropertySkeleton } from '../components/Skeletons'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import UtilityManager from './HouseOwner/UtilityManager'

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
          const key = `${b.property}-${b.roomDetails.buildingId}-${b.roomDetails.row}-${b.roomDetails.col}`
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
                  if (ri === row && ci === col) return { ...cell, isVacant: !cell.isVacant, isBooked: false }
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

  const isPaid = (propertyId, buildingId, row, col) => {
    const list = rentPayments[propertyId] || []
    const rec = list.find(x => x.buildingId === buildingId && x.row === row && x.col === col)
    return rec?.paid === true
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
                                  if (cell.type === 'empty') return <div key={colIndex} style={{width: CELL, height: CELL}} className='border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700' />
                                  if (cell.type === 'common') return (
                                    <div key={colIndex} style={{width: CELL, height: CELL}} className='border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 flex items-center justify-center'>
                                      <span className='text-[8px] text-gray-400 dark:text-gray-300'>C</span>
                                    </div>
                                  )
                                  return (
                                    <div key={colIndex} style={{width: CELL, height: CELL}} className={`relative border border-gray-200 dark:border-gray-600 overflow-hidden group ${cell.isBooked ? 'bg-yellow-50 dark:bg-yellow-900/40' : cell.isVacant ? 'bg-green-50 dark:bg-green-900/40' : 'bg-red-50 dark:bg-red-900/40'}`}>
                                      <div className='flex items-center justify-center h-full'>
                                        <span className='font-extrabold text-gray-700 dark:text-gray-200' style={{fontSize: '10px'}}>R{getRoomNumber(building.grid, rowIndex, colIndex)}</span>
                                      </div>
                                      <div className='absolute bottom-0 left-1/2 -translate-x-1/2' style={{width: '20%', height: '18%', background: '#7c2d12', borderRadius: '2px 2px 0 0', minHeight: '5px', minWidth: '6px'}}></div>
                                      {/* Hover overlay: show who booked, or toggle */}
                                      {cell.isBooked && bookingMap[`${property._id}-${building.id}-${rowIndex}-${colIndex}`] ? (() => {
                                        const bk = bookingMap[`${property._id}-${building.id}-${rowIndex}-${colIndex}`]
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
                const total = occupiedRooms.length

                return (
                  <div key={property._id} className='border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden'>
                    {/* Property header */}
                    <div className='flex flex-col sm:flex-row justify-between items-start gap-3 p-6 pb-4'>
                      <div>
                        <h4 className='text-lg font-bold text-gray-800 dark:text-gray-100'>{property.name}</h4>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>{property.address}, {property.estate}</p>
                      </div>
                      <div className='flex gap-3 text-sm'>
                        <div className='px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg'>
                          <span className='text-green-700 dark:text-green-300 font-semibold'>{paidCount}</span>
                          <span className='text-green-600 dark:text-green-400 ml-1'>paid</span>
                        </div>
                        <div className='px-3 py-1.5 bg-red-50 dark:bg-red-900/30 rounded-lg'>
                          <span className='text-red-700 dark:text-red-300 font-semibold'>{total - paidCount}</span>
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
                                  const paid = isPaid(property._id, r.buildingId, r.row, r.col)
                                  const key = `${property._id}-${r.buildingId}-${r.row}-${r.col}`
                                  const toggling = togglingRoom === key
                                  const payRec = (rentPayments[property._id] || []).find(x => x.buildingId === r.buildingId && x.row === r.row && x.col === r.col)

                                  return (
                                    <div key={key} className='flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors'>
                                      <div className='flex items-center gap-3'>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${paid ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                          R{r.roomNum}
                                        </div>
                                        <div>
                                          <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>Room {r.roomNum}</p>
                                          {payRec?.paidAt && paid && (
                                            <p className='text-xs text-gray-400'>Paid {new Date(payRec.paidAt).toLocaleDateString()}</p>
                                          )}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => togglePayment(property._id, r.buildingId, r.row, r.col)}
                                        disabled={toggling}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${
                                          paid
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60'
                                            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                                        }`}
                                      >
                                        {toggling ? (
                                          <div className='w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin' />
                                        ) : paid ? (
                                          <CheckCircle2 className='w-3.5 h-3.5' />
                                        ) : (
                                          <XCircle className='w-3.5 h-3.5' />
                                        )}
                                        {toggling ? 'Saving...' : paid ? 'Paid' : 'Unpaid'}
                                      </button>
                                    </div>
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
    </>
  )
}

export default ManagedProperties