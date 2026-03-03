import React from 'react'
import { assets } from '../../assets/assets'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
    const SidebarLinks = [
        {name: "Dashboard", path: "/owner", icon: assets.dashboardIcon},
        {name: "Bookings", path: "/owner/bookings", icon: assets.calenderIcon},
        {name: "Viewing Requests", path: "/owner/viewing-requests", icon: assets.calenderIcon},
        {name: "My Listings", path: "/owner/list-room", icon: assets.listIcon},
        {name: "Messages", path: "/my-chats", icon: assets.addIcon},
    ]
  return (
    <div className='md:w-64 w-16 border-r h-full text-base border-gray-300 dark:border-gray-700 pt-4 flex flex-col transition-all duration-300 dark:bg-gray-900'>
            {SidebarLinks.map((item, index)=>(
                <NavLink to={item.path} key={index} end='/owner' className={({isActive})=>`flex items-center py-3 px-4 md:px-8 gap-3 ${isActive ? "border-r-4 md:border-r-[6px] bg-indigo-600/10 border-indigo-600 text-indigo-600" : "hover:bg-gray-100/90 dark:hover:bg-gray-800 border-white dark:border-gray-900 text-gray-700 dark:text-gray-300"} `}>
                    <img src={item.icon} alt="" className='m-h-6 min-w-6' />
                    <p className='md:block hidden text-center'>{item.name}</p>
                </NavLink>
            ))}
    </div>
  )
}

export default Sidebar