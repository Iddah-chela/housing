import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { getAvatarFallback, onAvatarError } from '../utils/avatarFallback'

// Preset cartoon avatars — DiceBear adventurer style
const AVATAR_SEEDS = [
    'Felix', 'Lily', 'Max', 'Luna', 'Oscar', 'Bella', 'Leo', 'Chloe', 'Milo', 'Zoe',
    'Jack', 'Sophie', 'Charlie', 'Nala', 'Rocky', 'Daisy', 'Buddy', 'Ruby', 'Bear', 'Rosie',
]

const makeAvatarUrl = (seed) =>
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`

const ProfileModal = ({ onClose }) => {
    const { user, navigate, isOwner, isAdmin, logout, getToken, axios, dbImage, setDbImage } = useAppContext()
    const [showPicker, setShowPicker] = useState(false)
    const [saving, setSaving] = useState(false)

    const handleLogout = () => {
        logout()
        onClose()
    }

    const handleNavigation = (path) => {
        navigate(path)
        onClose()
    }

    const handleSelectAvatar = async (seed) => {
        const url = makeAvatarUrl(seed)
        setSaving(true)
        try {
            const token = await getToken()
            const { data } = await axios.post(
                '/api/profile/set-avatar',
                { avatarUrl: url },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            if (data.success) {
                setDbImage(url)
                toast.success('Avatar updated!')
                setShowPicker(false)
            } else {
                toast.error(data.message || 'Failed to update avatar')
            }
        } catch (err) {
            console.error(err)
            toast.error('Failed to update avatar')
        } finally {
            setSaving(false)
        }
    }

    if (!user) return null

    const currentAvatar = dbImage || user.imageUrl

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
                                src={currentAvatar}
                                alt={user.fullName}
                                className='w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover bg-indigo-100'
                                onError={(e) => onAvatarError(e, user.fullName)}
                            />
                            <button
                                onClick={() => setShowPicker(v => !v)}
                                className='absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
                                title='Change avatar'
                            >
                                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={() => setShowPicker(v => !v)}
                            className='mt-2 text-white/80 text-xs hover:text-white transition-colors underline underline-offset-2'
                        >
                            {showPicker ? 'Close picker' : 'Change avatar'}
                        </button>
                        <h2 className='text-white text-2xl font-semibold mt-2'>{user.fullName}</h2>
                        <p className='text-white/80 text-sm mt-1'>{user.emailAddresses[0].emailAddress}</p>
                        {isOwner && (
                            <span className='mt-3 px-4 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full'>
                                House Owner
                            </span>
                        )}
                    </div>
                </div>

                {/* Avatar Picker */}
                {showPicker && (
                    <div className='p-4 border-b border-gray-100 bg-gray-50'>
                        <p className='text-sm font-semibold text-gray-700 mb-3 text-center'>
                            Choose your cartoon avatar
                        </p>
                        {saving && (
                            <p className='text-xs text-center text-indigo-500 mb-2 animate-pulse'>Saving…</p>
                        )}
                        <div className='grid grid-cols-5 gap-2'>
                            {AVATAR_SEEDS.map((seed, idx) => {
                                const url = makeAvatarUrl(seed)
                                const isSelected = currentAvatar === url
                                return (
                                    <button
                                        key={seed}
                                        onClick={() => handleSelectAvatar(seed)}
                                        disabled={saving}
                                        title={seed}
                                        className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-105 focus:outline-none ${
                                            isSelected
                                                ? 'border-indigo-500 ring-2 ring-indigo-300'
                                                : 'border-transparent hover:border-indigo-300'
                                        }`}
                                    >
                                        <img
                                            src={url}
                                            alt={seed}
                                            className='w-full h-auto bg-indigo-50'
                                            loading='lazy'
                                            onError={(e) => onAvatarError(e, seed)}
                                        />
                                        {isSelected && (
                                            <div className='absolute inset-0 flex items-center justify-center bg-indigo-500/20'>
                                                <svg className='w-5 h-5 text-indigo-700 drop-shadow' fill='currentColor' viewBox='0 0 20 20'>
                                                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className='p-6'>
                    <div className='flex flex-col gap-2'>
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

                        {isAdmin && (
                            <button 
                                onClick={() => handleNavigation('/admin')}
                                className='flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-lg transition-all text-left'
                            >
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <span className='text-indigo-700 font-medium'>Admin Panel</span>
                            </button>
                        )}

                        <hr className='my-2' />

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

