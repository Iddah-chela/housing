import React, { useEffect, useRef, useState } from 'react'
import { assets, Places } from '../assets/assets'
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import { HardHat, Save, Home, Check, X as XIcon, GripVertical, MapPin, Navigation, ExternalLink } from 'lucide-react';

const PropertyListingModal = ({ onClose, existingProperty = null, showAsLandlord = false }) => {
  const { user, navigate, getToken, axios, darkMode, isAdmin } = useAppContext()
  const effectiveAdmin = isAdmin && !showAsLandlord

  // Property Details State
  const [propertyInfo, setPropertyInfo] = useState(existingProperty ? {
    name: existingProperty.name,
    address: existingProperty.address,
    contact: existingProperty.contact,
    whatsappNumber: existingProperty.whatsappNumber || '',
    place: existingProperty.place,
    estate: existingProperty.estate,
    propertyType: existingProperty.propertyType,
    googleMapsUrl: existingProperty.googleMapsUrl || '',
    landlordName: existingProperty.landlordName || ''
  } : {
    name: '',
    address: '',
    contact: '',
    whatsappNumber: '',
    place: '',
    estate: '',
    propertyType: '',
    googleMapsUrl: '',
    landlordName: ''
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
        gatePosition: building.gatePosition || { row: 0, col: 4 },
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
      'Double Occupancy': false,
      'Gate Closes 10PM': false,
      'ELDOWAS Water': false,
      'Borehole Water': false,
      'Water Storage Tank': false,
      'Electricity Tokens': false,
    },
    isVacant: true
  })

  const [images, setImages] = useState(() => {
    const existingImages = existingProperty?.images || []
    return {
      1: existingImages[0] || null,
      2: existingImages[1] || null,
      3: existingImages[2] || null,
      4: existingImages[3] || null,
    }
  })
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationPermission, setLocationPermission] = useState('unknown') // unknown | prompt | granted | denied
  const [selectMode, setSelectMode] = useState(false) // Multi-select mode
  const [compoundGate, setCompoundGate] = useState(existingProperty?.compoundGate || { side: 'bottom', layout: 'row' })
  const [compoundRoadSurface, setCompoundRoadSurface] = useState(existingProperty?.compoundRoadSurface || 'tarmac')
  const [quickSetup, setQuickSetup] = useState({ rooms: '', roomType: 'BedSitter', price: '', floors: 1 })
  const [dragPrice, setDragPrice] = useState(3500)
  const [showDragPalette, setShowDragPalette] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })
  const dragDataRef = useRef(null)

  useEffect(() => {
    let mounted = true

    const detectPermission = async () => {
      if (!navigator?.permissions?.query) return
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' })
        if (!mounted) return
        setLocationPermission(status.state || 'unknown')
        status.onchange = () => {
          if (mounted) setLocationPermission(status.state || 'unknown')
        }
      } catch (_) {
        // Some browsers do not support querying geolocation permission state.
      }
    }

    detectPermission()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const syncDragPaletteMode = () => {
      if (window.innerWidth >= 1024) {
        setShowDragPalette(true)
      }
    }

    syncDragPaletteMode()
    window.addEventListener('resize', syncDragPaletteMode)
    return () => window.removeEventListener('resize', syncDragPaletteMode)
  }, [])

  const openGoogleMapsPicker = () => {
    const query = [propertyInfo.address, propertyInfo.estate, propertyInfo.place]
      .map(v => String(v || '').trim())
      .filter(Boolean)
      .join(', ')
    const q = encodeURIComponent(query || 'Kenya')
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer')
    toast('Google Maps opened. Drop a pin, then copy and paste the map URL here.')
  }

  const getLocationEnableSteps = () => {
    const ua = navigator.userAgent || ''
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)

    if (isIOS) {
      return [
        'Open iPhone Settings > Privacy & Security > Location Services and ensure it is ON.',
        'In Settings > Safari > Location, choose Allow.',
        'Return here and tap Use my location again.'
      ]
    }

    if (isAndroid) {
      return [
        'Open browser settings > Site settings > Location.',
        'Allow location for this site.',
        'Return here and tap Use my location again.'
      ]
    }

    return [
      'Open browser site permissions for this page.',
      'Allow location access for this site.',
      'Return here and tap Use my location again.'
    ]
  }

  // Get device GPS location -> build a Google Maps URL
  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    if (!window.isSecureContext) {
      toast.error('Location only works on HTTPS (or localhost).')
      return
    }

    if (navigator?.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' })
        setLocationPermission(status.state || 'unknown')
      } catch (_) {
        // Ignore permission-query errors and still attempt geolocation.
      }
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const url = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
        setPropertyInfo(prev => ({ ...prev, googleMapsUrl: url }))
        setLocationPermission('granted')
        toast.success('Location pinned!')
        setLocating(false)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermission('denied')
        }
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied. Enable location and tap Use my location again.')
        } else {
          toast.error('Could not get location. Use address fallback or paste a Google Maps link manually.')
        }
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleBuildMapLinkFromAddress = () => {
    const query = [propertyInfo.address, propertyInfo.estate, propertyInfo.place].filter(Boolean).join(', ').trim()
    if (!query) {
      toast.error('Enter address/place first, then use address fallback.')
      return
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    setPropertyInfo(prev => ({ ...prev, googleMapsUrl: url }))
    toast.success('Map link generated from address details.')
  }

  // Drag-and-drop palette items
  const paletteItems = [
    { type: 'room', roomType: 'BedSitter',    label: 'BedSitter',    color: 'bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-600 dark:text-emerald-300' },
    { type: 'room', roomType: 'One-Bedroom',  label: '1-Bedroom',    color: 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-300' },
    { type: 'room', roomType: 'Self-Contain', label: 'Self-Contain', color: 'bg-purple-100 border-purple-400 text-purple-800 dark:bg-purple-900/40 dark:border-purple-600 dark:text-purple-300' },
    { type: 'common', roomType: '', label: 'Common Area',            color: 'bg-gray-200 border-gray-400 text-gray-700 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200' },
    { type: 'empty',  roomType: '', label: 'Empty',                  color: 'bg-white border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300' },
  ]

  const handleDragStart = (item) => {
    dragDataRef.current = item
  }

  const handleDrop = (rowIndex, colIndex) => {
    const item = dragDataRef.current
    if (!item) return
    const newBuildings = [...buildings]
    const building = newBuildings[activeBuilding]
    const cellData = {
      type: item.type,
      roomType: item.roomType,
      pricePerMonth: item.type === 'room' ? parseInt(dragPrice) || 0 : 0,
      amenities: [],
      isVacant: true
    }
    building.grid[rowIndex][colIndex] = cellData
    setBuildings(newBuildings)
    dragDataRef.current = null
  }

  // Grid manipulation functions
  const handleQuickSetup = () => {
    const numRooms = parseInt(quickSetup.rooms)
    const numFloors = parseInt(quickSetup.floors) || 1
    if (!numRooms || numRooms < 1 || numRooms > 100) {
      toast.error('Enter a valid number of rooms (1-100)')
      return
    }
    if (!quickSetup.price || parseFloat(quickSetup.price) < 100) {
      toast.error('Enter a valid rent amount (min Ksh 100)')
      return
    }

    const roomsPerFloor = Math.ceil(numRooms / numFloors)
    const cols = roomsPerFloor
    const rows = numFloors

    const grid = []
    let roomCount = 0
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < cols; c++) {
        if (roomCount < numRooms) {
          row.push({
            type: 'room',
            roomType: quickSetup.roomType,
            pricePerMonth: parseFloat(quickSetup.price),
            amenities: [],
            isVacant: true
          })
          roomCount++
        } else {
          row.push({ type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true })
        }
      }
      grid.push(row)
    }

    const newBuilding = {
      id: 'building_1',
      name: 'Main Building',
      rows,
      cols,
      grid,
      gatePosition: { row: rows - 1, col: 0 }
    }

    setBuildings([newBuilding])
    setActiveBuilding(0)
    setSelectedCell(null)
    setSelectedCells([])
    toast.success(`Generated ${numRooms} rooms across ${numFloors} floor${numFloors > 1 ? 's' : ''}!`)
  }

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

  const removeBuilding = () => {
    if (buildings.length <= 1) { toast.error('You must have at least one building'); return }
    const newBuildings = buildings.filter((_, i) => i !== activeBuilding)
    setBuildings(newBuildings)
    setActiveBuilding(Math.max(0, activeBuilding - 1))
    setSelectedCell(null)
    setSelectedCells([])
    toast.success('Building removed!')
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
            'Double Occupancy': false,
            'Gate Closes 10PM': false,
            'ELDOWAS Water': false,
            'Borehole Water': false,
            'Water Storage Tank': false,
            'Electricity Tokens': false,
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
            'Double Occupancy': false,
            'Gate Closes 10PM': false,
            'ELDOWAS Water': false,
            'Borehole Water': false,
            'Water Storage Tank': false,
            'Electricity Tokens': false,
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
    const fontSize = Math.max(7, Math.floor(baseCellPx * 0.18))
    const numSize = Math.max(8, Math.floor(baseCellPx * 0.22))
    if (cell.type === 'room') {
      return (
        <div className='relative w-full flex flex-col items-center justify-center h-full'>
          {roomNum > 0 && <span style={{ fontSize: numSize + 'px', lineHeight: '1' }} className='text-gray-700 dark:text-gray-300 font-extrabold absolute top-0.5 left-1'>R{roomNum}</span>}
          {/* Door — CSS div instead of emoji for dark mode compatibility */}
          <div style={{ width: Math.max(14, Math.floor(baseCellPx * 0.32)) + 'px', height: Math.max(18, Math.floor(baseCellPx * 0.40)) + 'px', background: '#7c2d12', borderRadius: '2px 2px 0 0', border: '1px solid #451a03', marginTop: 'auto' }}></div>
        </div>
      )
    }

    if (cell.type === 'common') {
      return <div style={{ fontSize: fontSize + 'px' }} className='text-gray-500 font-medium'>Common</div>
    }

    return <div style={{ fontSize: fontSize + 'px' }} className='text-gray-400'>·</div>
  }

  const onSubmitHandler = async (e) => {
    e.preventDefault()

    const isAdminCreateMode = effectiveAdmin && !existingProperty

    if (!isAdminCreateMode && (!propertyInfo.name || !propertyInfo.address || !propertyInfo.contact || !propertyInfo.place || !propertyInfo.propertyType)) {
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

    if (!isAdminCreateMode && totalRooms === 0) {
      toast.error('Please add at least one room to the grid')
      return
    }

    // On create: require at least one image. On edit: existing images are already on the server.
    if (!isAdminCreateMode && !existingProperty && !Object.values(images).some(image => image)) {
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
            if (typeof img === 'string') return Promise.resolve(img)
            return new Promise((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result)
              reader.readAsDataURL(img)
            })
          })
      )

      const propertyData = {
        ...propertyInfo,
        estate: propertyInfo.estate?.trim() || propertyInfo.name,
        buildings: buildings,
        compoundGate: compoundGate,
        compoundRoadSurface,
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
      toast.error('Failed to submit property. Please try again.')
      setLoading(false)
    }
  }

  const currentBuilding = buildings[activeBuilding]
  // Dynamic cell size: smaller as more buildings/columns are present so they all fit in the compound
  const totalCols = buildings.reduce((sum, b) => sum + (b.cols || 5), 0)
  const baseCellPx = Math.max(32, Math.min(72, Math.floor(580 / (totalCols + buildings.length))))

  return (
    <div onClick={onClose} className='fixed inset-0 z-[100] flex items-center justify-center bg-black/70 overflow-y-auto p-4'>
      <form onSubmit={onSubmitHandler} onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full my-auto max-h-[95vh] overflow-y-auto overflow-x-hidden p-6 md:p-8 relative'>
        
        <button type="button" onClick={onClose} className='absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors'>
          <XIcon className='w-5 h-5' />
        </button>

        <h1 className='text-3xl font-bold mb-2'>{existingProperty ? 'Edit Property' : effectiveAdmin ? 'Add Listing (Admin)' : 'List Your Rental Property'}</h1>
        <p className='text-gray-600 mb-6'>{effectiveAdmin && !existingProperty ? "Create a listing on behalf of a house owner. Fill in their contact details and property layout." : "Fill in details, design the layout, and set room pricing - all in one go!"}</p>

        {/* Property Details */}
        <div className='border-l-4 border-indigo-500 pl-4 mb-6'>
          <h2 className='text-xl font-semibold mb-3'>Property Information</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <input type="text" placeholder='Property/Apartment Name *' className='border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100' value={propertyInfo.name} onChange={(e) => setPropertyInfo({ ...propertyInfo, name: e.target.value })} required={!effectiveAdmin || !!existingProperty} />
            <select className='border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100' value={propertyInfo.propertyType} onChange={(e) => setPropertyInfo({ ...propertyInfo, propertyType: e.target.value })} required={!effectiveAdmin || !!existingProperty}>
              <option value="">Select type *</option>
              <option value="Apartments">Apartment Complex</option>
              <option value="Bedsitters">Bedsitter Units</option>
              <option value="Single Rooms">Single Room Rentals</option>
              <option value="Mixed">Mixed</option>
            </select>
            <input type="tel" placeholder='Contact Phone *' className='border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100' value={propertyInfo.contact} onChange={(e) => setPropertyInfo({ ...propertyInfo, contact: e.target.value })} required={!effectiveAdmin || !!existingProperty} />
            <input type="tel" placeholder='WhatsApp Number (Optional)' className='border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100' value={propertyInfo.whatsappNumber} onChange={(e) => setPropertyInfo({ ...propertyInfo, whatsappNumber: e.target.value })} />
            {(effectiveAdmin || !!existingProperty) && (
              <input type="text" placeholder="House Owner's Name (shown to tenants after unlock)" className='border border-indigo-300 dark:border-indigo-600 rounded px-3 py-2 outline-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:text-gray-100 md:col-span-2' value={propertyInfo.landlordName} onChange={(e) => setPropertyInfo({ ...propertyInfo, landlordName: e.target.value })} />
            )}
            <input type="text" placeholder='Street Address *' className='border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100' value={propertyInfo.address} onChange={(e) => setPropertyInfo({ ...propertyInfo, address: e.target.value })} required={!effectiveAdmin || !!existingProperty} />
            <input type="text" placeholder='Estate/Area (optional if same as property name)' className='border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100' value={propertyInfo.estate} onChange={(e) => setPropertyInfo({ ...propertyInfo, estate: e.target.value })} />
            <select className='border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100 md:col-span-2' value={propertyInfo.place} onChange={(e) => setPropertyInfo({ ...propertyInfo, place: e.target.value })} required={!effectiveAdmin || !!existingProperty}>
              <option value="">Select Location *</option>
              {Places.map((place) => (<option key={place} value={place}>{place}</option>))}
            </select>
            {/* Location picker */}
            <div className='md:col-span-2 space-y-2'>
              <div className='flex items-center gap-2'>
                <MapPin className='w-4 h-4 text-indigo-500' />
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Property Location on Google Maps</span>
                <span className='text-xs text-gray-400'>(shown to tenants after viewing is confirmed)</span>
              </div>
                <div className='flex flex-col sm:flex-row gap-2'>
                <input
                  type='url'
                  placeholder='Paste a Google Maps link, or use the button below'
                  className='flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 outline-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100 text-sm'
                  value={propertyInfo.googleMapsUrl}
                  onChange={(e) => setPropertyInfo({ ...propertyInfo, googleMapsUrl: e.target.value })}
                />
                <button
                  type='button'
                  onClick={handleGetLocation}
                  disabled={locating}
                  className='flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded text-sm font-medium transition-all'
                >
                  {locating ? (
                    <><span className='w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block' /> Locating...</>
                  ) : (
                    <><Navigation className='w-4 h-4' /> Use my location</>
                  )}
                </button>
                <button
                  type='button'
                  onClick={openGoogleMapsPicker}
                  className='flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-all'
                >
                  <ExternalLink className='w-4 h-4' /> Open map picker
                </button>
                <button
                  type='button'
                  onClick={handleBuildMapLinkFromAddress}
                  className='flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded text-sm font-medium transition-all'
                >
                  <MapPin className='w-4 h-4' /> Use address fallback
                </button>
              </div>
              {locationPermission === 'denied' && (
                <div className='text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded p-2'>
                  <p className='font-semibold mb-1'>Location is blocked. Enable it with these steps:</p>
                  <ol className='list-decimal pl-4 space-y-0.5'>
                    {getLocationEnableSteps().map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {propertyInfo.googleMapsUrl && (
                <a
                  href={propertyInfo.googleMapsUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline'
                >
                  <ExternalLink className='w-3 h-3' /> Preview pinned location
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Property Photos */}
        <div className='border-l-4 border-green-500 pl-4 mb-6'>
          <h2 className='text-xl font-semibold mb-3'>Property Photos</h2>
          <div className='flex gap-2 flex-wrap'>
            {Object.keys(images).map((key) => (
              <label htmlFor={`propertyImage${key}`} key={key} className='cursor-pointer group'>
                <div className='h-20 w-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden group-hover:border-indigo-500 transition-all'>
                  <img className='h-full w-full object-cover dark:opacity-88' src={images[key] ? (typeof images[key] === 'string' ? images[key] : URL.createObjectURL(images[key])) : assets.uploadArea} alt="" />
                </div>
                <input type='file' accept='image/*' id={`propertyImage${key}`} hidden onChange={e => setImages({ ...images, [key]: e.target.files[0] })} />
                {images[key] && (
                  <button
                    type='button'
                    onClick={(e) => { e.preventDefault(); setImages({ ...images, [key]: null }) }}
                    className='mt-1 w-full text-[10px] text-red-600 hover:text-red-700'
                  >
                    Remove
                  </button>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Quick Setup */}
        <div className='border-l-4 border-green-500 pl-4 mb-6'>
          <h2 className='text-xl font-semibold mb-3'>Quick Setup</h2>
          <p className='text-sm text-gray-500 mb-3'>Enter the number of rooms and we'll auto-generate the building layout for you.</p>
          <div className='flex gap-2 flex-wrap items-end'>
            <div>
              <label className='text-xs text-gray-600 font-medium'>Number of Rooms</label>
              <input
                type='number'
                min='1'
                max='100'
                placeholder='e.g. 10'
                value={quickSetup.rooms}
                onChange={(e) => setQuickSetup({ ...quickSetup, rooms: e.target.value })}
                className='border px-3 py-2 rounded w-28 outline-indigo-500 block bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100'
              />
            </div>
            <div>
              <label className='text-xs text-gray-600 dark:text-gray-400 font-medium'>Floors</label>
              <input
                type='number'
                min='1'
                max='10'
                placeholder='1'
                value={quickSetup.floors}
                onChange={(e) => setQuickSetup({ ...quickSetup, floors: e.target.value })}
                className='border px-3 py-2 rounded w-20 outline-indigo-500 block bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100'
              />
            </div>
            <div>
              <label className='text-xs text-gray-600 dark:text-gray-400 font-medium'>Room Type</label>
              <select
                value={quickSetup.roomType}
                onChange={(e) => setQuickSetup({ ...quickSetup, roomType: e.target.value })}
                className='border px-3 py-2 rounded outline-indigo-500 block bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100'
              >
                <option value='BedSitter'>BedSitter</option>
                <option value='One-Bedroom'>One-Bedroom</option>
                <option value='Self-Contain'>Self-Contain</option>
              </select>
            </div>
            <div>
              <label className='text-xs text-gray-600 dark:text-gray-400 font-medium'>Rent (Ksh/month)</label>
              <input
                type='number'
                min='100'
                placeholder='e.g. 3500'
                value={quickSetup.price}
                onChange={(e) => setQuickSetup({ ...quickSetup, price: e.target.value })}
                className='border px-3 py-2 rounded w-32 outline-indigo-500 block bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100'
              />
            </div>
            <button
              type='button'
              onClick={handleQuickSetup}
              className='bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white px-4 py-2 rounded font-medium text-sm'
            >
              Generate Layout
            </button>
          </div>
        </div>

        {/* Grid Editor */}
        <div className='border-l-4 border-purple-500 pl-4 mb-6'>
          <div className='mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
            <h2 className='text-xl font-semibold flex items-center gap-2'>Building Layout <HardHat className='w-5 h-5 text-purple-500' /></h2>
            <button
              type='button'
              onClick={() => setShowDragPalette((s) => !s)}
              className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors self-start sm:self-auto'
              title='Show or hide drag & drop tools'
            >
              <GripVertical className='w-4 h-4' />
              {showDragPalette ? 'Hide Drag Tools' : 'Show Drag Tools'}
            </button>
          </div>

          {/* Action buttons */}
          <div className='flex gap-2 mb-3 flex-wrap text-sm'>
            <button type="button" onClick={addStory} className='flex items-center gap-1 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' /></svg>
              Floor
            </button>
            <button type="button" onClick={addColumn} className='flex items-center gap-1 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' /></svg>
              House
            </button>
            <button type="button" onClick={removeColumn} className='flex items-center gap-1 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' /></svg>
              Remove
            </button>
            <button type="button" onClick={duplicateBuilding} className='flex items-center gap-1 bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' /></svg>
              Duplicate
            </button>

            <button type="button" onClick={addNewBuilding} className='flex items-center gap-1 bg-orange-500 dark:bg-orange-600 hover:bg-orange-600 dark:hover:bg-orange-700 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' /></svg>
              New Building
            </button>
            {buildings.length > 1 && (
              <button type="button" onClick={removeBuilding} className='flex items-center gap-1 bg-rose-600 dark:bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-800 text-white px-3 py-1.5 rounded font-medium'>
                <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' /></svg>
                Del Building
              </button>
            )}
          </div>

          {/* Drag & Drop Palette */}
          {showDragPalette && (
          <div className='mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg'>
            <p className='text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-1.5'>
              <GripVertical className='w-3.5 h-3.5' /> Drag & Drop — drag a room type onto the grid
            </p>
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
                <label className='text-[10px] text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap'>Default rent:</label>
                <input
                  type='number'
                  min='100'
                  value={dragPrice}
                  onChange={(e) => setDragPrice(e.target.value)}
                  className='border border-indigo-300 dark:border-indigo-600 rounded px-2 py-1 w-24 text-xs outline-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100'
                  placeholder='Ksh'
                />
              </div>
            </div>
          </div>
          )}

          {/* Gate side selector — 8 positions */}
          <div className='mb-2'>
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
                <button key={id} type="button" onClick={() => setCompoundGate(g => ({ ...g, side: id }))}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${compoundGate.side === id ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Building arrangement — row (side by side) or col (stacked) */}
          <div className='mb-3 flex items-center gap-2'>
            <span className='text-gray-600 font-medium text-xs'>Building arrangement:</span>
            {[{ id: 'row', label: '↔ Side by Side' }, { id: 'col', label: '↕ Stacked' }].map(({ id, label }) => (
              <button key={id} type='button' onClick={() => setCompoundGate(g => ({ ...g, layout: id }))}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${(compoundGate.layout || 'row') === id ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className='mb-3 flex items-center gap-2'>
            <span className='text-gray-600 font-medium text-xs'>Compound road surface:</span>
            {[{ id: 'tarmac', label: 'Tarmac' }, { id: 'murram', label: 'Murram' }].map(({ id, label }) => (
              <button key={id} type='button' onClick={() => setCompoundRoadSurface(id)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${compoundRoadSurface === id ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Compound — all buildings in ONE fenced compound, ONE gate */}
          <div className='overflow-x-auto mb-3'>
            <div className='inline-block'>
              <div className='relative'>
                {/* Compound fence — gate-connected path network */}
                {(() => {
                  const gs = compoundGate.side
                  const isColLayout = (compoundGate.layout || 'row') === 'col'
                  const isMurramSurface = compoundRoadSurface === 'murram'
                  const roadBgClass = isMurramSurface ? 'bg-[#b08968] dark:bg-[#8a6a4e]' : 'bg-gray-500 dark:bg-gray-600'
                  const laneDashColor = isMurramSurface ? 'rgba(77,52,30,0.45)' : 'rgba(255,255,255,0.55)'
                  const corridorDashColor = isMurramSurface ? 'rgba(77,52,30,0.45)' : 'rgba(255,255,255,0.6)'
                  const cornerClip = {
                    'top-left':     'polygon(48px 0, 100% 0, 100% 100%, 0 100%, 0 48px)',
                    'top-right':    'polygon(0 0, calc(100% - 48px) 0, 100% 48px, 100% 100%, 0 100%)',
                    'bottom-left':  'polygon(0 0, 100% 0, 100% 100%, 48px 100%, 0 calc(100% - 48px))',
                    'bottom-right': 'polygon(0 0, 100% 0, 100% calc(100% - 48px), calc(100% - 48px) 100%, 0 100%)',
                  }[gs]
                  // Extra padding pushes buildings away from the chamfered corner
                  const cornerPad = {
                    'top-left':     { paddingTop: 40, paddingLeft: 40 },
                    'top-right':    { paddingTop: 40, paddingRight: 40 },
                    'bottom-left':  { paddingBottom: 40, paddingLeft: 40 },
                    'bottom-right': { paddingBottom: 40, paddingRight: 40 },
                  }[gs] || {}

                  // Tarmac keeps the original end-to-end fence corridor design.
                  if (!isMurramSurface) {
                    const trunkList = []
                    if (!isColLayout) {
                      trunkList.push({ dir: 'h', pos: ['top','top-left','top-right'].includes(gs) ? 'top' : 'bottom' })
                      if (gs === 'left') trunkList.push({ dir: 'v', pos: 'left' })
                      if (gs === 'right') trunkList.push({ dir: 'v', pos: 'right' })
                    } else {
                      trunkList.push({ dir: 'v', pos: ['right','top-right','bottom-right'].includes(gs) ? 'right' : 'left' })
                      if (['top','top-left','top-right'].includes(gs)) trunkList.push({ dir: 'h', pos: 'top' })
                      if (['bottom','bottom-left','bottom-right'].includes(gs)) trunkList.push({ dir: 'h', pos: 'bottom' })
                    }

                    return (
                      <div className='border-2 border-dashed border-gray-500 dark:border-gray-400 p-3 bg-gradient-to-br from-green-50 to-slate-100 dark:from-gray-700 dark:to-gray-800 relative'
                        style={{ ...(cornerClip ? { clipPath: cornerClip } : {}), ...cornerPad }}>
                        {trunkList.map((t, i) => t.dir === 'h' ? (
                          <div key={i} className={`absolute left-0 right-0 overflow-hidden ${roadBgClass}`}
                            style={t.pos === 'top'
                              ? { top: 0, height: 14, zIndex: 1 }
                              : { bottom: 0, height: 14, zIndex: 1 }}>
                            <div className='absolute inset-0 flex items-center' style={{ padding: '0 6px' }}>
                              <div style={{ borderTop: `2px dashed ${laneDashColor}`, width: '100%' }}></div>
                            </div>
                          </div>
                        ) : (
                          <div key={i} className={`absolute top-0 bottom-0 overflow-hidden ${roadBgClass}`}
                            style={t.pos === 'left'
                              ? { left: 0, width: 14, zIndex: 1 }
                              : { right: 0, width: 14, zIndex: 1 }}>
                            <div className='absolute inset-0 flex justify-center'>
                              <div style={{ borderLeft: `2px dashed ${laneDashColor}`, height: '100%' }}></div>
                            </div>
                          </div>
                        ))}

                        <div className={`relative flex ${isColLayout ? 'flex-col items-start' : 'flex-row items-end'}`} style={{ zIndex: 2 }}>
                          {buildings.map((building, buildingIndex) => {
                            const isActive = buildingIndex === activeBuilding
                            return (
                              <React.Fragment key={building.id}>
                                {buildingIndex > 0 && (isColLayout ? (
                                  <div style={{ height: 14, alignSelf: 'stretch', flexShrink: 0, marginLeft: '-12px', marginRight: '-12px' }} className='my-1.5 relative'>
                                    <div className={`h-full w-full ${roadBgClass}`}>
                                      <div className='absolute inset-0 flex items-center px-2'>
                                        <div style={{ borderTop: `2px dashed ${corridorDashColor}`, width: '100%' }}></div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ width: 18, alignSelf: 'stretch', flexShrink: 0, marginTop: '-12px', marginBottom: '-12px' }} className='flex items-stretch mx-1.5 relative'>
                                    <div className={`w-full h-full ${roadBgClass}`}>
                                      <div className='absolute inset-0 flex justify-center'>
                                        <div style={{ borderLeft: `2px dashed ${corridorDashColor}`, height: '100%' }}></div>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                <div
                                  onClick={() => { if (!isActive) { setActiveBuilding(buildingIndex); setSelectedCell(null); setSelectedCells([]) } }}
                                  className={`relative transition-all duration-200 mx-2 my-2 ${isActive ? 'cursor-default' : 'opacity-60 cursor-pointer hover:opacity-80'}`}
                                  style={{ transform: isActive ? 'scale(1)' : 'scale(0.88)', transformOrigin: 'bottom center' }}
                                >
                                  <div className={`text-center text-xs font-semibold mb-1 ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>{building.name}</div>

                                  <div className='flex justify-center' style={{ marginLeft: -Math.round(baseCellPx * 0.15), marginRight: -Math.round(baseCellPx * 0.15) }}>
                                    <svg width={building.cols * baseCellPx + Math.round(baseCellPx * 0.3)} height='28'>
                                      <polyline
                                        points={`0,28 ${(building.cols * baseCellPx + Math.round(baseCellPx * 0.3)) / 2},2 ${building.cols * baseCellPx + Math.round(baseCellPx * 0.3)},28`}
                                        fill={isActive ? (darkMode ? '#4338ca' : '#ede9fe') : 'transparent'}
                                        stroke={isActive ? '#4f46e5' : '#9ca3af'}
                                        strokeWidth={isActive ? '3.5' : '2'}
                                        strokeLinejoin='round'
                                      />
                                    </svg>
                                  </div>

                                  <div className={`bg-white dark:bg-gray-700 shadow border-2 ${isActive ? 'border-indigo-400' : 'border-gray-300 dark:border-gray-600'}`}>
                                    {building.grid.map((row, rowIndex) => (
                                      <div key={rowIndex} className='flex'>
                                        {row.map((cell, colIndex) => {
                                          const isSelected = isActive && selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                                          const isMultiSelected = isActive && selectedCells.includes(`${rowIndex},${colIndex}`)
                                          return (
                                            <div
                                              key={colIndex}
                                              onClick={(e) => { if (isActive) { e.stopPropagation(); handleCellClick(rowIndex, colIndex) } }}
                                              onDragOver={(e) => { if (isActive) e.preventDefault() }}
                                              onDrop={(e) => { if (isActive) { e.preventDefault(); handleDrop(rowIndex, colIndex) } }}
                                              style={{ width: baseCellPx + 'px', height: baseCellPx + 'px' }}
                                              className={`group relative border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all ${
                                                isSelected ? 'ring-4 ring-indigo-500 bg-indigo-200 dark:bg-indigo-900 cursor-pointer' :
                                                isMultiSelected ? 'ring-2 ring-yellow-400 bg-yellow-100 dark:bg-yellow-900 cursor-pointer' :
                                                isActive && cell.type === 'room' && !cell.isVacant ? 'bg-red-200 dark:bg-red-900 border-red-400 hover:bg-red-300 cursor-pointer' :
                                                isActive && cell.type === 'room' ? 'bg-emerald-200 dark:bg-emerald-900 border-emerald-400 hover:bg-emerald-300 cursor-pointer' :
                                                isActive && cell.type === 'common' ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 hover:bg-gray-300 cursor-pointer' :
                                                isActive ? 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 cursor-pointer' :
                                                cell.type === 'room' && !cell.isVacant ? 'bg-red-200 dark:bg-red-950 border-red-400' :
                                                cell.type === 'room' ? 'bg-emerald-200 dark:bg-emerald-950 border-emerald-400' :
                                                cell.type === 'common' ? 'bg-gray-200 dark:bg-gray-700 border-gray-400' : 'bg-gray-50'
                                              }`}
                                            >
                                              {getCellDisplay(cell, cell.type === 'room' ? getRoomNumber(building.grid, rowIndex, colIndex) : 0)}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    ))}
                                  </div>

                                  <div className='h-2 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                                </div>
                              </React.Fragment>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  // Murram: gate connector -> one trunk -> short feeders to each house.
                  const isLeftLike = ['left', 'top-left', 'bottom-left'].includes(gs)
                  const isRightLike = ['right', 'top-right', 'bottom-right'].includes(gs)
                  const isTopLike = ['top', 'top-left', 'top-right'].includes(gs)
                  const isBottomLike = ['bottom', 'bottom-left', 'bottom-right'].includes(gs)
                  const rowTrunkInsetPx = Math.max(104, Math.min(180, 112 + Math.max(0, buildings.length - 1) * 22))
                  const rowTrunkLeft = rowTrunkInsetPx
                  const rowTrunkRight = rowTrunkInsetPx
                  const rowSideStemPx = 78
                  const rowTrunkBottomPx = 52
                  const colTrunkSide = isRightLike ? 'right' : 'left'
                  const colTrunkOffsetPx = 50
                  const feedBottomPx = -84
                  const gateJoinY = isTopLike ? 56 : isBottomLike ? 'calc(100% - 72px)' : 'calc(65% - 6px)'
                  const rowGateJoinY = gateJoinY
                  const colTrunkTopPx = isTopLike ? 56 : 112
                  const colTrunkBottomPx = isBottomLike ? 72 : 112
                  const murramPad = { paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20 }

                  return (
                <div className='border-2 border-dashed border-gray-500 dark:border-gray-400 p-3 bg-gradient-to-br from-green-50 to-slate-100 dark:from-gray-700 dark:to-gray-800 relative'
                  style={{ ...(cornerClip ? { clipPath: cornerClip } : {}), ...cornerPad, ...murramPad }}>
                  {!isColLayout && (
                    <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                      style={{ bottom: rowTrunkBottomPx, left: rowTrunkLeft, right: rowTrunkRight, height: 12, zIndex: 1 }}>
                      <div className='absolute inset-0 flex items-center' style={{ padding: '0 8px' }}>
                        <div style={{ borderTop: `2px dashed ${laneDashColor}`, width: '100%' }}></div>
                      </div>
                    </div>
                  )}

                  {isColLayout && (
                    <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                      style={colTrunkSide === 'left'
                        ? { left: colTrunkOffsetPx, top: colTrunkTopPx, bottom: colTrunkBottomPx, width: 12, zIndex: 1 }
                        : { right: colTrunkOffsetPx, top: colTrunkTopPx, bottom: colTrunkBottomPx, width: 12, zIndex: 1 }}>
                      <div className='absolute inset-0 flex justify-center'>
                        <div style={{ borderLeft: `2px dashed ${laneDashColor}`, height: '100%' }}></div>
                      </div>
                    </div>
                  )}

                  {!isColLayout && (
                    <>
                      {isLeftLike && (
                        <>
                          <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                            style={{ left: 0, top: rowGateJoinY, width: rowSideStemPx + 4, height: 12, zIndex: 1 }}>
                            <div className='absolute inset-0 flex items-center px-2'>
                              <div style={{ borderTop: `2px dashed ${laneDashColor}`, width: '100%' }}></div>
                            </div>
                          </div>
                          <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                            style={{ left: rowSideStemPx, top: rowGateJoinY, bottom: rowTrunkBottomPx, width: 12, zIndex: 1 }}>
                            <div className='absolute inset-0 flex justify-center'>
                              <div style={{ borderLeft: `2px dashed ${laneDashColor}`, height: '100%' }}></div>
                            </div>
                          </div>
                          <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                            style={{ left: rowSideStemPx, bottom: rowTrunkBottomPx, width: Math.max(14, rowTrunkLeft - rowSideStemPx), height: 12, zIndex: 1 }}>
                            <div className='absolute inset-0 flex items-center px-2'>
                              <div style={{ borderTop: `2px dashed ${laneDashColor}`, width: '100%' }}></div>
                            </div>
                          </div>
                        </>
                      )}
                      {isRightLike && (
                        <>
                          <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                            style={{ right: 0, top: rowGateJoinY, width: rowSideStemPx + 4, height: 12, zIndex: 1 }}>
                            <div className='absolute inset-0 flex items-center px-2'>
                              <div style={{ borderTop: `2px dashed ${laneDashColor}`, width: '100%' }}></div>
                            </div>
                          </div>
                          <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                            style={{ right: rowSideStemPx, top: rowGateJoinY, bottom: rowTrunkBottomPx, width: 12, zIndex: 1 }}>
                            <div className='absolute inset-0 flex justify-center'>
                              <div style={{ borderLeft: `2px dashed ${laneDashColor}`, height: '100%' }}></div>
                            </div>
                          </div>
                          <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                            style={{ right: rowSideStemPx, bottom: rowTrunkBottomPx, width: Math.max(14, rowTrunkRight - rowSideStemPx), height: 12, zIndex: 1 }}>
                            <div className='absolute inset-0 flex items-center px-2'>
                              <div style={{ borderTop: `2px dashed ${laneDashColor}`, width: '100%' }}></div>
                            </div>
                          </div>
                        </>
                      )}
                      {!isLeftLike && !isRightLike && (isTopLike || isBottomLike) && (
                        <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                          style={isTopLike
                            ? { top: 0, left: 'calc(50% - 6px)', width: 12, height: 'calc(100% - 64px)', zIndex: 1 }
                            : { bottom: 0, left: 'calc(50% - 6px)', width: 12, height: rowTrunkBottomPx, zIndex: 1 }}>
                          <div className='absolute inset-0 flex justify-center'>
                            <div style={{ borderLeft: `2px dashed ${laneDashColor}`, height: '100%' }}></div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {isColLayout && (
                    <>
                      {(isLeftLike || isRightLike) && (
                        <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                          style={colTrunkSide === 'left'
                            ? { left: 0, top: gateJoinY, width: colTrunkOffsetPx + 10, height: 12, zIndex: 1 }
                            : { right: 0, top: gateJoinY, width: colTrunkOffsetPx + 10, height: 12, zIndex: 1 }}>
                          <div className='absolute inset-0 flex items-center px-2'>
                            <div style={{ borderTop: `2px dashed ${laneDashColor}`, width: '100%' }}></div>
                          </div>
                        </div>
                      )}

                      {(isTopLike || isBottomLike) && (isLeftLike || isRightLike) && (
                        <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                          style={isLeftLike
                            ? (isTopLike
                              ? { left: 0, top: 0, height: 56, width: 12, zIndex: 1 }
                              : { left: 0, bottom: 0, height: 72, width: 12, zIndex: 1 })
                            : (isTopLike
                              ? { right: 0, top: 0, height: 56, width: 12, zIndex: 1 }
                              : { right: 0, bottom: 0, height: 72, width: 12, zIndex: 1 })}>
                          <div className='absolute inset-0 flex justify-center'>
                            <div style={{ borderLeft: `2px dashed ${laneDashColor}`, height: '100%' }}></div>
                          </div>
                        </div>
                      )}

                      {!isLeftLike && !isRightLike && (isTopLike || isBottomLike) && (
                        <>
                          <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                            style={isTopLike
                              ? { top: 0, left: 'calc(50% - 6px)', width: 12, height: 60, zIndex: 1 }
                              : { bottom: 0, left: 'calc(50% - 6px)', width: 12, height: 60, zIndex: 1 }}>
                            <div className='absolute inset-0 flex justify-center'>
                              <div style={{ borderLeft: `2px dashed ${laneDashColor}`, height: '100%' }}></div>
                            </div>
                          </div>
                          <div className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                            style={colTrunkSide === 'left'
                              ? { left: colTrunkOffsetPx + 8, right: '50%', top: gateJoinY, height: 12, zIndex: 1 }
                              : { left: '50%', right: colTrunkOffsetPx + 8, top: gateJoinY, height: 12, zIndex: 1 }}>
                            <div className='absolute inset-0 flex items-center px-2'>
                              <div style={{ borderTop: `2px dashed ${laneDashColor}`, width: '100%' }}></div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div className={`relative flex ${isColLayout ? 'flex-col items-start w-full' : 'flex-row items-end'}`} style={{ zIndex: 2 }}>
                    {buildings.map((building, buildingIndex) => {
                      const isActive = buildingIndex === activeBuilding
                      const centerX = Math.round((building.cols * baseCellPx) / 2) + 12
                      return (
                        <React.Fragment key={building.id}>
                        <div
                          className={`relative ${isColLayout ? 'w-full mb-8' : ''}`}
                          style={isColLayout
                            ? (colTrunkSide === 'left'
                              ? { paddingLeft: 72 }
                              : { paddingRight: 72 })
                            : undefined}
                        >
                        {isColLayout && (
                          <>
                            <div
                              className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                              style={{ left: centerX, bottom: feedBottomPx, width: 12, height: 84, transform: 'translateX(-50%)', zIndex: 1 }}
                            >
                              <div className='absolute inset-0 flex justify-center'>
                                <div style={{ borderLeft: `2px dashed ${laneDashColor}`, height: '100%' }}></div>
                              </div>
                            </div>
                            <div
                              className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                              style={colTrunkSide === 'right'
                                ? { left: centerX, right: colTrunkOffsetPx + 2, bottom: feedBottomPx, height: 12, zIndex: 1 }
                                : { left: colTrunkOffsetPx + 2, right: `calc(100% - ${centerX}px)`, bottom: feedBottomPx, height: 12, zIndex: 1 }}
                            >
                              <div className='absolute inset-0 flex items-center px-2'>
                                <div style={{ borderTop: `2px dashed ${laneDashColor}`, width: '100%' }}></div>
                              </div>
                            </div>
                          </>
                        )}

                        <div
                          onClick={() => { if (!isActive) { setActiveBuilding(buildingIndex); setSelectedCell(null); setSelectedCells([]) } }}
                          className={`relative transition-all duration-200 mx-2 my-2 ${isActive ? 'cursor-default' : 'opacity-60 cursor-pointer hover:opacity-80'}`}
                          style={{ transform: isActive ? 'scale(1)' : 'scale(0.88)', transformOrigin: 'bottom center' }}
                        >
                          {!isColLayout && (
                            <div
                              className={`absolute overflow-hidden rounded-sm ${roadBgClass}`}
                              style={{ bottom: -52, left: '50%', width: 12, height: 52, transform: 'translateX(-50%)', zIndex: 1 }}
                            >
                              <div className='absolute inset-0 flex justify-center'>
                                <div style={{ borderLeft: `2px dashed ${laneDashColor}`, height: '100%' }}></div>
                              </div>
                            </div>
                          )}

                          {/* Building label */}
                          <div className={`text-center text-xs font-semibold mb-1 ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>{building.name}</div>

                          {/* Roof — outlined triangle with overhang, no bottom border */}
                          <div className='flex justify-center' style={{ marginLeft: -Math.round(baseCellPx * 0.15), marginRight: -Math.round(baseCellPx * 0.15) }}>
                            <svg width={building.cols * baseCellPx + Math.round(baseCellPx * 0.3)} height="28">
                              <polyline
                                points={`0,28 ${(building.cols * baseCellPx + Math.round(baseCellPx * 0.3)) / 2},2 ${building.cols * baseCellPx + Math.round(baseCellPx * 0.3)},28`}
                                fill={isActive ? (darkMode ? '#4338ca' : '#ede9fe') : 'transparent'}
                                stroke={isActive ? '#4f46e5' : '#9ca3af'}
                                strokeWidth={isActive ? '3.5' : '2'}
                                strokeLinejoin='round'
                              />
                            </svg>
                          </div>

                          {/* Grid */}
                          <div className={`bg-white dark:bg-gray-700 shadow border-2 ${isActive ? 'border-indigo-400' : 'border-gray-300 dark:border-gray-600'}`}>
                            {building.grid.map((row, rowIndex) => (
                              <div key={rowIndex} className='flex'>
                                {row.map((cell, colIndex) => {
                                  const isSelected = isActive && selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                                  const isMultiSelected = isActive && selectedCells.includes(`${rowIndex},${colIndex}`)
                                  return (
                                    <div
                                      key={colIndex}
                                      onClick={(e) => { if (isActive) { e.stopPropagation(); handleCellClick(rowIndex, colIndex) } }}
                                      onDragOver={(e) => { if (isActive) e.preventDefault() }}
                                      onDrop={(e) => { if (isActive) { e.preventDefault(); handleDrop(rowIndex, colIndex) } }}
                                      style={{ width: baseCellPx + 'px', height: baseCellPx + 'px' }}
                                      className={`group relative border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all ${
                                        isSelected ? 'ring-4 ring-indigo-500 bg-indigo-200 dark:bg-indigo-900 cursor-pointer' :
                                        isMultiSelected ? 'ring-2 ring-yellow-400 bg-yellow-100 dark:bg-yellow-900 cursor-pointer' :
                                        isActive && cell.type === 'room' && !cell.isVacant ? 'bg-red-200 dark:bg-red-900 border-red-400 hover:bg-red-300 cursor-pointer' :
                                        isActive && cell.type === 'room' ? 'bg-emerald-200 dark:bg-emerald-900 border-emerald-400 hover:bg-emerald-300 cursor-pointer' :
                                        isActive && cell.type === 'common' ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 hover:bg-gray-300 cursor-pointer' :
                                        isActive ? 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 cursor-pointer' :
                                        cell.type === 'room' && !cell.isVacant ? 'bg-red-200 dark:bg-red-950 border-red-400' :
                                        cell.type === 'room' ? 'bg-emerald-200 dark:bg-emerald-950 border-emerald-400' :
                                        cell.type === 'common' ? 'bg-gray-200 dark:bg-gray-700 border-gray-400' : 'bg-gray-50'
                                      }`}
                                    >
                                      {getCellDisplay(cell, cell.type === 'room' ? getRoomNumber(building.grid, rowIndex, colIndex) : 0)}
                                      {cell.type === 'room' && (
                                        <div className='hidden group-hover:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none items-center'>
                                          <div className='bg-gray-900  text-white rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl text-left'>
                                            <div className='font-bold text-[11px]'>R{getRoomNumber(building.grid, rowIndex, colIndex)} · {cell.roomType || 'Room'}</div>
                                            {cell.pricePerMonth && <div className='text-[10px] text-gray-300 mt-0.5'>Ksh {cell.pricePerMonth?.toLocaleString()}/mo</div>}
                                            <div className={`text-[10px] font-medium mt-0.5 ${cell.isVacant ? 'text-green-300' : 'text-red-300'}`}>
                                              {cell.isVacant ? '● Vacant' : '● Occupied'}
                                            </div>
                                          </div>
                                          <div className='w-2 h-2 bg-gray-900 rotate-45 -mt-1 shrink-0'></div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>

                          {/* Foundation */}
                          <div className='h-2 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                        </div>
                        </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
                  )
                })()}

                {/* Gate — 8-position compound gate with rotation */}
                {(() => {
                  const gs = compoundGate.side
                  const posClass = {
                    'top':          'absolute top-0 left-1/2',
                    'bottom':       'absolute bottom-0 left-1/2',
                    'left':         'absolute left-0 top-1/2',
                    'right':        'absolute right-0 top-1/2',
                    'top-left':     'absolute top-0 left-0',
                    'top-right':    'absolute top-0 right-0',
                    'bottom-left':  'absolute bottom-0 left-0',
                    'bottom-right': 'absolute bottom-0 right-0',
                  }[gs] || 'absolute bottom-0 left-1/2'
                  const gateTransform = {
                    'top':          'translate(-50%, -50%)',
                    'bottom':       'translate(-50%, 50%)',
                    'left':         'translate(-50%, -50%) rotate(-90deg)',
                    'right':        'translate(50%, -50%) rotate(-90deg)',
                    'top-left':     'translate(calc(-50% + 24px), calc(-50% + 24px)) rotate(-45deg)',
                    'top-right':    'translate(calc(50% - 24px), calc(-50% + 24px)) rotate(45deg)',
                    'bottom-left':  'translate(calc(-50% + 24px), calc(50% - 24px)) rotate(45deg)',
                    'bottom-right': 'translate(calc(50% - 24px), calc(50% - 24px)) rotate(-45deg)',
                  }[gs] || 'translate(-50%, 50%)'
                  return (
                    <div className={`${posClass} bg-amber-50 border border-amber-400 rounded px-2 py-0.5 flex items-center gap-1 z-10`}
                      style={{ transform: gateTransform }}>
                      <svg className='w-3 h-3 text-amber-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18' /></svg>
                      <span className='text-[9px] font-bold text-amber-800 uppercase tracking-wide'>Gate</span>
                      <svg className='w-3 h-3 text-amber-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18' /></svg>
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
          <div className='flex gap-2 mb-3 flex-wrap text-sm'>
            <button type="button" onClick={() => { setSelectMode(!selectMode); setSelectedCells([]) }} className={`px-3 py-1.5 rounded font-medium ${selectMode ? 'bg-yellow-500 dark:bg-yellow-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200'}`}>
              {selectMode ? 'Multi-Select ON' : 'Multi-Select'}
            </button>
            <button type="button" onClick={applyToAllCells} className='flex items-center gap-1 bg-teal-500 dark:bg-teal-600 hover:bg-teal-600 dark:hover:bg-teal-700 text-white px-3 py-1.5 rounded font-medium'>
              <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2' /></svg>
              Apply to All
            </button>
          </div>
          {(selectedCell || selectedCells.length > 0) ? (
            <div className='space-y-3'>
              {selectMode && selectedCells.length > 0 && (
                <p className='text-sm font-medium text-yellow-700 bg-yellow-50 p-2 rounded'>Editing {selectedCells.length} cells - Changes will apply to all selected</p>
              )}
              <div className='flex gap-2 flex-wrap items-center'>
                <select className='border px-3 py-2 rounded outline-indigo-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100' value={roomConfig.type} onChange={(e) => setRoomConfig({ ...roomConfig, type: e.target.value })}>
                  <option value="empty">Empty</option>
                  <option value="room">Room</option>
                  <option value="common">Common Area</option>
                </select>
                {roomConfig.type === 'room' && (<>
                  <select className='border px-3 py-2 rounded outline-indigo-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100' value={roomConfig.roomType} onChange={(e) => setRoomConfig({ ...roomConfig, roomType: e.target.value })}>
                    <option value="">Room Type *</option>
                    <option value="BedSitter">BedSitter</option>
                    <option value="One-Bedroom">One-Bedroom</option>
                    <option value="Self-Contain">Self-Contain</option>
                  </select>
                  <input type='number' placeholder='Monthly Rent *' min="100" className='border px-3 py-2 rounded w-32 outline-indigo-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100' value={roomConfig.pricePerMonth} onChange={(e) => setRoomConfig({ ...roomConfig, pricePerMonth: e.target.value })} />
                  <button
                    type="button"
                    onClick={() => setRoomConfig({ ...roomConfig, isVacant: !roomConfig.isVacant })}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm border-2 transition-all ${
                      roomConfig.isVacant
                        ? 'bg-green-50 text-green-700 border-green-500 hover:bg-green-100'
                        : 'bg-red-50 text-red-700 border-red-500 hover:bg-red-100'
                    }`}
                  >
                    <span className='flex items-center gap-1'>{roomConfig.isVacant ? <><Check className='w-4 h-4' /> Vacant</> : <><XIcon className='w-4 h-4' /> Occupied</>}</span>
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
          {loading ? 'Creating Listing...' : existingProperty ? <span className='flex items-center justify-center gap-2'><Save className='w-5 h-5' /> Update Property</span> : <span className='flex items-center justify-center gap-2'><Home className='w-5 h-5' /> List Property</span>}
        </button>
      </form>
    </div>
  )
}

export default PropertyListingModal
