import React, { useState } from 'react'
import {assets, Places} from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const HouseReg = () => {
    const {setShowHouseReg, axios, getToken, setIsOwner, user, setUser, navigate} = useAppContext()

    const [name, setName] = useState("")
    const [address, setAddress] = useState("")
    const [contact, setContact] = useState("")
    const [place, setPlace] = useState("")
    const [estate, setEstate] = useState("")
    const [propertyType, setPropertyType] = useState("")
    const [totalUnits, setTotalUnits] = useState("")

    const onSubmitHandler = async (event) => {
        try {
            event.preventDefault();
            
            // Create property object
            const newProperty = {
                _id: 'house_' + Date.now(),
                name,
                contact,
                address,
                place,
                estate,
                propertyType,
                totalUnits: parseInt(totalUnits),
                owner: user.id,
                createdAt: new Date().toISOString()
            }
            
            // Save property to localStorage
            const storedProperties = JSON.parse(localStorage.getItem('userProperties') || '[]')
            storedProperties.push(newProperty)
            localStorage.setItem('userProperties', JSON.stringify(storedProperties))
            
            // Update user role to landlord
            const updatedUser = {...user, role: 'landlord'}
            localStorage.setItem('user', JSON.stringify(updatedUser))
            setUser(updatedUser)
            setIsOwner(true)
            
            toast.success("Property listed successfully! You can now add rooms to your property.")
            setShowHouseReg(false)
            
            // Navigate to dashboard to add rooms
            navigate('/owner')
            
            // ORIGINAL API CALL (commented out temporarily):
            // const {data} = await axios.post('/api/houses/', {name, contact, address, place, estate, propertyType, totalUnits }, {headers: {Authorization: `Bearer ${await getToken()}`}})
            // if(data.success){
            //     toast.success(data.message)
            //     setIsOwner(true)
            //     setShowHouseReg(false)
            //     navigate('/owner')
            // }else{
            //     toast.error(data.message)
            // }
        } catch (error) {
            toast.error(error.message)
        }
    }

    return (
        <div onClick={() => setShowHouseReg(false)} className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/70 overflow-y-auto p-4'>
            <form onSubmit={onSubmitHandler} onClick={(e)=> e.stopPropagation()} className='flex bg-white rounded-xl max-w-4xl my-auto max-h-[95vh] overflow-y-auto'>
                <img src={assets.regImage} alt="" className='w-1/2 rounded-xl hidden md:block object-cover' />

                <div className='relative flex flex-col items-center md:w-1/2 p-8 md:p-10 overflow-y-auto'>
                    <img src={assets.closeIcon} alt="" className='absolute top-4 right-4 h-4 w-4 cursor-pointer' onClick={()=>setShowHouseReg(false)} />
                    <p className='text-2xl font-semibold mt-6'>List Your Rental Property</p>
                    <p className='text-sm text-gray-500 mt-2 text-center'>Share your property details and start earning rental income</p>

                    {/* Property Name */}
                    <div className='w-full mt-6'>
                        <label htmlFor='name' className='font-medium text-gray-700 text-sm'>Property Name *</label>
                        <input id='name' onChange={(e)=> setName(e.target.value)} value={name} type="text" placeholder='e.g., Sunset View Apartments' className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500 font-light' required />
                    </div>

                    {/* Property Type */}
                    <div className='w-full mt-4'>
                        <label htmlFor='propertyType' className='font-medium text-gray-700 text-sm'>Property Type *</label>
                        <select id="propertyType" onChange={(e)=> setPropertyType(e.target.value)} value={propertyType} className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500 font-light' required>
                            <option value="">Select type</option>
                            <option value="Apartments">Apartment Complex</option>
                            <option value="Bedsitters">Bedsitter Units</option>
                            <option value="Single Rooms">Single Room Rentals</option>
                            <option value="Mixed">Mixed (Multiple types)</option>
                        </select>
                    </div>

                    {/* Total Units */}
                    <div className='w-full mt-4'>
                        <label htmlFor='totalUnits' className='font-medium text-gray-700 text-sm'>Total Number of Units *</label>
                        <input id='totalUnits' onChange={(e)=> setTotalUnits(e.target.value)} value={totalUnits} type="number" min="1" placeholder='e.g., 12' className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500 font-light' required />
                    </div>

                    {/* Contact Phone */}
                    <div className='w-full mt-4'>
                        <label htmlFor='contact' className='font-medium text-gray-700 text-sm'>Contact Phone *</label>
                        <input id='contact' onChange={(e)=> setContact(e.target.value)} value={contact} type="tel" placeholder='e.g., 0712345678' className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500 font-light' required />
                    </div>

                    {/* Street Address */}
                    <div className='w-full mt-4'>
                        <label htmlFor='address' className='font-medium text-gray-700 text-sm'>Street Address *</label>
                        <input id='address' onChange={(e)=> setAddress(e.target.value)} value={address} type="text" placeholder='e.g., Plot 45, Moi Avenue' className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500 font-light' required />
                    </div>

                    {/* Estate/Building Name */}
                    <div className='w-full mt-4'>
                        <label htmlFor='estate' className='font-medium text-gray-700 text-sm'>Estate/Building Name *</label>
                        <input id='estate' onChange={(e)=> setEstate(e.target.value)} value={estate} type="text" placeholder='e.g., Greenview Estate' className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500 font-light' required />
                    </div>

                    {/* Location */}
                    <div className='w-full mt-4'>
                        <label htmlFor="place" className='font-medium text-gray-700 text-sm'>Area/Location *</label>
                        <select id="place" onChange={(e)=> setPlace(e.target.value)} value={place} className='border border-gray-300 rounded w-full px-3 py-2.5 mt-1 outline-indigo-500 font-light' required>
                            <option value="">Select Location</option>
                            {Places.map((place)=>(
                                <option key={place} value={place}>{place}</option>
                            ))}
                        </select>
                    </div>

                    <button className='bg-indigo-500 hover:bg-indigo-600 transition-all text-white w-full py-3 rounded cursor-pointer mt-6 font-medium'>
                        List Property
                    </button>
                    <p className='text-xs text-gray-500 mt-3 text-center'>After listing, you can add individual rooms with pricing and photos</p>
                </div>
            </form>
        </div>
    )
}

export default HouseReg
