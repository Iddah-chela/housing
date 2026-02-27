import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, AlertTriangle, Phone, Eye } from 'lucide-react'

const Safety = () => {
  return (
    <div className='max-w-4xl mx-auto px-4 py-16 sm:py-20'>
      <Link to='/' className='inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8'>
        <ArrowLeft className='w-4 h-4' /> Back to Home
      </Link>

      <h1 className='text-3xl font-bold mb-2'>Safety Tips</h1>
      <p className='text-gray-500 mb-8'>Your safety matters. Follow these guidelines when house hunting.</p>

      <div className='prose prose-gray max-w-none space-y-8'>
        {/* For Tenants */}
        <section>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center'>
              <Shield className='w-5 h-5 text-indigo-600' />
            </div>
            <h2 className='text-xl font-semibold'>For Tenants</h2>
          </div>

          <div className='space-y-4'>
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <div className='flex items-start gap-3'>
                <Eye className='w-5 h-5 text-blue-600 mt-0.5 shrink-0' />
                <div>
                  <h3 className='font-medium text-blue-900 mb-1'>Always Visit in Person</h3>
                  <p className='text-blue-800 text-sm'>Never pay rent or deposit without physically visiting the property. Request a viewing through CampusCrib to have a record of your visit.</p>
                </div>
              </div>
            </div>

            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <div className='flex items-start gap-3'>
                <Phone className='w-5 h-5 text-blue-600 mt-0.5 shrink-0' />
                <div>
                  <h3 className='font-medium text-blue-900 mb-1'>Verify the Landlord</h3>
                  <p className='text-blue-800 text-sm'>Check that the person showing you the property matches the contact details on CampusCrib. Ask to see their ID or ownership documents. Look for the verified badge on listings.</p>
                </div>
              </div>
            </div>

            <ul className='list-disc pl-6 text-gray-700 space-y-2'>
              <li><strong>Visit during daytime.</strong> Schedule viewings between 9 AM and 5 PM. Bring a friend for the first visit.</li>
              <li><strong>Meet in public first.</strong> If meeting a landlord for the first time, start at a public place nearby before going to the property.</li>
              <li><strong>Trust your instincts.</strong> If something feels wrong, leave immediately. A good deal isn't worth your safety.</li>
              <li><strong>Don't carry large amounts of cash.</strong> Use M-Pesa for deposits and rent whenever possible for a clear paper trail.</li>
              <li><strong>Get a written agreement.</strong> Always sign a lease/tenancy agreement before paying. Never pay based on verbal promises.</li>
              <li><strong>Check the neighbourhood.</strong> Talk to other tenants in the compound. Ask about water, electricity, security, and the landlord's responsiveness.</li>
              <li><strong>Report suspicious listings.</strong> If a listing seems too good to be true, use the Report button on the property page.</li>
              <li><strong>Keep records.</strong> Screenshot conversations, save receipts, and keep copies of all signed documents.</li>
            </ul>
          </div>
        </section>

        {/* For Landlords */}
        <section>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-full bg-green-100 flex items-center justify-center'>
              <Shield className='w-5 h-5 text-green-600' />
            </div>
            <h2 className='text-xl font-semibold'>For Landlords</h2>
          </div>

          <ul className='list-disc pl-6 text-gray-700 space-y-2'>
            <li><strong>Verify tenant identity.</strong> Ask for a valid national ID or student ID before signing any agreement.</li>
            <li><strong>Use the Platform.</strong> Respond to viewing requests through CampusCrib to maintain a record of all interactions.</li>
            <li><strong>Be available.</strong> Respond to viewing requests promptly. Your response time is tracked and displayed to tenants.</li>
            <li><strong>Be honest.</strong> Accurately describe your property. Misleading listings lead to bad reviews and potential delisting.</li>
            <li><strong>Written agreements.</strong> Always provide a written tenancy agreement. Include rent amount, payment date, deposit terms, and notice period.</li>
            <li><strong>Receipts.</strong> Always provide M-Pesa or written receipts for all payments received.</li>
          </ul>
        </section>

        {/* Red Flags */}
        <section>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-full bg-red-100 flex items-center justify-center'>
              <AlertTriangle className='w-5 h-5 text-red-600' />
            </div>
            <h2 className='text-xl font-semibold'>Red Flags to Watch For</h2>
          </div>

          <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
            <ul className='list-disc pl-6 text-red-800 space-y-2'>
              <li>Landlord asks for deposit without showing the property in person.</li>
              <li>Price is significantly below market rate for the area.</li>
              <li>Pressure to pay immediately ("someone else is interested").</li>
              <li>Landlord cannot provide ownership proof or a valid ID.</li>
              <li>Property looks different from the listed photos.</li>
              <li>No written agreement or refusal to sign one.</li>
              <li>Being asked to send money to a different name/number than the listed owner.</li>
            </ul>
          </div>
        </section>

        {/* Emergency Contacts */}
        <section>
          <h2 className='text-xl font-semibold mb-3'>Emergency Contacts</h2>
          <div className='bg-gray-50 rounded-lg p-4 space-y-2'>
            <p className='text-gray-700'><strong>Kenya Police:</strong> 999 / 112</p>
            <p className='text-gray-700'><strong>Eldoret Police Station:</strong> 053-2062222</p>
            <p className='text-gray-700'><strong>Gender-Based Violence Hotline:</strong> 1195</p>
            <p className='text-gray-700'><strong>CampusCrib Support:</strong> <a href='mailto:safety@CampusCrib.co.ke' className='text-indigo-600 hover:underline'>safety@CampusCrib.co.ke</a></p>
          </div>
        </section>

        <section>
          <p className='text-gray-600 text-sm bg-gray-50 p-4 rounded-lg'>
            CampusCrib is committed to creating a safe rental marketplace. If you encounter any safety issues or suspicious 
            activity, please report it using the Report button on any listing or contact us directly. We take all reports seriously.
          </p>
        </section>
      </div>
    </div>
  )
}

export default Safety
