import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react'

const Safety = () => {
  return (
    <div className='max-w-5xl mx-auto px-4 py-16 sm:py-20'>
      <Link to='/' className='inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8'>
        <ArrowLeft className='w-4 h-4' /> Back to Home
      </Link>

      <h1 className='text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100'>Safety Tips</h1>
      <p className='text-gray-500 dark:text-gray-400 mb-10'>Your safety matters. Follow these guidelines when house hunting.</p>

      <div className='space-y-8'>

        {/* For Tenants + For Landlords � side by side on lg screens */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* For Tenants */}
          <section className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4'>
            <div className='flex items-center gap-3 mb-2'>
              <div className='w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center'>
                <Shield className='w-5 h-5 text-indigo-600' />
              </div>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-gray-100'>For Tenants</h2>
            </div>

            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3'>
              <p className='text-blue-800 dark:text-blue-200 text-sm'>Never share your M-Pesa PIN, national ID photos, or personal banking details with anyone claiming to be a landlord.</p>
            </div>

            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3'>
              <p className='text-blue-800 dark:text-blue-200 text-sm'>Ask to see the landlord's ID or ownership documents. Look for the verified badge on listings.</p>
            </div>

            <ul className='list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 text-sm'>
              <li><strong>Visit during daytime.</strong> Schedule viewings between 9 AM and 5 PM. Bring a friend.</li>
              <li><strong>Meet in public first.</strong> Start at a public place before going to the property.</li>
              <li><strong>Trust your instincts.</strong> If something feels wrong, leave immediately.</li>
              <li><strong>Avoid large cash payments.</strong> Use M-Pesa for a clear paper trail.</li>
              <li><strong>Get a written agreement.</strong> Never pay based on verbal promises.</li>
              <li><strong>Check the neighbourhood.</strong> Talk to other tenants about water, security, and the landlord.</li>
              <li><strong>Report suspicious listings.</strong> Use the Report button on any property page.</li>
              <li><strong>Keep records.</strong> Screenshot conversations and save receipts.</li>
            </ul>
          </section>

          {/* For Landlords */}
          <section className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4'>
            <div className='flex items-center gap-3 mb-2'>
              <div className='w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                <Shield className='w-5 h-5 text-green-600' />
              </div>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-gray-100'>For House Owners</h2>
            </div>

            <ul className='list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 text-sm'>
              <li><strong>Verify tenant identity.</strong> Ask for a valid national ID or student ID.</li>
              <li><strong>Use the Platform.</strong> Respond to viewing requests through PataKeja to maintain records.</li>
              <li><strong>Be available.</strong> Your response time is tracked and displayed to tenants.</li>
              <li><strong>Be honest.</strong> Accurately describe your property. Misleading listings lead to bad reviews.</li>
              <li><strong>Written agreements.</strong> Include rent amount, payment date, deposit terms, and notice period.</li>
              <li><strong>Receipts.</strong> Always provide M-Pesa or written receipts for all payments.</li>
            </ul>
          </section>
        </div>

        {/* Red Flags */}
        <section>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center'>
              <AlertTriangle className='w-5 h-5 text-red-600' />
            </div>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-gray-100'>Red Flags to Watch For</h2>
          </div>

          <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5'>
            <ul className='list-disc pl-5 text-red-800 dark:text-red-300 space-y-1.5 text-sm grid sm:grid-cols-2 gap-x-6'>
              <li>Landlord asks for deposit without showing the property in person.</li>
              <li>Price is significantly below market rate for the area.</li>
              <li>Pressure to pay immediately ("someone else is interested").</li>
              <li>Landlord cannot provide ownership proof or a valid ID.</li>
              <li>Property looks different from the listed photos.</li>
              <li>No written agreement or refusal to sign one.</li>
              <li className='sm:col-span-2'>Being asked to send money to a different name/number than the listed owner.</li>
            </ul>
          </div>
        </section>

        {/* Emergency Contacts */}
        <section>
          <h2 className='text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100'>Emergency Contacts</h2>
          <div className='bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 grid sm:grid-cols-3 gap-4'>
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-0.5'>Police Station</p>
              <p className='text-gray-800 dark:text-gray-200 font-semibold'>053-2062222</p>
            </div>
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-0.5'>GBV Hotline</p>
              <p className='text-gray-800 dark:text-gray-200 font-semibold'>1195</p>
            </div>
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-0.5'>PataKeja Support</p>
              <a href='mailto:support@patakejaa.co.ke' className='text-indigo-600 hover:underline font-medium'>support@patakejaa.co.ke</a>
            </div>
          </div>
        </section>

        <section>
          <p className='text-gray-600 dark:text-gray-400 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl'>
            PataKeja is committed to creating a safe rental marketplace. If you encounter any safety issues or suspicious 
            activity, please report it using the Report button on any listing or contact us directly. We take all reports seriously.
          </p>
        </section>
      </div>
    </div>
  )
}

export default Safety
