import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { assets, facilityIcons } from '../assets/assets'
import ChatInterface from '../components/ChatInterface'
import ViewingRequestForm from '../components/ViewingRequestForm'
import ReportModal from '../components/ReportModal'
import VerificationBadge from '../components/VerificationBadge'
import PaymentModal from '../components/PaymentModal'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { SignInButton, SignUpButton } from '@clerk/clerk-react'
import { Gift, Lock, Unlock, Key, CreditCard, MessageCircle, Smartphone, PartyPopper, Check, Share2, Copy, Users } from 'lucide-react'
import { PropertyDetailSkeleton } from '../components/Skeletons'

const PropertyDetails = () => {
    const {id} = useParams() // This is now property ID, not room ID
    const { user, getToken, axios, darkMode } = useAppContext()
    const [property, setProperty] = useState(null)
    const [selectedBuilding, setSelectedBuilding] = useState(0)
    const [zoomedBuilding, setZoomedBuilding] = useState(null)
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [mainImage, setMainImage] = useState(null)
    const [showChat, setShowChat] = useState(false)
    const [showViewingForm, setShowViewingForm] = useState(false)
    const [showDirectApplyForm, setShowDirectApplyForm] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [unlockData, setUnlockData] = useState(null)
    const [isFreeUnlock, setIsFreeUnlock] = useState(null)  // null = checking, true = free, false = paid
    const [freeReason, setFreeReason] = useState(null) // 'signup' or 'referral'
    const [referralInfo, setReferralInfo] = useState(null)
    const [referralCopied, setReferralCopied] = useState(false)
    const [loading, setLoading] = useState(true)
    const [showGuestPayment, setShowGuestPayment] = useState(false)

    useEffect(()=>{
      const fetchProperty = async () => {
        try {
          setLoading(true)

          // Build optional headers so backend can decide whether to include contact info
          const headers = {}
          // 1) Auth token for logged-in users
          const token = await getToken().catch(() => null)
          if (token) headers['Authorization'] = `Bearer ${token}`
          // 2) Stored guest unlock token
          try {
            const guestUnlocks = JSON.parse(localStorage.getItem('guestUnlocks') || '{}')
            const guestData = guestUnlocks[id]
            if (guestData?.unlockId && guestData?.expiresAt && new Date(guestData.expiresAt) > new Date()) {
              headers['x-guest-token'] = guestData.unlockId
            }
          } catch (_) {}

          const response = await axios.get(`/api/properties/${id}`, { headers })
          // using context axios (has correct baseURL)
          
          if(response.data.success) {
            const fetchedProperty = response.data.property
            setProperty(fetchedProperty)
            setMainImage(fetchedProperty.images[0])
          } else {
            toast.error(response.data.message)
          }
          
        } catch (error) {
          toast.error('Failed to load property details')
        } finally {
          setLoading(false)
        }
      }
      fetchProperty()
    }, [id])

    // For logged-in users: fetch unlock info immediately using URL id (parallel with property fetch)
    useEffect(() => {
      if (!user) return
      const fetchUnlockInfo = async () => {
        try {
          const token = await getToken()
          const { data } = await axios.get('/api/payment/property-unlock-info', {
            params: { propertyId: id },
            headers: { Authorization: `Bearer ${token}` }
          })
          if (data.success) {
            if (data.unlocked) {
              setIsUnlocked(true)
              setUnlockData(data.unlock)
            }
            setIsFreeUnlock(data.isFree)
            setFreeReason(data.reason || null)
            setReferralInfo(data)
          }
        } catch (error) {
          setIsFreeUnlock(false)
        }
      }
      fetchUnlockInfo()
    }, [user, id])

    // For guest users: check localStorage unlock (needs property loaded)
    useEffect(() => {
      if (user || !property) return
      try {
        const guestUnlocks = JSON.parse(localStorage.getItem('guestUnlocks') || '{}')
        let changed = false
        for (const pid of Object.keys(guestUnlocks)) {
          if (!guestUnlocks[pid]?.expiresAt || new Date(guestUnlocks[pid].expiresAt) <= new Date()) {
            delete guestUnlocks[pid]
            changed = true
          }
        }
        if (changed) localStorage.setItem('guestUnlocks', JSON.stringify(guestUnlocks))
        const guestData = guestUnlocks[property._id]
        if (guestData) {
          setIsUnlocked(true)
          setUnlockData(guestData)
          return
        }
      } catch (_) {}
      setIsFreeUnlock(false)
    }, [user, property])

    const handleCopyReferral = () => {
      if (!referralInfo?.referralCode) return
      const link = `${window.location.origin}/sign-up?ref=${referralInfo.referralCode}`
      navigator.clipboard.writeText(link)
      setReferralCopied(true)
      toast.success('Referral link copied!')
      setTimeout(() => setReferralCopied(false), 2000)
    }

    const handleShareWhatsApp = () => {
      if (!referralInfo?.referralCode) return
      const link = `${window.location.origin}/sign-up?ref=${referralInfo.referralCode}`
      const text = `Hey! I found great rental houses on PataKeja. Sign up with my link and we both get free unlocks to view owner contacts: ${link}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }

    const handlePaymentSuccess = (unlockRecord) => {
      setIsUnlocked(true)
      setUnlockData(unlockRecord)
      // For guest users, persist unlock in localStorage (include unlockId for re-auth on refresh)
      if (!user && property) {
        try {
          const guestUnlocks = JSON.parse(localStorage.getItem('guestUnlocks') || '{}')
          guestUnlocks[property._id] = unlockRecord
          localStorage.setItem('guestUnlocks', JSON.stringify(guestUnlocks))
        } catch (_) {}
      }
      toast.success('Property unlocked! Contact details now visible.')
    }

    // Compute sequential room number within a building grid
    const getRoomNumber = (grid, rowIndex, colIndex) => {
      let count = 0
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c].type === 'room') {
            count++
            if (r === rowIndex && c === colIndex) return count
          }
        }
      }
      return 0
    }

    const getCellDisplay = (building, rowIndex, colIndex) => {
      const cell = building.grid[rowIndex][colIndex]
      const numSize = Math.max(8, Math.floor(bCellPx * 0.22))
      
      if (cell.type === 'room') {
        const roomNum = getRoomNumber(building.grid, rowIndex, colIndex)
        return (
          <div className='relative w-full flex flex-col items-center justify-center h-full'>
            {roomNum > 0 && <span style={{ fontSize: numSize + 'px', lineHeight: '1' }} className='text-gray-700 font-extrabold absolute top-0.5 left-1'>R{roomNum}</span>}
            <div className='hidden sm:block absolute bottom-0 left-1/2 -translate-x-1/2' style={{ width: '30%', height: '22%', background: '#7c2d12', borderRadius: '3px 3px 0 0', minHeight: '6px', minWidth: '8px' }}></div>
          </div>
        )
      }
      
      if (cell.type === 'common') {
        return <div style={{ fontSize: fontSize + 'px' }} className='text-gray-500 font-medium'>Common</div>
      }
      
      return <div className='text-gray-300 text-lg'>·</div>
    }

    const handleCellClick = (building, rowIndex, colIndex) => {
      const cell = building.grid[rowIndex][colIndex]
      if (cell.type !== 'room') return
      
      // Create room object from cell data
      const roomData = {
        buildingId: building.id,
        buildingName: building.name,
        row: rowIndex,
        col: colIndex,
        roomType: cell.roomType,
        pricePerMonth: cell.pricePerMonth,
        amenities: cell.amenities || [],
        isVacant: cell.isVacant
      }
      
      setSelectedRoom(roomData)
      toast.success(`Selected: ${cell.roomType} - Ksh ${cell.pricePerMonth}/month`)
    }

    const handleRequestViewing = () => {
      if (!user) {
        toast.error('Please sign in to request a viewing')
        return
      }
      if (!isUnlocked) {
        toast.error('Please unlock this property first to request a viewing')
        return
      }
      if (!selectedRoom) {
        toast.error('Please select a room from the grid first')
        return
      }
      if (!selectedRoom.isVacant) {
        toast.error('This room is currently occupied')
        return
      }
      setShowViewingForm(true)
    }

    const handleDirectApply = () => {
      if (!user) {
        toast.error('Please sign in to apply directly')
        return
      }
      if (!isUnlocked) {
        toast.error('Please unlock this property first to apply')
        return
      }
      if (!selectedRoom) {
        toast.error('Please select a room from the grid first')
        return
      }
      if (!selectedRoom.isVacant) {
        toast.error('This room is currently occupied')
        return
      }
      setShowDirectApplyForm(true)
    }

  if (loading) {
    return <PropertyDetailSkeleton />
  }

  if (!property) {
    return <div className='py-28 text-center'>Property not found</div>
  }

  // Safety check for buildings
  if (!property.buildings || property.buildings.length === 0) {
    return <div className='py-28 text-center'>No buildings configured for this property</div>
  }

  const currentBuilding = property.buildings[selectedBuilding]
  const vacantCount = property.vacantRooms || 0

  // Dynamic cell size for compound thumbnail view
  const numBuildings = property.buildings.length
  const totalCols = property.buildings.reduce((sum, b) => sum + (b.cols || 5), 0)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const bCellPx = (() => {
    if (isMobile) {
      // Shrink to fit on small screens — scrolls only when truly extreme
      const availableWidth = Math.max(200, window.innerWidth - 80)
      const fixedOverhead = numBuildings * 16 + Math.max(0, numBuildings - 1) * 18 + 24
      const maxCell = totalCols > 0 ? Math.floor((availableWidth - fixedOverhead) / totalCols) : 42
      return Math.max(16, Math.min(42, maxCell))
    }
    // Original formula for large screens
    return Math.max(32, Math.min(42, Math.floor(520 / (totalCols + numBuildings))))
  })()

  // Days since last refresh
  const daysSinceRefresh = property.lastVerifiedAt
    ? Math.floor((Date.now() - new Date(property.lastVerifiedAt)) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(property.createdAt)) / (1000 * 60 * 60 * 24))

  return (
    <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>

        {/* Freshness warning banner */}
        {property.needsRefresh && (
          <div className='mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200'>
            <svg className='w-4 h-4 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'/></svg>
            <span><strong>Heads up:</strong> This listing was last updated {daysSinceRefresh} days ago. Availability may have changed — confirm directly with the house owner.</span>
          </div>
        )}
        {/* Property Header */}
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
            <div>
              <h1 className='text-3xl md:text-4xl font-medium'>{property.name}</h1>
              <p className='text-gray-600 dark:text-gray-400 mt-1'>{property.propertyType}</p>
              <div className='flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-2'>
                <img src={assets.locationIcon} alt="" className='w-5 h-5' />
                <span>{property.estate}, {property.place}</span>
              </div>
            </div>
            <div className='flex flex-col items-end gap-2'>
              <div className='flex items-center gap-2'>
                {property.isVerified && (
                    <div className='px-4 py-2 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 flex items-center gap-1'>
                      <Check className='w-4 h-4' /> Verified
                    </div>
                  )}
                  <div className='px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'>
                  {vacantCount} {vacantCount === 1 ? 'Vacancy' : 'Vacancies'}
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(true)}
                className='text-red-600 hover:text-red-800 text-sm font-medium'
              >
                Report listing
              </button>
            </div>
        </div>

        {/* Images */}
        <div className='flex flex-col lg:flex-row mt-8 gap-4'>
          <div className='lg:w-2/3 w-full'>
            <img src={mainImage} alt="" className='w-full h-96 rounded-lg object-cover' />
          </div>
          <div className='grid grid-cols-2 gap-2 lg:w-1/3 w-full'>
            {property.images.slice(0, 4).map((image, index)=>(
              <img 
                onClick={()=> setMainImage(image)}
                key={index} 
                src={image} 
                alt=''
                className={`w-full h-44 rounded-lg object-cover cursor-pointer ${mainImage === image ? 'ring-2 ring-primary' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Grid Selector */}
        <div className='mt-10 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-700'>
          <div className='flex items-center gap-2 mb-2'>
            <svg className='w-6 h-6 text-indigo-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
            </svg>
            <h2 className='text-2xl font-bold'>Select Your Room</h2>
          </div>
          <p className='text-gray-600 dark:text-gray-400 mb-4'>Click on any vacant (green) room in the grid below to view details and request viewing</p>

          {/* All buildings inside ONE compound fence / Zoom mode */}
          {zoomedBuilding !== null ? (() => {
            const bld = property.buildings[zoomedBuilding]
            const zCellPx = Math.max(52, Math.min(84, Math.floor(680 / (bld.cols + 2))))
            return (
              <div className='py-2'>
                <div className='flex items-center gap-3 mb-3'>
                  <button onClick={() => setZoomedBuilding(null)} className='flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-700 px-3 py-1.5 rounded-lg transition-all'>
                    ? All Buildings
                  </button>
                  <span className='font-bold text-gray-800'>{bld.name}</span>
                  <span className='text-xs text-gray-400'>{bld.rows} floors · {bld.cols} units wide</span>
                </div>
                <div className='overflow-x-auto'>
                  <div className='inline-block'>
                    <div className='flex justify-center' style={{ marginLeft: -Math.round(zCellPx * 0.15), marginRight: -Math.round(zCellPx * 0.15) }}>
                      <svg width={bld.cols * zCellPx + Math.round(zCellPx * 0.3)} height='32' className='drop-shadow-sm'>
                        <polyline points={`0,32 ${(bld.cols * zCellPx + Math.round(zCellPx * 0.3)) / 2},2 ${bld.cols * zCellPx + Math.round(zCellPx * 0.3)},32`} fill={darkMode ? '#4338ca' : '#ede9fe'} stroke='#4f46e5' strokeWidth='3.5' strokeLinejoin='round' />
                      </svg>
                    </div>
                    <div className='bg-white dark:bg-gray-700 shadow border-2 border-indigo-400'>
                      {bld.grid.map((row, rowIndex) => (
                        <div key={rowIndex} className='flex'>
                          {row.map((cell, colIndex) => {
                            const isSelected = selectedRoom && selectedRoom.buildingId === bld.id && selectedRoom.row === rowIndex && selectedRoom.col === colIndex
                            const roomNum = cell.type === 'room' ? getRoomNumber(bld.grid, rowIndex, colIndex) : 0
                            const numSz = Math.max(9, Math.floor(zCellPx * 0.22))
                            return (
                              <div
                                key={colIndex}
                                onClick={() => handleCellClick(bld, rowIndex, colIndex)}
                                style={{ width: zCellPx + 'px', height: zCellPx + 'px' }}
                                className={`group relative border border-gray-300 flex items-center justify-center transition-all text-xs ${
                                  isSelected ? 'ring-4 ring-indigo-500 bg-indigo-200 dark:bg-indigo-700 z-10' :
                                  cell.type === 'room' && cell.isBooked ? 'bg-amber-200 dark:bg-amber-800 border-amber-400 cursor-not-allowed' :
                                  cell.type === 'room' && cell.isVacant ? 'bg-emerald-200 dark:bg-emerald-700 border-emerald-400 hover:bg-emerald-300 cursor-pointer' :
                                  cell.type === 'room' && !cell.isVacant ? 'bg-red-200 dark:bg-red-800 border-red-400 cursor-not-allowed' :
                                  cell.type === 'common' ? 'bg-gray-200 dark:bg-gray-600 border-gray-400' : 'bg-gray-50'
                                }`}
                              >
                                {cell.type === 'room' && (
                                  <div className='relative w-full flex flex-col items-center justify-center h-full'>
                                    {roomNum > 0 && <span style={{ fontSize: numSz + 'px', lineHeight: '1' }} className='text-gray-700 dark:text-gray-200 font-extrabold absolute top-0.5 left-1'>R{roomNum}</span>}
                                    <div className='absolute bottom-0 left-1/2 -translate-x-1/2' style={{ width: '30%', height: '22%', background: '#7c2d12', borderRadius: '3px 3px 0 0', minHeight: '6px', minWidth: '8px' }}></div>
                                  </div>
                                )}
                                {cell.type === 'common' && <div style={{ fontSize: Math.max(7, Math.floor(zCellPx * 0.15)) + 'px' }} className='text-gray-500 dark:text-gray-400 font-medium'>Common</div>}
                                {cell.type !== 'room' && cell.type !== 'common' && <div className='text-gray-300'>·</div>}
                                {cell.type === 'room' && (
                                  <div className='hidden group-hover:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none items-center'>
                                    <div className='bg-gray-900 text-white rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl text-left'>
                                      <div className='font-bold text-[11px]'>R{roomNum} · {cell.roomType}</div>
                                      <div className='text-[10px] text-gray-300 mt-0.5'>Ksh {cell.pricePerMonth?.toLocaleString()}/mo</div>
                                      <div className={`text-[10px] font-medium mt-0.5 ${cell.isBooked ? 'text-amber-300' : cell.isVacant ? 'text-green-300' : 'text-red-300'}`}>
                                        {cell.isBooked ? '? Booked' : cell.isVacant ? '? Vacant' : '? Occupied'}
                                      </div>
                                    </div>
                                    <div className='w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 -mt-1 shrink-0'></div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                    <div className='h-2 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                  </div>
                </div>
              </div>
            )
          })() : (
          <div className='py-4 overflow-x-auto'>
            <div className='w-fit mx-auto'>
              {(() => {
                const gs = property.compoundGate?.side || 'bottom'
                const posClass = {
                  'top':          'absolute top-0 left-1/2',
                  'bottom':       'absolute bottom-0 left-1/2',
                  'left':         'absolute left-0 top-1/2',
                  'right':        'absolute right-0 top-1/2',
                  'top-left':     'absolute top-0 left-0',
                  'top-right':    'absolute top-0 right-0',
                  'bottom-left':  'absolute bottom-0 left-0',
                  'bottom-right': 'absolute bottom-0 right-0',
                }[gs] || 'absolute bottom-0 left-1/2'
                const gateTransform = {
                  'top':          'translate(-50%, -50%)',
                  'bottom':       'translate(-50%, 50%)',
                  'left':         'translate(-50%, -50%) rotate(-90deg)',
                  'right':        'translate(50%, -50%) rotate(-90deg)',
                  'top-left':     'translate(calc(-50% + 24px), calc(-50% + 24px)) rotate(-45deg)',
                  'top-right':    'translate(calc(50% - 24px), calc(-50% + 24px)) rotate(45deg)',
                  'bottom-left':  'translate(calc(-50% + 24px), calc(50% - 24px)) rotate(45deg)',
                  'bottom-right': 'translate(calc(50% - 24px), calc(50% - 24px)) rotate(-45deg)',
                }[gs] || 'translate(-50%, 50%)'
                const cornerClip = {
                  'top-left':     'polygon(48px 0, 100% 0, 100% 100%, 0 100%, 0 48px)',
                  'top-right':    'polygon(0 0, calc(100% - 48px) 0, 100% 48px, 100% 100%, 0 100%)',
                  'bottom-left':  'polygon(0 0, 100% 0, 100% 100%, 48px 100%, 0 calc(100% - 48px))',
                  'bottom-right': 'polygon(0 0, 100% 0, 100% calc(100% - 48px), calc(100% - 48px) 100%, 0 100%)',
                }[gs]
                // Extra padding pushes buildings away from the chamfered corner
                const cornerPad = {
                  'top-left':     { paddingTop: 40, paddingLeft: 40 },
                  'top-right':    { paddingTop: 40, paddingRight: 40 },
                  'bottom-left':  { paddingBottom: 40, paddingLeft: 40 },
                  'bottom-right': { paddingBottom: 40, paddingRight: 40 },
                }[gs] || {}
                return (
              <div className='relative'>
                {/* Compound fence — gate-connected path network */}
                <div className='border-2 border-dashed border-gray-500 dark:border-gray-500 p-3 bg-gradient-to-br from-green-50 to-slate-100 dark:from-gray-800 dark:to-gray-900 relative'
                  style={{ ...(cornerClip ? { clipPath: cornerClip } : {}), ...cornerPad }}>
                  {(() => {
                    const isColLayout = (property.compoundGate?.layout || 'row') === 'col'
                    const trunkList = []
                    if (!isColLayout) {
                      trunkList.push({ dir: 'h', pos: ['top','top-left','top-right'].includes(gs) ? 'top' : 'bottom' })
                      if (gs === 'left')  trunkList.push({ dir: 'v', pos: 'left' })
                      if (gs === 'right') trunkList.push({ dir: 'v', pos: 'right' })
                    } else {
                      trunkList.push({ dir: 'v', pos: ['right','top-right','bottom-right'].includes(gs) ? 'right' : 'left' })
                      if (['top','top-left','top-right'].includes(gs))          trunkList.push({ dir: 'h', pos: 'top' })
                      if (['bottom','bottom-left','bottom-right'].includes(gs)) trunkList.push({ dir: 'h', pos: 'bottom' })
                    }
                    return (
                      <>
                        {trunkList.map((t, i) => t.dir === 'h' ? (
                          <div key={i} className='absolute left-0 right-0 overflow-hidden bg-gray-500 dark:bg-gray-600'
                            style={t.pos === 'top'
                              ? { top: 0, height: 14, zIndex: 1 }
                              : { bottom: 0, height: 14, zIndex: 1 }}>
                            <div className='absolute inset-0 flex items-center' style={{ padding: '0 6px' }}>
                              <div style={{ borderTop: '2px dashed rgba(255,255,255,0.55)', width: '100%' }}></div>
                            </div>
                          </div>
                        ) : (
                          <div key={i} className='absolute top-0 bottom-0 overflow-hidden bg-gray-500 dark:bg-gray-600'
                            style={t.pos === 'left'
                              ? { left: 0, width: 14, zIndex: 1 }
                              : { right: 0, width: 14, zIndex: 1 }}>
                            <div className='absolute inset-0 flex justify-center'>
                              <div style={{ borderLeft: '2px dashed rgba(255,255,255,0.55)', height: '100%' }}></div>
                            </div>
                          </div>
                        ))}
                        <div className={`relative flex ${isColLayout ? 'flex-col items-start' : 'flex-row items-end'}`} style={{ zIndex: 2 }}>
                    {property.buildings.map((building, buildingIdx) => {
                      const isActive = buildingIdx === selectedBuilding

                      return (
                        <React.Fragment key={building.id}>
                          {/* Corridor pathway between buildings */}
                          {buildingIdx > 0 && (isColLayout ? (
                            /* Horizontal corridor for stacked buildings — bleeds to left+right fence */
                            <div style={{ height: 14, alignSelf: 'stretch', flexShrink: 0, marginLeft: '-12px', marginRight: '-12px' }} className='my-1.5 relative'>
                              <div className='h-full w-full bg-gray-500 dark:bg-gray-600'>
                                <div className='absolute inset-0 flex items-center px-2'>
                                  <div style={{ borderTop: '2px dashed rgba(255,255,255,0.6)', width: '100%' }}></div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Vertical corridor for side-by-side buildings — bleeds to top+bottom fence */
                            <div style={{ width: 18, alignSelf: 'stretch', flexShrink: 0, marginTop: '-12px', marginBottom: '-12px' }} className='flex items-stretch mx-1.5 relative'>
                              <div className='w-full h-full bg-gray-500 dark:bg-gray-600'>
                                <div className='absolute inset-0 flex justify-center'>
                                  <div style={{ borderLeft: '2px dashed rgba(255,255,255,0.6)', height: '100%' }}></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        <div
                          onClick={() => { setZoomedBuilding(buildingIdx); setSelectedBuilding(buildingIdx) }}
                          className='relative transition-all duration-200 mx-2 my-2 cursor-pointer hover:opacity-80'
                          title={`Click to zoom into ${building.name}`}
                        >
                          {/* Building label */}
                          <div className={`text-center text-xs font-semibold mb-1 ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {building.name}
                          </div>

                          {/* Roof — outlined triangle with overhang, no bottom border */}
                          <div className='flex justify-center' style={{ marginLeft: -Math.round(bCellPx * 0.15), marginRight: -Math.round(bCellPx * 0.15) }}>
                            <svg width={building.cols * bCellPx + Math.round(bCellPx * 0.3)} height='28' className='drop-shadow-sm'>
                              <polyline
                                points={`0,28 ${(building.cols * bCellPx + Math.round(bCellPx * 0.3)) / 2},2 ${building.cols * bCellPx + Math.round(bCellPx * 0.3)},28`}
                                fill={isActive ? (darkMode ? '#4338ca' : '#ede9fe') : 'transparent'}
                                stroke={isActive ? '#4f46e5' : '#9ca3af'}
                                strokeWidth={isActive ? '3.5' : '2'}
                                strokeLinejoin='round'
                              />
                            </svg>
                          </div>

                          {/* Grid */}
                          <div className={`bg-white dark:bg-gray-700 shadow border-2 ${isActive ? 'border-indigo-400' : 'border-gray-300 dark:border-gray-600'}`}>
                            {building.grid.map((row, rowIndex) => (
                              <div key={rowIndex} className='flex'>
                                {row.map((cell, colIndex) => {
                                  const isSelected = selectedRoom &&
                                    selectedRoom.buildingId === building.id &&
                                    selectedRoom.row === rowIndex &&
                                    selectedRoom.col === colIndex
                                  return (
                                    <div
                                      key={colIndex}
                                      onClick={(e) => { e.stopPropagation(); setZoomedBuilding(buildingIdx); setSelectedBuilding(buildingIdx) }}
                                      style={{ width: bCellPx + 'px', height: bCellPx + 'px' }}
                                      className={`group relative border border-gray-300 flex items-center justify-center transition-all text-xs ${
                                        isSelected ? 'ring-4 ring-indigo-500 bg-indigo-200 dark:bg-indigo-900 z-10' :
                                        cell.type === 'room' && cell.isBooked ? 'bg-amber-200 dark:bg-amber-900 border-amber-400 cursor-not-allowed' :
                                        cell.type === 'room' && cell.isVacant ? 'bg-emerald-200 dark:bg-emerald-900 border-emerald-400 hover:bg-emerald-300 cursor-pointer' :
                                        cell.type === 'room' && !cell.isVacant ? 'bg-red-200 dark:bg-red-900 border-red-400 cursor-not-allowed' :
                                        cell.type === 'common' ? 'bg-gray-200 dark:bg-gray-600 border-gray-400' :
                                        'bg-gray-50'
                                      }`}
                                    >
                                      {getCellDisplay(building, rowIndex, colIndex)}
                                      {cell.type === 'room' && (
                                        <div className='hidden group-hover:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none items-center'>
                                          <div className='bg-gray-900 text-white rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl text-left'>
                                            <div className='font-bold text-[11px]'>R{getRoomNumber(building.grid, rowIndex, colIndex)} · {cell.roomType}</div>
                                            <div className='text-[10px] text-gray-300 mt-0.5'>Ksh {cell.pricePerMonth?.toLocaleString()}/mo</div>
                                            <div className={`text-[10px] font-medium mt-0.5 ${cell.isBooked ? 'text-amber-300' : cell.isVacant ? 'text-green-300' : 'text-red-300'}`}>
                                              {cell.isBooked ? '? Booked' : cell.isVacant ? '? Vacant' : '? Occupied'}
                                            </div>
                                          </div>
                                          <div className='w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 -mt-1 shrink-0'></div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>

                          {/* Foundation */}
                          <div className='h-2 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                        </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                      </>
                    )
                  })()}
                </div>

                {/* ONE gate on the compound fence */}
                <div
                  className={`${posClass} bg-amber-50 dark:bg-amber-900 border border-amber-400 rounded px-2 py-0.5 flex items-center gap-1 z-10`}
                  style={{ transform: gateTransform }}
                >
                  <svg className='w-3 h-3 text-amber-700 dark:text-amber-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18' />
                  </svg>
                  <span className='text-[9px] font-bold text-amber-800 dark:text-amber-500 uppercase tracking-wide'>Gate</span>
                  <svg className='w-3 h-3 text-amber-700 dark:text-amber-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18' />
                  </svg>
                </div>
              </div>
                )
              })()}
            </div>
          </div>
          )}

          <div className='mt-4 flex gap-4 text-xs font-medium'>
            <div className='flex items-center gap-2'><div className='w-4 h-4 bg-emerald-200 border border-emerald-400 rounded-sm'></div><span>Vacant</span></div>
            <div className='flex items-center gap-2'><div className='w-4 h-4 bg-red-200 border border-red-400 rounded-sm'></div><span>Occupied</span></div>
            <div className='flex items-center gap-2'><div className='w-4 h-4 bg-amber-200 border border-amber-400 rounded-sm'></div><span>Booked</span></div>
            <div className='flex items-center gap-2'><div className='w-4 h-4 bg-gray-200 border border-gray-400 rounded-sm'></div><span>Common</span></div>
          </div>
        </div>

        {/* Selected Room Details */}
        {selectedRoom ? (
          <div className='mt-10'>
            <h2 className='text-2xl font-bold mb-4'>Selected Room Details</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <h3 className='text-xl font-semibold text-indigo-600'>{selectedRoom.roomType}</h3>
                <p className='text-3xl font-bold mt-2'>Ksh {selectedRoom.pricePerMonth.toLocaleString()}<span className='text-lg text-gray-600 dark:text-gray-400 font-normal'>/month</span></p>
                
                <div className='mt-4'>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>Building: {selectedRoom.buildingName}</p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>Status: <span className={selectedRoom.isBooked ? 'text-yellow-600 font-medium' : selectedRoom.isVacant ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{selectedRoom.isBooked ? 'Booked' : selectedRoom.isVacant ? 'Vacant' : 'Occupied'}</span></p>
                </div>

                {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                  <div className='mt-6'>
                    <h4 className='font-semibold mb-3 text-gray-800 dark:text-gray-200'>Room Features:</h4>
                    <div className='flex flex-wrap gap-3'>
                      {selectedRoom.amenities.map((amenity, index) => (
                        <div key={index} className='flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'>
                          {facilityIcons[amenity] && <img src={facilityIcons[amenity]} alt={amenity} className='w-5 h-5' />}
                          <p className='text-sm font-medium'>{amenity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className='flex flex-col gap-3'>
                {isUnlocked ? (
                  <>
                    {/* Unlocked - Show contact buttons */}
                    <div className='mb-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
                      <div className='flex items-center gap-2 text-sm text-green-700'>
                        <Unlock className='w-4 h-4' />
                        <span className='font-medium'>Active Pass</span>
                        {unlockData && (
                          <span className='text-xs text-green-600'>
                            {unlockData.passType === '7day' ? '7-day' : '1-day'} pass · {unlockData.daysRemaining > 0 ? `${unlockData.daysRemaining} day${unlockData.daysRemaining > 1 ? 's' : ''} left` : 'expires today'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setShowChat(true)}
                      className='px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium flex items-center justify-center gap-2'
                    >
                      <MessageCircle className='w-5 h-5' /> Message Owner
                    </button>
                    
                    {property.whatsappNumber && (
                      <a
                        href={`https://wa.me/${property.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your ${selectedRoom.roomType} room at ${property.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className='px-6 py-3 rounded-lg border-2 border-green-600 bg-green-50 text-green-700 hover:bg-green-100 transition-all inline-flex items-center justify-center gap-2 font-medium'
                      >
                        <Smartphone className='w-5 h-5' /> WhatsApp Owner
                      </a>
                    )}

                    {/* Share & Earn (also visible when unlocked) */}
                    {referralInfo && (
                      <div className='p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg'>
                        <div className='flex items-center gap-2 mb-1.5'>
                          <Share2 className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                          <span className='text-xs font-semibold text-gray-800 dark:text-gray-200'>Refer a friend, earn a free day</span>
                        </div>
                        <div className='flex gap-2'>
                          <button onClick={handleCopyReferral} className='flex-1 py-1.5 text-xs font-medium rounded border border-amber-300 dark:border-amber-600 bg-white dark:bg-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 dark:text-gray-200 flex items-center justify-center gap-1'>
                            {referralCopied ? <><Check className='w-3 h-3 text-green-600' /> Copied</> : <><Copy className='w-3 h-3' /> Copy Link</>}
                          </button>
                          <button onClick={handleShareWhatsApp} className='flex-1 py-1.5 text-xs font-medium rounded border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 flex items-center justify-center gap-1'>
                            <Smartphone className='w-3 h-3' /> WhatsApp
                          </button>
                        </div>
                        {referralInfo.referralCount > 0 && (
                          <p className='text-xs text-amber-700 dark:text-amber-400 mt-1.5 flex items-center gap-1 flex-wrap'>
                            <Users className='w-3 h-3' />
                            {referralInfo.referralCount} friend{referralInfo.referralCount !== 1 ? 's' : ''} joined
                            {referralInfo.referralUnlocksAvailable > 0
                              ? <span className='text-green-600 font-medium ml-1'>· {referralInfo.referralUnlocksAvailable} free day{referralInfo.referralUnlocksAvailable !== 1 ? 's' : ''} ready!</span>
                              : referralInfo.referralUnlocksUsed > 0
                                ? <span className='ml-1'>· {referralInfo.referralUnlocksUsed} used · Invite another!</span>
                                : <span className='ml-1'>· Invite another for a free day</span>
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Locked - Show unlock button */}
                    <div className='p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg mb-2'>
                      <div className='text-center'>
                        {!user ? (
                          /* Not logged in — two options: free sign-in OR pay without login */
                          <>
                            <Gift className='w-8 h-8 text-indigo-400 mx-auto mb-2' />
                            <p className='text-sm font-semibold text-gray-800 mb-1'>Access owner contact details</p>
                            <p className='text-xs text-gray-500 mb-4'>Phone number, WhatsApp & exact address</p>

                            {/* Option A: free with sign-in */}
                            <div className='mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
                              <p className='text-xs font-bold text-green-700 dark:text-green-300 mb-0.5 flex items-center gap-1'><PartyPopper className='w-3.5 h-3.5' /> FREE — First 2 unlocks</p>
                              <p className='text-xs text-green-600 dark:text-green-400 mb-2'>Sign in or create a free account</p>
                              <SignInButton mode='modal'>
                                <button className='w-full py-2 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all text-sm flex items-center justify-center gap-2'>
                                  <Key className='w-4 h-4' /> Sign In for Free Access
                                </button>
                              </SignInButton>
                            </div>

                            {/* Divider */}
                            <div className='flex items-center gap-2 mb-3'>
                              <div className='flex-1 h-px bg-gray-200'></div>
                              <span className='text-xs text-gray-400'>or</span>
                              <div className='flex-1 h-px bg-gray-200'></div>
                            </div>

                            {/* Option B: pay without login via M-Pesa */}
                            <div className='p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg'>
                              <p className='text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-0.5 flex items-center gap-1'><Lock className='w-3.5 h-3.5' /> Ksh 100/day or Ksh 300/week — via M-Pesa</p>
                              <p className='text-xs text-indigo-600 dark:text-indigo-400 mb-2'>Pay directly, no account needed</p>
                              <button
                                onClick={() => setShowGuestPayment(true)}
                                className='w-full py-2 rounded-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-sm flex items-center justify-center gap-2'
                              >
                                <CreditCard className='w-4 h-4' /> Pay via M-Pesa
                              </button>
                            </div>
                          </>
                        ) : (() => {
                          // Show card immediately — no "Checking..." block
                          // isFreeUnlock: null = still loading (show paid as default), true = free, false = paid
                          const showFree = isFreeUnlock === true
                          return (
                          <>
                            <div className='text-3xl mb-2'>{showFree ? <Gift className='w-8 h-8 text-green-500 mx-auto' /> : <Lock className='w-8 h-8 text-indigo-500 mx-auto' />}</div>
                            <p className='text-sm text-gray-700 font-medium mb-1'>Unlock owner contact details</p>
                            <p className='text-xs text-gray-600 mb-3'>Phone number, WhatsApp & exact address</p>
                            {showFree ? (
                              <>
                                <div className='text-2xl font-bold text-green-600 mb-1'>FREE</div>
                                <p className='text-xs text-green-700 mb-3'>
                                  {freeReason === 'referral' 
                                    ? `Referral unlock — ${referralInfo?.referralUnlocksAvailable || 1} free unlock${(referralInfo?.referralUnlocksAvailable || 1) > 1 ? 's' : ''} available!`
                                    : 'Free unlock — first 2 are on us!'}
                                </p>
                              </>
                            ) : (
                              <div className='mb-3'>
                                {isFreeUnlock === null ? (
                                  <div className='h-8 w-32 mx-auto bg-gray-200 rounded animate-pulse' />
                                ) : (
                                  <>
                                    <div className='text-2xl font-bold text-indigo-600'>from Ksh 100</div>
                                    <p className='text-xs text-indigo-500'>Ksh 100/day &nbsp;·&nbsp; Ksh 300/week</p>
                                  </>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              disabled={isFreeUnlock === null}
                              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                                isFreeUnlock === null
                                  ? 'bg-gray-200 text-gray-500'
                                  : showFree
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                              }`}
                            >
                              {isFreeUnlock === null 
                                ? <span className='flex items-center justify-center gap-2 animate-pulse'>Loading...</span>
                                : showFree 
                                  ? <span className='flex items-center justify-center gap-2'><Gift className='w-4 h-4' /> Claim Free Access</span> 
                                  : <span className='flex items-center justify-center gap-2'><Unlock className='w-4 h-4' /> Unlock — from Ksh 100</span>}
                            </button>
                          </>
                        )})()}
                      </div>
                    </div>
                    
                    {/* Blurred contact buttons */}
                    <div className='relative'>
                      <div className='blur-sm pointer-events-none opacity-50'>
                        <button className='w-full px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 font-medium flex items-center justify-center gap-2'>
                          <MessageCircle className='w-5 h-5' /> Message Owner
                        </button>
                      </div>
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <span className='text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow flex items-center gap-1'><Lock className='w-3 h-3' /> Unlock to contact</span>
                      </div>
                    </div>

                    {/* Share & Earn Referral Section */}
                    {user && (referralInfo ? (
                      <div className='p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg'>
                        <div className='flex items-center gap-2 mb-2'>
                          <Share2 className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                          <span className='text-sm font-semibold text-gray-800 dark:text-gray-100'>Share & Earn Free Days</span>
                        </div>
                        <p className='text-xs text-gray-600 dark:text-gray-300 mb-2.5'>
                          Invite a friend to sign up — you get a free 1-day unlock for any property!
                        </p>
                        <div className='flex gap-2 mb-2'>
                          <button
                            onClick={handleCopyReferral}
                            className='flex-1 py-2 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-600 bg-white dark:bg-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 dark:text-gray-200 transition-all flex items-center justify-center gap-1.5'
                          >
                            {referralCopied ? <><Check className='w-3.5 h-3.5 text-green-600' /> Copied!</> : <><Copy className='w-3.5 h-3.5' /> Copy Link</>}
                          </button>
                          <button
                            onClick={handleShareWhatsApp}
                            className='flex-1 py-2 text-xs font-medium rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 transition-all flex items-center justify-center gap-1.5'
                          >
                            <Smartphone className='w-3.5 h-3.5' /> WhatsApp
                          </button>
                        </div>
                        {referralInfo.referralUnlocksAvailable > 0 && (
                          <p className='text-xs text-green-700 font-medium flex items-center gap-1 mb-1'>
                            <Gift className='w-3 h-3' /> {referralInfo.referralUnlocksAvailable} free day{referralInfo.referralUnlocksAvailable > 1 ? 's' : ''} ready to use!
                          </p>
                        )}
                        {referralInfo.referralCount > 0 && (
                          <p className='text-xs text-amber-700 flex items-center gap-1 flex-wrap'>
                            <Users className='w-3 h-3' />
                            {referralInfo.referralCount} friend{referralInfo.referralCount !== 1 ? 's' : ''} joined
                            {referralInfo.referralUnlocksUsed > 0 && <span className='ml-1'>· {referralInfo.referralUnlocksUsed} day{referralInfo.referralUnlocksUsed !== 1 ? 's' : ''} used</span>}
                            {referralInfo.referralUnlocksAvailable === 0 && <span className='ml-1'>· Invite another!</span>}
                          </p>
                        )}
                        {referralInfo.referralCount === 0 && (
                          <p className='text-xs text-amber-600 flex items-center gap-1'>
                            <Users className='w-3 h-3' /> Invite a friend — each signup = 1 free day for any property!
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className='p-3 bg-amber-50/50 border border-amber-100 rounded-lg animate-pulse'>
                        <div className='flex items-center gap-2 mb-2'>
                          <div className='w-4 h-4 bg-amber-200 rounded' />
                          <div className='h-3.5 w-32 bg-amber-200 rounded' />
                        </div>
                        <div className='h-3 w-full bg-amber-100 rounded mb-2.5' />
                        <div className='flex gap-2 mb-2'>
                          <div className='flex-1 h-8 bg-amber-100 rounded-lg' />
                          <div className='flex-1 h-8 bg-green-100 rounded-lg' />
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                <button 
                  onClick={handleRequestViewing}
                  disabled={!selectedRoom.isVacant || selectedRoom.isBooked}
                  className='px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold disabled:bg-gray-400'
                >
                  {selectedRoom.isBooked ? 'Room Booked' : selectedRoom.isVacant ? 'Request Viewing' : 'Room Occupied'}
                </button>
                {selectedRoom.isVacant && !selectedRoom.isBooked && (
                  <button
                    onClick={handleDirectApply}
                    className='px-6 py-3 rounded-lg border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all font-semibold'
                  >
                    Apply Directly
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className='mt-10 text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg'>
            <p className='text-gray-500 dark:text-gray-400 text-lg'>Select a room from the grid above to view details</p>
          </div>
        )}

        {/* Owner Info */}
        <div className='mt-10 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800'>
          <div className='flex items-start gap-4'>
            <img 
              src={property.owner?.image || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(property.owner?.username || 'Owner') + '&background=6366f1&color=fff'} 
              alt="" 
              onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(property.owner?.username || 'Owner') + '&background=6366f1&color=fff' }}
              className='w-16 h-16 rounded-full object-cover'
            />
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <p className='text-lg font-medium'>{property.landlordName || property.owner?.username || 'Property Owner'}</p>
              </div>
              <p className='text-gray-600 dark:text-gray-400 text-sm mt-1'>Property Owner</p>
              {/* <p className='text-gray-500 text-sm mt-2'>
                Contact: {property.contact}
              </p> */}
            </div>
          </div>
        </div>

        {/* Modals */}
        {showViewingForm && selectedRoom && (
          <ViewingRequestForm 
            room={selectedRoom}
            propertyId={property._id}
            ownerId={property.owner._id}
            onClose={() => setShowViewingForm(false)}
            onSuccess={() => {
              setShowViewingForm(false)
              toast.success('Viewing request sent!')
            }}
          />
        )}

        {showDirectApplyForm && selectedRoom && (
          <ViewingRequestForm 
            room={selectedRoom}
            propertyId={property._id}
            ownerId={property.owner._id}
            isDirectApply={true}
            onClose={() => setShowDirectApplyForm(false)}
            onSuccess={() => {
              setShowDirectApplyForm(false)
              toast.success('Application submitted!')
            }}
          />
        )}

        {showChat && selectedRoom && (
          <ChatInterface 
            room={selectedRoom}
            propertyId={property._id}
            houseOwner={property.owner} 
            onClose={() => setShowChat(false)} 
          />
        )}

        {showReportModal && (
          <ReportModal
            type="listing"
            itemId={property._id}
            userId={property.owner._id}
            onClose={() => setShowReportModal(false)}
          />
        )}

        {showPaymentModal && (
          <PaymentModal
            property={property}
            freeReason={freeReason}
            referralInfo={referralInfo}
            isFreeUnlockProp={isFreeUnlock}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {showGuestPayment && (
          <PaymentModal
            property={property}
            guestMode={true}
            onClose={() => setShowGuestPayment(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}
    </div>
  )
}

export default PropertyDetails
