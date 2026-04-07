import React from 'react'
import Sidebar from '../../components/HouseOwner/Sidebar'
import { Outlet } from 'react-router-dom'
import {useAppContext} from '../../context/AppContext'
import { useEffect } from 'react'

const Layout = () => {
  const { isOwner, isAdmin, isCaretaker, navigate, user, authLoading } = useAppContext()

  const canAccess = isOwner || isAdmin || isCaretaker

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/'); return }
    if (!canAccess) { navigate('/'); return }
  }, [canAccess, user, authLoading, navigate])

  if (authLoading) {
    return (
      <div className='flex items-center justify-center h-screen bg-white dark:bg-gray-900'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4'></div>
          <p className='text-gray-500 dark:text-gray-400 text-sm'>Loading…</p>
        </div>
      </div>
    )
  }

  if (!user || !canAccess) return null

  return (
    <div className='flex pt-20 min-h-screen'>
        <Sidebar/>
        <div className='flex-1 p-4 pt-8 md:px-10 pb-24 md:pb-10 overflow-y-auto overflow-x-hidden min-w-0'>
            <Outlet/>
        </div>
    </div>
  )
}

export default Layout
