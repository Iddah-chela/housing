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
import { SignInButton } from '@clerk/clerk-react'

const PropertyDetails = () => {
    const {id} = useParams() // This is now property ID, not room ID
    const { user, getToken, axios } = useAppContext()
    const [property, setProperty] = useState(null)
    const [selectedBuilding, setSelectedBuilding] = useState(0) 
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [mainImage, setMainImage] = useState(null)
    const [showChat, setShowChat] = useState(false)
    const [showViewingForm, setShowViewingForm] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [unlockData, setUnlockData] = useState(null)
    const [isFreeUnlock, setIsFreeUnlock] = useState(null)  // null = checking, true = free, false = paid
    const [loading, setLoading] = useState(true)

    useEffect(()=>{
      const fetchProperty = async () => {
        try {
          setLoading(true)
          
          const response = await axios.get(`/api/properties/${id}`)
          // using context axios (has correct baseURL)
          
          if(response.data.success) {
            const fetchedProperty = response.data.property
            setProperty(fetchedProperty)
            setMainImage(fetchedProperty.images[0])
          } else {
            toast.error(response.data.message)
          }
          
        } catch (error) {
          console.error('Error fetching property:', error)
          toast.error('Failed to load property details')
        } finally {
          setLoading(false)
        }
      }
      fetchProperty()
    }, [id])

    // Check if user has unlocked this property
    useEffect(() => {
      const checkUnlockStatus = async () => {
        if (!property) return
        if (!user) {
          setIsFreeUnlock(false)  // not logged in → show paid price
          return
        }
        
        try {
          const token = await getToken()
          const [statusRes, freeRes] = await Promise.all([
            axios.get(`/api/payment/pass-status`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get('/api/payment/is-first-unlock', { headers: { Authorization: `Bearer ${token}` } })
          ])
          if (statusRes.data.success && statusRes.data.unlocked) {
            setIsUnlocked(true)
            setUnlockData(statusRes.data.unlock)
          }
          if (freeRes.data.success) {
            setIsFreeUnlock(freeRes.data.isFree)
          }
        } catch (error) {
          console.error('Error checking unlock status:', error)
        }
      }
      
      checkUnlockStatus()
    }, [user, property, id])

    const handlePaymentSuccess = (unlockRecord) => {
      setIsUnlocked(true)
      setUnlockData(unlockRecord)
      toast.success('🎉 Property unlocked! Contact details now visible.')
    }

    const getCellDisplay = (building, rowIndex, colIndex) => {
      const cell = building.grid[rowIndex][colIndex]
      const fs = Math.max(7, Math.floor(bCellPx * 0.15))
      
      if (cell.type === 'room') {
        const isSelectedRoom = selectedRoom && 
          selectedRoom.buildingId === building.id && 
          selectedRoom.row === rowIndex && 
          selectedRoom.col === colIndex
          
        return (
          <div className={`relative w-full flex flex-col items-center justify-center h-full ${isSelectedRoom ? 'ring-2 ring-indigo-500' : ''}`} style={{ fontSize: fs + 'px', padding: Math.max(2, Math.floor(bCellPx * 0.05)) + 'px' }}>
            <div className="font-semibold leading-tight truncate w-full text-center">{cell.roomType}</div>
            <div className="leading-tight opacity-80">Ksh {cell.pricePerMonth}</div>
            {!cell.isVacant ? (
              <div className="text-red-600 leading-tight">Occupied</div>
            ) : (
              <div className="text-green-600 leading-tight">Vacant</div>
            )}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: '20%', height: '18%', background: '#7c2d12', borderRadius: '2px 2px 0 0', minHeight: '5px', minWidth: '6px' }}></div>
          </div>
        )
      }
      
      if (cell.type === 'common') {
        return <div className="text-[10px] text-gray-500">Common</div>
      }
      
      return <div className="text-gray-300 text-xs">-</div>
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

  if (loading) {
    return <div className='py-28 text-center'>Loading...</div>
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

  // Dynamic cell size: shrinks automatically so all buildings fit inside the compound
  const numBuildings = property.buildings.length
  const totalCols = property.buildings.reduce((sum, b) => sum + (b.cols || 5), 0)
  const bCellPx = Math.max(40, Math.min(100, Math.floor(620 / (totalCols + numBuildings))))

  // Days since last refresh
  const daysSinceRefresh = property.lastVerifiedAt
    ? Math.floor((Date.now() - new Date(property.lastVerifiedAt)) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(property.createdAt)) / (1000 * 60 * 60 * 24))

  return (
    <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>

        {/* Freshness warning banner */}
        {property.needsRefresh && (
          <div className='mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-center gap-2 text-sm text-yellow-800'>
            <svg className='w-4 h-4 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'/></svg>
            <span><strong>Heads up:</strong> This listing was last updated {daysSinceRefresh} days ago. Availability may have changed — confirm directly with the landlord.</span>
          </div>
        )}
        {/* Property Header */}
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
            <div>
              <h1 className='text-3xl md:text-4xl font-medium'>{property.name}</h1>
              <p className='text-gray-600 mt-1'>{property.propertyType}</p>
              <div className='flex items-center gap-2 text-gray-600 mt-2'>
                <img src={assets.locationIcon} alt="" className='w-5 h-5' />
                <span>{property.estate}, {property.place}</span>
              </div>
            </div>
            <div className='flex flex-col items-end gap-2'>
              <div className='flex items-center gap-2'>
                {property.isVerified && (
                  <div className='px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800'>
                    ✓ Verified
                  </div>
                )}
                <div className='px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800'>
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
        <div className='mt-10 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200'>
          <div className='flex items-center gap-2 mb-2'>
            <svg className='w-6 h-6 text-indigo-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
            </svg>
            <h2 className='text-2xl font-bold'>Select Your Room</h2>
          </div>
          <p className='text-gray-600 mb-4'>Click on any vacant (green) room in the grid below to view details and request viewing</p>

          {/* All buildings inside ONE compound fence — matches listing modal */}
          <div className='overflow-x-auto py-4'>
            <div className='inline-block'>
              <div className='relative'>
                {/* Compound fence */}
                <div className='border-2 border-dashed border-gray-500 p-5 bg-gradient-to-br from-green-50 to-slate-100'>

                  {/* Buildings side by side */}
                  <div className='flex gap-6 items-end flex-wrap'>
                    {property.buildings.map((building, buildingIdx) => {
                      const isActive = buildingIdx === selectedBuilding

                      return (
                        <div
                          key={building.id}
                          onClick={() => !isActive && setSelectedBuilding(buildingIdx)}
                          className={`relative transition-all duration-200 ${!isActive ? 'opacity-60 cursor-pointer hover:opacity-80' : ''}`}
                          style={{ transform: isActive ? 'scale(1)' : 'scale(0.88)', transformOrigin: 'bottom center' }}
                        >
                          {/* Building label */}
                          <div className={`text-center text-xs font-semibold mb-1 ${isActive ? 'text-indigo-700' : 'text-gray-500'}`}>
                            {building.name}
                            {isActive && <span className='ml-1 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded'>Active</span>}
                          </div>

                          {/* Roof */}
                          <div className='flex justify-center'>
                            <svg width={building.cols * bCellPx} height='26'>
                              <polygon
                                points={`0,26 ${(building.cols * bCellPx) / 2},0 ${building.cols * bCellPx},26`}
                                fill={isActive ? '#7c3aed' : '#9ca3af'}
                                stroke={isActive ? '#4c1d95' : '#6b7280'}
                                strokeWidth='2'
                              />
                            </svg>
                          </div>

                          {/* Grid */}
                          <div className={`bg-white shadow border-2 ${isActive ? 'border-indigo-400' : 'border-gray-300'}`}>
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
                                      onClick={(e) => { e.stopPropagation(); isActive && handleCellClick(building, rowIndex, colIndex) }}
                                      style={{ width: bCellPx + 'px', height: bCellPx + 'px' }}
                                      className={`border border-gray-300 flex items-center justify-center transition-all text-xs overflow-hidden ${
                                        isSelected ? 'ring-4 ring-indigo-500 bg-indigo-100 z-10' :
                                        cell.type === 'room' && cell.isBooked ? 'bg-yellow-50 cursor-not-allowed opacity-80' :
                                        cell.type === 'room' && cell.isVacant ? 'bg-green-50 hover:bg-green-100 cursor-pointer' :
                                        cell.type === 'room' && !cell.isVacant ? 'bg-red-50 cursor-not-allowed opacity-60' :
                                        cell.type === 'common' ? 'bg-gray-100' :
                                        'bg-gray-50'
                                      }`}
                                    >
                                      {getCellDisplay(building, rowIndex, colIndex)}
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>

                          {/* Foundation */}
                          <div className='h-2 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Ground path */}
                  <div className='h-3 mt-3 bg-amber-100 border-t border-amber-200 rounded-sm w-full'></div>
                </div>

                {/* ONE gate on the compound fence */}
                {(() => {
                  const gs = property.compoundGate?.side || 'bottom'
                  const gatePos = {
                    'top':          'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
                    'bottom':       'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
                    'left':         'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2',
                    'right':        'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2',
                    'top-left':     'absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2',
                    'top-right':    'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2',
                    'bottom-left':  'absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
                    'bottom-right': 'absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2',
                  }
                  const pos = gatePos[gs] || gatePos['bottom']
                  return (
                    <div className={`${pos} bg-amber-50 border border-amber-400 rounded px-1.5 py-0.5 flex items-center gap-0.5 z-10`}>
                      <svg className='w-3.5 h-3.5 text-amber-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18m6-18v18' />
                      </svg>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          <div className='mt-4 flex gap-4 text-xs'>
            <div className='flex items-center gap-2'><div className='w-4 h-4 bg-green-50 border border-green-300'></div><span>Available</span></div>
            <div className='flex items-center gap-2'><div className='w-4 h-4 bg-red-50 border border-red-300'></div><span>Occupied</span></div>
            <div className='flex items-center gap-2'><div className='w-4 h-4 bg-gray-100 border border-gray-300'></div><span>Common Area</span></div>
          </div>
        </div>

        {/* Selected Room Details */}
        {selectedRoom ? (
          <div className='mt-10'>
            <h2 className='text-2xl font-bold mb-4'>Selected Room Details</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <h3 className='text-xl font-semibold text-indigo-600'>{selectedRoom.roomType}</h3>
                <p className='text-3xl font-bold mt-2'>Ksh {selectedRoom.pricePerMonth.toLocaleString()}<span className='text-lg text-gray-600 font-normal'>/month</span></p>
                
                <div className='mt-4'>
                  <p className='text-sm text-gray-600 mb-2'>Building: {selectedRoom.buildingName}</p>
                  <p className='text-sm text-gray-600'>Status: <span className={selectedRoom.isBooked ? 'text-yellow-600 font-medium' : selectedRoom.isVacant ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{selectedRoom.isBooked ? 'Booked' : selectedRoom.isVacant ? 'Vacant' : 'Occupied'}</span></p>
                </div>

                {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                  <div className='mt-6'>
                    <h4 className='font-semibold mb-3 text-gray-800'>Room Features:</h4>
                    <div className='flex flex-wrap gap-3'>
                      {selectedRoom.amenities.map((amenity, index) => (
                        <div key={index} className='flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200'>
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
                    <div className='mb-2 p-3 bg-green-50 border border-green-200 rounded-lg'>
                      <div className='flex items-center gap-2 text-sm text-green-700'>
                        <span>🔓</span>
                        <span className='font-medium'>Active Pass</span>
                        {unlockData && (
                          <span className='text-xs text-green-600'>
                            {unlockData.passType === '30day' ? '30-day' : '7-day'} pass · {unlockData.daysRemaining} days left
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setShowChat(true)}
                      className='px-6 py-3 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-all font-medium'
                    >
                      💬 Message Owner
                    </button>
                    
                    {property.whatsappNumber && (
                      <a
                        href={`https://wa.me/${property.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your ${selectedRoom.roomType} room at ${property.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className='px-6 py-3 rounded-lg border-2 border-green-600 bg-green-50 text-green-700 hover:bg-green-100 transition-all inline-flex items-center justify-center gap-2 font-medium'
                      >
                        <span className='text-xl'>📱</span> WhatsApp Owner
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    {/* Locked - Show unlock button */}
                    <div className='p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg mb-2'>
                      <div className='text-center'>
                        {!user ? (
                          /* Not logged in — sign-in CTA with free access hook */
                          <>
                            <div className='text-3xl mb-2'>🎁</div>
                            <p className='text-sm font-semibold text-gray-800 mb-1'>Get FREE access to contact details</p>
                            <p className='text-xs text-gray-500 mb-3'>Sign in to claim your free first unlock — phone number, WhatsApp & address included.</p>
                            <div className='text-2xl font-bold text-green-600 mb-3'>FREE</div>
                            <SignInButton mode="modal">
                              <button className='w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all'>
                                🔑 Sign In for Free Access
                              </button>
                            </SignInButton>
                            <p className='text-xs text-gray-400 mt-2'>Already have an account? Just sign in.</p>
                          </>
                        ) : isFreeUnlock === null ? (
                          /* Checking status — show neutral skeleton */
                          <>
                            <div className='text-3xl mb-2'>🔒</div>
                            <p className='text-sm text-gray-700 font-medium mb-1'>Unlock landlord contact details</p>
                            <p className='text-xs text-gray-600 mb-3'>Phone number, WhatsApp & exact address</p>
                            <div className='h-8 w-24 mx-auto bg-gray-200 rounded animate-pulse mb-3'></div>
                            <button disabled className='w-full py-3 rounded-lg font-semibold bg-gray-300 text-gray-500 cursor-wait'>
                              Checking...
                            </button>
                          </>
                        ) : (
                          <>
                            <div className='text-3xl mb-2'>{isFreeUnlock ? '🎁' : '🔒'}</div>
                            <p className='text-sm text-gray-700 font-medium mb-1'>Unlock landlord contact details</p>
                            <p className='text-xs text-gray-600 mb-3'>Phone number, WhatsApp & exact address</p>
                            {isFreeUnlock ? (
                              <>
                                <div className='text-2xl font-bold text-green-600 mb-1'>FREE</div>
                                <p className='text-xs text-green-700 mb-3'>Your first unlock is on us!</p>
                              </>
                            ) : (
                              <div className='text-2xl font-bold text-indigo-600 mb-3'>Ksh 200</div>
                            )}
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                                isFreeUnlock
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                              }`}
                            >
                              {isFreeUnlock ? '🎁 Claim Free Access' : '🔓 Unlock for Ksh 200'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Blurred contact buttons */}
                    <div className='relative'>
                      <div className='blur-sm pointer-events-none opacity-50'>
                        <button className='w-full px-6 py-3 rounded-lg border-2 border-gray-300 font-medium'>
                          💬 Message Owner
                        </button>
                      </div>
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <span className='text-xs font-medium text-gray-600 bg-white px-3 py-1 rounded-full shadow'>🔒 Unlock to contact</span>
                      </div>
                    </div>
                  </>
                )}
                
                <button 
                  onClick={handleRequestViewing}
                  disabled={!selectedRoom.isVacant || selectedRoom.isBooked}
                  className='px-8 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold disabled:bg-gray-400'
                >
                  {selectedRoom.isBooked ? 'Room Booked' : selectedRoom.isVacant ? 'Request Viewing' : 'Room Occupied'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className='mt-10 text-center py-10 bg-gray-50 rounded-lg'>
            <p className='text-gray-500 text-lg'>👆 Select a room from the grid above to view details</p>
          </div>
        )}

        {/* Owner Info */}
        <div className='mt-10 p-6 border border-gray-200 rounded-lg bg-white'>
          <div className='flex items-start gap-4'>
            <img 
              src={property.owner?.imageUrl || 'https://avatar.iran.liara.run/public'} 
              alt="" 
              className='w-16 h-16 rounded-full'
            />
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <p className='text-lg font-medium'>{property.owner?.fullName || 'Property Owner'}</p>
              </div>
              <p className='text-gray-600 text-sm mt-1'>Property Owner</p>
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
            onClose={() => setShowPaymentModal(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}
    </div>
  )
}

export default PropertyDetails
