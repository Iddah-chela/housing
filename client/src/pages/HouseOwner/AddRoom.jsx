import React, { useState, useEffect, useRef } from 'react'
import Title from '../../components/Title'
import { assets, Places } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';


const AddRoom = () => {

  const {axios, getToken, user, isOwner, navigate} = useAppContext()

  // Check if user is landlord
  useEffect(() => {
    if (!user || !isOwner) {
      toast.error('Only landlords can list properties.')
      navigate('/')
      return
    }
  }, [user, isOwner, navigate])

// Property Details State
const [propertyInfo, setPropertyInfo] = useState({
  name: '',
  address: '',
  contact: '',
  whatsappNumber: '',
  place: '',
  estate: '',
  propertyType: '',
  googleMapsUrl: ''
})

// Grid State - Start with 1 row (1-story building) with 5 columns
const [buildings, setBuildings] = useState([{
  id: 'building_1',
  name: 'Main Building',
  rows: 1,
  cols: 5,
  grid: Array(1).fill(null).map(() => Array(5).fill({ type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true })),
  gatePosition: { side: 'bottom' }
}])

const [activeBuilding, setActiveBuilding] = useState(0)

// Room Configuration State
const [selectedCell, setSelectedCell] = useState(null)
const [roomConfig, setRoomConfig] = useState({
  type: 'room', // 'room', 'empty', 'common'
  roomType: '', // 'BedSitter', 'One-Bedroom', 'Self-Contain'
  pricePerMonth: 0,
  amenities: {
    'Free WiFi': false,
    '24/7 Security': false,
    'Water Supply': false,
    'Parking': false,
  },
  isVacant: true
})

const [images, setImages] = useState({
  1:null,
  2:null,
  3:null,
  4:null,
})

const [loading, setLoading] = useState(false)
const [dragPrice, setDragPrice] = useState(3500)
const dragDataRef = useRef(null)

// Drag-and-drop palette items
const paletteItems = [
  { type: 'room', roomType: 'BedSitter', label: 'BedSitter', color: 'bg-emerald-100 border-emerald-400 text-emerald-800' },
  { type: 'room', roomType: 'One-Bedroom', label: '1-Bedroom', color: 'bg-blue-100 border-blue-400 text-blue-800' },
  { type: 'room', roomType: 'Self-Contain', label: 'Self-Contain', color: 'bg-purple-100 border-purple-400 text-purple-800' },
  { type: 'common', roomType: '', label: 'Common Area', color: 'bg-gray-200 border-gray-400 text-gray-700' },
  { type: 'empty', roomType: '', label: 'Empty', color: 'bg-white border-gray-300 text-gray-500' },
]

const handleDragStart = (item) => {
  dragDataRef.current = item
}

const handleDrop = (rowIndex, colIndex) => {
  const item = dragDataRef.current
  if (!item) return
  const newBuildings = [...buildings]
  const building = newBuildings[activeBuilding]
  building.grid[rowIndex][colIndex] = {
    type: item.type,
    roomType: item.roomType,
    pricePerMonth: item.type === 'room' ? parseInt(dragPrice) || 0 : 0,
    amenities: [],
    isVacant: true
  }
  setBuildings(newBuildings)
  dragDataRef.current = null
}

// Add a new story (row) to current building
const addStory = () => {
  const newBuildings = [...buildings]
  const building = newBuildings[activeBuilding]
  building.rows += 1
  building.grid.unshift(Array(building.cols).fill({ type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true }))
  setBuildings(newBuildings)
  toast.success('New floor added!')
}

// Add a new column to current building
const addColumn = () => {
  const newBuildings = [...buildings]
  const building = newBuildings[activeBuilding]
  building.cols += 1
  building.grid = building.grid.map(row => [...row, { type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true }])
  setBuildings(newBuildings)
  toast.success('Column added!')
}

// Duplicate current building
const duplicateBuilding = () => {
  const currentBuilding = buildings[activeBuilding]
  const newBuilding = {
    id: 'building_' + (buildings.length + 1),
    name: `Building ${buildings.length + 1}`,
    rows: currentBuilding.rows,
    cols: currentBuilding.cols,
    grid: currentBuilding.grid.map(row => row.map(cell => ({...cell}))),
    gatePosition: { side: currentBuilding.gatePosition?.side || 'bottom' }
  }
  setBuildings([...buildings, newBuilding])
  setActiveBuilding(buildings.length)
  toast.success(`Building duplicated! Now editing ${newBuilding.name}`)
}

// Add a new empty building
const addNewBuilding = () => {
  const newBuilding = {
    id: 'building_' + (buildings.length + 1),
    name: `Building ${buildings.length + 1}`,
    rows: 1,
    cols: 5,
    grid: Array(1).fill(null).map(() => Array(5).fill({ type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true })),
    gatePosition: { side: 'bottom' }
  }
  setBuildings([...buildings, newBuilding])
  setActiveBuilding(buildings.length)
  toast.success(`New building added! Now editing ${newBuilding.name}`)
}

// Apply room config to all cells in current building
const applyToAllCells = () => {
  if (roomConfig.type === 'room' && !roomConfig.roomType) {
    toast.error('Please select a room type first')
    return
  }
  if (roomConfig.type === 'room' && roomConfig.pricePerMonth <= 0) {
    toast.error('Please enter a valid monthly rent first')
    return
  }
  const newBuildings = [...buildings]
  const building = newBuildings[activeBuilding]
  const selectedAmenities = Object.keys(roomConfig.amenities).filter(key => roomConfig.amenities[key])
  building.grid = building.grid.map(row =>
    row.map(() => ({
      type: roomConfig.type,
      roomType: roomConfig.roomType,
      pricePerMonth: parseInt(roomConfig.pricePerMonth) || 0,
      amenities: selectedAmenities,
      isVacant: roomConfig.isVacant
    }))
  )
  setBuildings(newBuildings)
  toast.success(`Applied to all cells in ${building.name}!`)
}

// Handle cell click in grid
const handleCellClick = (rowIndex, colIndex) => {
  const building = buildings[activeBuilding]
  const cell = building.grid[rowIndex][colIndex]
  
  setSelectedCell({ row: rowIndex, col: colIndex })
  
  // Load cell data into room config
  if (cell.type === 'room') {
    setRoomConfig({
      type: cell.type,
      roomType: cell.roomType,
      pricePerMonth: cell.pricePerMonth,
      amenities: cell.amenities.reduce((acc, amenity) => ({...acc, [amenity]: true}), {
        'Free WiFi': false,
        '24/7 Security': false,
        'Water Supply': false,
        'Parking': false,
      }),
      isVacant: cell.isVacant
    })
  } else {
    setRoomConfig({
      type: cell.type || 'empty',
      roomType: '',
      pricePerMonth: 0,
      amenities: {
        'Free WiFi': false,
        '24/7 Security': false,
        'Water Supply': false,
        'Parking': false,
      },
      isVacant: true
    })
  }
}

// Apply room configuration to selected cell
const applyRoomConfig = () => {
  if (!selectedCell) {
    toast.error('Please select a cell in the grid first')
    return
  }

  if (roomConfig.type === 'room' && !roomConfig.roomType) {
    toast.error('Please select a room type')
    return
  }

  if (roomConfig.type === 'room' && roomConfig.pricePerMonth <= 0) {
    toast.error('Please enter a valid monthly rent')
    return
  }

  const newBuildings = [...buildings]
  const building = newBuildings[activeBuilding]
  const selectedAmenities = Object.keys(roomConfig.amenities).filter(key => roomConfig.amenities[key])
  
  building.grid[selectedCell.row][selectedCell.col] = {
    type: roomConfig.type,
    roomType: roomConfig.roomType,
    pricePerMonth: parseInt(roomConfig.pricePerMonth),
    amenities: selectedAmenities,
    isVacant: roomConfig.isVacant
  }
  
  setBuildings(newBuildings)
  toast.success(`Cell updated: ${roomConfig.type === 'room' ? roomConfig.roomType : roomConfig.type}`)
}

// Get cell display
// Compute room number for a cell position in a building grid
const getRoomNumber = (grid, rowIndex, colIndex) => {
  let count = 0
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].type === 'room') {
        count++
        if (r === rowIndex && c === colIndex) return count
      }
    }
  }
  return 0
}

const getCellDisplay = (cell, roomNum) => {
  const fontSize = Math.max(7, Math.floor(bCellWidth * 0.16))
  const numSize = Math.max(8, Math.floor(bCellWidth * 0.22))
  if (cell.type === 'room') {
    const label = !cell.isVacant ? 'Occupied' : 'Vacant'
    const color = !cell.isVacant ? 'text-red-700' : 'text-green-800'
    return (
      <div className='relative w-full flex flex-col items-center justify-center h-full'>
        {roomNum > 0 && <span style={{ fontSize: numSize + 'px', lineHeight: '1' }} className='text-gray-700 font-extrabold absolute top-0.5 left-1'>R{roomNum}</span>}
        <span style={{ fontSize: fontSize + 'px', lineHeight: '1.1' }} className={`${color} font-semibold text-center leading-tight`}>{label}</span>
        <div className='absolute bottom-0 left-1/2 -translate-x-1/2' style={{ width: '30%', height: '22%', background: '#7c2d12', borderRadius: '3px 3px 0 0', minHeight: '6px', minWidth: '8px' }}></div>
      </div>
    )
  }
  
  if (cell.type === 'common') {
    return <div style={{ fontSize: fontSize + 'px' }} className='text-gray-500 font-medium'>Common</div>
  }
  
  return <div className='text-gray-400 text-lg'>·</div>
}

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    
    // Validate property info
    if(!propertyInfo.name || !propertyInfo.address || !propertyInfo.contact || !propertyInfo.place || !propertyInfo.estate || !propertyInfo.propertyType){
      toast.error("Please fill in all property details")
      return;
    }

    // Count total rooms across all buildings
    let totalRooms = 0
    buildings.forEach(building => {
      building.grid.forEach(row => {
        row.forEach(cell => {
          if (cell.type === 'room') totalRooms++
        })
      })
    })

    if (totalRooms === 0) {
      toast.error('Please add at least one room to the grid')
      return
    }

    if(!Object.values(images).some(image => image)){
      toast.error("Please upload at least one image")
      return;
    }

    setLoading(true);
    try {
      // Convert images to data URLs for demo (in production, upload to server)
      const imageUrls = await Promise.all(
        Object.values(images)
          .filter(img => img !== null)
          .map(img => {
            return new Promise((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result)
              reader.readAsDataURL(img)
            })
          })
      )

      // Create property object
      const newProperty = {
        _id: 'house_' + Date.now(),
        ...propertyInfo,
        totalUnits: totalRooms,
        owner: {
          _id: user.id,
          fullName: user.fullName,
          email: user.emailAddresses[0].emailAddress
        },
        buildings: buildings.map(building => ({
          id: building.id,
          name: building.name,
          rows: building.rows,
          cols: building.cols,
          layout: building.grid,
          gatePosition: building.gatePosition
        })),
        images: imageUrls.length > 0 ? imageUrls : [assets.uploadArea],
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Create individual room listings from grid
      const roomListings = []
      buildings.forEach((building, buildingIndex) => {
        building.grid.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            if (cell.type === 'room') {
              roomListings.push({
                _id: 'room_' + Date.now() + '_' + buildingIndex + '_' + rowIndex + '_' + colIndex,
                house: {
                  _id: newProperty._id,
                  name: newProperty.name,
                  address: newProperty.address,
                  place: newProperty.place,
                  estate: newProperty.estate,
                  owner: newProperty.owner
                },
                buildingId: building.id,
                buildingName: building.name,
                gridPosition: { row: rowIndex, col: colIndex },
                roomType: cell.roomType,
                pricePerMonth: cell.pricePerMonth,
                amenities: cell.amenities,
                images: imageUrls,
                isAvailable: cell.isVacant,
                availabilityStatus: cell.isVacant ? 'available' : 'occupied',
                isVerified: true,
                whatsappNumber: propertyInfo.whatsappNumber || propertyInfo.contact,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              })
            }
          })
        })
      })

      // Save to localStorage
      const existingProperties = JSON.parse(localStorage.getItem('userProperties') || '[]')
      existingProperties.push(newProperty)
      localStorage.setItem('userProperties', JSON.stringify(existingProperties))

      const existingRooms = JSON.parse(localStorage.getItem('userRooms') || '[]')
      existingRooms.push(...roomListings)
      localStorage.setItem('userRooms', JSON.stringify(existingRooms))

      toast.success(`Property listed successfully with ${totalRooms} rooms across ${buildings.length} building(s)!`)
      
      // Navigate to list rooms page
      setTimeout(() => {
        navigate('/owner/list-room')
      }, 1500)

    } catch (error) {
      toast.error(error.message)
    }finally{
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='pb-20 max-w-7xl mx-auto px-4'>
      <Title align='left' font='outfit' title='List Your Rental Property' subTitle='Provide property details, design the layout using the grid, and set room pricing - all in one step!' />

      {/* SECTION 1: Property Details */}
      <div className='bg-white border border-gray-200 rounded-lg p-6 mt-6'>
        <h2 className='text-xl font-semibold mb-4 text-gray-800'>1. Property Information</h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='font-medium text-gray-700 text-sm'>Property Name *</label>
            <input 
              type="text" 
              placeholder='e.g., Sunset View Apartments' 
              className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500' 
              value={propertyInfo.name}
              onChange={(e) => setPropertyInfo({...propertyInfo, name: e.target.value})}
              required 
            />
          </div>

          <div>
            <label className='font-medium text-gray-700 text-sm'>Property Type *</label>
            <select 
              className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500' 
              value={propertyInfo.propertyType}
              onChange={(e) => setPropertyInfo({...propertyInfo, propertyType: e.target.value})}
              required
            >
              <option value="">Select type</option>
              <option value="Apartments">Apartment Complex</option>
              <option value="Bedsitters">Bedsitter Units</option>
              <option value="Single Rooms">Single Room Rentals</option>
              <option value="Mixed">Mixed (Multiple types)</option>
            </select>
          </div>

          <div>
            <label className='font-medium text-gray-700 text-sm'>Contact Phone *</label>
            <input 
              type="tel" 
              placeholder='e.g., 0712345678' 
              className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500' 
              value={propertyInfo.contact}
              onChange={(e) => setPropertyInfo({...propertyInfo, contact: e.target.value})}
              required 
            />
          </div>

          <div>
            <label className='font-medium text-gray-700 text-sm'>WhatsApp Number (Optional)</label>
            <input 
              type="tel" 
              placeholder='e.g., 0712345678' 
              className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500' 
              value={propertyInfo.whatsappNumber}
              onChange={(e) => setPropertyInfo({...propertyInfo, whatsappNumber: e.target.value})}
            />
          </div>

          <div>
            <label className='font-medium text-gray-700 text-sm'>Street Address *</label>
            <input 
              type="text" 
              placeholder='e.g., Plot 45, Moi Avenue' 
              className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500' 
              value={propertyInfo.address}
              onChange={(e) => setPropertyInfo({...propertyInfo, address: e.target.value})}
              required 
            />
          </div>

          <div>
            <label className='font-medium text-gray-700 text-sm'>Estate/Building Name *</label>
            <input 
              type="text" 
              placeholder='e.g., Greenview Estate' 
              className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500' 
              value={propertyInfo.estate}
              onChange={(e) => setPropertyInfo({...propertyInfo, estate: e.target.value})}
              required 
            />
          </div>

          <div className='md:col-span-2'>
            <label className='font-medium text-gray-700 text-sm'>Area/Location *</label>
            <select 
              className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500' 
              value={propertyInfo.place}
              onChange={(e) => setPropertyInfo({...propertyInfo, place: e.target.value})}
              required
            >
              <option value="">Select Location</option>
              {Places.map((place)=>(
                <option key={place} value={place}>{place}</option>
              ))}
            </select>
          </div>

          <div className='md:col-span-2'>
            <label className='font-medium text-gray-700 text-sm'>Google Maps Link</label>
            <input 
              type="url" 
              placeholder='Paste link from Google Maps share button' 
              className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500' 
              value={propertyInfo.googleMapsUrl}
              onChange={(e) => setPropertyInfo({...propertyInfo, googleMapsUrl: e.target.value})}
            />
            <p className='text-xs text-gray-400 mt-1'>Open Google Maps → Find your property → Share → Copy link</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Property Photos */}
      <div className='bg-white border border-gray-200 rounded-lg p-6 mt-6'>
        <h2 className='text-xl font-semibold mb-4 text-gray-800'>2. Property Photos</h2>
        <p className='text-sm text-gray-500 mb-3'>Upload clear photos of the property (at least 1 required)</p>
        <div className='grid grid-cols-2 sm:flex gap-4 flex-wrap'>
          {Object.keys(images).map((key)=>(
              <label htmlFor={`propertyImage${key}`} key={key}>
                <img className='h-24 w-24 object-cover cursor-pointer opacity-80 hover:opacity-100 transition-opacity border border-gray-300 rounded'
                 src={images[key] ? URL.createObjectURL(images[key]) : assets.uploadArea} alt="" />
                 <input type='file' accept='image/*' id={`propertyImage${key}`} hidden onChange={e=> setImages ({...images, [key]: e.target.files[0]})} />
              </label>
          ))}
        </div>
      </div>

      {/* SECTION 3: Building Layout Grid Editor */}
      <div className='bg-white border border-gray-200 rounded-lg p-6 mt-6'>
        <h2 className='text-xl font-semibold mb-4 text-gray-800'>3. Building Layout (Grid Editor)</h2>
        <p className='text-sm text-gray-500 mb-4'>Design your property layout. Click cells to configure rooms, add floors, or duplicate buildings.</p>
        
        {/* Grid Controls */}
        <div className='flex gap-3 mb-4 flex-wrap'>
          <button type="button" onClick={addStory} className='flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-all'>
            <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' /></svg>
            Add Floor
          </button>
          <button type="button" onClick={addColumn} className='flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition-all'>
            <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' /></svg>
            Add Column
          </button>
          <button type="button" onClick={duplicateBuilding} className='flex items-center gap-1.5 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium transition-all'>
            <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' /></svg>
            Duplicate Building
          </button>
          <button type="button" onClick={addNewBuilding} className='flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium transition-all'>
            <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' /></svg>
            Add Building
          </button>
        </div>

        {/* Drag & Drop Palette */}
        <div className='mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg'>
          <p className='text-xs font-semibold text-indigo-700 mb-2'>Drag & Drop — drag a room type onto the grid</p>
          <div className='flex gap-2 flex-wrap items-end'>
            {paletteItems.map((item) => (
              <div
                key={item.label}
                draggable
                onDragStart={() => handleDragStart(item)}
                className={`px-3 py-1.5 rounded border-2 text-xs font-semibold cursor-grab active:cursor-grabbing select-none ${item.color} hover:shadow-md transition-all`}
              >
                {item.label}
              </div>
            ))}
            <div className='flex items-center gap-1.5 ml-2'>
              <label className='text-[10px] text-gray-600 font-medium whitespace-nowrap'>Default rent:</label>
              <input
                type='number'
                min='100'
                value={dragPrice}
                onChange={(e) => setDragPrice(e.target.value)}
                className='border border-indigo-300 rounded px-2 py-1 w-24 text-xs outline-indigo-500'
                placeholder='Ksh'
              />
            </div>
          </div>
        </div>

        {/* Gate Side Selector */}
        <div className='mb-4 flex items-center gap-3 flex-wrap'>
          <span className='text-sm font-medium text-gray-700'>Gate side:</span>
          {['top', 'bottom', 'left', 'right'].map(side => (
            <button
              key={side}
              type="button"
              onClick={() => {
                const newBuildings = [...buildings]
                newBuildings[activeBuilding].gatePosition = { side }
                setBuildings(newBuildings)
              }}
              className={`px-3 py-1 rounded text-xs font-medium capitalize border transition-all ${
                (buildings[activeBuilding].gatePosition?.side || 'bottom') === side
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-amber-50'
              }`}
            >
              {side}
            </button>
          ))}
        </div>

        {/* All Buildings — visible simultaneously; active = full size */}
        <div className='overflow-x-auto pb-6'>
          <div className='flex gap-10 items-start min-w-max'>
            {buildings.map((building, buildingIdx) => {
              const isActive = buildingIdx === activeBuilding
              const bMax = Math.max(building.rows || 1, building.cols || 1)
              const bCell = bMax <= 4 ? 'w-24 h-24' : bMax <= 6 ? 'w-20 h-20' : bMax <= 8 ? 'w-16 h-16' : 'w-12 h-12'
              const bCellWidth = bMax <= 4 ? 96 : bMax <= 6 ? 80 : bMax <= 8 ? 64 : 48
              const gateSide = building.gatePosition?.side || 'bottom'

              return (
                <div
                  key={building.id}
                  style={{ zoom: isActive ? 1 : 0.55 }}
                  className={`shrink-0 transition-all duration-200 ${!isActive ? 'cursor-pointer opacity-70 hover:opacity-90' : ''}`}
                  onClick={() => !isActive && setActiveBuilding(buildingIdx)}
                >
                  {/* Building name */}
                  <div className={`text-center text-sm font-semibold mb-2 ${isActive ? 'text-indigo-700' : 'text-gray-500'}`}>
                    {building.name}
                    {isActive && <span className='ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded'>Editing</span>}
                  </div>

                  {/* Compound — dashed fence all 4 sides */}
                  <div className='relative inline-block'>
                    <div className={`border-2 border-dashed ${isActive ? 'border-indigo-500' : 'border-gray-400'} p-4 bg-gradient-to-br from-gray-50 to-slate-100`}>
                      {/* Roof — outlined triangle with overhang, no bottom border */}
                      <div className='flex justify-center mb-1' style={{ marginLeft: -Math.round(bCellWidth * 0.15), marginRight: -Math.round(bCellWidth * 0.15) }}>
                        <svg width={building.cols * bCellWidth + Math.round(bCellWidth * 0.3)} height='28' className='drop-shadow-sm'>
                          <polyline
                            points={`0,28 ${(building.cols * bCellWidth + Math.round(bCellWidth * 0.3)) / 2},2 ${building.cols * bCellWidth + Math.round(bCellWidth * 0.3)},28`}
                            fill={isActive ? '#f5f3ff' : '#f9fafb'}
                            stroke={isActive ? '#4f46e5' : '#9ca3af'}
                            strokeWidth={isActive ? '3.5' : '2'}
                            strokeLinejoin='round'
                          />
                        </svg>
                      </div>

                      {/* Grid */}
                      <div className='bg-white shadow border border-gray-200'>
                        {building.grid.map((row, rowIndex) => (
                          <div key={rowIndex} className='flex'>
                            {row.map((cell, colIndex) => {
                              const isSelected = isActive && selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                              return (
                                <div
                                  key={colIndex}
                                  onClick={(e) => { e.stopPropagation(); isActive && handleCellClick(rowIndex, colIndex) }}
                                  onDragOver={(e) => { if (isActive) e.preventDefault() }}
                                  onDrop={(e) => { if (isActive) { e.preventDefault(); handleDrop(rowIndex, colIndex) } }}
                                  className={`${bCell} border border-gray-300 flex items-center justify-center cursor-pointer transition-all text-xs ${
                                    isSelected ? 'ring-4 ring-indigo-500 bg-indigo-200' :
                                    cell.type === 'room' && !cell.isVacant ? 'bg-red-200 border-red-400 hover:bg-red-300' :
                                    cell.type === 'room' ? 'bg-emerald-200 border-emerald-400 hover:bg-emerald-300' :
                                    cell.type === 'common' ? 'bg-gray-200 border-gray-400 hover:bg-gray-300' :
                                    'bg-gray-50 hover:bg-gray-100'
                                  }`}
                                >
                                  {getCellDisplay(cell, cell.type === 'room' ? getRoomNumber(building.grid, rowIndex, colIndex) : 0)}
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Foundation */}
                      <div className='h-2 bg-gradient-to-b from-gray-300 to-gray-400 rounded-b mt-0.5'></div>
                    </div>

                    {/* Gate — small icon on fence border */}
                    {(() => {
                      const posClass = {
                        'top':    'absolute top-0 left-1/2',
                        'bottom': 'absolute bottom-0 left-1/2',
                        'left':   'absolute left-0 top-1/2',
                        'right':  'absolute right-0 top-1/2',
                      }[gateSide] || 'absolute bottom-0 left-1/2'
                      const gateTransform = {
                        'top':    'translate(-50%, -50%)',
                        'bottom': 'translate(-50%, 50%)',
                        'left':   'translate(-50%, -50%) rotate(-90deg)',
                        'right':  'translate(50%, -50%) rotate(-90deg)',
                      }[gateSide] || 'translate(-50%, 50%)'
                      return (
                    <div className={`${posClass} bg-amber-50 border border-amber-400 rounded px-2 py-0.5 flex items-center gap-1 z-10`}
                      style={{ transform: gateTransform }}>
                      <svg className='w-3 h-3 text-amber-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18' />
                      </svg>
                      <span className='text-[9px] font-bold text-amber-800 uppercase tracking-wide'>Gate</span>
                      <svg className='w-3 h-3 text-amber-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18' />
                      </svg>
                    </div>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className='mt-1 text-xs text-gray-500'>
          Click any cell in the active building to configure it. Click an inactive building to switch to it.
        </div>
      </div>

      {/* SECTION 4: Room Configuration */}
      <div className='bg-white border border-gray-200 rounded-lg p-6 mt-6'>
        <h2 className='text-xl font-semibold mb-4 text-gray-800'>4. Configure Selected Cell</h2>
        {selectedCell ? (
          <div className='space-y-4'>
            <p className='text-sm text-gray-600'>Editing: Row {selectedCell.row + 1}, Column {selectedCell.col + 1}</p>
            
            <div>
              <label className='font-medium text-gray-700 text-sm'>Cell Type *</label>
              <select 
                className='border border-gray-300 rounded w-full max-w-xs px-3 py-2.5 mt-1 outline-indigo-500' 
                value={roomConfig.type}
                onChange={(e) => setRoomConfig({...roomConfig, type: e.target.value})}
              >
                <option value="empty">Empty</option>
                <option value="room">Room</option>
                <option value="common">Common Area</option>
              </select>
            </div>

            {roomConfig.type === 'room' && (
              <>
                <div className='flex gap-4 flex-wrap'>
                  <div className='flex-1 min-w-[200px]'>
                    <label className='font-medium text-gray-700 text-sm'>Room Type *</label>
                    <select 
                      className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500' 
                      value={roomConfig.roomType}
                      onChange={(e) => setRoomConfig({...roomConfig, roomType: e.target.value})}
                    >
                      <option value="">Select Room Type</option>
                      <option value="BedSitter">BedSitter</option>
                      <option value="One-Bedroom">One-Bedroom</option>
                      <option value="Self-Contain">Self-Contain</option>
                    </select>
                  </div>

                  <div>
                    <label className='font-medium text-gray-700 text-sm'>
                      Monthly Rent * <span className='text-xs font-normal'>(Ksh)</span>
                    </label>
                    <input 
                      type='number' 
                      placeholder='e.g., 4500' 
                      min="100" 
                      className='border border-gray-300 rounded px-3 py-2.5 w-32 mt-1 outline-indigo-500' 
                      value={roomConfig.pricePerMonth}
                      onChange={(e) => setRoomConfig({...roomConfig, pricePerMonth: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className='font-medium text-gray-700 text-sm block mb-2'>Amenities</label>
                  <div className='grid grid-cols-2 gap-3 max-w-md'>
                    {Object.keys(roomConfig.amenities).map((amenity, index)=>(
                      <label key={index} className='flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors'>
                          <input 
                            type="checkbox" 
                            checked={roomConfig.amenities[amenity]} 
                            onChange={()=>setRoomConfig({...roomConfig, amenities: {...roomConfig.amenities, [amenity]: !roomConfig.amenities[amenity]}})}
                            className='w-4 h-4 text-indigo-600'
                          />
                          <span className='select-none text-sm'>{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className='flex items-center gap-2 cursor-pointer w-fit'>
                    <input 
                      type="checkbox" 
                      checked={roomConfig.isVacant}
                      onChange={(e) => setRoomConfig({...roomConfig, isVacant: e.target.checked})}
                      className='w-4 h-4 text-indigo-600'
                    />
                    <span className='select-none text-sm font-medium text-gray-700'>Room is Vacant (Available for Rent)</span>
                  </label>
                </div>
              </>
            )}

            <div className='flex gap-3 flex-wrap'>
              <button 
                type="button" 
                onClick={applyRoomConfig} 
                className='bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded font-medium transition-all'
              >
                Apply to Cell
              </button>
              <button 
                type="button" 
                onClick={applyToAllCells}
                className='bg-gray-600 hover:bg-gray-700 text-white px-6 py-2.5 rounded font-medium transition-all'
                title='Apply this configuration to ALL cells in the current building'
              >
                Apply to All Cells
              </button>
            </div>
          </div>
        ) : (
          <p className='text-gray-500 text-sm'>Click a cell in the grid above to configure it</p>
        )}
      </div>

      {/* Submit Button */}
      <button 
        type="submit"
        className='bg-primary hover:bg-primary-dull text-white px-10 py-4 rounded mt-8 cursor-pointer transition-all font-semibold text-lg w-full md:w-auto' 
        disabled={loading}
      >
        { loading ? 'Creating Listing...' : 'List Property & Rooms'}
      </button>
    </form>
  )
}

export default AddRoom