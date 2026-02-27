import React from 'react'
import { assets } from '../assets/assets'

const About = () => {
  return (
    <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
      {/* Hero Section */}
      <div className='text-center mb-16'>
        <h1 className='text-4xl md:text-5xl font-playfair font-bold text-gray-800 mb-4'>
          About Us
        </h1>
        <p className='text-lg text-gray-600 max-w-3xl mx-auto'>
          Your trusted platform for finding safe, verified long-term rentals with confidence
        </p>
      </div>

      {/* Mission Section */}
      <div className='grid md:grid-cols-2 gap-12 items-center mb-20'>
        <div>
          <h2 className='text-3xl font-playfair font-semibold text-gray-800 mb-4'>
            Our Mission
          </h2>
          <p className='text-gray-600 leading-relaxed mb-4'>
            We're revolutionizing the rental experience by putting trust and transparency first. 
            Our platform connects renters with verified property owners, making the process of 
            finding your next home safe, simple, and stress-free.
          </p>
          <p className='text-gray-600 leading-relaxed'>
            Unlike traditional listing sites, we guide you through every step - from initial viewing 
            requests to final move-in, ensuring both renters and property owners are protected throughout 
            the journey.
          </p>
        </div>
        <div className='rounded-xl overflow-hidden shadow-lg'>
          <img 
            src={assets.heroImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'} 
            alt="Modern rental property" 
            className='w-full h-full object-cover'
          />
        </div>
      </div>

      {/* Features Section */}
      <div className='mb-20'>
        <h2 className='text-3xl font-playfair font-semibold text-gray-800 text-center mb-12'>
          Why Choose Us
        </h2>
        <div className='grid md:grid-cols-3 gap-8'>
          <div className='text-center p-6'>
            <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-8 h-8 text-primary' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className='text-xl font-semibold text-gray-800 mb-2'>Verified Listings</h3>
            <p className='text-gray-600'>
              All properties and owners go through our verification process to ensure authenticity and safety
            </p>
          </div>

          <div className='text-center p-6'>
            <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-8 h-8 text-primary' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className='text-xl font-semibold text-gray-800 mb-2'>Viewing Requests</h3>
            <p className='text-gray-600'>
              Schedule property viewings directly with owners and track your requests in real-time
            </p>
          </div>

          <div className='text-center p-6'>
            <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-8 h-8 text-primary' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className='text-xl font-semibold text-gray-800 mb-2'>Direct Communication</h3>
            <p className='text-gray-600'>
              Chat directly with property owners to ask questions and negotiate terms transparently
            </p>
          </div>
        </div>
      </div>

      {/* Trust & Safety Section */}
      <div className='bg-gray-50 rounded-2xl p-8 md:p-12 mb-20'>
        <h2 className='text-3xl font-playfair font-semibold text-gray-800 text-center mb-8'>
          Trust & Safety First
        </h2>
        <div className='grid md:grid-cols-2 gap-8'>
          <div className='flex items-start gap-4'>
            <div className='flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center'>
              <svg className='w-6 h-6 text-green-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>Phone & ID Verification</h3>
              <p className='text-gray-600'>
                Property owners verify their identity to build trust with potential renters
              </p>
            </div>
          </div>

          <div className='flex items-start gap-4'>
            <div className='flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center'>
              <svg className='w-6 h-6 text-green-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>Property Verification</h3>
              <p className='text-gray-600'>
                Houses are verified with photos and location pins to prevent fake listings
              </p>
            </div>
          </div>

          <div className='flex items-start gap-4'>
            <div className='flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center'>
              <svg className='w-6 h-6 text-green-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>Report System</h3>
              <p className='text-gray-600'>
                Users can report suspicious listings or behavior for admin review
              </p>
            </div>
          </div>

          <div className='flex items-start gap-4'>
            <div className='flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center'>
              <svg className='w-6 h-6 text-green-600' fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>Auto-Expire Protection</h3>
              <p className='text-gray-600'>
                Viewing requests automatically expire after 48 hours to keep listings available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className='text-center bg-primary/5 rounded-2xl p-12'>
        <h2 className='text-3xl font-playfair font-semibold text-gray-800 mb-4'>
          Ready to Find Your Next Home?
        </h2>
        <p className='text-gray-600 mb-8 max-w-2xl mx-auto'>
          Join thousands of renters who have found their perfect home through our trusted platform
        </p>
        <button 
          onClick={() => window.location.href = '/rooms'}
          className='px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dull transition-all font-medium'
        >
          Browse Available Rentals
        </button>
      </div>
    </div>
  )
}

export default About
