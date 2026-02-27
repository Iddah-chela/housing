import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { Check, FileText } from 'lucide-react'

const LandlordApplicationModal = ({ onClose }) => {
    const { getToken, user, axios } = useAppContext()
    
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        phoneNumber: '',
        idNumber: '',
        idDocument: '',
        ownershipProof: '',
        numberOfProperties: 1,
        totalRooms: 1,
        propertiesLocation: '',
        notes: ''
    })
    
    const [loading, setLoading] = useState(false)
    const [existingApplication, setExistingApplication] = useState(null)
    const [checkingStatus, setCheckingStatus] = useState(true)
    
    // Check if user already has an application
    useEffect(() => {
        checkApplicationStatus()
    }, [])
    
    const checkApplicationStatus = async () => {
        try {
            const token = await getToken()
            if (!token) {
                setCheckingStatus(false)
                return
            }
            
            const { data } = await axios.get('/api/landlord-application/my-application', {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 6000
            })
            
            if (data.success) {
                setExistingApplication(data.application)
            }
        } catch (error) {
            // No application found or timeout - that's okay
        } finally {
            setCheckingStatus(false)
        }
    }
    
    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0]
        
        if (!file) return
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB')
            return
        }
        
        // Convert to base64
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
            setFormData(prev => ({ ...prev, [field]: reader.result }))
            toast.success('File uploaded successfully')
        }
        reader.onerror = () => {
            toast.error('Error uploading file')
        }
    }
    
    const handleSubmit = async (e) => {
        e.preventDefault()
        
        // Validation
        if (!formData.fullName || !formData.phoneNumber || !formData.idNumber || !formData.idDocument) {
            toast.error('Please fill in all required fields')
            return
        }
        
        if (!formData.propertiesLocation || formData.numberOfProperties < 1 || formData.totalRooms < 1) {
            toast.error('Please provide valid property details')
            return
        }
        
        setLoading(true)
        
        try {
            const token = await getToken()
            if (!token) {
                toast.error('Please login to continue')
                return
            }
            
            const { data } = await axios.post(
                '/api/landlord-application/submit',
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            
            if (data.success) {
                toast.success(data.message)
                setExistingApplication(data.application)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit application')
        } finally {
            setLoading(false)
        }
    }
    
    if (checkingStatus) {
        return (
            <div className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50'>
                <div className='bg-white rounded-xl p-8'>
                    <p className='text-gray-600'>Checking application status...</p>
                </div>
            </div>
        )
    }
    
    // Show status if application exists
    if (existingApplication) {
        return (
            <div 
                onClick={onClose} 
                className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto p-4'
            >
                <div 
                    onClick={(e) => e.stopPropagation()} 
                    className='bg-white rounded-xl max-w-2xl w-full my-auto shadow-2xl p-8'
                >
                    <div className='flex justify-between items-start mb-6'>
                        <div>
                            <h2 className='text-3xl font-bold mb-2'>Application Status</h2>
                        </div>
                        <img 
                            src={assets.closeIcon} 
                            alt="close" 
                            className='h-5 w-5 cursor-pointer opacity-60 hover:opacity-100' 
                            onClick={onClose} 
                        />
                    </div>
                    
                    <div className='mb-6'>
                        {existingApplication.status === 'pending' && (
                            <div className='bg-yellow-50 border-l-4 border-yellow-400 p-4'>
                                <div className='flex items-center'>
                                    <div className='flex-shrink-0'>
                                        <svg className='h-5 w-5 text-yellow-400' viewBox='0 0 20 20' fill='currentColor'>
                                            <path fillRule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
                                        </svg>
                                    </div>
                                    <div className='ml-3'>
                                        <p className='text-sm text-yellow-700'>
                                            <strong>Pending Review</strong> - Your application is being reviewed by our admin team. You'll receive a response within 24 hours.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {existingApplication.status === 'approved' && (
                            <div className='bg-green-50 border-l-4 border-green-400 p-4'>
                                <div className='flex items-center'>
                                    <div className='flex-shrink-0'>
                                        <svg className='h-5 w-5 text-green-400' viewBox='0 0 20 20' fill='currentColor'>
                                            <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
                                        </svg>
                                    </div>
                                    <div className='ml-3'>
                                        <p className='text-sm text-green-700'>
                                            <strong>Approved!</strong> Congratulations! You are now a verified landlord. You can start listing properties right away.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {existingApplication.status === 'rejected' && (
                            <div className='bg-red-50 border-l-4 border-red-400 p-4 mb-4'>
                                <div className='flex items-center'>
                                    <div className='flex-shrink-0'>
                                        <svg className='h-5 w-5 text-red-400' viewBox='0 0 20 20' fill='currentColor'>
                                            <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z' clipRule='evenodd' />
                                        </svg>
                                    </div>
                                    <div className='ml-3'>
                                        <p className='text-sm text-red-700'>
                                            <strong>Application Rejected</strong>
                                        </p>
                                        <p className='text-sm text-red-600 mt-1'>
                                            Reason: {existingApplication.rejectionReason}
                                        </p>
                                        <p className='text-sm text-red-600 mt-2'>
                                            Please contact support if you have questions or would like to reapply.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className='bg-gray-50 rounded-lg p-4'>
                        <h3 className='font-semibold mb-3'>Application Details</h3>
                        <div className='grid grid-cols-2 gap-3 text-sm'>
                            <div>
                                <p className='text-gray-500'>Full Name</p>
                                <p className='font-medium'>{existingApplication.fullName}</p>
                            </div>
                            <div>
                                <p className='text-gray-500'>Phone Number</p>
                                <p className='font-medium'>{existingApplication.phoneNumber}</p>
                            </div>
                            <div>
                                <p className='text-gray-500'>Properties</p>
                                <p className='font-medium'>{existingApplication.numberOfProperties}</p>
                            </div>
                            <div>
                                <p className='text-gray-500'>Total Rooms</p>
                                <p className='font-medium'>{existingApplication.totalRooms}</p>
                            </div>
                            <div className='col-span-2'>
                                <p className='text-gray-500'>Location</p>
                                <p className='font-medium'>{existingApplication.propertiesLocation}</p>
                            </div>
                            <div className='col-span-2'>
                                <p className='text-gray-500'>Submitted</p>
                                <p className='font-medium'>{new Date(existingApplication.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className='mt-6 w-full bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-700 transition-all'
                    >
                        Close
                    </button>
                </div>
            </div>
        )
    }
    
    // Show application form
    return (
        <div 
            onClick={onClose} 
            className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto p-4'
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                className='bg-white rounded-xl max-w-3xl w-full my-auto shadow-2xl max-h-[95vh] overflow-y-auto'
            >
                {/* Header */}
                <div className='sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl z-10'>
                    <div className='flex justify-between items-start'>
                        <div>
                            <h1 className='text-3xl font-bold mb-2'>Become a Landlord</h1>
                            <p className='text-gray-600'>Fill in the details below to apply as a verified property owner</p>
                        </div>
                        <img 
                            src={assets.closeIcon} 
                            alt="close" 
                            className='h-5 w-5 cursor-pointer opacity-60 hover:opacity-100' 
                            onClick={onClose} 
                        />
                    </div>
                </div>
                
                {/* Form */}
                <form onSubmit={handleSubmit} className='p-6'>
                    {/* Personal Information */}
                    <div className='mb-8'>
                        <h3 className='text-lg font-semibold mb-4 text-gray-800'>Personal Information</h3>
                        
                        <div className='grid md:grid-cols-2 gap-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Full Name <span className='text-red-500'>*</span>
                                </label>
                                <input 
                                    type='text'
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                    placeholder='John Doe'
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Phone Number <span className='text-red-500'>*</span>
                                </label>
                                <input 
                                    type='tel'
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                    placeholder='0712345678'
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    ID/Passport Number <span className='text-red-500'>*</span>
                                </label>
                                <input 
                                    type='text'
                                    value={formData.idNumber}
                                    onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                    placeholder='12345678'
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Documents */}
                    <div className='mb-8'>
                        <h3 className='text-lg font-semibold mb-4 text-gray-800'>Documents</h3>
                        
                        <div className='grid md:grid-cols-2 gap-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    ID/Passport Copy <span className='text-red-500'>*</span>
                                </label>
                                <input 
                                    type='file'
                                    accept='image/*,.pdf'
                                    onChange={(e) => handleFileUpload(e, 'idDocument')}
                                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                    required={!formData.idDocument}
                                />
                                {formData.idDocument && (
                                    <p className='text-sm text-green-600 mt-1 flex items-center gap-1'><Check className='w-4 h-4' /> Uploaded</p>
                                )}
                            </div>
                            
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Ownership Proof (Optional)
                                </label>
                                <input 
                                    type='file'
                                    accept='image/*,.pdf'
                                    onChange={(e) => handleFileUpload(e, 'ownershipProof')}
                                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                />
                                {formData.ownershipProof && (
                                    <p className='text-sm text-green-600 mt-1 flex items-center gap-1'><Check className='w-4 h-4' /> Uploaded</p>
                                )}
                                <p className='text-xs text-gray-500 mt-1'>Land title, lease agreement, etc.</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Property Details */}
                    <div className='mb-8'>
                        <h3 className='text-lg font-semibold mb-4 text-gray-800'>Property Details</h3>
                        
                        <div className='grid md:grid-cols-3 gap-4 mb-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Number of Properties <span className='text-red-500'>*</span>
                                </label>
                                <input 
                                    type='number'
                                    min='1'
                                    value={formData.numberOfProperties}
                                    onChange={(e) => setFormData({...formData, numberOfProperties: parseInt(e.target.value)})}
                                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>
                                    Total Rooms <span className='text-red-500'>*</span>
                                </label>
                                <input 
                                    type='number'
                                    min='1'
                                    value={formData.totalRooms}
                                    onChange={(e) => setFormData({...formData, totalRooms: parseInt(e.target.value)})}
                                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                Properties Location <span className='text-red-500'>*</span>
                            </label>
                            <input 
                                type='text'
                                value={formData.propertiesLocation}
                                onChange={(e) => setFormData({...formData, propertiesLocation: e.target.value})}
                                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                placeholder='e.g. Eldoret Town, Pioneer Estate'
                                required
                            />
                        </div>
                    </div>
                    
                    {/* Additional Notes */}
                    <div className='mb-8'>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>
                            Additional Notes (Optional)
                        </label>
                        <textarea 
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                            rows='3'
                            placeholder='Any additional information...'
                        />
                    </div>
                    
                    {/* Info Box */}
                    <div className='bg-blue-50 border-l-4 border-blue-400 p-4 mb-6'>
                        <div className='flex'>
                            <div className='flex-shrink-0'>
                                <svg className='h-5 w-5 text-blue-400' viewBox='0 0 20 20' fill='currentColor'>
                                    <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
                                </svg>
                            </div>
                            <div className='ml-3'>
                                <p className='text-sm text-blue-700'>
                                    Your application will be reviewed by our admin team within 24 hours. Once approved, you'll be able to list your properties immediately.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Submit Button */}
                    <button 
                        type='submit'
                        disabled={loading}
                        className='w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                        {loading ? 'Submitting Application...' : <span className='flex items-center justify-center gap-2'><FileText className='w-5 h-5' /> Submit Application</span>}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default LandlordApplicationModal
