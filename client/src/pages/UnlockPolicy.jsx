import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const UnlockPolicy = () => {
  return (
    <div className='max-w-4xl mx-auto px-4 py-16 sm:py-20'>
      <Link to='/' className='inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8'>
        <ArrowLeft className='w-4 h-4' /> Back to Home
      </Link>

      <h1 className='text-3xl font-bold mb-2'>Unlock & Pass Policy</h1>
      <p className='text-gray-500 mb-8'>Last updated: {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className='prose prose-gray max-w-none space-y-6'>
        <section>
          <h2 className='text-xl font-semibold mb-3'>How It Works</h2>
          <p className='text-gray-700 leading-relaxed'>
            PataKeja uses a browsing pass system. Once you purchase a pass, you can view owner contact details 
            (phone number, WhatsApp, exact address) for <strong>all properties</strong> on the Platform for the duration 
            of your pass.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>Pass Options</h2>
          <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4'>
            <div className='flex items-start gap-4'>
              <div className='bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap'>Free Trial</div>
              <div>
                <p className='text-gray-700'>New users may receive up to <strong>2 free property unlocks</strong> upon signing up. This lets you try the service before paying.</p>
              </div>
            </div>
            <div className='flex items-start gap-4'>
              <div className='bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap'>1-Day Pass</div>
              <div>
                <p className='text-gray-700'><strong>Ksh 100</strong> — Full access to all owner contact details for 24 hours. Ideal for a quick search in one day.</p>
              </div>
            </div>
            <div className='flex items-start gap-4'>
              <div className='bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap'>7-Day Pass</div>
              <div>
                <p className='text-gray-700'><strong>Ksh 300</strong> — Full access for 7 days. Best for active house hunters comparing multiple properties.</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>Payment Process</h2>
          <ol className='list-decimal pl-6 text-gray-700 space-y-2'>
            <li>Click "Unlock" on any property page.</li>
            <li>Enter your M-Pesa phone number (Safaricom).</li>
            <li>An STK push notification will appear on your phone.</li>
            <li>Enter your M-Pesa PIN to complete payment.</li>
            <li>Click "Verify Payment" — once confirmed, your pass activates immediately.</li>
          </ol>
          <p className='text-gray-700 mt-2'>Payments are processed securely through IntaSend, a licensed Kenyan payment gateway.</p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>What You Get</h2>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li>Landlord's phone number for direct calls.</li>
            <li>Direct WhatsApp link to message landlords instantly.</li>
            <li>Exact property address and plot number.</li>
            <li>Ability to request property viewings.</li>
            <li>In-app messaging with property owners.</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>Refund Policy</h2>
          <p className='text-gray-700 leading-relaxed'>
            Passes are <strong>non-refundable</strong> once activated, as they provide immediate access to contact 
            information that cannot be "un-seen." However, if you experience a technical issue with payment 
            (e.g., money deducted but pass not activated), contact us within 24 hours and we will resolve it.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>Pass Expiration</h2>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li>Passes expire at the exact time they were activated (e.g., a 7-day pass bought at 2 PM expires at 2 PM seven days later).</li>
            <li>After expiration, contact details are hidden again until you purchase a new pass.</li>
            <li>Viewing requests and bookings made during an active pass remain valid after expiry.</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>Fair Use</h2>
          <p className='text-gray-700 leading-relaxed'>
            Passes are for personal use only. Sharing, reselling, or distributing unlocked contact information 
            in bulk is prohibited and may result in account suspension.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>Questions?</h2>
          <p className='text-gray-700 leading-relaxed'>
            Contact us at <a href='mailto:support@PataKeja.co.ke' className='text-indigo-600 hover:underline'>support@PataKeja.co.ke</a> for 
            payment issues or pass-related questions.
          </p>
        </section>
      </div>
    </div>
  )
}

export default UnlockPolicy
