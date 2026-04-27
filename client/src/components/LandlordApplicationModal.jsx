import React, { useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { Check, ShieldCheck } from 'lucide-react'

const LandlordApplicationModal = ({ onClose }) => {
    const { getToken, axios, fetchUser } = useAppContext()
    const [phoneNumber, setPhoneNumber] = useState('')
    const [idDocument, setIdDocument] = useState(null)
    const [titleDeed, setTitleDeed] = useState(null)
    const [loading, setLoading] = useState(false)
    const [existingApplication, setExistingApplication] = useState(null)
    const [checkingStatus, setCheckingStatus] = useState(true)

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
                timeout: 6000,
            })

            if (data.success) {
                setExistingApplication(data.application)
                if (data.application?.phoneNumber) {
                    setPhoneNumber(data.application.phoneNumber)
                }
            }
        } catch (error) {
            // No previous application is valid for first-time users.
        } finally {
            setCheckingStatus(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!phoneNumber.trim()) {
            toast.error('Phone number is required')
            return
        }
        if (!idDocument) {
            toast.error('National ID or Passport upload is required')
            return
        }
        if (idDocument.size > 5 * 1024 * 1024) {
            toast.error('ID document must be less than 5MB')
            return
        }
        if (titleDeed && titleDeed.size > 5 * 1024 * 1024) {
            toast.error('Ownership proof must be less than 5MB')
            return
        }

        setLoading(true)
        try {
            const token = await getToken()
            if (!token) {
                toast.error('Please login to continue')
                return
            }

            const formData = new FormData()
            formData.append('phoneNumber', phoneNumber.trim())
            formData.append('idDocument', idDocument)
            if (titleDeed) {
                formData.append('titleDeed', titleDeed)
            }

            const { data } = await axios.post('/api/landlord-application/instant-signup', formData, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30000,
            })

            if (data.success) {
                toast.success(data.message || 'You are now a landlord')
                await fetchUser()
                onClose()
            } else {
                toast.error(data.message || 'Failed to complete instant signup')
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to complete instant signup')
        } finally {
            setLoading(false)
        }
    }

    if (checkingStatus) {
        return (
            <div className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50'>
                <div className='bg-white dark:bg-gray-800 rounded-xl p-8'>
                    <p className='text-gray-600 dark:text-gray-300'>Checking landlord status...</p>
                </div>
            </div>
        )
    }

    if (existingApplication?.status === 'approved') {
        return (
            <div onClick={onClose} className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 p-4'>
                <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-xl max-w-xl w-full shadow-2xl p-8'>
                    <div className='flex justify-between items-start mb-6'>
                        <h2 className='text-2xl font-bold dark:text-white'>Already a Landlord</h2>
                        <img src={assets.closeIcon} alt='close' className='h-5 w-5 cursor-pointer opacity-60 hover:opacity-100' onClick={onClose} />
                    </div>
                    <div className='bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4 rounded'>
                        <p className='text-sm text-green-700 dark:text-green-300'>
                            Your landlord access is active. Open the Owner Dashboard to add and manage properties.
                        </p>
                    </div>
                    <button onClick={onClose} className='mt-6 w-full bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-lg hover:bg-black dark:hover:bg-gray-600 transition-all'>
                        Close
                    </button>
                </div>
            </div>
        )
    }

    if (existingApplication?.status === 'pending') {
        return (
            <div onClick={onClose} className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 p-4'>
                <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-xl max-w-xl w-full shadow-2xl p-8'>
                    <div className='flex justify-between items-start mb-6'>
                        <h2 className='text-2xl font-bold dark:text-white'>Application Pending</h2>
                        <img src={assets.closeIcon} alt='close' className='h-5 w-5 cursor-pointer opacity-60 hover:opacity-100' onClick={onClose} />
                    </div>
                    <div className='bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded'>
                        <p className='text-sm text-yellow-700 dark:text-yellow-300'>
                            Your landlord application is still being reviewed. Please wait for approval or contact support.
                        </p>
                    </div>
                    <button onClick={onClose} className='mt-6 w-full bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-lg hover:bg-black dark:hover:bg-gray-600 transition-all'>
                        Close
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div onClick={onClose} className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto p-4'>
            <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-xl max-w-xl w-full my-auto shadow-2xl'>
                <div className='border-b border-gray-200 dark:border-gray-700 p-6'>
                    <div className='flex justify-between items-start'>
                        <div>
                            <h1 className='text-2xl font-bold mb-2 dark:text-white'>Become a Landlord Fast</h1>
                            <p className='text-gray-600 dark:text-gray-400 text-sm'>
                                Submit minimal details now and start listing properties right away.
                            </p>
                        </div>
                        <img src={assets.closeIcon} alt='close' className='h-5 w-5 cursor-pointer opacity-60 hover:opacity-100' onClick={onClose} />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className='p-6'>
                    <div className='space-y-4'>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Phone Number</label>
                            <input
                                type='tel'
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white'
                                placeholder='0712345678'
                                required
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>National ID / Passport (Required)</label>
                            <input
                                type='file'
                                accept='image/*,.pdf'
                                onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
                                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-300'
                                required
                            />
                            {idDocument && (
                                <p className='text-sm text-green-600 mt-1 flex items-center gap-1'>
                                    <Check className='w-4 h-4' /> {idDocument.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Title Deed / Ownership Proof (Optional)</label>
                            <input
                                type='file'
                                accept='image/*,.pdf'
                                onChange={(e) => setTitleDeed(e.target.files?.[0] || null)}
                                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-300'
                            />
                            {titleDeed && (
                                <p className='text-sm text-green-600 mt-1 flex items-center gap-1'>
                                    <Check className='w-4 h-4' /> {titleDeed.name}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className='mt-5 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 rounded'>
                        <p className='text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2'>
                            <ShieldCheck className='w-4 h-4 mt-0.5 shrink-0' />
                            Instant signup auto-approves landlord access after ID upload. Admin can still review and revoke if details are invalid.
                        </p>
                    </div>

                    {existingApplication?.status === 'rejected' && (
                        <div className='mt-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded'>
                            <p className='text-sm text-red-700 dark:text-red-300'>
                                Previous application was rejected. You can submit a fresh instant signup now with updated documents.
                            </p>
                        </div>
                    )}

                    <button
                        type='submit'
                        disabled={loading}
                        className='mt-6 w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                        {loading ? 'Submitting...' : 'Become a Landlord Now'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default LandlordApplicationModal
