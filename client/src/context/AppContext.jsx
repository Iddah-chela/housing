import axios from "axios";
import { useContext } from "react";
import { createContext } from "react";
import { useNavigate } from 'react-router-dom';
import {useUser, useAuth} from "@clerk/clerk-react"
import { useState } from "react";
import {toast} from 'react-hot-toast'
import { useEffect } from "react";
import { roomsDummyData } from "../assets/assets";

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
    const [showHouseReg, setShowHouseReg] = useState(false)
    const [searchedPlaces, setSearchedPlaces] = useState([])
    const [rooms, setRooms] = useState([])
    const [properties, setProperties] = useState([]) // For featured listings
    const [authLoading, setAuthLoading] = useState(true) // Track if auth is still loading

    // Get token from Clerk
    const getToken = async () => {
        try {
            if (!clerkUser) {
                console.log('⚠️  No Clerk user, cannot get token');
                return null;
            }
            
            const token = await clerkGetToken();
            
            if (!token) {
                console.warn('⚠️  Clerk returned null token despite user being logged in');
            } else {
                console.log('✅ Token retrieved successfully');
            }
            
            return token;
        } catch (error) {
            console.error('❌ Error getting token:', error)
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
                console.error('Failed to fetch properties:', data.message)
            }
        } catch (error) {
            console.error('Error fetching properties:', error.message)
        }
    }

    const fetchUser = async () => {
        try {
            console.log('🔍 Attempting to fetch user data...');
            console.log('   clerkLoaded:', clerkLoaded);
            console.log('   clerkUser exists:', !!clerkUser);
            console.log('   clerkUser ID:', clerkUser?.id);
            
            const token = await getToken()
            if (!token) {
                console.log('⚠️  No token available, skipping user fetch');
                setIsOwner(false);
                setIsAdmin(false);
                setAuthLoading(false);
                return;
            }
            
            console.log('📤 Sending request to /api/user with token...');
            
            const {data} = await axios.get('/api/user', {
                headers: {Authorization: `Bearer ${token}`}
            })
            
            // Check if response is JSON (not HTML from ngrok)
            if (typeof data === 'string' || !data.success) {
                console.error('❌ Invalid API response:', typeof data === 'string' ? 'HTML received' : data.message);
                if (typeof data === 'string') {
                    toast.error('Connection error. Please check if backend is running.');
                }
                setIsOwner(false);
                setIsAdmin(false);
                setAuthLoading(false);
                return;
            }
            
            console.log('✅ Fetched user data:', data);
            const ownerStatus = data.role === "houseOwner" || data.role === "admin";
            const adminStatus = data.role === "admin";
            console.log('Setting isOwner to:', ownerStatus, 'isAdmin to:', adminStatus);
            setIsOwner(ownerStatus);
            setIsAdmin(adminStatus);
            setSearchedPlaces(data.recentSearchedPlaces || [])
            setAuthLoading(false);
        } catch (error) {
           // Only log actual errors, not 401s for unauthenticated users
           if (error.response?.status === 401) {
               console.log('ℹ️  User not authenticated (401)');
               setIsOwner(false);
               setIsAdmin(false);
               setAuthLoading(false);
               return;
           }
           
           console.error('❌ Error fetching user:', error.message);
           if (error.response) {
               console.error('Response status:', error.response.status);
               console.error('Response data:', error.response.data);
           }
           setIsOwner(false);
           setIsAdmin(false);
           setAuthLoading(false);
        }
    }

    // Logout function
    const logout = async () => {
        try {
            await signOut()
            setIsOwner(false)
            setIsAdmin(false)
            navigate('/')
            toast.success('Logged out successfully')
        } catch (error) {
            console.error('Logout error:', error)
            toast.error('Error logging out')
        }
    }

    // Fetch user data when Clerk user is loaded
    useEffect(() =>{
        console.log('🔄 Auth state changed - clerkLoaded:', clerkLoaded, 'clerkUser:', !!clerkUser);
        
        if(clerkLoaded){
            if(clerkUser) {
                console.log('👤 User logged in, fetching user data...');
                fetchUser();
            } else {
                console.log('👤 No user logged in, resetting states');
                // User not logged in - reset states
                setIsOwner(false);
                setIsAdmin(false);
                setAuthLoading(false); // Done loading - no user
            }
        }
    }, [clerkLoaded, clerkUser])

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
        logout
    }
    return(
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}


export const useAppContext = () => useContext(AppContext);  