import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, Plus, X, Loader, Image, Video, MapPin, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import LocationPinPicker from '../../components/LocationPinPicker';

export default function PostVacancy() {
  const { axios, getToken, navigate } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [amenities, setAmenities] = useState([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [mediaInput, setMediaInput] = useState('');
  const [mediaType, setMediaType] = useState('photo');
  const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
  const [showGridEditor, setShowGridEditor] = useState(false);
  const [buildings, setBuildings] = useState([
    {
      id: 'building_1',
      name: 'Main Building',
      rows: 1,
      cols: 4,
      grid: [Array(4).fill(null).map(() => ({ type: 'empty', roomType: '', pricePerMonth: 0, amenities: [], isVacant: true, isBooked: false, isMoveOutSoon: false }))],
      gatePosition: { row: 0, col: 3, side: 'bottom' }
    }
  ]);
  const [selectedCell, setSelectedCell] = useState({ buildingIndex: 0, rowIndex: 0, colIndex: 0 });
  const [formData, setFormData] = useState({
    title: '',
    location: {
      area: '',
      city: '',
      coordinates: null,
    },
    rent: {
      min: '',
      max: '',
    },
    roomType: 'single',
    availableRooms: '1',
    googleMapsUrl: '',
    description: '',
    moveInDate: '',
    availabilityFrom: '',
    availabilityTo: '',
    minBookingLeadDays: '2',
    contactPhone: '',
    whatsappNumber: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddAmenity = () => {
    const value = amenityInput.trim();
    if (value && !amenities.includes(value)) {
      setAmenities([...amenities, value]);
      setAmenityInput('');
    }
  };

  const createEmptyCell = () => ({
    type: 'empty',
    roomType: '',
    pricePerMonth: Number(formData.rent.min || 0),
    amenities: [],
    isVacant: true,
    isBooked: false,
    isMoveOutSoon: false,
  });

  const toggleGridEditor = () => {
    setShowGridEditor((s) => !s);
  };

  const addBuilding = () => {
    const nextIndex = buildings.length + 1;
    setBuildings((prev) => ([
      ...prev,
      {
        id: `building_${nextIndex}`,
        name: `Building ${nextIndex}`,
        rows: 1,
        cols: 4,
        grid: [Array(4).fill(null).map(() => createEmptyCell())],
        gatePosition: { row: 0, col: 3, side: 'bottom' }
      }
    ]));
  };

  const resizeBuilding = (buildingIndex, type) => {
    setBuildings((prev) => prev.map((b, idx) => {
      if (idx !== buildingIndex) return b;
      if (type === 'add-row') {
        return { ...b, rows: b.rows + 1, grid: [...b.grid, Array(b.cols).fill(null).map(() => createEmptyCell())] };
      }
      if (type === 'remove-row' && b.rows > 1) {
        return { ...b, rows: b.rows - 1, grid: b.grid.slice(0, -1) };
      }
      if (type === 'add-col') {
        return {
          ...b,
          cols: b.cols + 1,
          grid: b.grid.map((row) => [...row, createEmptyCell()]),
        };
      }
      if (type === 'remove-col' && b.cols > 1) {
        return {
          ...b,
          cols: b.cols - 1,
          grid: b.grid.map((row) => row.slice(0, -1)),
        };
      }
      return b;
    }));
  };

  const cycleCellType = (buildingIndex, rowIndex, colIndex) => {
    setBuildings((prev) => prev.map((b, idx) => {
      if (idx !== buildingIndex) return b;
      const nextGrid = b.grid.map((row, rIdx) => row.map((cell, cIdx) => {
        if (rIdx !== rowIndex || cIdx !== colIndex) return cell;
        if (cell.type === 'empty') return { ...cell, type: 'room', roomType: formData.roomType, pricePerMonth: Number(formData.rent.min || 0) };
        if (cell.type === 'room') return { ...cell, type: 'common', roomType: '', pricePerMonth: 0 };
        return createEmptyCell();
      }));
      return { ...b, grid: nextGrid };
    }));
    setSelectedCell({ buildingIndex, rowIndex, colIndex });
  };

  const updateSelectedRoom = (key, value) => {
    const { buildingIndex, rowIndex, colIndex } = selectedCell;
    setBuildings((prev) => prev.map((b, idx) => {
      if (idx !== buildingIndex) return b;
      const nextGrid = b.grid.map((row, rIdx) => row.map((cell, cIdx) => {
        if (rIdx !== rowIndex || cIdx !== colIndex) return cell;
        return { ...cell, [key]: value };
      }));
      return { ...b, grid: nextGrid };
    }));
  };

  const handleRemoveAmenity = (index) => {
    setAmenities(amenities.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAddMedia = () => {
    const value = mediaInput.trim();
    if (!value) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      new URL(value);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    if (mediaType === 'photo') {
      if (photos.length >= 5) {
        toast.error('Maximum 5 photos allowed');
        return;
      }
      setPhotos([...photos, value]);
    } else {
      if (videos.length >= 3) {
        toast.error('Maximum 3 videos allowed');
        return;
      }
      setVideos([...videos, value]);
    }

    setMediaInput('');
    toast.success(`${mediaType} added successfully`);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentPhotosCount = photos.length;
    const currentVideosCount = videos.length;
    let uploadedPhotos = 0;
    let uploadedVideos = 0;

    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`${file.name} is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum is 15 MB.`);
          continue;
        }
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('mediaType', mediaType);
        const token = await getToken();
        const response = await axios.post('/api/agent/upload-media', formDataUpload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const media = response.data?.media;
        if (!media || !media.url) {
          console.error('Upload response missing media object:', response.data);
          throw new Error(response.data?.message || 'Upload failed: missing media object');
        }

        if (mediaType === 'photo') {
          if ((currentPhotosCount + uploadedPhotos) >= 5) {
            toast.error('Maximum 5 photos reached');
            break;
          }
          // store full media object { url, publicId?, thumbnail?, resourceType? }
          setPhotos((prev) => [...prev, media]);
          uploadedPhotos += 1;
          toast.success('Photo uploaded');
        } else {
          if ((currentVideosCount + uploadedVideos) >= 3) {
            toast.error('Maximum 3 videos reached');
            break;
          }
          setVideos((prev) => [...prev, media]);
          uploadedVideos += 1;
          toast.success('Video uploaded');
        }
      }
    } catch (error) {
      console.error('Upload error:', error.response?.data || error.message || error);
      toast.error(error.response?.data?.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, itemIndex) => itemIndex !== index));
  };

  const removeVideo = (index) => {
    setVideos(videos.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!formData.title.trim()) {
        toast.error('Please add a vacancy title');
        return;
      }

      if (!formData.location.area || !formData.location.city) {
        toast.error('Please fill in location details');
        return;
      }

      if (
        formData.location.coordinates?.latitude == null ||
        formData.location.coordinates?.longitude == null
      ) {
        toast.error('Drop an accurate map pin. Exact location is shared only after a viewing is confirmed.');
        return;
      }

      if (!formData.rent.min || !formData.rent.max) {
        toast.error('Please fill in rent range');
        return;
      }

      if (Number(formData.rent.min) > Number(formData.rent.max)) {
        toast.error('Minimum rent cannot be greater than maximum rent');
        return;
      }

      if (!formData.availableRooms || Number(formData.availableRooms) < 1) {
        toast.error('Available rooms must be at least 1');
        return;
      }

      let parsedBuildings = [];
      if (showGridEditor) {
        parsedBuildings = buildings.map((b) => ({
          id: b.id,
          name: b.name,
          rows: b.rows,
          cols: b.cols,
          gatePosition: b.gatePosition,
          grid: b.grid,
        }));

        const hasAnyRoom = parsedBuildings.some((b) =>
          (b.grid || []).some((row) => (row || []).some((cell) => cell?.type === 'room'))
        );
        if (!hasAnyRoom) {
          parsedBuildings = [];
        }
      }
      // Auto-generate default building if empty and availableRooms > 0
      if (parsedBuildings.length === 0 && Number(formData.availableRooms) > 0) {
        const numRooms = Number(formData.availableRooms);
        const cols = Math.min(4, Math.ceil(Math.sqrt(numRooms))); // 2-4 cols
        const rows = Math.ceil(numRooms / cols);
        
        const grid = [];
        let roomCount = 0;
        for (let r = 0; r < rows; r++) {
          const row = [];
          for (let c = 0; c < cols; c++) {
            if (roomCount < numRooms) {
              row.push({
                type: 'room',
                roomNumber: `${r + 1}${String.fromCharCode(65 + c)}`,
                roomType: formData.roomType,
                pricePerMonth: Number(formData.rent.min),
                amenities: amenities || [],
                isVacant: true,
                isMoveOutSoon: false,
                isBooked: false,
              });
              roomCount++;
            } else {
              row.push(null);
            }
          }
          grid.push(row);
        }
        
        parsedBuildings = [{
          id: 'main-building',
          name: 'Main Building',
          rows,
          cols,
          grid,
        }];
      }

      setLoading(true);
      const token = await getToken();

      const payload = {
        title: formData.title.trim(),
        location: {
          area: formData.location.area,
          city: formData.location.city,
          ...(formData.location.coordinates
            ? { coordinates: formData.location.coordinates }
            : {}),
        },
        rent: {
          min: Number(formData.rent.min),
          max: Number(formData.rent.max),
        },
        roomType: formData.roomType,
        availableRooms: Number(formData.availableRooms),
        googleMapsUrl: formData.googleMapsUrl?.trim() || (
          formData.location.coordinates
            ? `https://www.google.com/maps?q=${formData.location.coordinates.latitude},${formData.location.coordinates.longitude}`
            : ''
        ),
        description: formData.description,
        amenities,
        photos: photos.map((p) => (typeof p === 'string' ? { url: p, publicId: '' } : { url: p.url, publicId: p.publicId || '', thumbnail: p.thumbnail || '' })),
        videos: videos.map((v) => (typeof v === 'string' ? { url: v, publicId: '', thumbnail: '' } : { url: v.url, publicId: v.publicId || '', thumbnail: v.thumbnail || '' })),
        buildings: parsedBuildings,
        moveInDate: formData.moveInDate ? new Date(formData.moveInDate).toISOString() : undefined,
        availabilityFrom: formData.availabilityFrom ? new Date(formData.availabilityFrom).toISOString() : undefined,
        availabilityTo: formData.availabilityTo ? new Date(formData.availabilityTo).toISOString() : undefined,
        minBookingLeadDays: Number(formData.minBookingLeadDays) || 2,
        contactPhone: formData.contactPhone?.trim() || '',
        whatsappNumber: formData.whatsappNumber?.trim() || '',
      };

      const res = await axios.post('/api/agent/vacancies', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.message) {
        toast.success('Vacancy posted successfully!');
        navigate('/agent');
      }
    } catch (error) {
      console.error('Error posting vacancy:', error);
      toast.error(error.response?.data?.message || 'Failed to post vacancy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='max-w-5xl mx-auto p-4 md:p-8'>
      <div className='flex items-center gap-4 mb-8'>
        <button
          onClick={() => navigate('/agent')}
          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>Post a Vacancy</h1>
          <p className='text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1'>Share the details renters need to decide quickly.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700'>
        <div className='mb-8'>
          <h2 className='text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4'>Title</h2>
          <input
            type='text'
            name='title'
            placeholder='e.g. Spacious bedsitter near town'
            value={formData.title}
            onChange={handleInputChange}
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
          />
        </div>

        <div className='mb-8'>
          <h2 className='text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4'>Location</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='relative'>
              <MapPin className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={18} />
              <input
                type='text'
                name='location.area'
                placeholder='Area (e.g. Annex, Huruma)'
                value={formData.location.area}
                onChange={handleInputChange}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                required
              />
            </div>
            <input
              type='text'
              name='location.city'
              placeholder='City (e.g. Eldoret)'
              value={formData.location.city}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
          </div>
          <div className='mt-3 grid grid-cols-1 md:grid-cols-4 gap-3'>
            <input
              type='url'
              name='googleMapsUrl'
              placeholder='Google Maps link (optional if pin is set)'
              value={formData.googleMapsUrl}
              onChange={handleInputChange}
              className='md:col-span-3 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            />
            <button
              type='button'
              onClick={() => window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${formData.location.area || ''} ${formData.location.city || ''}`.trim() || 'Kenya'), '_blank', 'noopener,noreferrer')}
              className='px-4 py-2 border border-indigo-300 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-sm'
            >
              Open Maps
            </button>
          </div>
          <div className='mt-4'>
            <LocationPinPicker
              value={formData.location.coordinates}
              onChange={(coordinates) => {
                setFormData((prev) => ({
                  ...prev,
                  location: { ...prev.location, coordinates },
                  googleMapsUrl: coordinates
                    ? `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`
                    : prev.googleMapsUrl,
                }));
              }}
            />
          </div>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
            Accurate pin required. Public map shows an approximate area; exact location unlocks after you confirm a viewing.
          </p>
        </div>

        <div className='mb-8'>
          <h2 className='text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4'>Rent Range</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <input
              type='number'
              name='rent.min'
              placeholder='Minimum rent (Ksh)'
              value={formData.rent.min}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
            <input
              type='number'
              name='rent.max'
              placeholder='Maximum rent (Ksh)'
              value={formData.rent.max}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
          </div>
        </div>

        <div className='mb-8'>
          <h2 className='text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4'>Room Details</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <select
              name='roomType'
              value={formData.roomType}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            >
              <option value='single'>Single</option>
              <option value='double'>Double</option>
              <option value='shared'>Shared</option>
              <option value='studio'>Studio</option>
              <option value='bedsitter'>Bedsitter</option>
              <option value='apartment'>Apartment</option>
            </select>
            <input
              type='number'
              name='availableRooms'
              placeholder='Available rooms'
              value={formData.availableRooms}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
          </div>
        </div>

        <div className='mb-8'>
          <div className='flex items-start justify-between mb-4'>
            <div>
              <h2 className='text-lg md:text-xl font-semibold text-gray-900 dark:text-white'>Availability Window</h2>
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>Use this to show when the vacancy opens and the last date someone can move in. (Optional)</p>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Available From</label>
              <input
                type='date'
                name='availabilityFrom'
                value={formData.availabilityFrom}
                onChange={handleInputChange}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                title='The earliest date a tenant can move in'
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Tenants can move in on or after this date</p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Move-In Deadline</label>
              <input
                type='date'
                name='availabilityTo'
                value={formData.availabilityTo}
                onChange={handleInputChange}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                title='The latest date a tenant can move in'
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Last date a tenant can move in before this vacancy is no longer considered current</p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Min Days Notice</label>
              <input
                type='number'
                min='0'
                name='minBookingLeadDays'
                placeholder='e.g. 2'
                value={formData.minBookingLeadDays}
                onChange={handleInputChange}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                title='How many days in advance tenants must book'
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Days in advance to confirm booking</p>
            </div>
          </div>
        </div>

        <div className='mb-8'>
          <h2 className='text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4'>Description</h2>
          <textarea
            name='description'
            placeholder='Describe the room or property'
            value={formData.description}
            onChange={handleInputChange}
            rows='5'
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
          />
        </div>

        <div className='mb-8'>
          <h2 className='text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4'>Contact (optional)</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <input
              type='tel'
              name='contactPhone'
              placeholder='Contact phone (e.g. 0712345678)'
              value={formData.contactPhone}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            />
            <input
              type='tel'
              name='whatsappNumber'
              placeholder='WhatsApp number (optional)'
              value={formData.whatsappNumber}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            />
          </div>
          <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>Providing a contact or WhatsApp number makes it easier for tenants to reach you.</p>
        </div>

        <div className='mb-8'>
          <div className='flex items-center justify-between mb-2'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Advanced: House Grid</h2>
            <button
              type='button'
              onClick={toggleGridEditor}
              className='text-sm text-indigo-600 hover:underline'
            >
              {showGridEditor ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className='text-sm text-gray-500 dark:text-gray-400 mb-2'>Use the same visual grid workflow as landlord listings (optional). If you skip this, we auto-create a simple unit grid from available rooms.</p>
          {showGridEditor && (
            <>
              <div className='flex flex-wrap gap-2 mb-3'>
                <button type='button' onClick={addBuilding} className='px-3 py-1.5 text-sm rounded border border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'>Add Building</button>
              </div>
              <div className='space-y-4'>
                {buildings.map((building, bIdx) => (
                  <div key={building.id} className='p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
                    <div className='flex flex-wrap items-center gap-2 mb-3'>
                      <input
                        value={building.name}
                        onChange={(e) => setBuildings((prev) => prev.map((b, i) => i === bIdx ? { ...b, name: e.target.value } : b))}
                        className='px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded text-sm'
                      />
                      <button type='button' onClick={() => resizeBuilding(bIdx, 'add-row')} className='px-2 py-1 text-xs border rounded'>+ Row</button>
                      <button type='button' onClick={() => resizeBuilding(bIdx, 'remove-row')} className='px-2 py-1 text-xs border rounded'>- Row</button>
                      <button type='button' onClick={() => resizeBuilding(bIdx, 'add-col')} className='px-2 py-1 text-xs border rounded'>+ Col</button>
                      <button type='button' onClick={() => resizeBuilding(bIdx, 'remove-col')} className='px-2 py-1 text-xs border rounded'>- Col</button>
                    </div>
                    <div className='overflow-x-auto'>
                      {building.grid.map((row, rIdx) => (
                        <div key={rIdx} className='flex'>
                          {row.map((cell, cIdx) => {
                            const type = cell?.type || 'empty';
                            const active = selectedCell.buildingIndex === bIdx && selectedCell.rowIndex === rIdx && selectedCell.colIndex === cIdx;
                            return (
                              <button
                                key={cIdx}
                                type='button'
                                onClick={() => cycleCellType(bIdx, rIdx, cIdx)}
                                className={`w-12 h-12 border text-[10px] flex items-center justify-center ${active ? 'ring-2 ring-indigo-500' : ''} ${
                                  type === 'room' ? 'bg-emerald-100 border-emerald-400' : type === 'common' ? 'bg-gray-200 border-gray-400' : 'bg-white dark:bg-gray-700 border-gray-300'
                                }`}
                                title='Click to cycle: Empty -> Room -> Common'
                              >
                                {type === 'room' ? 'ROOM' : type === 'common' ? 'COMMON' : '-'}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {(() => {
                const b = buildings[selectedCell.buildingIndex];
                const cell = b?.grid?.[selectedCell.rowIndex]?.[selectedCell.colIndex];
                if (!cell || cell.type !== 'room') return null;
                return (
                  <div className='mt-3 p-3 rounded border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'>
                    <p className='text-sm font-medium mb-2'>Selected Room Settings</p>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
                      <select value={cell.roomType || formData.roomType} onChange={(e) => updateSelectedRoom('roomType', e.target.value)} className='px-3 py-2 border rounded dark:bg-gray-700'>
                        <option value='single'>Single</option>
                        <option value='double'>Double</option>
                        <option value='shared'>Shared</option>
                        <option value='studio'>Studio</option>
                        <option value='bedsitter'>Bedsitter</option>
                        <option value='apartment'>Apartment</option>
                      </select>
                      <input type='number' value={cell.pricePerMonth || 0} onChange={(e) => updateSelectedRoom('pricePerMonth', Number(e.target.value || 0))} className='px-3 py-2 border rounded dark:bg-gray-700' placeholder='Price/month' />
                      <label className='flex items-center gap-2 px-3 py-2 border rounded dark:bg-gray-700'>
                        <input type='checkbox' checked={!!cell.isVacant} onChange={(e) => updateSelectedRoom('isVacant', e.target.checked)} /> Vacant
                      </label>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Amenities</h2>
          <div className='flex gap-2 mb-4'>
            <input
              type='text'
              placeholder='Add amenity (e.g. WiFi, Kitchen)'
              value={amenityInput}
              onChange={(e) => setAmenityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAmenity();
                }
              }}
              className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            />
            <button
              type='button'
              onClick={handleAddAmenity}
              className='bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors'
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          {amenities.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {amenities.map((amenity, index) => (
                <div
                  key={index}
                  className='bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full flex items-center gap-2'
                >
                  {amenity}
                  <button
                    type='button'
                    onClick={() => handleRemoveAmenity(index)}
                    className='hover:text-red-600'
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Image size={20} />
            {mediaType === 'photo' ? `Photos (${photos.length}/5)` : `Videos (${videos.length}/3)`}
          </h2>
          
          {/* Media Type Selector and URL Input */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 min-w-0'>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg w-full'
            >
              <option value='photo'>Photo</option>
              <option value='video'>Video</option>
            </select>
              <input
                type='url'
                placeholder='Paste photo or video URL'
                value={mediaInput}
                onChange={(e) => setMediaInput(e.target.value)}
                className='md:col-span-2 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-0 w-full'
              />
            <button
              type='button'
              onClick={handleAddMedia}
              className='bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors w-full md:w-auto'
            >
              <Plus size={18} />
              Add URL
            </button>
          </div>

          {/* File Upload Option */}
          <div className='mb-4'>
            <label className='flex items-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors'>
              <Upload size={18} className='text-indigo-600' />
              <span className='text-sm font-medium text-indigo-600'>
                {uploading ? 'Uploading...' : `Upload ${mediaType} from device`}
              </span>
              <input
                type='file'
                multiple
                accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
                onChange={handleFileUpload}
                disabled={uploading}
                className='hidden'
              />
            </label>
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>Max file size: 15 MB. Allowed types: images and videos.</p>
          </div>

          {/* Photos Grid */}
          {photos.length > 0 && (
            <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mt-4'>
              {photos.map((photo, index) => (
                <div key={index} className='relative group'>
                  <img src={typeof photo === 'string' ? photo : (photo.url || '')} alt={`Photo ${index + 1}`} className='w-full h-24 object-cover rounded-lg' />
                  <button
                    type='button'
                    onClick={() => removePhoto(index)}
                    className='absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Videos List */}
          {videos.length > 0 && (
            <div className='space-y-2 mt-4'>
              {videos.map((video, index) => (
                <div key={index} className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <div className='flex items-center gap-2 min-w-0'>
                    <Video size={18} className='text-gray-500' />
                    <span className='text-sm text-gray-700 dark:text-gray-300 truncate'>{(typeof video === 'string' ? video : (video.url || '')).substring(0, 50)}...</span>
                  </div>
                  <button
                    type='button'
                    onClick={() => removeVideo(index)}
                    className='text-red-500 hover:text-red-700'
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Video size={20} />
            Videos ({videos.length}/3)
          </h2>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>Paste a direct video URL for now.</p>

          {videos.length > 0 && (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
              {videos.map((video, index) => (
                <div key={index} className='relative group'>
                  <video src={video} className='w-full h-32 object-cover rounded-lg bg-black' controls />
                  <button
                    type='button'
                    onClick={() => removeVideo(index)}
                    className='absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='flex gap-4'>
          <button
            type='submit'
            disabled={loading}
            className='flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
          >
            {loading && <Loader size={18} className='animate-spin' />}
            {loading ? 'Posting...' : 'Post Vacancy'}
          </button>
          <button
            type='button'
            onClick={() => navigate('/agent')}
            className='px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
