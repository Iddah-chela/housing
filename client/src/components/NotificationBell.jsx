import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'

const typeIcon = {
    message: <svg className='w-5 h-5 text-blue-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}><path strokeLinecap='round' strokeLinejoin='round' d='M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' /></svg>,
    viewing:  <svg className='w-5 h-5 text-green-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}><path strokeLinecap='round' strokeLinejoin='round' d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' /></svg>,
    booking:  <svg className='w-5 h-5 text-indigo-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}><path strokeLinecap='round' strokeLinejoin='round' d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' /></svg>,
    payment:  <svg className='w-5 h-5 text-emerald-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}><path strokeLinecap='round' strokeLinejoin='round' d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' /></svg>,
    system:   <svg className='w-5 h-5 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}><path strokeLinecap='round' strokeLinejoin='round' d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' /></svg>,
}

const NotificationBell = ({ isScrolled }) => {
    const { axios, getToken, user, navigate, darkMode } = useAppContext()
    const [open, setOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unread, setUnread] = useState(0)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef(null)
    const pollRef = useRef(null)

    const fetchNotifications = useCallback(async () => {
        if (!user) return
        try {
            const token = await getToken()
            if (!token) return
            const { data } = await axios.get('/api/notifications/my', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (data.success) {
                setNotifications(data.notifications)
                setUnread(data.unreadCount)
            }
        } catch (_) {}
    }, [user])

    // Poll every 30 seconds when logged in
    useEffect(() => {
        if (!user) return
        fetchNotifications()
        pollRef.current = setInterval(fetchNotifications, 30000)
        return () => clearInterval(pollRef.current)
    }, [user, fetchNotifications])

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const handleOpen = async () => {
        setOpen(prev => !prev)
        if (!open && unread > 0) {
            // Mark all as read when opening
            try {
                const token = await getToken()
                await axios.post('/api/notifications/mark-read', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setUnread(0)
                setNotifications(prev => prev.map(n => ({ ...n, read: true })))
            } catch (_) {}
        }
    }

    const handleClick = (notif) => {
        setOpen(false)
        if (notif.url && notif.url !== '/') navigate(notif.url)
    }

    const timeAgo = (date) => {
        const s = Math.floor((Date.now() - new Date(date)) / 1000)
        if (s < 60) return 'just now'
        if (s < 3600) return `${Math.floor(s / 60)}m ago`
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`
        return `${Math.floor(s / 86400)}d ago`
    }

    if (!user) return null

    return (
        <div className='relative' ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={handleOpen}
                className={`relative p-1.5 rounded-full transition-all hover:scale-110 ${
                    isScrolled
                        ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : !darkMode
                            ? 'text-gray-800 hover:bg-gray-100/60'
                            : 'text-white hover:bg-white/10'
                }`}
                title='Notifications'
            >
                <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
                </svg>
                {unread > 0 && (
                    <span className='absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5'>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className='absolute right-0 mt-2 w-80 max-w-[92vw] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[200] overflow-hidden animate-slide-up'>
                    {/* Header */}
                    <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700'>
                        <span className='text-sm font-semibold text-gray-800 dark:text-gray-100'>Notifications</span>
                        {notifications.length > 0 && (
                            <button
                                onClick={async () => {
                                    try {
                                        const token = await getToken()
                                        await axios.post('/api/notifications/mark-read', {}, {
                                            headers: { Authorization: `Bearer ${token}` }
                                        })
                                        setUnread(0)
                                        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                                    } catch (_) {}
                                }}
                                className='text-xs text-indigo-600 dark:text-indigo-400 hover:underline'
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className='max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700'>
                        {notifications.length === 0 ? (
                            <div className='flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500'>
                                <svg className='w-10 h-10 mb-2 opacity-40' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' />
                                </svg>
                                <p className='text-sm'>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <button
                                    key={notif._id}
                                    onClick={() => handleClick(notif)}
                                    className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                                        !notif.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                                    }`}
                                >
                                    <span className='flex-shrink-0 mt-0.5'>{typeIcon[notif.type] || typeIcon.system}</span>
                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-start justify-between gap-2'>
                                            <p className={`text-sm leading-tight ${!notif.read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {notif.title}
                                            </p>
                                            {!notif.read && <span className='flex-shrink-0 w-2 h-2 mt-1 bg-indigo-500 rounded-full' />}
                                        </div>
                                        {notif.body && (
                                            <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2'>{notif.body}</p>
                                        )}
                                        <p className='text-[10px] text-gray-400 dark:text-gray-500 mt-1'>{timeAgo(notif.createdAt)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default NotificationBell
