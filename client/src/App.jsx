import React, { useEffect, useState, lazy, Suspense } from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation, useSearchParams, Navigate } from 'react-router-dom'
import { useAppContext } from './context/AppContext'
import { useClerk, useUser } from '@clerk/clerk-react'
import { MessageSquareHeart } from 'lucide-react'
import {Toaster} from 'react-hot-toast'
import FeedbackModal from './components/FeedbackModal'
import Footer from './components/Footer'

// Lazy-load all pages - they won't be in the initial JS bundle
const Home            = lazy(() => import('./pages/home'))
const About           = lazy(() => import('./pages/About'))
const AllRooms        = lazy(() => import('./pages/AllRooms'))
const PropertyDetails = lazy(() => import('./pages/PropertyDetails'))
const MyBooking       = lazy(() => import('./pages/MyBooking'))
const MyChats         = lazy(() => import('./pages/MyChats'))
const MyViewings      = lazy(() => import('./pages/MyViewings'))
const MyClaims        = lazy(() => import('./pages/MyClaims'))
const Layout          = lazy(() => import('./pages/HouseOwner/Layout'))
const Dashboard       = lazy(() => import('./pages/HouseOwner/Dashboard'))
const AddRoom         = lazy(() => import('./pages/HouseOwner/AddRoom'))
const ListRoom        = lazy(() => import('./pages/HouseOwner/ListRoom'))
const ViewingRequests = lazy(() => import('./pages/HouseOwner/ViewingRequests'))
const OwnerBookings   = lazy(() => import('./pages/HouseOwner/OwnerBookings'))
const UtilityManager  = lazy(() => import('./pages/HouseOwner/UtilityManager'))
const AdminLayout     = lazy(() => import('./pages/Admin/AdminLayout'))
const AdminDashboard  = lazy(() => import('./pages/Admin/AdminDashboard'))
const AdminApplications = lazy(() => import('./pages/Admin/AdminApplications'))
const AdminReports    = lazy(() => import('./pages/Admin/AdminReports'))
const AdminUsers      = lazy(() => import('./pages/Admin/AdminUsers'))
const AdminListings   = lazy(() => import('./pages/Admin/AdminListings'))
const AdminFeedback   = lazy(() => import('./pages/Admin/AdminFeedback'))
const Terms           = lazy(() => import('./pages/Terms'))
const Privacy         = lazy(() => import('./pages/Privacy'))
const UnlockPolicy    = lazy(() => import('./pages/UnlockPolicy'))
const Safety          = lazy(() => import('./pages/Safety'))
const ManagedProperties = lazy(() => import('./pages/ManagedProperties'))
const ViewingAction   = lazy(() => import('./pages/ViewingAction'))
const Unsubscribe     = lazy(() => import('./pages/Unsubscribe'))

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
     <main className={isAdminPath ? '' : 'min-h-[70vh]'}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/about' element={<About/>}/>
          <Route path='/rooms' element={<AllRooms/>}/>
          <Route path='/rooms/:id' element={<PropertyDetails/>}/>
          <Route path='/my-bookings' element={<MyBooking/>}/>
          <Route path='/my-viewings' element={<MyViewings/>}/>
          <Route path='/my-chats' element={<MyChats/>}/>
          <Route path='/my-claims' element={<MyClaims/>}/>
          <Route path='/terms' element={<Terms/>}/>
          <Route path='/privacy' element={<Privacy/>}/>
          <Route path='/unlock-policy' element={<UnlockPolicy/>}/>
          <Route path='/safety' element={<Safety/>}/>
          <Route path='/sign-up' element={<SignUpRedirect/>}/>
          <Route path='/managed-properties' element={<ManagedProperties/>}/>
          <Route path='/viewing/action' element={<ViewingAction/>}/>
          <Route path='/unsubscribe' element={<Unsubscribe/>}/>
          <Route path='/owner' element={<Layout/>}>
              <Route index element={<Dashboard/>}/>
              <Route path='viewing-requests' element={<ViewingRequests/>}/>
              <Route path='add-room' element={<AddRoom/>}/>
              <Route path='list-room' element={<ListRoom/>}/>
              <Route path='bookings' element={<OwnerBookings/>}/>
              <Route path='utilities' element={<UtilityManager/>}/>
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
        </Suspense>
     </main>
     {!isAdminPath && <Footer/>}

     {/* Floating Feedback Button */}
     {user && !isAdminPath && (
       <button
         onClick={() => setShowFeedback(true)}
         className={`fixed z-50 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-3.5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 ${isOwnerPath ? 'bottom-20 right-4 md:bottom-6 md:right-6' : 'bottom-6 right-6'}`}
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
