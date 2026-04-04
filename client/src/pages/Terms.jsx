import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const Terms = () => {
  return (
    <div className='max-w-4xl mx-auto px-4 py-16 sm:py-20'>
      <Link to='/' className='inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8'>
        <ArrowLeft className='w-4 h-4' /> Back to Home
      </Link>

      <h1 className='text-3xl font-bold mb-2'>Terms of Service</h1>
      <p className='text-gray-500 mb-8'>Last updated: {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className='prose prose-gray max-w-none space-y-6'>
        <section>
          <h2 className='text-xl font-semibold mb-3'>1. Acceptance of Terms</h2>
          <p className='text-gray-700 leading-relaxed'>
            By accessing or using PataKeja ("the Platform"), you agree to be bound by these Terms of Service. 
            PataKeja is a rental listing platform that connects tenants with property owners and caretakers 
            in Kenya, primarily around university areas. If you do not agree with these terms, please do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>2. Description of Service</h2>
          <p className='text-gray-700 leading-relaxed'>
            PataKeja provides an online marketplace where property owners can list rental properties and tenants can 
            browse, unlock contact details, request viewings, and book rooms. The Platform facilitates connections 
            but is not a party to any rental agreement between property owners and tenants.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>3. User Accounts</h2>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li>You must provide accurate information when creating your account.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must be at least 18 years old to use the Platform.</li>
            <li>One person may only maintain one account. Duplicate accounts may be suspended.</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>4. Listings & Property Information</h2>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li>Property owners are solely responsible for the accuracy of their property listings.</li>
            <li>PataKeja does not verify or guarantee the condition, legality, or availability of listed properties.</li>
            <li>Listings that expire (no updates in 60 days) are automatically delisted.</li>
            <li>PataKeja reserves the right to remove any listing that violates these terms or applicable laws.</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>5. Payments & Unlocking</h2>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li>Unlocking owner contact details requires purchasing a browsing pass via M-Pesa (Ksh 25 for 1 day, Ksh 250 for 7 days). First 2 property views are free.</li>
            <li>Payments are processed through IntaSend, a licensed Kenyan payment service provider.</li>
            <li>Passes are non-refundable once activated, as they provide immediate access to contact information.</li>
            <li>Free trial unlocks may be available to new users, subject to change without notice.</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>6. Prohibited Conduct</h2>
          <p className='text-gray-700 mb-2'>Users shall not:</p>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li>Post false, misleading, or fraudulent property listings.</li>
            <li>Harass, threaten, or abuse other users.</li>
            <li>Attempt to circumvent payment requirements.</li>
            <li>Use the Platform for any unlawful purpose.</li>
            <li>Scrape, copy, or redistribute Platform data without written permission.</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>7. Limitation of Liability</h2>
          <p className='text-gray-700 leading-relaxed'>
            PataKeja acts solely as an intermediary. We are not responsible for the quality of any rental property, 
            the conduct of any user, or any disputes between property owners and tenants. Use the Platform at your own risk. 
            Our total liability shall not exceed the amount you have paid to us in the 12 months preceding any claim.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>8. Intellectual Property</h2>
          <p className='text-gray-700 leading-relaxed'>
            All content on the Platform, including the PataKeja name, logo, design, and software, is our intellectual 
            property. User-uploaded content (photos, descriptions) remains the property of the uploader, but you grant 
            PataKeja a non-exclusive license to display it on the Platform.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>9. Termination</h2>
          <p className='text-gray-700 leading-relaxed'>
            We may suspend or terminate your account at any time if you violate these terms. You may delete your 
            account at any time. Upon termination, any active passes will be forfeited.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>10. Governing Law</h2>
          <p className='text-gray-700 leading-relaxed'>
            These terms are governed by the laws of the Republic of Kenya. Any disputes shall be subject to the 
            exclusive jurisdiction of the courts in Eldoret, Uasin Gishu County, Kenya.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>11. Contact</h2>
          <p className='text-gray-700 leading-relaxed'>
            For questions about these terms, contact us at <a href='mailto:support@patakejaa.co.ke' className='text-indigo-600 hover:underline'>support@patakejaa.co.ke</a>.
          </p>
        </section>
      </div>
    </div>
  )
}

export default Terms
