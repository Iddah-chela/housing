import React from 'react'
import { assets } from '../../assets/assets'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
    const SidebarLinks = [
        {name: "Dashboard", path: "/owner", icon: assets.dashboardIcon},
        {name: "Bookings", path: "/owner/bookings", icon: assets.totalBookingIcon},
        {name: "Viewing Requests", path: "/owner/viewing-requests", icon: assets.calenderIcon},
        {name: "My Listings", path: "/owner/list-room", icon: assets.listIcon},
        {name: "Utilities", path: "/owner/utilities", icon: assets.listIcon},
        {name: "Messages", path: "/my-chats", icon: assets.addIcon},
    ]
    const linkClass = ({ isActive }) =>
        `flex items-center py-3 px-4 md:px-8 gap-3 transition-colors ${isActive
            ? 'border-r-[6px] bg-indigo-600/10 border-indigo-600 text-indigo-600'
            : 'hover:bg-gray-100/90 dark:hover:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300'
        }`

    return (
        <>
            {/* Desktop sidebar — hidden on mobile */}
            <div className='hidden md:flex md:w-64 border-r min-h-full text-base border-gray-300 dark:border-gray-700 pt-4 flex-col dark:bg-gray-900 flex-shrink-0'>
                {SidebarLinks.map((item, index) => (
                    <NavLink to={item.path} key={index} end={item.path === '/owner'} className={linkClass}>
                        <img src={item.icon} alt="" className='h-5 w-5 min-w-[20px] opacity-70 dark:invert' />
                        <p className='text-sm'>{item.name}</p>
                    </NavLink>
                ))}
            </div>

            {/* Mobile bottom tab bar */}
            <div className='md:hidden fixed bottom-0 left-0 right-0 z-30 flex border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]'>
                {SidebarLinks.map((item, index) => (
                    <NavLink
                        to={item.path}
                        key={index}
                        end={item.path === '/owner'}
                        className={({ isActive }) =>
                            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors min-w-0 ${
                                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <img
                                    src={item.icon}
                                    alt=""
                                    className='h-5 w-5'
                                    style={{
                                        filter: isActive
                                            ? 'invert(34%) sepia(96%) saturate(1200%) hue-rotate(220deg) brightness(0.9)'
                                            : 'invert(55%) sepia(0%) saturate(0%) brightness(0.7)'
                                    }}
                                />
                                <span className='truncate w-full text-center px-0.5'>{item.name}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </>
    )
}

export default Sidebar
