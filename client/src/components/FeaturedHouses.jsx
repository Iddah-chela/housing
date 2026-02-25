import React from 'react'
import Title from './Title'
import { useAppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'

const FeaturedHouses = () => {
    const { properties } = useAppContext();
    const navigate = useNavigate();
    
    // Show properties with vacancies; show verified ones first
    const featuredProperties = (properties || [])
      .filter(p => p && p.vacantRooms > 0 && p.images && p.images.length > 0)
      .sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0))
      .slice(0, 4);
    
  return featuredProperties.length > 0  && (
    <div className='flex flex-col items-center px-6 md:px-16 lg:px-24 bg-slate-50 py-16'>
        <Title title='Featured Properties' subTitle='Discover quality rental properties with verified listings, great amenities, and affordable rates.'/>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 w-full max-w-7xl'>
           {featuredProperties.map((property, index)=>(
            <div 
              key={property._id}
              onClick={() => { navigate(`/rooms/${property._id}`); window.scrollTo(0,0); }}
              className='bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-200'
            >
              <div className='relative h-48'>
                <img 
                  src={property.images[0]} 
                  alt={property.name}
                  className='w-full h-full object-cover'
                />
                {property.isVerified && (
                  <div className='absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full'>
                    ✓ Verified
                  </div>
                )}
              </div>
              <div className='p-4'>
                <h3 className='font-semibold text-lg mb-1 truncate'>{property.name}</h3>
                <p className='text-sm text-gray-600 mb-2'>{property.estate}, {property.place}</p>
                <div className='flex items-center justify-between'>
                  <span className='text-indigo-600 font-medium'>
                    {property.vacantRooms} {property.vacantRooms === 1 ? 'Vacancy' : 'Vacancies'}
                  </span>
                  <span className='text-sm text-gray-500'>{property.propertyType}</span>
                </div>
              </div>
            </div>
           ))} 
        </div>

        <button onClick={()=>{
                navigate('/rooms'); window.scrollTo(0,0);
        }}
         className='mt-12 px-6 py-3 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-all cursor-pointer'>
            View All Properties
        </button>
    </div>
  )
}

export default FeaturedHouses