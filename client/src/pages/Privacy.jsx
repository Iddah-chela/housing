import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const Privacy = () => {
  return (
    <div className='max-w-4xl mx-auto px-4 py-16 sm:py-20'>
      <Link to='/' className='inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8'>
        <ArrowLeft className='w-4 h-4' /> Back to Home
      </Link>

      <h1 className='text-3xl font-bold mb-2'>Privacy Policy</h1>
      <p className='text-gray-500 mb-8'>Last updated: {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className='prose prose-gray max-w-none space-y-6'>
        <section>
          <h2 className='text-xl font-semibold mb-3'>1. Information We Collect</h2>
          <p className='text-gray-700 mb-2'>We collect the following types of information:</p>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li><strong>Account Information:</strong> Name, email address, profile picture (via Clerk authentication).</li>
            <li><strong>Phone Number:</strong> Provided during payment for M-Pesa STK push processing.</li>
            <li><strong>Property Data:</strong> Listings, photos, addresses, and contact details uploaded by landlords.</li>
            <li><strong>Usage Data:</strong> Pages visited, search queries, viewing requests, and booking history.</li>
            <li><strong>Payment Data:</strong> Transaction references and payment status (processed securely by IntaSend; we do not store M-Pesa PINs).</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>2. How We Use Your Information</h2>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li>To operate the Platform and provide our services.</li>
            <li>To process payments and unlock property contact details.</li>
            <li>To send notifications about viewing requests and bookings.</li>
            <li>To send newsletter updates about new listings (if subscribed).</li>
            <li>To detect and prevent fraud, abuse, and policy violations.</li>
            <li>To improve the Platform through analytics and user feedback.</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>3. Information Sharing</h2>
          <p className='text-gray-700 mb-2'>We share your information only in these cases:</p>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li><strong>Between Tenants & Landlords:</strong> When you unlock a property, the landlord's contact details are shared with you. Your viewing request details and messages are shared with the property owner.</li>
            <li><strong>Payment Processors:</strong> IntaSend processes your M-Pesa payments and receives your phone number.</li>
            <li><strong>Authentication:</strong> Clerk handles your sign-in and basic account data.</li>
            <li><strong>Legal Requirements:</strong> We may disclose data if required by Kenyan law or a valid court order.</li>
          </ul>
          <p className='text-gray-700 mt-2'>We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>4. Data Storage & Security</h2>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li>Your data is stored in MongoDB databases with encryption at rest.</li>
            <li>Images are stored on Cloudinary with secure URLs.</li>
            <li>All API communications use HTTPS encryption.</li>
            <li>We implement industry-standard security measures but cannot guarantee absolute security.</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>5. Your Rights</h2>
          <p className='text-gray-700 mb-2'>Under the Kenya Data Protection Act, 2019, you have the right to:</p>
          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li>Access your personal data held by us.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data (subject to legal retention requirements).</li>
            <li>Withdraw consent for marketing communications at any time.</li>
            <li>Lodge a complaint with the Office of the Data Protection Commissioner.</li>
          </ul>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>6. Cookies & Local Storage</h2>
          <p className='text-gray-700 leading-relaxed'>
            We use cookies and local storage for authentication (Clerk session), user preferences, and basic analytics. 
            You can clear these through your browser settings, though this may affect Platform functionality.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>7. Data Retention</h2>
          <p className='text-gray-700 leading-relaxed'>
            We retain your account data for as long as your account is active. Viewing requests expire after 48 hours. 
            Payment records are retained for 7 years as required by Kenyan tax regulations. You may request account 
            deletion by contacting us.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>8. Changes to This Policy</h2>
          <p className='text-gray-700 leading-relaxed'>
            We may update this Privacy Policy from time to time. Material changes will be communicated via email 
            or a prominent notice on the Platform. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className='text-xl font-semibold mb-3'>9. Contact Us</h2>
          <p className='text-gray-700 leading-relaxed'>
            For privacy-related inquiries, contact our Data Protection Officer at{' '}
            <a href='mailto:privacy@CampusCrib.co.ke' className='text-indigo-600 hover:underline'>privacy@CampusCrib.co.ke</a>.
          </p>
        </section>
      </div>
    </div>
  )
}

export default Privacy
