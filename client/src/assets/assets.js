import logo from './logo.png'
import searchIcon from './searchIcon.svg'
import userIcon from './userIcon.svg'
import calenderIcon from './calenderIcon.svg'
import locationIcon from './locationIcon.svg'
import starIconFilled from './starIconFilled.svg'
import arrowIcon from './arrowIcon.svg'
import starIconOutlined from './starIconOutlined.svg'
import instagramIcon from './instagramIcon.svg'
import facebookIcon from './facebookIcon.svg'
import twitterIcon from './twitterIcon.svg'
import linkendinIcon from './linkendinIcon.svg'
import freeWifiIcon from './freeWifiIcon.svg'
import freeBreakfastIcon from './freeBreakfastIcon.svg'
import roomServiceIcon from './roomServiceIcon.svg'
import mountainIcon from './mountainIcon.svg'
import poolIcon from './poolIcon.svg'
import homeIcon from './homeIcon.svg'
import closeIcon from './closeIcon.svg'
import locationFilledIcon from './locationFilledIcon.svg'
import heartIcon from './heartIcon.svg'
import badgeIcon from './badgeIcon.svg'
import menuIcon from './menuIcon.svg'
import closeMenu from './closeMenu.svg'
import guestsIcon from './guestsIcon.svg'
import roomImg1 from './roomImg1.jpg'
import roomImg2 from './roomImg2.jpg'
import roomImg3 from './roomImg3.jpg'
import roomImg4 from './roomImg4.jpg'
import regImage from './renty.png'
import exclusiveOfferCardImg1 from "./exclusiveOfferCardImg1.jpg";
import exclusiveOfferCardImg2 from "./exclusiveOfferCardImg2.png";
import exclusiveOfferCardImg3 from "./exclusiveOfferCardImg3.jpg";
import addIcon from "./addIcon.svg";
import dashboardIcon from "./dashboardIcon.svg";
import listIcon from "./listIcon.svg";
import uploadArea from "./uploadArea.svg";
import totalBookingIcon from "./totalBookingIcon.svg";
import totalRevenueIcon from "./totalRevenueIcon.svg";


export const assets = {
    logo,
    searchIcon,
    userIcon,
    calenderIcon,
    locationIcon,
    starIconFilled,
    arrowIcon,
    starIconOutlined,
    instagramIcon,
    facebookIcon,
    twitterIcon,
    linkendinIcon,
    freeWifiIcon,
    freeBreakfastIcon,
    roomServiceIcon,
    mountainIcon,
    poolIcon,
    closeIcon,
    homeIcon,
    locationFilledIcon,
    heartIcon,
    badgeIcon,
    menuIcon,
    closeMenu,
    guestsIcon,
    regImage,
    addIcon,
    dashboardIcon,
    listIcon,
    uploadArea,
    totalBookingIcon,
    totalRevenueIcon,
}

export const Places = [
    "Junction",
    "Sogomo",
    "Upande",
    "ChipsRoad",
];

// Exclusive Offers Dummy Data
export const exclusiveOffers = [
    { _id: 1, title: "Student Special", description: "Get your first month at 15% off any verified listing", priceOff: 15, expiryDate: "Aug 31", image: exclusiveOfferCardImg1 },
    { _id: 2, title: "Semester Package", description: "Book for 6 months and save on verified rentals", priceOff: 20, expiryDate: "Sep 20", image: exclusiveOfferCardImg2 },
    { _id: 3, title: "Early Bird Offer", description: "Book 2 months in advance and get 25% off your rental", priceOff: 25, expiryDate: "Sep 25", image: exclusiveOfferCardImg3 },
]

// Testimonials Dummy Data
export const testimonials = [
    { id: 1, name: "Emma Wanjiku", address: "Nairobi, Kenya", image: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200", rating: 5, review: "Found the perfect room near campus! The verification process made me feel safe, and the owner was very responsive to my viewing request." },
    { id: 2, name: "David Ochieng", address: "Eldoret, Kenya", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200", rating: 4, review: "Great platform for finding student accommodation. The viewing system works perfectly and all listings are verified. Highly recommended!" },
    { id: 3, name: "Grace Muthoni", address: "Mombasa, Kenya", image: "https://images.unsplash.com/photo-1701615004837-40d8573b6652?q=80&w=200", rating: 5, review: "Amazing service! I found a clean, affordable bedsitter within walking distance to campus. The booking process was smooth and secure." }
];

// Facility Icon
export const facilityIcons = {
    "Free WiFi": assets.freeWifiIcon,
    "Free Breakfast": assets.freeBreakfastIcon,
    "24/7 Security": assets.roomServiceIcon,
    "Water Supply": assets.mountainIcon,
    "Parking": assets.poolIcon,
};

// For Room Details Page
export const roomCommonData = [
    { icon: assets.homeIcon, title: "Clean & Safe Stay", description: "Well-maintained and secure rental space." },
    { icon: assets.badgeIcon, title: "Verified Listing", description: "This property has been verified by our team." },
    { icon: assets.locationFilledIcon, title: "Near Campus", description: "Walking distance to university facilities." },
    { icon: assets.heartIcon, title: "Student Friendly", description: "Perfect for students and young professionals." },
];

// User Dummy Data
export const userDummyData = {
    "_id": "owner_123abc",
    "username": "John Kamau",
    "email": "john.kamau@gmail.com",
    "image": "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvdXBsb2FkZWQvaW1nXzJ2N2c5YVpSSEFVYVUxbmVYZ2JkSVVuWnFzWSJ9",
    "role": "houseOwner",
    "isPhoneVerified": true,
    "isIdVerified": true,
    "averageResponseTime": 2,
    "createdAt": "2025-03-25T09:29:16.367Z",
    "updatedAt": "2025-04-10T06:34:48.719Z",
    "__v": 1,
    "recentSearchedPlaces": [
        "Junction"
    ]
}

// House Dummy Data
export const houseDummyData = {
    "_id": "house_456def",
    "name": "Mwamba Apartments",
    "address": "Plot 45, University Road",
    "contact": "+254712345678",
    "owner": userDummyData,
    "place": "Junction",
    "estate": "Campus View Estate",
    "isVerified": true,
    "createdAt": "2025-04-10T06:22:11.663Z",
    "updatedAt": "2025-04-10T06:22:11.663Z",
    "__v": 0
}

// Rooms Dummy Data
export const roomsDummyData = [
    {
        "_id": "6756a1b4f2e3c4d8e9a0b1c2",
        "house": houseDummyData,
        "roomType": "BedSitter",
        "pricePerMonth": 4500,
        "amenities": ["Free WiFi", "24/7 Security", "Water Supply"],
        "images": [roomImg1, roomImg2, roomImg3, roomImg4],
        "isAvailable": true,
        "availabilityStatus": "available",
        "isVerified": true,
        "createdAt": "2025-04-10T06:26:04.013Z",
        "updatedAt": "2025-04-10T06:26:04.013Z",
        "__v": 0
    },
    {
        "_id": "6756a2c5f3e4d5e9f0b2c3d4",
        "house": houseDummyData,
        "roomType": "One-Bedroom",
        "pricePerMonth": 3800,
        "amenities": ["Free WiFi", "Parking", "Water Supply"],
        "images": [roomImg2, roomImg3, roomImg4, roomImg1],
        "isAvailable": true,
        "availabilityStatus": "available",
        "isVerified": true,
        "createdAt": "2025-04-10T06:25:22.593Z",
        "updatedAt": "2025-04-10T06:25:22.593Z",
        "__v": 0
    },
    {
        "_id": "6756a3d6f4e5d6f0a1c3d4e5",
        "house": houseDummyData,
        "roomType": "Self-Contain",
        "pricePerMonth": 3200,
        "amenities": ["Free WiFi", "24/7 Security", "Parking"],
        "images": [roomImg3, roomImg4, roomImg1, roomImg2],
        "isAvailable": true,
        "availabilityStatus": "available",
        "isVerified": true,
        "createdAt": "2025-04-10T06:24:06.285Z",
        "updatedAt": "2025-04-10T06:24:06.285Z",
        "__v": 0
    },
    {
        "_id": "6756a4e7f5e6d7f1a2c4d5e6",
        "house": houseDummyData,
        "roomType": "BedSitter",
        "pricePerMonth": 4200,
        "amenities": ["Free WiFi", "Water Supply", "Parking"],
        "images": [roomImg4, roomImg1, roomImg2, roomImg3],
        "isAvailable": true,
        "availabilityStatus": "available",
        "isVerified": true,
        "createdAt": "2025-04-10T06:23:20.252Z",
        "updatedAt": "2025-04-10T06:23:20.252Z",
        "__v": 0
    }
]



// User Bookings Dummy Data
export const userBookingsDummyData = [
    {
        "_id": "booking_1",
        "user": userDummyData,
        "room": roomsDummyData[1],
        "house": houseDummyData,
        "checkInDate": "2025-05-01T00:00:00.000Z",
        "checkOutDate": "2025-11-01T00:00:00.000Z",
        "totalPrice": 22800,
        "guests": 1,
        "status": "confirmed",
        "paymentMethod": "M-Pesa",
        "isPaid": true,
        "createdAt": "2025-04-10T06:42:01.529Z",
        "updatedAt": "2025-04-10T06:43:54.520Z",
        "__v": 0
    },
    {
        "_id": "booking_2",
        "user": userDummyData,
        "room": roomsDummyData[0],
        "house": houseDummyData,
        "checkInDate": "2025-06-01T00:00:00.000Z",
        "checkOutDate": "2025-12-01T00:00:00.000Z",
        "totalPrice": 27000,
        "guests": 1,
        "status": "pending",
        "paymentMethod": "Cash",
        "isPaid": false,
        "createdAt": "2025-04-10T06:41:45.873Z",
        "updatedAt": "2025-04-10T06:41:45.873Z",
        "__v": 0
    },
    {
        "_id": "booking_3",
        "user": userDummyData,
        "room": roomsDummyData[3],
        "house": houseDummyData,
        "checkInDate": "2025-05-15T00:00:00.000Z",
        "checkOutDate": "2025-11-15T00:00:00.000Z",
        "totalPrice": 25200,
        "guests": 1,
        "status": "confirmed",
        "paymentMethod": "Bank Transfer",
        "isPaid": true,
        "createdAt": "2025-04-10T06:41:20.501Z",
        "updatedAt": "2025-04-10T06:41:20.501Z",
        "__v": 0
    }
]

// Dashboard Dummy Data
export const dashboardDummyData = {
    "totalBookings": 3,
    "totalRevenue": 75000,
    "bookings": userBookingsDummyData
}

// --------- SVG code for Book Icon------
/* 
const BookIcon = ()=>(
    <svg className="w-4 h-4 text-gray-700" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" >
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4" />
</svg>
)

*/
