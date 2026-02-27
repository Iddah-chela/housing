import React, {useEffect, useState } from "react";
import { Link, useLocation } from 'react-router-dom';
import { assets } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import ProfileModal from './ProfileModal';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import PropertyListingModal from './PropertyListingModal';
import LandlordApplicationModal from './LandlordApplicationModal';

const Navbar = () => {
    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Houses', path: '/rooms' },
        { name: 'About', path: '/about' },
    ];


    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showPropertyModal, setShowPropertyModal] = useState(false);
    const [showLandlordApplicationModal, setShowLandlordApplicationModal] = useState(false);
    
    const location = useLocation()

    const{user, navigate, isOwner, dbImage} = useAppContext()

    useEffect(() => {
        if(location.pathname !== '/'){
            setIsScrolled(true);
            return;
        }else{
            setIsScrolled(false)
        }
        setIsScrolled(prev => location.pathname !== '/' ? true: prev)

        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [location.pathname]);

    return (
        <>
            <nav className={`fixed top-0 left-0 w-full flex items-center justify-between px-4 md:px-16 lg:px-24 xl:px-32 transition-all duration-500 z-40 overflow-visible ${isScrolled ? "bg-white/80 shadow-md text-gray-700 backdrop-blur-lg py-2 md:py-2" : "py-3 md:py-4"}`}>

                {/* Logo - overflows navbar intentionally */}
                <Link to ="/" className="flex-shrink-0 relative z-50">
                    <img src={assets.logo} alt="logo" className={`h-24 md:h-32 w-auto -my-6 md:-my-8 ${isScrolled && "invert opacity-80"}`} />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-4 lg:gap-8">
                    {navLinks.map((link, i) => (
                        <a key={i} href={link.path} className={`group flex flex-col gap-0.5 ${isScrolled ? "text-gray-700" : "text-gray-900"}`}>
                            {link.name}
                            <div className={`${isScrolled ? "bg-gray-700" : "bg-gray-900"} h-0.5 w-0 group-hover:w-full transition-all duration-300`} />
                        </a>
                    ))}

                {user && isOwner && (   
                    <>
                        <button className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer ${isScrolled ? 'text-black border-gray-700' : 'text-gray-900 border-gray-900'} transition-all hover:bg-gray-100`} onClick={()=> navigate('/owner')}>
                            Dashboard
                        </button>
                        <button className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer ${isScrolled ? 'text-black border-gray-700 bg-indigo-50' : 'text-gray-900 border-indigo-600 bg-indigo-50'} transition-all hover:bg-indigo-100`} onClick={() => setShowPropertyModal(true)}>
                            + List Property
                        </button>
                    </>
                )}
                
                {user && !isOwner && (
                    <button 
                        className={`flex items-center gap-1.5 border px-4 py-1 text-sm font-light rounded-full cursor-pointer ${isScrolled ? 'text-black border-green-700 bg-green-50' : 'text-gray-900 border-green-600 bg-green-50'} transition-all hover:bg-green-100`} 
                        onClick={() => setShowLandlordApplicationModal(true)}
                    >
                        <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' /></svg>
                        Become a Landlord
                    </button>
                )}
                </div>

                {/* Desktop Right */}
                <div className="hidden md:flex items-center gap-4">
                    <button onClick={() => navigate('/rooms')} className="focus:outline-none">
                        <img src={assets.searchIcon} alt="search" className={`${isScrolled ? 'opacity-70' : 'opacity-90'} h-7 transition-all duration-500 cursor-pointer hover:scale-110`}/>
                    </button>

                {user ? (
                    // Profile Picture - Click to open modal
                    <img 
                        src={dbImage || user.imageUrl} 
                        alt={user.fullName}
                        onClick={() => setShowProfileModal(true)}
                        className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-300 hover:border-indigo-500 transition-all"
                        onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'U')}&background=6366f1&color=fff&bold=true`; if (e.target.src !== fb) e.target.src = fb }}
                    />
                ) : (
                    <div className="flex gap-2">
                        <SignInButton mode="modal">
                            <button className={`px-6 py-2 rounded-full transition-all duration-500 border ${isScrolled ? "text-gray-700 border-gray-700 hover:bg-gray-100" : "text-gray-900 border-gray-900 hover:bg-gray-100"}`}>
                                Login
                            </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className={`px-6 py-2 rounded-full transition-all duration-500 ${isScrolled ? "text-white bg-indigo-500 hover:bg-indigo-600" : "bg-gray-900 text-white hover:bg-gray-800"}`}>
                                Sign Up
                            </button>
                        </SignUpButton>
                    </div>
                )}
                </div>

                {/* Mobile Menu Button */}
                <div className="flex items-center gap-3 md:hidden">
                    {user && (
                        <img 
                            src={dbImage || user.imageUrl} 
                            alt={user.fullName}
                            onClick={() => setShowProfileModal(true)}
                            className="w-8 h-8 rounded-full border-2 border-gray-800 cursor-pointer hover:border-indigo-500 transition-all"
                            onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'U')}&background=6366f1&color=fff&bold=true`; if (e.target.src !== fb) e.target.src = fb }}
                        />
                    )}
                    <img onClick={() => setIsMenuOpen(!isMenuOpen)} src={assets.menuIcon} alt="" className={`h-4 transition-all${isScrolled ? ' brightness-0' : ''}`} />
                </div>

                {/* Mobile Menu */}
                <div className={`fixed top-0 left-0 w-full h-screen bg-white text-base flex flex-col md:hidden items-center justify-center gap-6 font-medium text-gray-800 transition-all duration-500 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                    <button className="absolute top-4 right-4" onClick={() => setIsMenuOpen(false)}>
                        <img src={assets.closeIcon} alt="" className='h-6.5' />
                    </button>

                    {navLinks.map((link, i) => (
                        <a key={i} href={link.path} onClick={() => setIsMenuOpen(false)}>
                            {link.name}
                        </a>
                    ))}

                    {user && isOwner &&
                    <button className="border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all" onClick={()=> navigate('/owner')}>
                        Dashboard
                    </button>}

                    {!user && (
                        <>
                            <SignInButton mode="modal">
                                <button className="border border-gray-800 text-gray-800 px-8 py-2.5 rounded-full transition-all duration-500 hover:bg-gray-100">
                                    Login
                                </button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <button className="bg-indigo-500 text-white px-8 py-2.5 rounded-full transition-all duration-500 hover:bg-indigo-600">
                                    Sign Up
                                </button>
                            </SignUpButton>
                        </>
                    )}
                </div>
            </nav>

            {/* Modals - Rendered outside nav for proper stacking context */}
            {showLandlordApplicationModal && (
                <LandlordApplicationModal onClose={() => setShowLandlordApplicationModal(false)} />
            )}
            {showProfileModal && (
                <ProfileModal onClose={() => setShowProfileModal(false)} />
            )}
            {showPropertyModal && (
                <PropertyListingModal onClose={() => setShowPropertyModal(false)} />
            )}
        </>
    );
}

export default Navbar;