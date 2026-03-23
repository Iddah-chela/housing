import React, { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const statusBadgeClass = (status) => {
  const key = String(status || '').toLowerCase()
  if (key === 'approved' || key === 'verified') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  if (key === 'rejected') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  if (key === 'more_info_required') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
}

const formatStatus = (status) => String(status || 'pending').replaceAll('_', ' ')

const MyClaims = () => {
  const { user, getToken, axios } = useAppContext()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState([])

  const approvedCount = useMemo(() => claims.filter((c) => c.status === 'approved').length, [claims])
  const pendingCount = useMemo(() => claims.filter((c) => c.status === 'pending').length, [claims])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchClaims = async () => {
      try {
        const token = await getToken()
        const { data } = await axios.get('/api/properties/claims/my', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (data?.success) {
          setClaims(Array.isArray(data.claims) ? data.claims : [])
        } else {
          toast.error(data?.message || 'Failed to load claims')
        }
      } catch (error) {
        toast.error('Failed to load claims')
      } finally {
        setLoading(false)
      }
    }

    fetchClaims()
  }, [user])

  if (!user) {
    return (
      <div className='py-28 md:pt-32 px-4 md:px-16 lg:px-24 xl:px-32'>
        <h1 className='text-3xl font-medium'>My Claims</h1>
        <p className='mt-3 text-gray-600 dark:text-gray-400'>Please sign in to view your listing claim requests.</p>
      </div>
    )
  }

  return (
    <div className='py-28 md:pt-32 px-4 md:px-16 lg:px-24 xl:px-32'>
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
        <div>
          <h1 className='text-3xl font-medium'>My Claims</h1>
          <p className='mt-1 text-gray-600 dark:text-gray-400'>Track your listing claim requests and what to do next.</p>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span className='px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'>Pending: {pendingCount}</span>
          <span className='px-3 py-1.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'>Approved: {approvedCount}</span>
        </div>
      </div>

      {loading ? (
        <div className='mt-6 grid gap-3'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='h-28 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse bg-gray-50 dark:bg-gray-800' />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className='mt-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center'>
          <p className='font-medium'>No claims submitted yet.</p>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>Open any directory listing and use Claim This Hostel to get started.</p>
          <button
            onClick={() => navigate('/rooms')}
            className='mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium'
          >
            Browse Listings
          </button>
        </div>
      ) : (
        <div className='mt-6 grid gap-4'>
          {claims.map((claim) => {
            const property = claim.property || {}
            const image = property.images?.[0]
            const isApproved = claim.status === 'approved'
            const isPending = claim.status === 'pending'

            return (
              <div key={claim._id} className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-5'>
                <div className='flex flex-col md:flex-row gap-4'>
                  <div className='w-full md:w-40 h-28 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center'>
                    {image ? (
                      <img src={image} alt={property.name || 'Property'} className='w-full h-full object-cover' />
                    ) : (
                      <span className='text-xs text-gray-500'>No Image</span>
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h2 className='text-lg font-semibold'>{property.name || 'Listing'}</h2>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(claim.status)}`}>
                        {formatStatus(claim.status)}
                      </span>
                    </div>

                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      {property.estate || 'Estate'}, {property.place || 'Location'}
                    </p>

                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
                      Submitted: {new Date(claim.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>

                    {claim.reviewNote && (
                      <p className='mt-2 text-sm rounded-lg p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'>
                        Review note: {claim.reviewNote}
                      </p>
                    )}

                    <div className='mt-3 flex flex-wrap gap-2'>
                      <button
                        onClick={() => navigate(`/rooms/${property._id}`)}
                        className='px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700'
                      >
                        View Listing
                      </button>

                      {isPending && (
                        <span className='px-3 py-1.5 rounded-md text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'>
                          Waiting for admin review
                        </span>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => navigate('/owner')}
                          className='px-3 py-1.5 rounded-md bg-emerald-700 text-white text-sm hover:bg-emerald-800'
                        >
                          Open Owner Dashboard
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyClaims
