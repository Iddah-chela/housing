import React, { useState } from 'react'
import { assets, Places } from '../assets/assets'
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const PropertyListingModal = ({ onClose, existingProperty = null }) => {
  const { user, navigate, getToken, axios } = useAppContext()

  // Property Details State
  const [propertyInfo, setPropertyInfo] = useState(existingProperty ? {
    name: existingProperty.name,
    address: existingProperty.address,
    contact: existingProperty.contact,
    whatsappNumber: existingProperty.whatsappNumber || '',
    place: existingProperty.place,
    estate: existingProperty.estate,
    propertyType: existingProperty.propertyType
  } : {
    name: '',
    address: '',
    contact: '',
    whatsappNumber: '',
    place: '',
    estate: '',
    propertyType: ''
  })

  // Grid State - Start with 1 row (1-story building) with 5 columns
  // Ensure existingProperty.buildings has proper structure
  const initializeBuildings = () => {
    if (existingProperty?.buildings && Array.isArray(existingProperty.buildings) && existingProperty.buildings.length > 0) {
      // Validate each building has required structure
      return existingProperty.buildings.map(building => ({
        id: building.id || 'building_1',
        name: building.name || 'Main Building',
        rows: building.rows || 1,
        cols: building.cols || 5,
        grid: building.grid || Array(1).fill(null).map(() => Array(5).fill({ type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true })),
        gatePosition: building.gatePosition || { row: 0, col: 4 }
      }))
    }
    // Default new building
    return [{
      id: 'building_1',
      name: 'Main Building',
      rows: 1,
      cols: 5,
      grid: Array(1).fill(null).map(() => Array(5).fill({ type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true })),
      gatePosition: { row: 0, col: 4 }
    }]
  }
  
  const [buildings, setBuildings] = useState(initializeBuildings())

  const [activeBuilding, setActiveBuilding] = useState(0)
  const [selectedCell, setSelectedCell] = useState(null)
  const [selectedCells, setSelectedCells] = useState([]) // For "Apply to All"
  const [roomConfig, setRoomConfig] = useState({
    type: 'room',
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

  const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null })
  const [loading, setLoading] = useState(false)
  const [selectMode, setSelectMode] = useState(false) // Multi-select mode
  const [compoundGate, setCompoundGate] = useState(existingProperty?.compoundGate || { side: 'bottom' })

  // Grid manipulation functions
  const addStory = () => {
    const newBuildings = [...buildings]
    const building = newBuildings[activeBuilding]
    building.rows += 1
    building.grid.unshift(Array(building.cols).fill({ type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true }))
    building.gatePosition = { ...building.gatePosition, row: building.gatePosition.row + 1 }
    setBuildings(newBuildings)
    toast.success('New floor added!')
  }

  const addColumn = () => {
    const newBuildings = [...buildings]
    const building = newBuildings[activeBuilding]
    building.cols += 1
    building.grid = building.grid.map(row => [...row, { type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true }])
    setBuildings(newBuildings)
    toast.success('Column added!')
  }

  const removeColumn = () => {
    const newBuildings = [...buildings]
    const building = newBuildings[activeBuilding]
    if (building.cols <= 1) { toast.error('Minimum 1 column'); return }
    building.cols -= 1
    building.grid = building.grid.map(row => row.slice(0, -1))
    if (building.gatePosition?.col >= building.cols) {
      building.gatePosition = { ...building.gatePosition, col: building.cols - 1 }
    }
    setBuildings(newBuildings)
    toast.success('Column removed!')
  }

  const duplicateBuilding = () => {
    const currentBuilding = buildings[activeBuilding]
    const newBuilding = {
      id: 'building_' + (buildings.length + 1),
      name: `Building ${buildings.length + 1}`,
      rows: currentBuilding.rows,
      cols: currentBuilding.cols,
      grid: currentBuilding.grid.map(row => row.map(cell => ({ ...cell }))),
      gatePosition: { ...currentBuilding.gatePosition }
    }
    setBuildings([...buildings, newBuilding])
    setActiveBuilding(buildings.length)
    toast.success(`Building duplicated!`)
  }

  const addNewBuilding = () => {
    const newBuilding = {
      id: 'building_' + (buildings.length + 1),
      name: `Building ${buildings.length + 1}`,
      rows: 1,
      cols: 5,
      grid: Array(1).fill(null).map(() => Array(5).fill({ type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true })),
      gatePosition: { row: 0, col: 4 }
    }
    setBuildings([...buildings, newBuilding])
    setActiveBuilding(buildings.length)
    toast.success(`New building added!`)
  }

  const handleCellClick = (rowIndex, colIndex) => {
    if (selectMode) {
      // Multi-select mode
      const cellKey = `${rowIndex},${colIndex}`
      setSelectedCells(prev => {
        if (prev.includes(cellKey)) {
          return prev.filter(c => c !== cellKey)
        } else {
          return [...prev, cellKey]
        }
      })
    } else {
      // Single select mode
      const currentBuilding = buildings[activeBuilding]
      const cell = currentBuilding.grid[rowIndex][colIndex]
      setSelectedCell({ row: rowIndex, col: colIndex })

      if (cell.type === 'room') {
        setRoomConfig({
          type: cell.type,
          roomType: cell.roomType,
          pricePerMonth: cell.pricePerMonth,
          amenities: cell.amenities.reduce((acc, amenity) => ({ ...acc, [amenity]: true }), {
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
  }

  const applyRoomConfig = () => {
    if (!selectMode && !selectedCell) {
      toast.error('Please select a cell in the grid first')
      return
    }

    if (selectMode && selectedCells.length === 0) {
      toast.error('Please select at least one cell')
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

    const cellData = {
      type: roomConfig.type,
      roomType: roomConfig.roomType,
      pricePerMonth: parseInt(roomConfig.pricePerMonth),
      amenities: selectedAmenities,
      isVacant: roomConfig.isVacant
    }

    if (selectMode) {
      // Apply to all selected cells
      selectedCells.forEach(cellKey => {
        const [row, col] = cellKey.split(',').map(Number)
        building.grid[row][col] = { ...cellData }
      })
      toast.success(`Applied to ${selectedCells.length} cells!`)
      setSelectedCells([])
      setSelectMode(false)
    } else {
      // Apply to single cell
      building.grid[selectedCell.row][selectedCell.col] = cellData
      toast.success(`Cell updated!`)
    }

    setBuildings(newBuildings)
  }

  const applyToAllCells = () => {
    if (roomConfig.type === 'room' && !roomConfig.roomType) {
      toast.error('Please select a room type'); return
    }
    if (roomConfig.type === 'room' && roomConfig.pricePerMonth <= 0) {
      toast.error('Please enter a valid monthly rent'); return
    }
    const newBuildings = [...buildings]
    const building = newBuildings[activeBuilding]
    const selectedAmenities = Object.keys(roomConfig.amenities).filter(k => roomConfig.amenities[k])
    const cellData = {
      type: roomConfig.type,
      roomType: roomConfig.roomType,
      pricePerMonth: parseInt(roomConfig.pricePerMonth),
      amenities: selectedAmenities,
      isVacant: roomConfig.isVacant
    }
    building.grid.forEach((row, r) => row.forEach((_, c) => { building.grid[r][c] = { ...cellData } }))
    setBuildings(newBuildings)
    toast.success(`Applied to all cells in ${building.name}!`)
  }

  const getCellDisplay = (cell) => {
    const fs = Math.max(7, Math.floor(baseCellPx * 0.20))
    if (cell.type === 'room') {
      return (
        <div className="relative w-full flex flex-col items-center justify-center h-full" style={{ fontSize: fs + 'px', padding: Math.max(2, Math.floor(baseCellPx * 0.05)) + 'px' }}>
          <div className="font-semibold leading-tight text-center truncate w-full text-center">{cell.roomType}</div>
          <div className="leading-tight opacity-80">Ksh {cell.pricePerMonth}</div>
          {!cell.isVacant && <div className="text-red-600 leading-tight">Occupied</div>}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: '20%', height: '18%', background: '#7c2d12', borderRadius: '2px 2px 0 0', minHeight: '5px', minWidth: '6px' }}></div>
        </div>
      )
    }

    if (cell.type === 'common') {
      return <div style={{ fontSize: fs + 'px' }} className="text-gray-500">Common</div>
    }

    return <div style={{ fontSize: fs + 'px' }} className="text-gray-400">Empty</div>
  }

  const onSubmitHandler = async (e) => {
    e.preventDefault()

    if (!propertyInfo.name || !propertyInfo.address || !propertyInfo.contact || !propertyInfo.place || !propertyInfo.estate || !propertyInfo.propertyType) {
      toast.error("Please fill in all property details")
      return
    }

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

    // On create: require at least one image. On edit: existing images are already on the server.
    if (!existingProperty && !Object.values(images).some(image => image)) {
      toast.error("Please upload at least one image")
      return
    }

    setLoading(true)
    try {
      // Convert images to base64 for upload
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

      const propertyData = {
        ...propertyInfo,
        buildings: buildings,
        compoundGate: compoundGate,
        // When editing with no new images chosen, pass existing URLs so server keeps them
        images: imageUrls.length > 0 ? imageUrls : (existingProperty?.images || [])
      }

      let response;
      if (existingProperty) {
        // Update existing property
        response = await axios.put(`/api/properties/${existingProperty._id}`, propertyData, {
          headers: { Authorization: `Bearer ${await getToken()}` }
        })
      } else {
        // Create new property
        response = await axios.post('/api/properties', propertyData, {
          headers: { Authorization: `Bearer ${await getToken()}` }
        })
      }

      if (response.data.success) {
        toast.success(existingProperty ? 'Property updated successfully!' : 'Property listed successfully!')
        setLoading(false)
        onClose()
      } else {
        throw new Error(response.data.message)
      }
    } catch (error) {
      console.error('Error submitting property:', error)
      toast.error(error.message || 'Failed to submit property')
      setLoading(false)
    }
  }

  const currentBuilding = buildings[activeBuilding]
  // Dynamic cell size: smaller as more buildings/columns are present so they all fit in the compound
  const totalCols = buildings.reduce((sum, b) => sum + (b.cols || 5), 0)
  const baseCellPx = Math.max(32, Math.min(72, Math.floor(580 / (totalCols + buildings.length))))

  return (
    <div onClick={onClose} className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 overflow-y-auto p-4'>
      <form onSubmit={onSubmitHandler} onClick={(e) => e.stopPropagation()} className='bg-white rounded-xl max-w-6xl w-full my-auto max-h-[95vh] overflow-y-auto p-6 md:p-8 relative'>
        
        <img src={assets.closeIcon} alt="" className='absolute top-4 right-4 h-5 w-5 cursor-pointer hover:opacity-70' onClick={onClose} />

        <h1 className='text-3xl font-bold mb-2'>{existingProperty ? 'Edit Property' : 'List Your Rental Property'}</h1>
        <p className='text-gray-600 mb-6'>Fill in details, design the layout, and set room pricing - all in one go!</p>

        {/* Property Details */}
        <div className='border-l-4 border-indigo-500 pl-4 mb-6'>
          <h2 className='text-xl font-semibold mb-3'>Property Information</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <input type="text" placeholder='Property Name *' className='border border-gray-300 rounded px-3 py-2 outline-indigo-500' value={propertyInfo.name} onChange={(e) => setPropertyInfo({ ...propertyInfo, name: e.target.value })} required />
            <select className='border border-gray-300 rounded px-3 py-2 outline-indigo-500' value={propertyInfo.propertyType} onChange={(e) => setPropertyInfo({ ...propertyInfo, propertyType: e.target.value })} required>
              <option value="">Select type *</option>
              <option value="Apartments">Apartment Complex</option>
              <option value="Bedsitters">Bedsitter Units</option>
              <option value="Single Rooms">Single Room Rentals</option>
              <option value="Mixed">Mixed</option>
            </select>
            <input type="tel" placeholder='Contact Phone *' className='border border-gray-300 rounded px-3 py-2 outline-indigo-500' value={propertyInfo.contact} onChange={(e) => setPropertyInfo({ ...propertyInfo, contact: e.target.value })} required />
            <input type="tel" placeholder='WhatsApp Number (Optional)' className='border border-gray-300 rounded px-3 py-2 outline-indigo-500' value={propertyInfo.whatsappNumber} onChange={(e) => setPropertyInfo({ ...propertyInfo, whatsappNumber: e.target.value })} />
            <input type="text" placeholder='Street Address *' className='border border-gray-300 rounded px-3 py-2 outline-indigo-500' value={propertyInfo.address} onChange={(e) => setPropertyInfo({ ...propertyInfo, address: e.target.value })} required />
            <input type="text" placeholder='Estate/Building Name *' className='border border-gray-300 rounded px-3 py-2 outline-indigo-500' value={propertyInfo.estate} onChange={(e) => setPropertyInfo({ ...propertyInfo, estate: e.target.value })} required />
            <select className='border border-gray-300 rounded px-3 py-2 outline-indigo-500 md:col-span-2' value={propertyInfo.place} onChange={(e) => setPropertyInfo({ ...propertyInfo, place: e.target.value })} required>
              <option value="">Select Location *</option>
              {Places.map((place) => (<option key={place} value={place}>{place}</option>))}
            </select>
          </div>
        </div>

        {/* Property Photos */}
        <div className='border-l-4 border-green-500 pl-4 mb-6'>
          <h2 className='text-xl font-semibold mb-3'>Property Photos</h2>
          <div className='flex gap-2 flex-wrap'>
            {Object.keys(images).map((key) => (
              <label htmlFor={`propertyImage${key}`} key={key} className='cursor-pointer group'>
                <div className='h-20 w-20 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden group-hover:border-indigo-500 transition-all'>
                  <img className='h-full w-full object-cover' src={images[key] ? URL.createObjectURL(images[key]) : assets.uploadArea} alt="" />
                </div>
                <input type='file' accept='image/*' id={`propertyImage${key}`} hidden onChange={e => setImages({ ...images, [key]: e.target.files[0] })} />
              </label>
            ))}
          </div>
        </div>

        {/* Grid Editor */}
        <div className='border-l-4 border-purple-500 pl-4 mb-6'>
          <h2 className='text-xl font-semibold mb-3'>Building Layout 🏗️</h2>

          {/* Action buttons */}
          <div className='flex gap-2 mb-3 flex-wrap text-sm'>
            <button type="button" onClick={addStory} className='flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' /></svg>
              Floor
            </button>
            <button type="button" onClick={addColumn} className='flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' /></svg>
              House
            </button>
            <button type="button" onClick={removeColumn} className='flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
              Remove
            </button>
            <button type="button" onClick={duplicateBuilding} className='flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' /></svg>
              Duplicate
            </button>

            <button type="button" onClick={addNewBuilding} className='flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' /></svg>
              New Building
            </button>
            <button type="button" onClick={() => { setSelectMode(!selectMode); setSelectedCells([]) }} className={`px-3 py-1.5 rounded font-medium ${selectMode ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
              {selectMode ? 'Multi-Select ON' : 'Multi-Select'}
            </button>
            <button type="button" onClick={applyToAllCells} className='flex items-center gap-1 bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2' /></svg>
              Apply to All
            </button>
          </div>

          {/* Gate side selector — 8 positions */}
          <div className='mb-3'>
            <span className='text-gray-600 font-medium text-xs'>Gate position:</span>
            <div className='flex flex-wrap gap-1.5 mt-1'>
              {[
                { id: 'top', label: '↑ Top' },
                { id: 'bottom', label: '↓ Bottom' },
                { id: 'left', label: '← Left' },
                { id: 'right', label: '→ Right' },
                { id: 'top-left', label: '↖ Top-Left' },
                { id: 'top-right', label: '↗ Top-Right' },
                { id: 'bottom-left', label: '↙ Bot-Left' },
                { id: 'bottom-right', label: '↘ Bot-Right' },
              ].map(({ id, label }) => (
                <button key={id} type="button" onClick={() => setCompoundGate({ side: id })}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${compoundGate.side === id ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Compound — all buildings in ONE fenced compound, ONE gate */}
          <div className='overflow-x-auto mb-3'>
            <div className='inline-block'>
              <div className='relative'>
                {/* Compound fence */}
                <div className='border-2 border-dashed border-gray-500 p-5 bg-gradient-to-br from-green-50 to-slate-100'>

                  {/* Buildings side by side */}
                  <div className='flex gap-6 items-end flex-wrap'>
                    {buildings.map((building, buildingIndex) => {
                      const isActive = buildingIndex === activeBuilding
                      return (
                        <div
                          key={building.id}
                          onClick={() => { if (!isActive) { setActiveBuilding(buildingIndex); setSelectedCell(null); setSelectedCells([]) } }}
                          className={`relative transition-all duration-200 ${isActive ? 'cursor-default' : 'opacity-60 cursor-pointer hover:opacity-80'}`}
                          style={{ transform: isActive ? 'scale(1)' : 'scale(0.88)', transformOrigin: 'bottom center' }}
                        >
                          {/* Building label */}
                          <div className={`text-center text-xs font-semibold mb-1 ${isActive ? 'text-indigo-700' : 'text-gray-500'}`}>{building.name}</div>

                          {/* Roof */}
                          <div className='flex justify-center'>
                            <svg width={building.cols * baseCellPx} height="26">
                              <polygon
                                points={`0,26 ${(building.cols * baseCellPx) / 2},0 ${building.cols * baseCellPx},26`}
                                fill={isActive ? '#7c3aed' : '#9ca3af'}
                                stroke={isActive ? '#4c1d95' : '#6b7280'}
                                strokeWidth="2"
                              />
                            </svg>
                          </div>

                          {/* Grid */}
                          <div className={`bg-white shadow border-2 ${isActive ? 'border-indigo-400' : 'border-gray-300'}`}>
                            {building.grid.map((row, rowIndex) => (
                              <div key={rowIndex} className='flex'>
                                {row.map((cell, colIndex) => {
                                  const isSelected = isActive && selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                                  const isMultiSelected = isActive && selectedCells.includes(`${rowIndex},${colIndex}`)
                                  return (
                                    <div
                                      key={colIndex}
                                      onClick={(e) => { if (isActive) { e.stopPropagation(); handleCellClick(rowIndex, colIndex) } }}
                                      style={{ width: baseCellPx + 'px', height: baseCellPx + 'px' }}
                                      className={`border border-gray-300 flex items-center justify-center transition-all overflow-hidden ${
                                        isSelected ? 'ring-4 ring-indigo-500 bg-indigo-50 cursor-pointer' :
                                        isMultiSelected ? 'ring-2 ring-yellow-400 bg-yellow-50 cursor-pointer' :
                                        isActive && cell.type === 'room' ? 'bg-blue-50 hover:bg-blue-100 cursor-pointer' :
                                        isActive && cell.type === 'common' ? 'bg-green-50 hover:bg-green-100 cursor-pointer' :
                                        isActive ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer' :
                                        cell.type === 'room' ? 'bg-blue-50' : cell.type === 'common' ? 'bg-green-50' : 'bg-gray-50'
                                      }`}
                                    >
                                      {getCellDisplay(cell)}
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>

                          {/* Foundation */}
                          <div className='h-2 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Ground path */}
                  <div className='h-3 mt-3 bg-amber-100 border-t border-amber-200 rounded-sm w-full'></div>
                </div>

                {/* Gate — 8-position compound gate */}
                {(() => {
                  const gatePos = {
                    'top':          'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
                    'bottom':       'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
                    'left':         'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2',
                    'right':        'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2',
                    'top-left':     'absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2',
                    'top-right':    'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2',
                    'bottom-left':  'absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
                    'bottom-right': 'absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2',
                  }
                  const cls = gatePos[compoundGate.side] || gatePos['bottom']
                  return (
                    <div className={`${cls} bg-amber-50 border border-amber-400 rounded px-1.5 py-0.5 flex items-center gap-0.5 z-10`}>
                      <svg className='w-3.5 h-3.5 text-amber-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18m6-18v18' /></svg>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
          <p className='text-xs text-gray-500'>All buildings shown in one compound. Click an inactive building to switch to it. Use Multi-Select or Apply to All for bulk edits.</p>
        </div>

        {/* Cell Configuration */}
        <div className='border-l-4 border-orange-500 pl-4 mb-6'>
          <h2 className='text-xl font-semibold mb-3'>Cell Configuration</h2>
          {(selectedCell || selectedCells.length > 0) ? (
            <div className='space-y-3'>
              {selectMode && selectedCells.length > 0 && (
                <p className='text-sm font-medium text-yellow-700 bg-yellow-50 p-2 rounded'>Editing {selectedCells.length} cells - Changes will apply to all selected</p>
              )}
              <div className='flex gap-2 flex-wrap items-center'>
                <select className='border px-3 py-2 rounded outline-indigo-500' value={roomConfig.type} onChange={(e) => setRoomConfig({ ...roomConfig, type: e.target.value })}>
                  <option value="empty">Empty</option>
                  <option value="room">Room</option>
                  <option value="common">Common Area</option>
                </select>
                {roomConfig.type === 'room' && (<>
                  <select className='border px-3 py-2 rounded outline-indigo-500' value={roomConfig.roomType} onChange={(e) => setRoomConfig({ ...roomConfig, roomType: e.target.value })}>
                    <option value="">Room Type *</option>
                    <option value="BedSitter">BedSitter</option>
                    <option value="One-Bedroom">One-Bedroom</option>
                    <option value="Self-Contain">Self-Contain</option>
                  </select>
                  <input type='number' placeholder='Monthly Rent *' min="100" className='border px-3 py-2 rounded w-32 outline-indigo-500' value={roomConfig.pricePerMonth} onChange={(e) => setRoomConfig({ ...roomConfig, pricePerMonth: e.target.value })} />
                  <button
                    type="button"
                    onClick={() => setRoomConfig({ ...roomConfig, isVacant: !roomConfig.isVacant })}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm border-2 transition-all ${
                      roomConfig.isVacant
                        ? 'bg-green-50 text-green-700 border-green-500 hover:bg-green-100'
                        : 'bg-red-50 text-red-700 border-red-500 hover:bg-red-100'
                    }`}
                  >
                    {roomConfig.isVacant ? '✓ Vacant' : '✗ Occupied'}
                  </button>
                </>)}
              </div>
              {roomConfig.type === 'room' && (
                <div className='flex gap-2 flex-wrap text-sm'>
                  {Object.keys(roomConfig.amenities).map((amenity) => (
                    <label key={amenity} className='flex items-center gap-1 cursor-pointer'>
                      <input type="checkbox" checked={roomConfig.amenities[amenity]} onChange={() => setRoomConfig({ ...roomConfig, amenities: { ...roomConfig.amenities, [amenity]: !roomConfig.amenities[amenity] } })} />
                      <span>{amenity}</span>
                    </label>
                  ))}
                </div>
              )}
              <button type="button" onClick={applyRoomConfig} className='bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-medium'>
                {selectMode && selectedCells.length > 0 ? `Apply to ${selectedCells.length} Cells` : 'Apply to Cell'}
              </button>
            </div>
          ) : (
            <p className='text-gray-500 text-sm'>Click a cell in the grid to configure it. Enable Multi-Select to edit multiple cells at once.</p>
          )}
        </div>

        {/* Submit */}
        <button type="submit" className='bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-10 py-3 rounded-lg font-semibold text-lg w-full transition-all shadow-lg' disabled={loading}>
          {loading ? 'Creating Listing...' : existingProperty ? '💾 Update Property' : '🏠 List Property'}
        </button>
      </form>
    </div>
  )
}

export default PropertyListingModal
