import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'

const Unsubscribe = () => {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error' | 'invalid'

  useEffect(() => {
    if (!email) {
      setStatus('invalid')
      return
    }

    axios.post('/api/newsletter/unsubscribe', { email })
      .then(res => {
        setStatus(res.data.success ? 'success' : 'error')
      })
      .catch(() => setStatus('error'))
  }, [email])

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 max-w-md w-full text-center'>

        {status === 'loading' && (
          <>
            <div className='w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4' />
            <p className='text-gray-600 dark:text-gray-300'>Unsubscribing...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className='w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-7 h-7 text-green-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
              </svg>
            </div>
            <h1 className='text-xl font-bold text-gray-800 dark:text-gray-100 mb-2'>Unsubscribed</h1>
            <p className='text-gray-500 dark:text-gray-400 text-sm mb-6'>
              <span className='font-medium text-gray-700 dark:text-gray-300'>{email}</span> has been removed from the PataKeja mailing list. You won't receive listing alerts anymore.
            </p>
            <Link to='/' className='inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors'>
              Back to PataKeja
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className='w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-7 h-7 text-red-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </div>
            <h1 className='text-xl font-bold text-gray-800 dark:text-gray-100 mb-2'>Something went wrong</h1>
            <p className='text-gray-500 dark:text-gray-400 text-sm mb-6'>
              We couldn't process your unsubscribe request. Please try again or contact us.
            </p>
            <Link to='/' className='inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors'>
              Back to PataKeja
            </Link>
          </>
        )}

        {status === 'invalid' && (
          <>
            <h1 className='text-xl font-bold text-gray-800 dark:text-gray-100 mb-2'>Invalid link</h1>
            <p className='text-gray-500 dark:text-gray-400 text-sm mb-6'>
              This unsubscribe link is missing an email address. Please use the link from your email.
            </p>
            <Link to='/' className='inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors'>
              Back to PataKeja
            </Link>
          </>
        )}

      </div>
    </div>
  )
}

export default Unsubscribe
