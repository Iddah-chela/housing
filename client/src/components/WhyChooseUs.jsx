import React from 'react'

const features = [
  {
    icon: (
      <svg className='w-7 h-7 text-indigo-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' />
      </svg>
    ),
    title: 'Verified Listings',
    desc: 'Every property is reviewed before going live. No ghost listings, no surprises.',
  },
  {
    icon: (
      <svg className='w-7 h-7 text-indigo-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' />
      </svg>
    ),
    title: 'Direct to Landlord',
    desc: 'No middlemen. Chat directly with property owners and schedule viewings instantly.',
  },
  {
    icon: (
      <svg className='w-7 h-7 text-indigo-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
      </svg>
    ),
    title: 'Easy Viewing Requests',
    desc: 'Pick a date and time that works for you. Owners confirm within 48 hours.',
  },
  {
    icon: (
      <svg className='w-7 h-7 text-indigo-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' />
      </svg>
    ),
    title: 'Visual Room Layouts',
    desc: 'See the exact floor plan of each property before you visit, down to each room.',
  },
]

const stats = [
  { value: '100+', label: 'Properties Listed' },
  { value: '5+', label: 'Areas Covered' },
  { value: '48h', label: 'Avg. Owner Response' },
  { value: '100%', label: 'Verified Listings' },
]

const WhyChooseUs = () => {
  return (
    <div className='py-20 px-4 md:px-16 lg:px-24 xl:px-32 bg-white'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='text-center mb-14'>
          <h2 className='text-3xl md:text-4xl font-playfair font-semibold text-gray-800 mb-3'>
            Why Renters Choose Us
          </h2>
          <p className='text-gray-500 max-w-xl mx-auto'>
            Finding a house in Eldoret should be fast, honest, and stress-free. Here's how we make that happen.
          </p>
        </div>

        {/* Feature Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16'>
          {features.map((f, i) => (
            <div key={i} className='bg-gray-50 rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow'>
              <div className='w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4'>
                {f.icon}
              </div>
              <h3 className='font-semibold text-gray-800 mb-2'>{f.title}</h3>
              <p className='text-gray-500 text-sm leading-relaxed'>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        <div className='bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white'>
            {stats.map((s, i) => (
              <div key={i}>
                <p className='text-3xl font-bold font-playfair'>{s.value}</p>
                <p className='text-indigo-200 text-sm mt-1'>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WhyChooseUs
