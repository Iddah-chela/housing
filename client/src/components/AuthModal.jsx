import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { GraduationCap, Building2 } from 'lucide-react'

const AuthModal = ({ onClose, initialMode = 'login' }) => {
    const { setUser, setIsOwner } = useAppContext()
    const [mode, setMode] = useState(initialMode) // 'login' or 'signup'
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'tenant' // 'tenant' or 'landlord'
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (mode === 'signup') {
            // Signup logic
            if (!formData.username || !formData.email || !formData.password) {
                toast.error('Please fill all fields')
                return
            }
            
            // Create user based on role
            const newUser = {
                id: Date.now().toString(),
                fullName: formData.username,
                emailAddresses: [{ emailAddress: formData.email }],
                imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.username || 'U')}&background=6366f1&color=fff&bold=true`,
                role: formData.role,
                credentials: {
                    email: formData.email,
                    password: formData.password // In production, this would be hashed
                }
            }
            
            // Store user and credentials
            const users = JSON.parse(localStorage.getItem('users') || '[]')
            users.push(newUser)
            localStorage.setItem('users', JSON.stringify(users))
            localStorage.setItem('user', JSON.stringify(newUser))
            localStorage.setItem('isAuthenticated', 'true')
            
            setUser(newUser)
            setIsOwner(formData.role === 'landlord')
            
            toast.success(`Welcome ${formData.username}! Account created successfully.`)
            onClose()
        } else {
            // Login logic
            if (!formData.email || !formData.password) {
                toast.error('Please enter email and password')
                return
            }
            
            // Check if user exists in users array
            const users = JSON.parse(localStorage.getItem('users') || '[]')
            const user = users.find(u => 
                u.credentials.email === formData.email && 
                u.credentials.password === formData.password
            )
            
            if (user) {
                localStorage.setItem('user', JSON.stringify(user))
                localStorage.setItem('isAuthenticated', 'true')
                setUser(user)
                setIsOwner(user.role === 'landlord')
                toast.success(`Welcome back ${user.fullName}!`)
                onClose()
            } else {
                toast.error('Invalid email or password')
            }
        }
    }

    return (
        <div 
            onClick={onClose} 
            className='fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4'
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                className='bg-white rounded-xl max-w-md w-full my-auto shadow-2xl max-h-[95vh] overflow-y-auto'
            >
                {/* Header */}
                <div className='relative bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-xl'>
                    <img 
                        src={assets.closeIcon} 
                        alt="close" 
                        className='absolute top-4 right-4 h-4 w-4 cursor-pointer invert' 
                        onClick={onClose} 
                    />
                    <h2 className='text-white text-2xl font-semibold text-center mt-2'>
                        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className='text-white/80 text-sm text-center mt-2'>
                        {mode === 'login' ? 'Sign in to your account' : 'Join our rental community'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className='p-6'>
                    {mode === 'signup' && (
                        <div className='mb-4'>
                            <label className='block text-gray-700 text-sm font-medium mb-2'>
                                Full Name
                            </label>
                            <input
                                type='text'
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                                placeholder='John Doe'
                                required={mode === 'signup'}
                            />
                        </div>
                    )}

                    <div className='mb-4'>
                        <label className='block text-gray-700 text-sm font-medium mb-2'>
                            Email Address
                        </label>
                        <input
                            type='email'
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                            placeholder='john@example.com'
                            required
                        />
                    </div>

                    <div className='mb-4'>
                        <label className='block text-gray-700 text-sm font-medium mb-2'>
                            Password
                        </label>
                        <input
                            type='password'
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
                            placeholder='••••••••'
                            required
                        />
                    </div>

                    {mode === 'signup' && (
                        <div className='mb-6'>
                            <label className='block text-gray-700 text-sm font-medium mb-3'>
                                Account Type:
                            </label>
                            <div className='flex gap-4'>
                                <button
                                    type='button'
                                    onClick={() => setFormData({...formData, role: 'tenant'})}
                                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                                        formData.role === 'tenant' 
                                        ? 'border-indigo-500 bg-indigo-50' 
                                        : 'border-gray-300 hover:border-indigo-300'
                                    }`}
                                >
                                    <div className='text-center'>
                                        <GraduationCap className='w-7 h-7 mx-auto mb-2 text-indigo-500' />
                                        <div className='font-medium'>Student</div>
                                        <div className='text-xs text-gray-500 mt-1'>Looking for rentals</div>
                                    </div>
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setFormData({...formData, role: 'landlord'})}
                                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                                        formData.role === 'landlord' 
                                        ? 'border-indigo-500 bg-indigo-50' 
                                        : 'border-gray-300 hover:border-indigo-300'
                                    }`}
                                >
                                    <div className='text-center'>
                                        <Building2 className='w-7 h-7 mx-auto mb-2 text-indigo-500' />
                                        <div className='font-medium'>Landlord/Caretaker</div>
                                        <div className='text-xs text-gray-500 mt-1'>List properties</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    <button 
                        type='submit'
                        className='w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-lg font-medium transition-all'
                    >
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>

                    {/* Toggle Mode */}
                    <div className='text-center mt-4'>
                        <button
                            type='button'
                            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                            className='text-sm text-indigo-500 hover:text-indigo-600'
                        >
                            {mode === 'login' 
                                ? "Don't have an account? Sign up" 
                                : "Already have an account? Sign in"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AuthModal
