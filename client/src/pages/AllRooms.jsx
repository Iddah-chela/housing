import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, Coins, ImageIcon } from 'lucide-react'
import { PropertyCardSkeleton } from '../components/Skeletons'

const CheckBox = ({label, selected = false, onChange =() =>{}}) => {
    return(
      <label className='flex gap-3 items-center cursor-pointer mt-2 text-sm'>
        <input type='checkbox' checked={selected} onChange={(e)=>onChange(e.target.checked, label)}/>
        <span className='font-light select-none'>{label}</span>
      </label>
    )
}

const RadioButton = ({label, selected = false, onChange =() =>{}}) => {
    return(
      <label className='flex gap-3 items-center cursor-pointer mt-2 text-sm'>
        <input type='radio' name='sortOption' checked={selected} onChange={()=>onChange(label)}/>
        <span className='font-light select-none'>{label}</span>
      </label>
    )
}

const AllRooms = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL search params — must be before useState so they can seed initial state
  const urlLocation = searchParams.get('location') || '';
  const urlMinPrice = searchParams.get('minPrice') || '';
  const urlMaxPrice = searchParams.get('maxPrice') || '';

  const [properties, setProperties] = useState([])
  const [searchQuery, setSearchQuery] = useState(urlLocation)  // pre-fill from Hero search
  const [openFilters, SetOpenFilters] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState({
    roomType: [],
    priceRange: [],
    vacancyStatus: [],
  });
  const [includePreLive, setIncludePreLive] = useState(false)
  const [includeFullyOccupied, setIncludeFullyOccupied] = useState(false)

  const [selectedSort, setSelectedSort] = useState('')
  const [loading, setLoading] = useState(true)

  const formatLocationLine = (property) => {
    const address = (property.address || '').trim()
    const estate = (property.estate || '').trim()
    if (!address && !estate) return property.place || ''
    if (!address) return estate
    if (!estate) return address
    if (address.toLowerCase() === estate.toLowerCase()) return address
    return `${address}, ${estate}`
  }

  const getListingTierLabel = (property) => {
    const tier = String(property?.listingTier || '').toLowerCase()
    const isPartnerListing =
      String(property?.sourceType || '').toLowerCase() === 'field_list' ||
      (String(property?.owner?.role || '').toLowerCase() === 'admin' && !!String(property?.landlordName || '').trim())
    if (tier === 'live') return 'Live'
    if (tier === 'claimed') return 'Owner Updating'
    if (isPartnerListing) return 'Partner Listing'
    return 'Partner Listing'
  }

  const getListingTierBadgeClass = (property) => {
    const tier = String(property?.listingTier || '').toLowerCase()
    if (tier === 'live') return 'bg-green-600 text-white'
    if (tier === 'claimed') return 'bg-blue-600 text-white'
    return 'bg-slate-700 text-white'
  }

  const getCtaLabel = (property) => {
    if (property.actionability === 'info_only') return 'Details'
    if (property.actionability === 'inquiry_only') return 'Notify'
    return 'View Units'
  }
  
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/properties', {
          params: {
            includePreLive,
            includeFull: includeFullyOccupied,
          }
        })
        
        if (response.data.success) {
          // Process properties to calculate min/max prices from grid
          const processedProperties = response.data.properties.map(property => {
            const prices = []
            
            ;(property.buildings || []).forEach(building => {
              ;(building.grid || []).forEach(row => {
                row.forEach(cell => {
                  if (cell.type === 'room' && cell.pricePerMonth) {
                    prices.push(cell.pricePerMonth)
                  }
                })
              })
            })

            const fallbackMin = property.listedRentMin || property.listedRentMax || 0
            const fallbackMax = property.listedRentMax || property.listedRentMin || 0
            
            return {
              ...property,
              minPrice: prices.length > 0 ? Math.min(...prices) : 0,
              maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
              minPriceDisplay: prices.length > 0 ? Math.min(...prices) : fallbackMin,
              maxPriceDisplay: prices.length > 0 ? Math.max(...prices) : fallbackMax,
              hasRealImages: !!(property.images && property.images.length > 0),
              images: property.images && property.images.length > 0 ? property.images : []
            }
          })
          
          setProperties(processedProperties)
        } else {
          toast.error(response.data.message)
        }
      } catch (error) {
        toast.error('Failed to load properties')
      } finally {
        setLoading(false)
      }
    }
    
    fetchProperties()
  }, [includePreLive, includeFullyOccupied])

  const roomTypes = [
    "BedSitter",
    "One-Bedroom",
    "Self-Contain"
  ];

  const priceRanges = [
    '0 to 3000',
    '3000 to 3500',
    '3500 to 4000',
    '4000 to 4500',
  ];

  const vacancyStates = ['available', 'limited', 'full', 'unknown']

  const sortOptions = [
    "Price Low to High",
    "Price High to Low",
    "Most Vacancies",
    "Newest First",
    "Live Listings First"
  ];

  // Handle changes for filter and sorting
  const handleFiltersChange = (checked, value, type) => {
    setSelectedFilters((prevFilters) =>{
      const updatedFilters = {...prevFilters};
      if(checked){
        updatedFilters[type].push(value);
      }else{
        updatedFilters[type] = updatedFilters[type].filter(item => item !== value);
      }
      return updatedFilters;
    })
  }

  const handleSortChange = (sortOption) => {
    setSelectedSort(sortOption);
  }

  const clearAllFilters = () => {
    setSelectedFilters({
      roomType: [],
      priceRange: [],
      vacancyStatus: [],
    });
    setIncludePreLive(false)
    setIncludeFullyOccupied(false)
    setSelectedSort('');
    setSearchQuery('');
    setSearchParams({});
  }

  const clearURLParam = (param) => {
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    setSearchParams(next);
  }

  // Filter functions
  const matchesRoomType = (property) => {
    if (selectedFilters.roomType.length === 0) return true;
    
    // Check if any cell in any building matches the selected room types
    return (property.buildings || []).some(building => 
      (building.grid || []).some(row =>
        row.some(cell => 
          cell.type === 'room' && selectedFilters.roomType.includes(cell.roomType)
        )
      )
    ) || selectedFilters.roomType.some((roomType) =>
      String(property.propertyType || '').toLowerCase().includes(String(roomType).toLowerCase())
    );
  }

  const matchesPriceRange = (property) => {
    return selectedFilters.priceRange.length === 0 || selectedFilters.priceRange.some(range => {
      const [min, max] = range.split('to').map(Number);
      return property.minPriceDisplay >= min && property.minPriceDisplay <= max;
    })
  }

  const matchesListingTier = () => true

  const matchesVacancyStatus = (property) => {
    if (selectedFilters.vacancyStatus.length === 0) return true
    return selectedFilters.vacancyStatus.includes(String(property.vacancyStatus || '').toLowerCase())
  }

  const matchesSearch = (property) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      property.name.toLowerCase().includes(query) ||
      property.address.toLowerCase().includes(query) ||
      property.place.toLowerCase().includes(query) ||
      property.estate.toLowerCase().includes(query) ||
      property.propertyType.toLowerCase().includes(query)
    );
  }
  
  // Apply URL search params filters
  const matchesURLLocation = (property) => {
    if (!urlLocation) return true;
    const query = urlLocation.toLowerCase();
    return (
      property.place.toLowerCase().includes(query) ||
      property.estate.toLowerCase().includes(query) ||
      property.address.toLowerCase().includes(query)
    );
  }
  
  const matchesURLPriceRange = (property) => {
    const min = urlMinPrice ? parseFloat(urlMinPrice) : 0;
    const max = urlMaxPrice ? parseFloat(urlMaxPrice) : Infinity;
    
    if (!urlMinPrice && !urlMaxPrice) return true;
    
    return property.minPriceDisplay >= min && property.minPriceDisplay <= max;
  }

  const getFreshnessRank = (property) => {
    const baseline = property.lastVerifiedAt || property.createdAt
    if (!baseline) return 3
    const days = Math.floor((Date.now() - new Date(baseline)) / 86400000)
    if (days <= 7) return 0
    if (days <= 30) return 1
    return 2
  }

  // Sort properties
  const sortProperties = (a, b) => {
    const tierPriority = { live: 0, claimed: 1, directory: 2 }

    if (!selectedSort || selectedSort === 'Live Listings First') {
      const tierDiff = (tierPriority[a.listingTier] ?? 3) - (tierPriority[b.listingTier] ?? 3)
      if (tierDiff !== 0) return tierDiff

      const freshnessDiff = getFreshnessRank(a) - getFreshnessRank(b)
      if (freshnessDiff !== 0) return freshnessDiff

      return new Date(b.createdAt) - new Date(a.createdAt)
    }

    if (selectedSort === 'Price Low to High') {
      return a.minPriceDisplay - b.minPriceDisplay;
    }
    if (selectedSort === 'Price High to Low') {
      return b.maxPriceDisplay - a.maxPriceDisplay;
    }
    if (selectedSort === 'Most Vacancies') {
      return b.vacantRooms - a.vacantRooms;
    }
    if (selectedSort === 'Newest First') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  }

  const filteredProperties = properties
    .filter(matchesSearch)
    .filter(matchesRoomType)
    .filter(matchesPriceRange)
    .filter(matchesListingTier)
    .filter(matchesVacancyStatus)
    .filter(matchesURLLocation)
    .filter(matchesURLPriceRange)
    .sort(sortProperties)

  if (loading) {
    return (
      <div className='pt-28 md:pt-35 px-4 md:px-16 lg:px-24 pb-16'>
        <div className='h-10 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2 animate-pulse' />
        <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded w-80 mb-6 animate-pulse' />
        {[...Array(4)].map((_, i) => <PropertyCardSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className='flex flex-col-reverse lg:flex-row items-start justify-between gap-8 pt-28 md:pt-35 px-4 md:px-16 lg:px-24 pb-16'>
      <div className='flex-1 w-full lg:w-auto'>
        <div className='flex flex-col items-start text-left'> 
          <h1 className='font-playfair text-4xl md:text-[40px]'>Available Houses</h1>
        <p className='text-sm md:text-base text-gray-500/90 dark:text-gray-400 mt-2 max-w-2xl'>Browse live listings first. Turn on extra filters if you want to see claim opportunities or fully occupied properties.</p>
        </div>

        {/* Search Bar */}
        <div className='mt-6 mb-4'>
          <div className='relative max-w-xl'>
            <img src={assets.searchIcon} alt="" className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search by house name, location, or room type...'
              className='w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:text-gray-200'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
              >
                <X className='w-4 h-4' />
              </button>
            )}
          </div>
          {/* Active filter chips from Hero search */}
          {(urlLocation || urlMinPrice || urlMaxPrice) && (
            <div className='flex flex-wrap gap-2 mt-2'>
              {urlLocation && (
                <span className='flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-3 py-1 rounded-full font-medium'>
                  <button onClick={() => { clearURLParam('location'); setSearchQuery(''); }} className='ml-1 hover:text-indigo-900 font-bold'><X className='w-3 h-3' /></button>
                </span>
              )}
              {(urlMinPrice || urlMaxPrice) && (
                <span className='flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-3 py-1 rounded-full font-medium'>
                  <Coins className='w-3.5 h-3.5' /> Ksh {urlMinPrice || '0'} – {urlMaxPrice || '∞'}
                  <button onClick={() => { clearURLParam('minPrice'); clearURLParam('maxPrice'); }} className='ml-1 hover:text-indigo-900 font-bold'><X className='w-3 h-3' /></button>
                </span>
              )}
              <button onClick={clearAllFilters} className='text-xs text-gray-500 underline hover:text-gray-700 px-1'>Clear all</button>
            </div>
          )}
        </div>

        {filteredProperties.map((property) => (
          <div key={property._id} className='flex flex-col md:flex-row items-start py-10 gap-6 border-b border-gray-300 dark:border-gray-700 last:pb-30 last:border-0'>
            <div className='relative w-full md:w-1/2'>
              {property.hasRealImages ? (
                <img 
                  onClick={() => {navigate(`/rooms/${property._id}`), scrollTo(0,0)}}
                  src={property.images[0]} 
                  alt="" 
                  title='View Property Details' 
                  className='w-full aspect-[16/10] rounded-xl shadow-lg object-cover object-center cursor-pointer hover:shadow-2xl transition-shadow relative'
                />
              ) : (
                <div className='w-full aspect-[16/10] rounded-xl shadow-inner border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center text-gray-500 dark:text-gray-300'>
                  <ImageIcon className='w-8 h-8 mb-2 opacity-80' />
                  
                </div>
              )}
            </div>

            <div className='w-full md:w-1/2 flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <p className='text-gray-500 dark:text-gray-400'>{property.place}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${getListingTierBadgeClass(property)}`}>
                  {getListingTierLabel(property).toUpperCase()}
                </span>
                {property.isVerified && !(property.listingTier === 'live' && property.owner?.role === 'admin' && !String(property?.landlordName || '').trim() && (!property.caretakers || property.caretakers.length === 0)) && (
                  <span className='bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide'>VERIFIED</span>
                )}
                {property.listingTier === 'live' && property.isVerified && property.owner?.role === 'admin' && !String(property?.landlordName || '').trim() && (!property.caretakers || property.caretakers.length === 0) && (
                  <span className='bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide'>VERIFIED BY ADMIN</span>
                )}
                {(() => {
                  const baseline = property.lastVerifiedAt || property.createdAt
                  const d = baseline ? Math.floor((Date.now() - new Date(baseline)) / 86400000) : null
                  return d !== null && d <= 7 ? (
                    <span className='bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide'>NEW</span>
                  ) : null
                })()}
              </div>
              <p 
                onClick={() => {navigate(`/rooms/${property._id}`), scrollTo(0,0)}}
                className='text-gray-800 dark:text-gray-100 text-3xl font-playfair cursor-pointer hover:text-indigo-600 transition-colors'
              >
                {property.name}
              </p>
              
              <div className='flex items-center gap-3 flex-wrap'>
                {property.isVerified && (
                  <div className='flex items-center gap-2 text-green-600 text-sm'>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className='font-medium'>Verified Listing</span>
                  </div>
                )}
                
                {property.vacancyStatus === 'available' && (
                  <div className='px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium'>
                    {property.vacantRooms} {property.vacantRooms === 1 ? 'Vacancy' : 'Vacancies'}
                  </div>
                )}

                {property.vacancyStatus === 'limited' && (
                  <div className='px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium'>
                    Limited Vacancy
                  </div>
                )}

                {(property.soonAvailableRooms || 0) > 0 && (
                  <div className='px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium'>
                    {property.soonAvailableRooms} Available Soon
                  </div>
                )}

                {property.vacancyStatus === 'unknown' && (
                  <div className='px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-sm font-medium'>
                    Availability Not Confirmed
                  </div>
                )}
                
                {property.needsRefresh && (
                  <div className='px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-sm font-medium flex items-center gap-1'>
                    <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'/></svg>
                    May not be available
                  </div>
                )}
                
                {property.vacancyStatus === 'full' && (property.soonAvailableRooms || 0) === 0 && (
                  <div className='px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium'>
                    Fully Occupied
                  </div>
                )}
              </div>
              
              <div className='flex items-center gap-1 text-gray-500 mt-2 text-sm'>
                <img src={assets.locationIcon} alt="" />
                <span>{formatLocationLine(property)}</span>
              </div>
              
              <div className='mt-3 mb-4'>
                {(() => {
                  const unitCount = Number(property.totalRooms || property.declaredUnits || 0)
                  const unitsText = unitCount > 0
                    ? `${unitCount} ${unitCount === 1 ? 'Unit' : 'Units'}`
                    : 'Units not listed'
                  return (
                <p className='text-sm text-gray-600 mb-2'>
                  {property.propertyType} • {unitsText} 
                  {property.buildings && property.buildings.length > 0 && ` • ${property.buildings.length} ${property.buildings.length === 1 ? 'Building' : 'Buildings'}`}
                </p>
                  )
                })()}
              </div>
              
              {/* Price Range */}
              <p className='text-xl font-medium text-gray-700 dark:text-gray-200'>
                {property.minPriceDisplay === property.maxPriceDisplay ? (
                  property.minPriceDisplay > 0 ? `Ksh ${property.minPriceDisplay.toLocaleString()}/Month` : 'Rent on request'
                ) : (
                  `Ksh ${property.minPriceDisplay.toLocaleString()} - ${property.maxPriceDisplay.toLocaleString()}/Month`
                )}
              </p>
              {(property.lastVerifiedAt || property.createdAt) && (() => {
                const refreshed = property.lastVerifiedAt && property.lastVerifiedAt !== property.createdAt
                const baseline = refreshed ? property.lastVerifiedAt : property.createdAt
                const d = Math.floor((Date.now() - new Date(baseline)) / 86400000)
                const label = refreshed
                  ? (d === 0 ? 'Updated today' : `Updated ${d} day${d === 1 ? '' : 's'} ago`)
                  : (d === 0 ? 'Listed today' : `Listed ${d} day${d === 1 ? '' : 's'} ago`)
                return <p className='text-xs text-gray-400'>{label}</p>
              })()}
              
              <button 
                onClick={() => {navigate(`/rooms/${property._id}`), scrollTo(0,0)}}
                className='mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all w-fit'
              >
                {getCtaLabel(property)}
              </button>
            </div>
          </div>
        ))}
        
        {filteredProperties.length === 0 && (
          <div className='text-center py-20'>
            <p className='text-gray-500 text-lg'>No properties found matching your criteria.</p>
            <button onClick={clearAllFilters} className='mt-4 text-indigo-600 hover:text-indigo-700 font-medium'>
              Clear all filters
            </button>
          </div>
        )}
      </div>
      {/*filters*/}
      <div className='lg:sticky lg:top-28 bg-white dark:bg-gray-800 w-full max-w-xs lg:max-w-none mx-auto lg:mx-0 lg:w-52 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 max-lg:mb-6 self-start rounded-lg shadow-sm lg:shrink-0'>

        <div className={`flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30`}>
          <p className='text-xs font-semibold text-gray-800 dark:text-gray-200'>FILTERS</p>
          <div className='text-xs cursor-pointer font-medium'>
            <span onClick={()=> SetOpenFilters(!openFilters)} className='lg:hidden text-indigo-600 hover:text-indigo-700'>
              {openFilters ? '▲' : '▼'}</span>
            <span onClick={clearAllFilters} className='hidden lg:block text-gray-600 hover:text-indigo-600 transition-colors'>CLEAR</span>
          </div>
        </div>
        <div className={`${openFilters ? 'max-h-[1500px]' : "max-h-0 lg:max-h-[1500px]"} overflow-hidden transition-all duration-300`}>
          <div className='px-3 pt-3 pb-2'>
              <p className='font-medium text-gray-800 dark:text-gray-200 text-xs pb-2'>Room Type</p>
              <div className='flex flex-wrap gap-1.5'>
                {roomTypes.map((room, index)=>(
                  <button
                    key={index}
                    onClick={() => handleFiltersChange(!selectedFilters.roomType.includes(room), room, 'roomType')}
                    className={`px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedFilters.roomType.includes(room) 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                    }`}
                  >
                    {room}
                  </button>
                ))}
              </div>
          </div>
          <div className='px-3 pt-2 pb-2 border-t border-gray-100 dark:border-gray-700'>
              <p className='font-medium text-gray-800 dark:text-gray-200 text-xs pb-2'>Price Range</p>
              <div className='flex flex-wrap gap-1.5'>
                {priceRanges.map((range, index)=>(
                  <button
                    key={index}
                    onClick={() => handleFiltersChange(!selectedFilters.priceRange.includes(range), range, 'priceRange')}
                    className={`px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedFilters.priceRange.includes(range) 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400'
                    }`}
                  >
                    Ksh {range}
                  </button>
                ))}
              </div>
          </div>
          <div className='px-3 pt-2 pb-2 border-t border-gray-100 dark:border-gray-700'>
              <p className='font-medium text-gray-800 dark:text-gray-200 text-xs pb-2'>Listing Scope</p>
              <div className='flex flex-wrap gap-1.5'>
                <button
                  onClick={() => setIncludePreLive((prev) => !prev)}
                  className={`px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                    includePreLive
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-slate-500'
                  }`}
                >
                  Show Claim Opportunities
                </button>
                <button
                  onClick={() => setIncludeFullyOccupied((prev) => !prev)}
                  className={`px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                    includeFullyOccupied
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-slate-500'
                  }`}
                >
                  Show Fully Occupied
                </button>
              </div>
          </div>
          <div className='px-3 pt-2 pb-2 border-t border-gray-100 dark:border-gray-700'>
              <p className='font-medium text-gray-800 dark:text-gray-200 text-xs pb-2'>Vacancy</p>
              <div className='flex flex-wrap gap-1.5'>
                {vacancyStates.map((status, index)=>(
                  <button
                    key={index}
                    onClick={() => handleFiltersChange(!selectedFilters.vacancyStatus.includes(status), status, 'vacancyStatus')}
                    className={`px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                      selectedFilters.vacancyStatus.includes(status)
                        ? 'bg-indigo-700 text-white border-indigo-700'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                    }`}
                  >
                    {status === 'unknown' ? 'Not Confirmed' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
          </div>
          <div className='px-3 pt-2 pb-3 border-t border-gray-100 dark:border-gray-700'>
              <p className='font-medium text-gray-800 dark:text-gray-200 text-xs pb-2'>Sort By</p>
              <div className='space-y-1'>
                {sortOptions.map((option, index)=>(
                  <label
                    key={index}
                    className='flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-1.5 py-1 rounded transition-colors'
                  >
                    <input
                      type='radio'
                      name='sort'
                      checked={selectedSort === option}
                      onChange={() => handleSortChange(option)}
                      className='w-3 h-3 text-indigo-600'
                    />
                    <span className='text-xs text-gray-700 dark:text-gray-300'>{option}</span>
                  </label>
                ))}
              </div>
          </div>
          
        </div>

      </div>
    </div>
  )
}

export default AllRooms
