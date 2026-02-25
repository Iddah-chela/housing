import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { assets, facilityIcons, roomsDummyData } from '../assets/assets'
import ChatInterface from '../components/ChatInterface'
import ViewingRequestForm from '../components/ViewingRequestForm'
import ReportModal from '../components/ReportModal'
import VerificationBadge from '../components/VerificationBadge'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'

const RoomDetails = () => {
    const {id} = useParams()
    const { user, axios, getToken } = useAppContext()
    const [room, setRoom] = useState(null)
    const [mainImage, setMainImage] = useState(null)
    const [showChat, setShowChat] = useState(false)
    const [showViewingForm, setShowViewingForm] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [viewingRequest, setViewingRequest] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(()=>{
      const fetchRoom = async () => {
        try {
          setLoading(true)
          // TEMPORARILY USING DUMMY DATA - Replace with API call when backend is ready
          const foundRoom = roomsDummyData.find(room => room._id === id)
          if(foundRoom) {
            setRoom(foundRoom)
            setMainImage(foundRoom.images[0])
          } else {
            toast.error("Room not found")
          }
          
          // ORIGINAL API CALL (commented out temporarily):
          // const {data} = await axios.get(`/api/rooms/${id}`)
          // if(data.success) {
          //   setRoom(data.room)
          //   setMainImage(data.room.images[0])
          // } else {
          //   toast.error(data.message)
          // }
        } catch (error) {
          toast.error(error.message)
        } finally {
          setLoading(false)
        }
      }
      fetchRoom()
    }, [id])

    const handleRequestViewing = () => {
      if (!user) {
        toast.error('Please sign in to request a viewing')
        return
      }
      setShowViewingForm(true)
    }

    const onViewingSuccess = (request) => {
      setRoom({...room, availabilityStatus: 'viewing_requested'})
      setViewingRequest(request)
    }

    const getAvailabilityBadge = (status) => {
      const badges = {
        available: { text: 'Available', color: 'bg-green-100 text-green-800' },
        viewing_requested: { text: 'Viewing Pending', color: 'bg-yellow-100 text-yellow-800' },
        booked: { text: 'Booked', color: 'bg-red-100 text-red-800' }
      }
      return badges[status] || badges.available
    }

  if (loading) {
    return <div className='py-28 text-center'>Loading...</div>
  }

  if (!room) {
    return <div className='py-28 text-center'>Room not found</div>
  }

  return (
    <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
        {/* Room Header */}
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
            <div>
              <h1 className='text-3xl md:text-4xl font-medium'>{room.house.name}</h1>
              <p className='text-gray-600 mt-1'>{room.roomType} Room</p>
              <div className='flex items-center gap-2 text-gray-600 mt-2'>
                <img src={assets.locationIcon} alt="" className='w-5 h-5' />
                <span>{room.house.estate}, {room.house.place}</span>
              </div>
            </div>
            <div className='flex flex-col items-end gap-2'>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${getAvailabilityBadge(room.availabilityStatus || 'available').color}`}>
                {getAvailabilityBadge(room.availabilityStatus || 'available').text}
              </div>
              <button
                onClick={() => setShowReportModal(true)}
                className='text-red-600 hover:text-red-800 text-sm font-medium'
              >
                Report listing
              </button>
            </div>
        </div>

        {/* Status Message */}
        {viewingRequest && viewingRequest.status === 'pending' && (
          <div className='mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
            <p className='text-yellow-800 font-medium'>
              ⏳ Viewing requested. Waiting for owner response.
            </p>
            <p className='text-sm text-yellow-700 mt-1'>
              Your viewing request for {new Date(viewingRequest.viewingDate).toLocaleDateString()} {viewingRequest.viewingTimeRange} is pending.
            </p>
          </div>
        )}

        {viewingRequest && viewingRequest.status === 'confirmed' && (
          <div className='mt-4 p-4 bg-green-50 border border-green-200 rounded-lg'>
            <p className='text-green-800 font-medium'>
              ✓ Viewing confirmed for {new Date(viewingRequest.viewingDate).toLocaleDateString()} {viewingRequest.viewingTimeRange}
            </p>
            <p className='text-sm text-green-700 mt-1'>
              The owner will be expecting you at the scheduled time.
            </p>
          </div>
        )}

        {viewingRequest && viewingRequest.status === 'expired' && (
          <div className='mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg'>
            <p className='text-gray-800 font-medium'>
              ⚠️ Viewing expired. Request again.
            </p>
            <p className='text-sm text-gray-600 mt-1'>
              The owner did not respond. You can request another viewing.
            </p>
          </div>
        )}
        {/* Location */}
        <div className='flex items-center gap-2 text-gray-600 mt-4'>
          <img src={assets.locationIcon} alt="" className='w-5 h-5' />
          <span>{room.house.estate}, {room.house.place}</span>
        </div>

        {/* Images */}
        <div className='flex flex-col lg:flex-row mt-8 gap-4'>
          <div className='lg:w-2/3 w-full'>
            <img src={mainImage} alt="" className='w-full h-96 rounded-lg object-cover' />
          </div>
          <div className='grid grid-cols-2 gap-2 lg:w-1/3 w-full'>
            {room?.images.slice(0, 4).map((image, index)=>(
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

        {/* Price & CTA */}
        <div className='flex flex-col md:flex-row md:items-center md:justify-between mt-8 gap-4 p-6 bg-gray-50 rounded-lg'>
          <div>
            <p className='text-3xl font-semibold'>Ksh.{room.pricePerMonth.toLocaleString()}</p>
            <p className='text-gray-600 mt-1'>per month</p>
          </div>
          <div className='flex gap-3 flex-wrap'>
            <button 
              onClick={() => setShowChat(true)}
              className='px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-100 transition-all'
            >
              💬 Message Owner
            </button>
            {/* WhatsApp contact hidden until payment feature is implemented */}
            {/* {room.whatsappNumber && (
              <a
                href={`https://wa.me/${room.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your ${room.roomType} room at ${room.house.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className='px-6 py-3 rounded-lg border border-green-600 bg-green-50 text-green-700 hover:bg-green-100 transition-all inline-flex items-center gap-2'
              >
                <span className='text-lg'>📱</span> WhatsApp Owner
              </a>
            )} */}
            <button 
              onClick={handleRequestViewing}
              disabled={room.availabilityStatus === 'booked'}
              className='px-8 py-3 rounded-lg bg-primary text-white hover:bg-primary-dull transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Request Viewing
            </button>
          </div>
        </div>

        {showViewingForm && (
          <ViewingRequestForm
            roomId={room._id}
            houseId={room.house._id}
            ownerId={room.house.owner._id}
            onClose={() => setShowViewingForm(false)}
            onSuccess={onViewingSuccess}
          />
        )}

        {showChat && (
          <ChatInterface 
            room={room} 
            houseOwner={room.house.owner} 
            onClose={() => setShowChat(false)} 
          />
        )}

        {showReportModal && (
          <ReportModal
            type="listing"
            itemId={room._id}
            userId={room.house.owner._id}
            onClose={() => setShowReportModal(false)}
          />
        )}

        {/* Owner Info */}
        <div className='mt-10 p-6 border border-gray-200 rounded-lg'>
          <div className='flex items-start gap-4'>
            <img 
              src={room.house.owner.image} 
              alt="" 
              className='w-16 h-16 rounded-full'
            />
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <p className='text-lg font-medium'>{room.house.owner.username}</p>
                <VerificationBadge 
                  type="lister" 
                  isVerified={room.house.owner.isPhoneVerified && room.house.owner.isIdVerified} 
                />
              </div>
              <p className='text-gray-600 text-sm mt-1'>House Owner</p>
              {room.house.owner.averageResponseTime && (
                <p className='text-gray-500 text-sm mt-2'>
                  Usually responds within {Math.round(room.house.owner.averageResponseTime)} hours
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        {showViewingForm && (
          <ViewingRequestForm 
            room={room}
            onClose={() => setShowViewingForm(false)}
            onSuccess={() => {
              setRoom({...room, availabilityStatus: 'viewing_requested'})
            }}
          />
        )}

        {showChat && (
          <ChatInterface 
            room={room} 
            houseOwner={room.house.owner} 
            onClose={() => setShowChat(false)} 
          />
        )}
    </div>
  )
}

export default RoomDetails