import React from 'react'

const HowItWorks = () => {
  return (
    <div id='how-it-works' className='py-20 px-4 md:px-16 lg:px-24 xl:px-32 bg-gray-50'>
      <div className='max-w-7xl mx-auto'>
        {/* Section Header */}
        <h2 className='text-3xl font-playfair font-semibold text-gray-800 text-center mb-12'>
          How It Works
        </h2>
        
        {/* Steps Grid */}
        <div className='grid md:grid-cols-4 gap-6'>
          <div className='text-center'>
            <div className='w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold'>
              1
            </div>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>Browse Listings</h3>
            <p className='text-gray-600 text-sm'>
              Search by location and budget to find your perfect rental
            </p>
          </div>

          <div className='text-center'>
            <div className='w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold'>
              2
            </div>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>Request Viewing</h3>
            <p className='text-gray-600 text-sm'>
              Schedule a viewing with the property owner at your convenience
            </p>
          </div>

          <div className='text-center'>
            <div className='w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold'>
              3
            </div>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>Visit Property</h3>
            <p className='text-gray-600 text-sm'>
              Meet the owner and inspect the property in person
            </p>
          </div>

          <div className='text-center'>
            <div className='w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold'>
              4
            </div>
            <h3 className='text-lg font-semibold text-gray-800 mb-2'>Move In</h3>
            <p className='text-gray-600 text-sm'>
              Complete the rental agreement and move into your new home
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HowItWorks
