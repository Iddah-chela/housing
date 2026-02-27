import React from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'

const HouseCard = ({room, index}) => {
  const vacancyCount = room.house?.totalUnits ? Math.floor(Math.random() * room.house.totalUnits) : Math.floor(Math.random() * 5) + 1;
  
  return (
    < Link to={'/rooms/' + room._id} onClick={()=> scrollTo(0, 0)} key={room._id} className='relative max-w-70 w-full rounded-xl overflow-hidden bg-white text-gray-500/90 shadow-[0px_4px_4px_rgba(0,0,0,0.05)] hover:shadow-xl transition-shadow'>
        <img src={room.images[0]} alt="" className='h-48 w-full object-cover' />

        {room.isVerified && <p className='px-3 py-1 absolute top-3 left-3 text-xs bg-orange-500 text-white font-medium rounded-full flex items-center gap-1'>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          Verified
        </p>}
        {(() => {
          const daysOld = room.createdAt ? Math.floor((Date.now() - new Date(room.createdAt)) / 86400000) : null
          return daysOld !== null && daysOld <= 7 ? (
            <p className='px-2.5 py-1 absolute top-3 right-3 text-xs bg-green-500 text-white font-bold rounded-full tracking-wide'>NEW</p>
          ) : null
        })()}

        <div className='p-4 pt-5'>
            <div className='flex items-center justify-between'>
                <p className='font-playfair text-xl font-medium text-gray-800'>{room.house.name}</p>
                <div className='flex items-center gap-1 text-green-600 text-sm font-medium'>
                    {vacancyCount} vacant
                </div>
            </div>
            <div className='flex items-center gap-1 mt-2 text-sm'>
                 <img src={assets.locationIcon} alt="" className='w-4 h-4' /> 
                 <span>{room.house.place}</span>
            </div>
            <div className='flex items-center justify-between mt-4'>
                <p><span className='text-xl text-gray-800 font-semibold'>Ksh{room.pricePerMonth}</span><span className='text-sm text-gray-500'>/Month</span></p>
                <button className='px-4 py-2 text-sm font-medium bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-all cursor-pointer'>View Details</button>
            </div>
            {room.createdAt && (() => {
              const d = Math.floor((Date.now() - new Date(room.createdAt)) / 86400000)
              return <p className='text-xs text-gray-400 mt-1.5'>{d === 0 ? 'Listed today' : `Listed ${d} day${d === 1 ? '' : 's'} ago`}</p>
            })()}
        </div>
    </Link>
  )
}

export default HouseCard