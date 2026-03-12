import axios from "axios";
import { useContext } from "react";
import { createContext } from "react";
import { useNavigate } from 'react-router-dom';
import {useUser, useAuth} from "@clerk/clerk-react"
import { useState } from "react";
import {toast} from 'react-hot-toast'
import { useEffect } from "react";
import { roomsDummyData } from "../assets/assets";
import { resubscribeIfNeeded, subscribeToPush, isPushSupported, getPermissionState } from "../utils/pushNotifications";

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;
// In AppContext.jsx or axios config
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

const AppContext = createContext();

export const AppProvider = ({children})=>{

    const currency = import.meta.env.VITE_CURRENCY || "Ksh";
    const navigate = useNavigate();
    
    // Clerk authentication
    const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
    const { getToken: clerkGetToken, signOut } = useAuth()
    
    // App state
    const [isOwner, setIsOwner] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isCaretaker, setIsCaretaker] = useState(false)
    const [showHouseReg, setShowHouseReg] = useState(false)
    const [searchedPlaces, setSearchedPlaces] = useState([])
    const [rooms, setRooms] = useState([])
    const [properties, setProperties] = useState([]) // For featured listings
    const [authLoading, setAuthLoading] = useState(true) // Track if auth is still loading
    const [dbImage, setDbImage] = useState(null) // Profile picture from DB (custom uploads)
    
    // Dark mode state - persist in localStorage
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('PataKeja_darkMode');
        if (saved !== null) return saved === 'true';
        // Default to light mode
        return false;
    });
    
    // Apply dark mode class to <html>
    useEffect(() => {
        const html = document.documentElement;
        html.classList.add('dark-transition');
        if (darkMode) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
        localStorage.setItem('PataKeja_darkMode', darkMode);
        // Remove transition class after animation completes
        const timer = setTimeout(() => html.classList.remove('dark-transition'), 400);
        return () => clearTimeout(timer);
    }, [darkMode]);
    
    const toggleDarkMode = () => setDarkMode(prev => !prev);

    // Get token from Clerk
    const getToken = async () => {
        try {
            if (!clerkUser) {
                return null;
            }
            
            const token = await clerkGetToken();
            
            if (!token) {
            } else {
            }
            
            return token;
        } catch (error) {
            return null
        }
    }

    const fetchRooms = async () =>{
        try {
            // Fetch real properties from API
            const {data} = await axios.get('/api/properties')
            if(data.success){
                setProperties(data.properties || [])
            } else {
            }
        } catch (error) {
        }
    }

    const fetchUser = async () => {
        try {
            
            const token = await getToken()
            if (!token) {
                setIsOwner(false);
                setIsAdmin(false);
                setIsCaretaker(false);
                setIsCaretaker(false);
                setAuthLoading(false);
                return;
            }
            
            
            const {data} = await axios.get('/api/user', {
                headers: {Authorization: `Bearer ${token}`}
            })
            
            // Check if response is JSON (not HTML from ngrok)
            if (typeof data === 'string' || !data.success) {
                if (typeof data === 'string') {
                    toast.error('Unable to connect. Please try again later.');
                }
                setIsOwner(false);
                setIsAdmin(false);
                setAuthLoading(false);
                return;
            }
            
            const ownerStatus = data.role === "houseOwner" || data.role === "admin";
            const adminStatus = data.role === "admin";
            const caretakerStatus = !!data.isCaretaker && !ownerStatus;
            setIsOwner(ownerStatus);
            setIsAdmin(adminStatus);
            setIsCaretaker(caretakerStatus);
            setSearchedPlaces(data.recentSearchedPlaces || [])
            setDbImage(data.image || null)
            setAuthLoading(false);

            // Auto re-subscribe to push notifications if user previously opted in
            resubscribeIfNeeded(getToken);

            // Apply referral code if stored in localStorage (captured from ?ref= URL)
            const pendingRef = localStorage.getItem('PataKeja_referral');
            if (pendingRef) {
                try {
                    const refRes = await axios.post('/api/payment/apply-referral',
                        { referralCode: pendingRef },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (refRes.data.success) {
                        localStorage.removeItem('PataKeja_referral');
                        if (!refRes.data.alreadyReferred) {
                        }
                    }
                } catch (refErr) {
                }
            }
        } catch (error) {
           // Only log actual errors, not 401s for unauthenticated users
           if (error.response?.status === 401) {
               setIsOwner(false);
               setIsAdmin(false);
               setIsCaretaker(false);
               setAuthLoading(false);
               return;
           }
           
           if (error.response) {
           }
           setIsOwner(false);
           setIsAdmin(false);
           setIsCaretaker(false);
           setAuthLoading(false);
        }
    }

    // Logout function
    const logout = async () => {
        try {
            await signOut()
            setIsOwner(false)
            setIsAdmin(false)
            setIsCaretaker(false)
            navigate('/')
            toast.success('Logged out successfully')
        } catch (error) {
            toast.error('Error logging out')
        }
    }

    // Enable push notifications (call from UI prompt)
    const enablePushNotifications = async () => {
        if (!isPushSupported()) {
            toast.error('Push notifications are not supported in this browser');
            return false;
        }
        try {
            const ok = await subscribeToPush(getToken);
            if (ok) {
                toast.success('Notifications enabled!');
            } else if (getPermissionState() === 'denied') {
                toast.error('Notifications blocked. Please enable in browser settings.');
            } else {
                toast.error('Could not enable notifications. Please try again.');
            }
            return ok;
        } catch (err) {
            toast.error('Could not set up notifications. Please try again.');
            return false;
        }
    }

    // Fetch user data when Clerk user is loaded
    useEffect(() =>{
        
        if(clerkLoaded){
            if(clerkUser) {
                fetchUser();
            } else {
                // User not logged in - reset states
                setIsOwner(false);
                setIsAdmin(false);
                setIsCaretaker(false);
                setAuthLoading(false); // Done loading - no user
            }
        }
    }, [clerkLoaded, clerkUser])

    // Fire a lightweight ping immediately on app load to wake the Render backend
    // (Render free tier cold-starts in 30-90s; this gives it a head start)
    useEffect(() => {
        const controller = new AbortController();
        axios.get('/api/health', { signal: controller.signal, timeout: 90000 })
            .catch(() => {}); // Silence errors — this is fire-and-forget
        return () => controller.abort();
    }, []);

    useEffect(()=>{
        fetchRooms()
    },[])

    const value ={
        currency, 
        navigate, 
        user: clerkUser, 
        getToken, 
        isOwner, 
        setIsOwner, 
        isAdmin, 
        setIsAdmin,
        isCaretaker,
        setIsCaretaker,
        authLoading, // Expose loading state
        axios, 
        showHouseReg, 
        setShowHouseReg, 
        searchedPlaces, 
        setSearchedPlaces, 
        rooms, 
        setRooms,
        properties, // Expose properties for featured listings
        setProperties,
        logout,
        dbImage,
        setDbImage,
        fetchUser,
        enablePushNotifications,
        darkMode,
        toggleDarkMode
    }
    return(
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}


export const useAppContext = () => useContext(AppContext);  
