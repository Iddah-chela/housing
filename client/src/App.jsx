import React, { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation, useSearchParams, Navigate } from 'react-router-dom'
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
import AdminFeedback from './pages/Admin/AdminFeedback'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import UnlockPolicy from './pages/UnlockPolicy'
import Safety from './pages/Safety'
import ManagedProperties from './pages/ManagedProperties'
import ViewingAction from './pages/ViewingAction'
import OwnerBookings from './pages/HouseOwner/OwnerBookings'
import FeedbackModal from './components/FeedbackModal'
import {Toaster} from 'react-hot-toast'
import { useAppContext } from './context/AppContext'
import { useClerk, useUser } from '@clerk/clerk-react'
import { MessageSquareHeart } from 'lucide-react'

// Auto-open Clerk signup when landing on /sign-up?ref=...
const SignUpRedirect = () => {
  const [searchParams] = useSearchParams()
  const { openSignUp } = useClerk()
  const { isSignedIn } = useUser()

  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref && /^PS[A-Z0-9]{6}$/.test(ref)) {
      localStorage.setItem('PataKeja_referral', ref)
    }
    // If not signed in, open signup modal automatically
    if (!isSignedIn) {
      // Small delay to ensure Clerk is ready
      const timer = setTimeout(() => openSignUp({ redirectUrl: '/' }), 300)
      return () => clearTimeout(timer)
    }
  }, [isSignedIn, searchParams, openSignUp])

  return <Navigate to="/" replace />
}

const App = () => {

  const { user } = useAppContext();
  const [showFeedback, setShowFeedback] = useState(false);
  const isOwnerPath = useLocation().pathname.includes("owner");
  const isAdminPath = useLocation().pathname.includes("admin");
  const [searchParams] = useSearchParams();

  // Capture referral code from URL (e.g. ?ref=PS3A7F2B) and store in localStorage
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref && /^PS[A-Z0-9]{6}$/.test(ref)) {
      localStorage.setItem('PataKeja_referral', ref)
    }
  }, [searchParams])

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
      <Toaster
        position="top-center"
         toastOptions={{
        style: { zIndex: 99999, marginTop: '60px' }, // avoid overlapping navbar
         }}
      />
     {!isAdminPath && <Navbar />}
     <div className={isAdminPath ? '' : 'min-h-[70vh]'}>
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/about' element={<About/>}/>
          <Route path='/rooms' element={<AllRooms/>}/>
          <Route path='/rooms/:id' element={<PropertyDetails/>}/>
          <Route path='/my-bookings' element={<MyBooking/>}/>
          <Route path='/my-viewings' element={<MyViewings/>}/>
          <Route path='/my-chats' element={<MyChats/>}/>
          <Route path='/terms' element={<Terms/>}/>
          <Route path='/privacy' element={<Privacy/>}/>
          <Route path='/unlock-policy' element={<UnlockPolicy/>}/>
          <Route path='/safety' element={<Safety/>}/>
          <Route path='/sign-up' element={<SignUpRedirect/>}/>
          <Route path='/managed-properties' element={<ManagedProperties/>}/>
          <Route path='/viewing/action' element={<ViewingAction/>}/>
          <Route path='/owner' element={<Layout/>}>
              <Route index element={<Dashboard/>}/>
              <Route path='viewing-requests' element={<ViewingRequests/>}/>
              <Route path='add-room' element={<AddRoom/>}/>
              <Route path='list-room' element={<ListRoom/>}/>
              <Route path='bookings' element={<OwnerBookings/>}/>
          </Route>
          <Route path='/admin' element={<AdminLayout/>}>
              <Route index element={<AdminDashboard/>}/>
              <Route path='applications' element={<AdminApplications/>}/>
              <Route path='reports' element={<AdminReports/>}/>
              <Route path='users' element={<AdminUsers/>}/>
              <Route path='listings' element={<AdminListings/>}/>
              <Route path='feedback' element={<AdminFeedback/>}/>
          </Route>
        </Routes>
     </div>
     {!isAdminPath && <Footer/>}

     {/* Floating Feedback Button */}
     {user && !isAdminPath && (
       <button
         onClick={() => setShowFeedback(true)}
         className='fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-3.5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105'
         title='Send Feedback'
       >
         <MessageSquareHeart className='w-5 h-5' />
       </button>
     )}

     {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  )
}

export default App