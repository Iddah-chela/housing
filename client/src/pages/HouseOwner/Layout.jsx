import React from 'react'
import Sidebar from '../../components/HouseOwner/Sidebar'
import { Outlet } from 'react-router-dom'
import {useAppContext} from '../../context/AppContext'
import { useEffect } from 'react'

const Layout = () => {
  const {isOwner, navigate, user} = useAppContext()

  useEffect(()=> {
    if(!user){
      navigate('/')
    } else if(!isOwner){
      navigate('/')
    }
  }, [isOwner, user])
  return (
    <div className='flex pt-20 min-h-screen'>
        <Sidebar/>
        <div className='flex-1 p-4 pt-10 md:px-10 pb-32 overflow-y-auto'>
            <Outlet/>
        </div>
    </div>
  )
}

export default Layout