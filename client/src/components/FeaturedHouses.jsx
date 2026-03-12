import React from 'react'
import Title from './Title'
import { useAppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'

const FeaturedHouses = () => {
    const { properties } = useAppContext();
    const navigate = useNavigate();
    
    // Show properties with vacancies; show verified ones first
    const featuredProperties = (properties || [])
      .filter(p => p && p.vacantRooms > 0 && p.images && p.images.length > 0)
      .sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0))
      .slice(0, 4);
    
  return featuredProperties.length > 0  && (
    <div className='flex flex-col items-center px-6 md:px-16 lg:px-24 bg-slate-10 dark:bg-gray-900 py-16'>
        <Title title='Featured Properties' subTitle='Discover quality rental properties with verified listings, great amenities, and affordable rates.'/>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 w-full max-w-7xl'>
           {featuredProperties.map((property, index)=>(
            <div 
              key={property._id}
              onClick={() => { navigate(`/rooms/${property._id}`); window.scrollTo(0,0); }}
              className='bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-200 dark:border-gray-700'
            >
              <div className='relative h-48'>
                <img 
                  src={property.images[0]} 
                  alt={property.name}
                  className='w-full h-full object-cover'
                />
                {property.isVerified && (
                  <div className='absolute top-2 right-2 bg-green-500 dark:bg-green-700 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1'>
                    <Check className='w-3 h-3' /> Verified
                  </div>
                )}
                {(() => {
                  const ref = property.lastVerifiedAt || property.createdAt
                  const d = ref ? Math.floor((Date.now() - new Date(ref)) / 86400000) : null
                  return d !== null && d <= 7 ? (
                    <span className='absolute top-2 left-2 bg-green-300 dark:bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide'>NEW</span>
                  ) : null
                })()}
              </div>
              <div className='p-4'>
                <h3 className='font-semibold text-lg mb-1 truncate'>{property.name}</h3>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>{property.estate}, {property.place}</p>
                <div className='flex items-center justify-between'>
                  <span className='text-indigo-600 font-medium'>
                    {property.vacantRooms} {property.vacantRooms === 1 ? 'Vacancy' : 'Vacancies'}
                  </span>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>{property.propertyType}</span>
                </div>
                {property.createdAt && (() => {
                  const refreshed = property.lastVerifiedAt && property.lastVerifiedAt !== property.createdAt
                  const baseline = refreshed ? property.lastVerifiedAt : property.createdAt
                  const d = Math.floor((Date.now() - new Date(baseline)) / 86400000)
                  return <p className='text-xs text-gray-400 mt-1.5'>{d === 0 ? (refreshed ? 'Refreshed today' : 'Listed today') : refreshed ? `Refreshed ${d} day${d === 1 ? '' : 's'} ago` : `Listed ${d} day${d === 1 ? '' : 's'} ago`}</p>
                })()}
              </div>
            </div>
           ))} 
        </div>

        <button onClick={()=>{
                navigate('/rooms'); window.scrollTo(0,0);
        }}
         className='mt-12 px-6 py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer'>
            View All Properties
        </button>
    </div>
  )
}

export default FeaturedHouses
