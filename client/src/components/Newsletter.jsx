import React, { useState } from 'react'
import { assets } from '../assets/assets'
import Title from './Title'
import axios from 'axios'
import toast from 'react-hot-toast'

const Newsletter = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const { data } = await axios.post('/api/newsletter/subscribe', { email })
      if (data.success) {
        setSubscribed(true)
        setEmail('')
        toast.success(data.message)
      } else {
        toast.error(data.message)
      }
    } catch (err) {
      toast.error('Failed to subscribe. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center max-w-5xl lg:w-full rounded-2xl px-4 py-12 md:py-16 mx-2 lg:mx-auto my-30 bg-gray-900 text-white">

        <Title title="Stay Updated" subTitle="Subscribe to get alerts when new verified rental listings matching your preferences become available"/>

        {subscribed ? (
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="text-3xl">🎉</div>
            <p className="text-green-400 font-medium text-lg">You're subscribed!</p>
            <p className="text-gray-400 text-sm text-center">We'll email you whenever new listings go live.</p>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col md:flex-row items-center justify-center gap-4 mt-6 w-full max-w-xl">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-white/10 px-4 py-2.5 border border-white/20 rounded outline-none flex-1 w-full placeholder-white/40"
              placeholder="Enter your email"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 group bg-black px-4 md:px-7 py-2.5 rounded active:scale-95 transition-all disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? 'Subscribing...' : 'Subscribe'}
              {!loading && <img src={assets.arrowIcon} alt="" className='w-3.5 invert group-hover:translate-x-1 transition-all' />}
            </button>
          </form>
        )}

        <p className="text-gray-500 mt-6 text-xs text-center">Get notified about new listings, price drops, and exclusive rental deals. Unsubscribe anytime.</p>
    </div>
  )
}

export default Newsletter