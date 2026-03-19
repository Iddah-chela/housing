import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { Places } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import heroImage from '../assets/heroImage.jpg';

const Hero = () => {
  const { navigate } = useAppContext();
  const [location, setLocation] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    // Navigate to rooms page with search params
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (minBudget) params.append('minPrice', minBudget);
    if (maxBudget) params.append('maxPrice', maxBudget);
    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <div
      style={{ backgroundImage: `url(${heroImage})` }}
      className='relative flex flex-col items-start justify-center px-6 md:px-16 lg:px-24 xl:px-32 text-white h-screen bg-cover bg-center bg-no-repeat'
    >
        {/* Preloaded hero image via CSS background */}
        <div className='absolute inset-0 bg-black/45' aria-hidden="true" />
        <div className='relative z-10 flex flex-col items-start w-full'>
          <p className='text-sm font-medium bg-green-500/50 px-3 py-1 rounded-full'>✓ Verified listings · No scams</p>
        <h1 className='font-medium text-3xl md:text-5xl lg:text-6xl max-w-2xl mt-6'>
          Find available houses for rent near you
        </h1>
        <p className='max-w-xl mt-4 text-base md:text-lg'>
          Verified listings. Viewing requests. Safe and secure rentals.
        </p>
        
        <form onSubmit={handleSearch} className='bg-white/85 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 rounded-lg px-6 py-5 mt-10 flex flex-col md:flex-row max-md:items-start gap-4 w-full max-w-3xl'>

            <div className='flex-1'>
                <div className='flex items-center gap-2 mb-2'>
                    <img src={assets.locationIcon} alt="" className='w-4 h-4'/>
                    <label htmlFor="locationInput" className='text-sm font-medium'>Location</label>
                </div>
                <input 
                  list='locations' 
                  id="locationInput" 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary" 
                  placeholder="Where do you want to live?" 
                />
                <datalist id='locations'>
                    {Places.map((place, index)=> (
                        <option value={place} key={index}/>
                    ))}
                </datalist>
            </div>

            <div className='flex-1'>
                <div className='flex items-center gap-2 mb-2'>
                    <label className='text-sm font-medium'>Budget Range (per month)</label>
                </div>
                <div className='flex items-center gap-2'>
                  <input 
                    type="number" 
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary" 
                    placeholder="Min (Ksh)" 
                  />
                  <span className='text-gray-400'>–</span>
                  <input 
                    type="number" 
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary" 
                    placeholder="Max (Ksh)" 
                  />
                </div>
            </div>

            <button type='submit' className='flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-dull py-3 px-8 text-white font-medium my-auto cursor-pointer max-md:w-full transition-all'>
                <img src={assets.searchIcon} alt="" className='h-5 invert'/>
                <span>Search homes</span>
            </button>
        </form>
        </div>{/* end z-10 content wrapper */}
    </div>
  )
}

export default Hero
