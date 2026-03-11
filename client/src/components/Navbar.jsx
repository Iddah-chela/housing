import React, {useEffect, useState } from "react";
import { Link, useLocation } from 'react-router-dom';
import { assets } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import ProfileModal from './ProfileModal';
import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import PropertyListingModal from './PropertyListingModal';
import LandlordApplicationModal from './LandlordApplicationModal';
import NotificationBell from './NotificationBell';
import { isPushSupported, getPermissionState } from '../utils/pushNotifications';

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

    const{user, navigate, isOwner, dbImage, enablePushNotifications, darkMode, toggleDarkMode, isCaretaker} = useAppContext()

    const [showPushPrompt, setShowPushPrompt] = useState(false)

    // Show push notification prompt after login if not yet subscribed
    useEffect(() => {
        const dismissed = localStorage.getItem('PataKeja_push_dismissed');
        const alreadyEnabled = localStorage.getItem('PataKeja_push_enabled') === 'true';
        if (user && isPushSupported() && !alreadyEnabled && !dismissed) {
            const timer = setTimeout(() => setShowPushPrompt(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [user]);

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

    // hero state helpers — evaluated once per render, no dark: cascade needed
    const heroLight = !isScrolled && !darkMode;  // on hero, light mode
    const heroDark  = !isScrolled &&  darkMode;  // on hero, dark mode

    return (
        <>
            <nav className={`fixed top-0 left-0 w-full flex items-center justify-between px-4 md:px-16 lg:px-24 xl:px-32 transition-all duration-500 z-40 overflow-visible ${
                isScrolled
                    ? "bg-white/80 dark:bg-gray-900/80 shadow-md text-gray-700 dark:text-gray-200 backdrop-blur-lg py-2 md:py-2"
                    : heroLight
                        ? "py-3 md:py-4 bg-gradient-to-b from-white/50 min-[1100px]:from-white/75 to-transparent text-gray-900"
                        : "py-3 md:py-4 bg-gradient-to-b from-black/50 to-transparent text-white"
            }`}>

                {/* Logo - overflows navbar intentionally */}
                <Link to ="/" className="flex-shrink-0 relative z-50">
                    <img src={assets.logo} alt="logo" className={`h-24 md:h-32 w-auto -my-6 md:-my-8 ${isScrolled && !darkMode && "invert opacity-80"}`} />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-4 lg:gap-8">
                    {navLinks.map((link, i) => (
                        <a key={i} href={link.path} className={`group flex flex-col gap-0.5 ${isScrolled ? "text-gray-700 dark:text-gray-200" : heroLight ? "text-gray-900" : "text-white"}`}>
                            {link.name}
                            <div className={`${isScrolled ? "bg-gray-700 dark:bg-gray-300" : heroLight ? "bg-gray-900" : "bg-white"} h-0.5 w-0 group-hover:w-full transition-all duration-300`} />
                        </a>
                    ))}

                {user && isOwner && (   
                    <>
                        <button className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all ${isScrolled ? 'text-black dark:text-gray-200 border-gray-700 dark:border-gray-500 hover:bg-gray-100/60 dark:hover:bg-gray-700' : heroLight ? 'text-gray-900 border-gray-700 hover:bg-gray-100/60' : 'text-white border-white/70 hover:bg-white/10'}`} onClick={()=> navigate('/owner')}>
                            Dashboard
                        </button>
                        <button className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all ${isScrolled ? 'text-black dark:text-gray-200 border-gray-700 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50' : heroLight ? 'text-gray-900 border-indigo-600 bg-indigo-50/80 hover:bg-indigo-100/80' : 'text-white border-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50'}`} onClick={() => setShowPropertyModal(true)}>
                            + List Property
                        </button>
                    </>
                )}
                
                {user && !isOwner && (
                    <button 
                        className={`flex items-center gap-1.5 border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all ${isScrolled ? 'text-black dark:text-gray-200 border-green-700 dark:border-green-500 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50' : heroLight ? 'text-gray-900 border-green-700 bg-green-50/80 hover:bg-green-100/80' : 'text-white border-green-400 bg-green-900/30 hover:bg-green-900/50'}`} 
                        onClick={() => setShowLandlordApplicationModal(true)}
                    >
                        <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' /></svg>
                        List Your Property
                    </button>
                )}
                </div>

                {/* Desktop Right */}
                <div className="hidden md:flex items-center gap-4">
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className={`p-2 rounded-full transition-all hover:scale-110 ${isScrolled ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : heroLight ? 'text-gray-800 hover:bg-gray-100/60' : 'text-white hover:bg-white/10'}`}
                        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {darkMode ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        )}
                    </button>
                    <button onClick={() => navigate('/rooms')} className="focus:outline-none">
                        <img src={assets.searchIcon} alt="search" className="h-7 transition-all duration-500 cursor-pointer hover:scale-110 opacity-80 brightness-0 dark:invert"/>
                    </button>

                {user ? (
                    <div className="flex items-center gap-3">
                    {/* In-app notification bell */}
                    <NotificationBell isScrolled={isScrolled} />
                    {/* Profile Picture - Click to open modal */}
                    <img 
                        src={dbImage || user.imageUrl} 
                        alt={user.fullName}
                        onClick={() => setShowProfileModal(true)}
                        className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-500 transition-all"
                        onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'U')}&background=6366f1&color=fff&bold=true`; if (e.target.src !== fb) e.target.src = fb }}
                    />
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <SignInButton mode="modal">
                            <button className={`px-6 py-2 rounded-full transition-all duration-500 border ${isScrolled ? "text-gray-700 dark:text-gray-200 border-gray-700 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" : heroLight ? "text-gray-800 border-gray-700 hover:bg-gray-100/60" : "text-white border-white/70 hover:bg-white/10"}`}>
                                Login
                            </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button className={`px-6 py-2 rounded-full transition-all duration-500 ${isScrolled ? "text-white bg-indigo-500 hover:bg-indigo-600" : heroLight ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}>
                                Sign Up
                            </button>
                        </SignUpButton>
                    </div>
                )}
                </div>

                {/* Mobile Menu Button */}
                <div className="flex items-center gap-3 md:hidden">
                    {user && (
                        <>
                        <NotificationBell isScrolled={isScrolled} />
                        <img 
                            src={dbImage || user.imageUrl} 
                            alt={user.fullName}
                            onClick={() => setShowProfileModal(true)}
                            className="w-8 h-8 rounded-full border-2 border-gray-800 cursor-pointer hover:border-indigo-500 transition-all"
                            onError={(e) => { const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'U')}&background=6366f1&color=fff&bold=true`; if (e.target.src !== fb) e.target.src = fb }}
                        />
                        </>
                    )}
                    <img onClick={() => setIsMenuOpen(!isMenuOpen)} src={assets.menuIcon} alt="" className={`h-4 cursor-pointer transition-all brightness-0${darkMode ? ' invert' : ''}`} />
                </div>

                {/* Mobile Menu */}
                <div className={`fixed top-0 left-0 w-full h-screen bg-white dark:bg-gray-900 text-base flex flex-col md:hidden items-center justify-center gap-5 font-medium text-gray-800 dark:text-gray-200 transition-all duration-500 overflow-y-auto py-16 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                    <button className="absolute top-4 right-4" onClick={() => setIsMenuOpen(false)}>
                        <img src={assets.closeIcon} alt="" className='h-6.5' />
                    </button>

                    {navLinks.map((link, i) => (
                        <a key={i} href={link.path} onClick={() => setIsMenuOpen(false)}>
                            {link.name}
                        </a>
                    ))}

                    {/* Mobile Dark Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="flex items-center gap-2 border dark:border-gray-600 px-4 py-1.5 text-sm font-light rounded-full cursor-pointer transition-all"
                    >
                        {darkMode ? (
                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> Light Mode</>
                        ) : (
                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> Dark Mode</>
                        )}
                    </button>

                    {user && isOwner && <>
                    <button className="border dark:border-gray-600 px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all" onClick={()=> { setIsMenuOpen(false); navigate('/owner'); }}>
                        Dashboard
                    </button>
                    <button className="border border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50" onClick={() => { setIsMenuOpen(false); setShowPropertyModal(true); }}>
                        + List Property
                    </button>
                    </>}

                    {user && !isOwner && (
                        <button 
                            className="flex items-center gap-1.5 border border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-900/30 px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all hover:bg-green-100 dark:hover:bg-green-900/50"
                            onClick={() => { setIsMenuOpen(false); setShowLandlordApplicationModal(true); }}
                        >
                            <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' /></svg>
                            List Your Property
                        </button>
                    )}

                    {!user && (
                        <>
                            <SignInButton mode="modal">
                                <button className="border border-gray-800 dark:border-gray-400 text-gray-800 dark:text-gray-200 px-8 py-2.5 rounded-full transition-all duration-500 hover:bg-gray-100 dark:hover:bg-gray-700">
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

            {/* Push Notification Prompt */}
            {showPushPrompt && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-slide-up">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Enable notifications?</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Get instant alerts for messages, viewing responses, and more.</p>
                            <div className="flex gap-2 mt-2.5">
                                <button
                                    onClick={async () => { setShowPushPrompt(false); await enablePushNotifications(); }}
                                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                                >
                                    Enable
                                </button>
                                <button
                                    onClick={() => { setShowPushPrompt(false); localStorage.setItem('PataKeja_push_dismissed', 'true'); }}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                                >
                                    Not now
                                </button>
                            </div>
                        </div>
                        <button onClick={() => setShowPushPrompt(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default Navbar;