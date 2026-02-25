import React from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/home'
import About from './pages/About'
import Footer from './components/Footer'
import AllRooms from './pages/AllRooms'
import PropertyDetails from './pages/PropertyDetails'
import MyBooking from './pages/MyBooking'
import MyChats from './pages/MyChats'
import MyViewings from './pages/MyViewings'
import Layout from './pages/HouseOwner/Layout'
import Dashboard from './pages/HouseOwner/Dashboard'
import AddRoom from './pages/HouseOwner/AddRoom'
import ListRoom from './pages/HouseOwner/ListRoom'
import ViewingRequests from './pages/HouseOwner/ViewingRequests'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminApplications from './pages/Admin/AdminApplications'
import AdminReports from './pages/Admin/AdminReports'
import AdminUsers from './pages/Admin/AdminUsers'
import AdminListings from './pages/Admin/AdminListings'
import {Toaster} from 'react-hot-toast'
import { useAppContext } from './context/AppContext'

const App = () => {

  const isOwnerPath = useLocation().pathname.includes("owner");
  const isAdminPath = useLocation().pathname.includes("admin");

  return (
    <div>
      <Toaster
        position="top-center"
         toastOptions={{
        style: { zIndex: 99999, marginTop: '60px' }, // avoid overlapping navbar
         }}
      />
     <Navbar />
     <div className='min-h-[70vh]'>
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/about' element={<About/>}/>
          <Route path='/rooms' element={<AllRooms/>}/>
          <Route path='/rooms/:id' element={<PropertyDetails/>}/>
          <Route path='/my-bookings' element={<MyBooking/>}/>
          <Route path='/my-viewings' element={<MyViewings/>}/>
          <Route path='/my-chats' element={<MyChats/>}/>
          <Route path='/owner' element={<Layout/>}>
              <Route index element={<Dashboard/>}/>
              <Route path='viewing-requests' element={<ViewingRequests/>}/>
              <Route path='add-room' element={<AddRoom/>}/>
              <Route path='list-room' element={<ListRoom/>}/>
          </Route>
          <Route path='/admin' element={<AdminLayout/>}>
              <Route index element={<AdminDashboard/>}/>
              <Route path='applications' element={<AdminApplications/>}/>
              <Route path='reports' element={<AdminReports/>}/>
              <Route path='users' element={<AdminUsers/>}/>
              <Route path='listings' element={<AdminListings/>}/>
          </Route>
        </Routes>
     </div>
     <Footer/>
    </div>
  )
}

export default App