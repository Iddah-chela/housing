import React, { useState, useEffect } from 'react'
import Title from '../../components/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'
import PropertyListingModal from '../../components/PropertyListingModal'

const ListRoom = () => {

  const [properties, setProperties] = useState([])
  const [showPropertyModal, setShowPropertyModal] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)
  const [loading, setLoading] = useState(false)
  const { user, getToken, axios } = useAppContext()

  // fetch Properties
  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/properties/owner/my-properties', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      
      if (response.data.success) {
        setProperties(response.data.properties)
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error('Failed to load your properties')
    } finally {
      setLoading(false)
    }
  }

  //Toggle Availability of a room in a building grid
  const toggleAvailability = async (propertyId, buildingId, row, col) => {
    try {
      const response = await axios.post('/api/properties/toggle-room', {
        propertyId,
        buildingId,
        row,
        col
      }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      
      if (response.data.success) {
        toast.success(response.data.message)
        fetchData() // Refresh data
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error('Failed to update availability')
    }
  }

  const deleteProperty = async (propertyId) => {
    if (!confirm('Are you sure you want to delete this property and all its rooms?')) return
    
    try {
      const response = await axios.delete(`/api/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      
      if (response.data.success) {
        toast.success(response.data.message)
        fetchData()
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error('Failed to delete property')
    }
  }

  const refreshListing = async (propertyId) => {
    try {
      const response = await axios.post(`/api/properties/${propertyId}/verify`, {}, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (response.data.success) {
        toast.success(response.data.message)
        fetchData()
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error('Failed to refresh listing')
    }
  }

  const getFreshnessBadge = (property) => {
    const baseline = property.lastVerifiedAt || property.createdAt
    const days = Math.floor((Date.now() - new Date(baseline)) / (1000 * 60 * 60 * 24))
    if (property.isExpired) return { label: 'Expired (hidden)', color: 'bg-red-100 text-red-700', days, urgent: true }
    if (property.needsRefresh) return { label: `Stale (${days}d old)`, color: 'bg-yellow-100 text-yellow-700', days, urgent: true }
    return { label: `Fresh (${days}d ago)`, color: 'bg-green-100 text-green-700', days, urgent: false }
  }

  useEffect(() => {
    if(user) {
      fetchData()
    }
  }, [user, showPropertyModal])

  return (
    <div className='pb-20'>
       <Title align='left' font='outfit' title='My Properties & Rooms' subTitle='Manage your rental properties, update availability, and track your listings'/>
       
       {/* Add Property Button */}
       <div className='mt-6 mb-8'>
         <button 
           onClick={() => {setEditingProperty(null); setShowPropertyModal(true)}}
           className='bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-all'
         >
           + List New Property
         </button>
       </div>

       {/* Properties Section */}
       {loading ? (
         <div className='text-center py-20'>Loading your properties...</div>
       ) : properties.length === 0 ? (
         <div className='text-center py-20 bg-gray-50 rounded-lg'>
           <p className='text-gray-500 text-lg mb-4'>You haven't listed any properties yet</p>
           <button 
             onClick={() => setShowPropertyModal(true)}
             className='bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700'
           >
             List Your First Property
           </button>
         </div>
       ) : (
         <div className='grid gap-6'>
           {properties.map((property) => {
             return (
               <div key={property._id} className='border border-gray-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow'>
                 <div className='flex justify-between items-start mb-4'>
                  <div>
                     <h4 className='text-2xl font-bold text-gray-800'>{property.name}</h4>
                     <p className='text-sm text-gray-600 mt-1'>{property.address}, {property.estate}</p>
                     <p className='text-sm text-gray-500'>{property.place} • {property.propertyType}</p>
                   </div>
               <div className='flex gap-2'>
                     <button 
                       onClick={() => {setEditingProperty(property); setShowPropertyModal(true)}}
                       className='flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100'
                     >
                       <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' /></svg>
                       Edit
                     </button>
                     {(() => {
                       const fb = getFreshnessBadge(property)
                       return fb.urgent ? (
                         <button
                           onClick={() => refreshListing(property._id)}
                           className='flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-300 rounded-lg text-sm font-semibold hover:bg-amber-100 animate-pulse'
                         >
                           <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'/></svg>
                           Refresh Listing
                         </button>
                       ) : (
                         <button
                           onClick={() => refreshListing(property._id)}
                           className='flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100'
                         >
                           <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'/></svg>
                           Refresh
                         </button>
                       )
                     })()}
                     <button 
                       onClick={() => deleteProperty(property._id)}
                       className='flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100'
                     >
                       <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' /></svg>
                       Delete
                     </button>
                   </div>
                 </div>

                 {/* Freshness status row */}
                 {(() => {
                   const fb = getFreshnessBadge(property)
                   return (
                     <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3 ${fb.color}`}>
                       <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'><circle cx='10' cy='10' r='8'/></svg>
                       {fb.label} — {fb.urgent ? 'Renters see a warning. Refresh to restore full visibility.' : 'Listing looks fresh to renters.'}
                     </div>
                   )
                 })()}

                 <div className='flex gap-6 mb-4 text-sm flex-wrap'>
                   <div className='px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium'>
                     {property.vacantRooms} Vacant
                   </div>
                   <div className='px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium'>
                     {property.totalRooms - property.vacantRooms} Occupied
                   </div>
                   <div className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium'>
                     {property.totalRooms} Total Units
                   </div>
                   <div className='px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium'>
                     {property.buildings.length} {property.buildings.length === 1 ? 'Building' : 'Buildings'}
                   </div>
                 </div>

                 {/* Building Visual Grid — fixed 52px cells, scrollable */}
                 {property.buildings.map((building) => {
                   const CELL = 52
                   return (
                     <div key={building.id} className='mt-4 border-t pt-4'>
                       <h5 className='font-semibold text-gray-700 mb-2 text-sm'>{building.name}</h5>
                       <div className='overflow-x-auto'>
                         <div className='inline-block pb-2'>
                           {/* Roof */}
                           <div className='flex justify-center'>
                             <svg width={building.cols * CELL} height='22'>
                               <polygon
                                 points={`0,22 ${(building.cols * CELL) / 2},0 ${building.cols * CELL},22`}
                                 fill='#7c3aed' stroke='#4c1d95' strokeWidth='2'
                               />
                             </svg>
                           </div>
                           {/* Grid */}
                           <div className='bg-white shadow border-2 border-indigo-400'>
                             {building.grid.map((row, rowIndex) => (
                               <div key={rowIndex} className='flex'>
                                 {row.map((cell, colIndex) => {
                                   if (cell.type === 'empty') return (
                                     <div key={colIndex} style={{width: CELL, height: CELL}} className='border border-gray-200 bg-gray-50' />
                                   )
                                   if (cell.type === 'common') return (
                                     <div key={colIndex} style={{width: CELL, height: CELL}} className='border border-gray-200 bg-gray-100 flex items-center justify-center'>
                                       <span className='text-[8px] text-gray-400'>C</span>
                                     </div>
                                   )
                                   return (
                                     <div
                                       key={colIndex}
                                       style={{width: CELL, height: CELL}}
                                       className={`relative border border-gray-200 overflow-hidden group ${cell.isBooked ? 'bg-yellow-50' : cell.isVacant ? 'bg-green-50' : 'bg-red-50'}`}
                                     >
                                       <div className='flex flex-col items-center justify-center h-full text-center px-0.5'>
                                         <span className='font-semibold leading-tight truncate w-full text-center' style={{fontSize: '8px'}}>{cell.roomType}</span>
                                         <span style={{fontSize: '7px'}} className='opacity-70'>Ksh {cell.pricePerMonth}</span>
                                         <span style={{fontSize: '7px'}} className={cell.isBooked ? 'text-yellow-600' : cell.isVacant ? 'text-green-600' : 'text-red-600'}>{cell.isBooked ? 'Booked' : cell.isVacant ? 'Vacant' : 'Occupied'}</span>
                                       </div>
                                       {/* Door */}
                                       <div className='absolute bottom-0 left-1/2 -translate-x-1/2' style={{width: '20%', height: '18%', background: '#7c2d12', borderRadius: '2px 2px 0 0', minHeight: '5px', minWidth: '6px'}}></div>
                                       {/* Hover toggle */}
                                       <button
                                         onClick={() => toggleAvailability(property._id, building.id, rowIndex, colIndex)}
                                         className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white font-bold ${cell.isVacant ? 'bg-green-600/85' : 'bg-red-600/85'}`}
                                         style={{fontSize: '9px'}}
                                       >
                                         {cell.isVacant ? 'Mark\nOccupied' : 'Mark\nVacant'}
                                       </button>
                                     </div>
                                   )
                                 })}
                               </div>
                             ))}
                           </div>
                           {/* Foundation */}
                           <div className='h-1.5 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                         </div>
                       </div>
                       <p className='text-xs text-gray-400 mt-1'>Hover any room to toggle availability</p>
                     </div>
                   )
                 })}
               </div>
             )
           })}
         </div>
       )}

       {/* Property Listing Modal */}
       {showPropertyModal && (
         <PropertyListingModal 
           onClose={() => {
             setShowPropertyModal(false)
             setEditingProperty(null)
           }}
           existingProperty={editingProperty}
         />
       )}
    </div>
  )
}

export default ListRoom