import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import ProfileModal from '../ProfileModal'

const Navbar = () => {
  const { user } = useAppContext()
  const [showProfileModal, setShowProfileModal] = useState(false)

  return (
    <div className='flex items-center justify-between px-4 md:px-8 border-b border-gray-300 py-3 bg-white transition-all duration-300'>
        <Link to={'/'}>
          <img src={assets.logo} alt="" className='h-9 invert opacity-80' />
        </Link>
        {user && (
          <>
            <img 
              src={user.imageUrl} 
              alt={user.fullName}
              onClick={() => setShowProfileModal(true)}
              className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-300 hover:border-indigo-500 transition-all"
            />
            {showProfileModal && (
              <ProfileModal onClose={() => setShowProfileModal(false)} />
            )}
          </>
        )}
    </div>
  )
}

export default Navbar
