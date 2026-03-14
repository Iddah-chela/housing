import React, { useState } from 'react'
import { assets } from '../assets/assets'

const Footer = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
      await fetch(`${backendUrl}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      setStatus('done')
      setEmail('')
    } catch {
      setStatus('error')
    }
  }

  return (
   <div className='bg-[#F6F9FC] dark:bg-gray-800 text-gray-500/80 dark:text-gray-400 pt-8 px-6 md:px-16 lg:px-24 xl:px-32'>
            <div className='flex flex-wrap justify-between gap-12 md:gap-6'>
                <div className='max-w-80'>
                    <img src={assets.logo} alt="logo" className='mb-4 h-20 md:h-27  invert opacity-80' />
                    <p className='text-sm leading-relaxed'>
                        Find verified student housing near University of Eldoret. No brokers. No scams. Just honest listings.
                    </p>
                </div>

                <div>
                    <p className='font-playfair text-base text-gray-800 dark:text-gray-200 mb-3'>QUICK LINKS</p>
                    <ul className='flex flex-col gap-2 text-sm'>
                        <li><a href='/' className='hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>Home</a></li>
                        <li><a href='/rooms' className='hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>Browse Houses</a></li>
                        <li><a href='/about' className='hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>About Us</a></li>
                        <li><a href='/#how-it-works' className='hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>How It Works</a></li>
                        <li><a href='mailto:support@patakejaa.co.ke' className='hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>Contact Us</a></li>
                    </ul>
                </div>

                <div>
                    <p className='font-playfair text-base text-gray-800 dark:text-gray-200 mb-3'>LEGAL</p>
                    <ul className='flex flex-col gap-2 text-sm'>
                        <li><a href='/terms' className='hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>Terms of Service</a></li>
                        <li><a href='/privacy' className='hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>Privacy Policy</a></li>
                        <li><a href='/unlock-policy' className='hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>Unlock Fee Policy</a></li>
                        <li><a href='/safety' className='hover:text-gray-700 dark:hover:text-gray-200 transition-colors'>Safety Tips</a></li>
                    </ul>
                </div>

                <div className='max-w-72'>
                    <p className='font-playfair text-base text-gray-800 dark:text-gray-200 mb-3'>STAY UPDATED</p>
                    <p className='text-sm mb-3'>New listings and housing tips to your inbox.</p>
                    {status === 'done' ? (
                      <p className='text-sm text-green-600 font-medium'>? You're subscribed!</p>
                    ) : (
                      <form onSubmit={handleSubscribe} className='flex items-center'>
                        <input
                          type='email'
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className='bg-white dark:bg-gray-700 rounded-l border border-gray-300 dark:border-gray-600 h-9 px-3 outline-none text-sm flex-1 min-w-0 dark:text-gray-200'
                          placeholder='Your email'
                          required
                        />
                        <button
                          type='submit'
                          disabled={status === 'loading'}
                          className='flex items-center justify-center bg-black h-9 w-9 shrink-0 rounded-r hover:bg-gray-800 transition-colors'
                        >
                          <img src={assets.arrowIcon} alt='' className='w-3.5 invert'/>
                        </button>
                      </form>
                    )}
                    {status === 'error' && <p className='text-xs text-red-500 mt-1'>Something went wrong. Try again.</p>}
                </div>
            </div>
            <hr className='border-gray-300 dark:border-gray-600 mt-8' />
            <div className='flex flex-col md:flex-row gap-2 items-center justify-between py-5'>
                <p className='text-sm'>� {new Date().getFullYear()} PataKeja. All rights reserved.</p>
                <ul className='flex items-center gap-4 text-sm'>
                    <li><a href='/privacy' className='hover:text-gray-700'>Privacy</a></li>
                    <li><a href='/terms' className='hover:text-gray-700'>Terms</a></li>
                </ul>
            </div>
        </div>
  )
}

export default Footer
