import React, { useState, useRef } from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'

const ProfileModal = ({ onClose }) => {
    const { user, navigate, isOwner, logout, getToken, axios } = useAppContext()
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    const handleLogout = () => {
        logout()
        onClose()
    }

    const handleNavigation = (path) => {
        navigate(path)
        onClose()
    }

    const handleImageClick = () => {
        fileInputRef.current?.click()
    }

    const handleImageChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB')
            return
        }

        setUploading(true)
        try {
            const token = await getToken()
            const formData = new FormData()
            formData.append('profilePicture', file)

            const { data } = await axios.post('/api/profile/upload-picture', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            })

            if (data.success) {
                toast.success('Profile picture updated!')
                // Reload to refresh user data
                window.location.reload()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Failed to upload image')
        } finally {
            setUploading(false)
        }
    }

    if (!user) return null

    return (
        <div 
            onClick={onClose} 
            className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto p-4'
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                className='bg-white rounded-xl max-w-md w-full my-auto shadow-2xl max-h-[95vh] overflow-y-auto'
            >
                {/* Header */}
                <div className='relative bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-xl'>
                    <img 
                        src={assets.closeIcon} 
                        alt="close" 
                        className='absolute top-4 right-4 h-4 w-4 cursor-pointer invert' 
                        onClick={onClose} 
                    />
                    <div className='flex flex-col items-center'>
                        <div className='relative group'>
                            <img 
                                src={user.imageUrl} 
                                alt={user.fullName}
                                className='w-24 h-24 rounded-full border-4 border-white shadow-lg'
                            />
                            <button 
                                onClick={handleImageClick}
                                disabled={uploading}
                                className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
                            >
                                {uploading ? (
                                    <div className='w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                                ) : (
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*"
                                onChange={handleImageChange}
                                className='hidden'
                            />
                        </div>
                        <p className='text-white/60 text-xs mt-2'>Click photo to change</p>
                        <h2 className='text-white text-2xl font-semibold mt-2'>{user.fullName}</h2>
                        <p className='text-white/80 text-sm mt-1'>{user.emailAddresses[0].emailAddress}</p>
                        {isOwner && (
                            <span className='mt-3 px-4 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full'>
                                House Owner
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className='p-6'>
                    <div className='flex flex-col gap-2'>
                        {/* Navigation Items */}
                        <button 
                            onClick={() => handleNavigation('/my-viewings')}
                            className='flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-all text-left'
                        >
                            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className='text-gray-800 font-medium'>My Viewings</span>
                        </button>

                        <button 
                            onClick={() => handleNavigation('/my-bookings')}
                            className='flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-all text-left'
                        >
                            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19V4a1 1 0 011-1h12a1 1 0 011 1v13H7a2 2 0 00-2 2zm0 0a2 2 0 002 2h12M9 3v14m7 0v4" />
                            </svg>
                            <span className='text-gray-800 font-medium'>My Bookings</span>
                        </button>

                        <button 
                            onClick={() => handleNavigation('/my-chats')}
                            className='flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-all text-left'
                        >
                            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className='text-gray-800 font-medium'>My Messages</span>
                        </button>

                        {isOwner && (
                            <button 
                                onClick={() => handleNavigation('/owner')}
                                className='flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-all text-left'
                            >
                                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span className='text-gray-800 font-medium'>Owner Dashboard</span>
                            </button>
                        )}

                        <hr className='my-2' />

                        {/* Logout Button */}
                        <button 
                            onClick={handleLogout}
                            className='flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-all text-left text-red-600'
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className='font-medium'>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProfileModal
