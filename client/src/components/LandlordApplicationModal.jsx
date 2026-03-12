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
    
    useEffect(() => { checkApplicationStatus() }, [])
    
    const checkApplicationStatus = async () => {
        try {
            const token = await getToken()
            if (!token) { setCheckingStatus(false); return }
            const { data } = await axios.get('/api/landlord-application/my-application', {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 6000
            })
            if (data.success) setExistingApplication(data.application)
        } catch (error) {
            // No application found  that's fine
        } finally {
            setCheckingStatus(false)
        }
    }
    
    const handleFileUpload = (e, field) => {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { toast.error('File size must be less than 5MB'); return }
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => { setFormData(prev => ({ ...prev, [field]: reader.result })); toast.success('File uploaded successfully') }
        reader.onerror = () => toast.error('Error uploading file')
    }
    
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.fullName || !formData.phoneNumber || !formData.idNumber || !formData.idDocument) {
            toast.error('Please fill in all required fields'); return
        }
        if (!formData.propertiesLocation || formData.numberOfProperties < 1 || formData.totalRooms < 1) {
            toast.error('Please provide valid property details'); return
        }
        setLoading(true)
        try {
            const token = await getToken()
            if (!token) { toast.error('Please login to continue'); return }
            const { data } = await axios.post('/api/landlord-application/submit', formData, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (data.success) { toast.success(data.message); setExistingApplication(data.application) }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit application')
        } finally {
            setLoading(false)
        }
    }
    
    if (checkingStatus) {
        return (
            <div className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50'>
                <div className='bg-white dark:bg-gray-800 rounded-xl p-8'>
                    <p className='text-gray-600 dark:text-gray-300'>Checking application status...</p>
                </div>
            </div>
        )
    }
    
    if (existingApplication) {
        return (
            <div onClick={onClose} className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto p-4'>
                <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full my-auto shadow-2xl p-8'>
                    <div className='flex justify-between items-start mb-6'>
                        <h2 className='text-3xl font-bold dark:text-white'>Application Status</h2>
                        <img src={assets.closeIcon} alt="close" className='h-5 w-5 cursor-pointer opacity-60 hover:opacity-100' onClick={onClose} />
                    </div>
                    <div className='mb-6'>
                        {existingApplication.status === 'pending' && (
                            <div className='bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4'>
                                <p className='text-sm text-yellow-700 dark:text-yellow-300'><strong>Pending Review</strong>  Your application is being reviewed by our admin team. You will receive a response within 24 hours.</p>
                            </div>
                        )}
                        {existingApplication.status === 'approved' && (
                            <div className='bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4'>
                                <p className='text-sm text-green-700 dark:text-green-300'><strong>Approved!</strong> Congratulations! You are now a verified house owner. You can start listing properties right away.</p>
                            </div>
                        )}
                        {existingApplication.status === 'rejected' && (
                            <div className='bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4'>
                                <p className='text-sm text-red-700 dark:text-red-300'><strong>Application Rejected</strong></p>
                                <p className='text-sm text-red-600 dark:text-red-400 mt-1'>Reason: {existingApplication.rejectionReason}</p>
                                <p className='text-sm text-red-600 dark:text-red-400 mt-2'>Please contact support if you have questions or would like to reapply.</p>
                            </div>
                        )}
                    </div>
                    <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                        <h3 className='font-semibold mb-3 dark:text-white'>Application Details</h3>
                        <div className='grid grid-cols-2 gap-3 text-sm'>
                            <div><p className='text-gray-500 dark:text-gray-400'>Full Name</p><p className='font-medium dark:text-white'>{existingApplication.fullName}</p></div>
                            <div><p className='text-gray-500 dark:text-gray-400'>Phone Number</p><p className='font-medium dark:text-white'>{existingApplication.phoneNumber}</p></div>
                            <div><p className='text-gray-500 dark:text-gray-400'>Properties</p><p className='font-medium dark:text-white'>{existingApplication.numberOfProperties}</p></div>
                            <div><p className='text-gray-500 dark:text-gray-400'>Total Rooms</p><p className='font-medium dark:text-white'>{existingApplication.totalRooms}</p></div>
                            <div className='col-span-2'><p className='text-gray-500 dark:text-gray-400'>Location</p><p className='font-medium dark:text-white'>{existingApplication.propertiesLocation}</p></div>
                            <div className='col-span-2'><p className='text-gray-500 dark:text-gray-400'>Submitted</p><p className='font-medium dark:text-white'>{new Date(existingApplication.createdAt).toLocaleDateString()}</p></div>
                        </div>
                    </div>
                    <button onClick={onClose} className='mt-6 w-full bg-gray-800 dark:bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-all'>Close</button>
                </div>
            </div>
        )
    }
    
    return (
        <div onClick={onClose} className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto p-4'>
            <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full my-auto shadow-2xl max-h-[95vh] overflow-y-auto'>
                <div className='sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-xl z-10'>
                    <div className='flex justify-between items-start'>
                        <div>
                            <h1 className='text-3xl font-bold mb-2 dark:text-white'>Become a House Owner</h1>
                            <p className='text-gray-600 dark:text-gray-400'>Fill in the details below to apply as a verified property owner</p>
                        </div>
                        <img src={assets.closeIcon} alt="close" className='h-5 w-5 cursor-pointer opacity-60 hover:opacity-100' onClick={onClose} />
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className='p-6'>
                    <div className='mb-8'>
                        <h3 className='text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200'>Personal Information</h3>
                        <div className='grid md:grid-cols-2 gap-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Full Name <span className='text-red-500'>*</span></label>
                                <input type='text' value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                    className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white'
                                    placeholder='John Doe' required />
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Phone Number <span className='text-red-500'>*</span></label>
                                <input type='tel' value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                    className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white'
                                    placeholder='0712345678' required />
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>ID/Passport Number <span className='text-red-500'>*</span></label>
                                <input type='text' value={formData.idNumber} onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                                    className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white'
                                    placeholder='12345678' required />
                            </div>
                        </div>
                    </div>
                    
                    <div className='mb-8'>
                        <h3 className='text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200'>Documents</h3>
                        <div className='grid md:grid-cols-2 gap-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>ID/Passport Copy <span className='text-red-500'>*</span></label>
                                <input type='file' accept='image/*,.pdf' onChange={(e) => handleFileUpload(e, 'idDocument')}
                                    className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-300' required={!formData.idDocument} />
                                {formData.idDocument && <p className='text-sm text-green-600 mt-1 flex items-center gap-1'><Check className='w-4 h-4' /> Uploaded</p>}
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Ownership Proof <span className='text-xs text-gray-400'>(Optional)</span></label>
                                <input type='file' accept='image/*,.pdf' onChange={(e) => handleFileUpload(e, 'ownershipProof')}
                                    className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-300' />
                                {formData.ownershipProof && <p className='text-sm text-green-600 mt-1 flex items-center gap-1'><Check className='w-4 h-4' /> Uploaded</p>}
                                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Land title, lease agreement, etc.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className='mb-8'>
                        <h3 className='text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200'>Property Details</h3>
                        <div className='grid md:grid-cols-3 gap-4 mb-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Number of Properties <span className='text-red-500'>*</span></label>
                                <input type='number' min='1' value={formData.numberOfProperties} onChange={(e) => setFormData({...formData, numberOfProperties: parseInt(e.target.value)})}
                                    className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white' required />
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Total Rooms <span className='text-red-500'>*</span></label>
                                <input type='number' min='1' value={formData.totalRooms} onChange={(e) => setFormData({...formData, totalRooms: parseInt(e.target.value)})}
                                    className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white' required />
                            </div>
                        </div>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Properties Location <span className='text-red-500'>*</span></label>
                            <input type='text' value={formData.propertiesLocation} onChange={(e) => setFormData({...formData, propertiesLocation: e.target.value})}
                                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white'
                                placeholder='e.g. Eldoret Town, Pioneer Estate' required />
                        </div>
                    </div>
                    
                    <div className='mb-8'>
                        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Additional Notes <span className='text-xs text-gray-400'>(Optional)</span></label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white'
                            rows='3' placeholder='Any additional information...' />
                    </div>
                    
                    <div className='bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mb-6'>
                        <p className='text-sm text-blue-700 dark:text-blue-300'>
                            Your application will be reviewed by our admin team within 24 hours. Once approved, you will be able to list your properties immediately.
                        </p>
                    </div>
                    
                    <button type='submit' disabled={loading}
                        className='w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed'>
                        {loading ? 'Submitting Application...' : <span className='flex items-center justify-center gap-2'><FileText className='w-5 h-5' /> Submit Application</span>}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default LandlordApplicationModal
