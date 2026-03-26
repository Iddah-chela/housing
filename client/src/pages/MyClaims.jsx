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

const getClaimJourney = (status, claimRole) => {
  const key = String(status || 'pending').toLowerCase()
  const role = String(claimRole || '').toLowerCase()
  const manageLabel = role === 'caretaker' ? 'Manage Houses' : 'My Listings'
  if (key === 'approved') {
    return {
      stage: 'Approved',
      next: `Open ${manageLabel} and complete room grid, rent pricing, contact, and landlord display name to go live.`,
    }
  }
  if (key === 'rejected') {
    return {
      stage: 'Needs Resubmission',
      next: 'Review admin note, then submit a new claim with stronger proof.',
    }
  }
  if (key === 'more_info_required') {
    return {
      stage: 'More Info Required',
      next: 'Provide requested verification details to continue review.',
    }
  }
  return {
    stage: 'Under Review',
    next: 'Admin is verifying ownership/caretaker proof.',
  }
}

const getListingTypeLabel = (property) => {
  const tier = String(property?.listingTier || '').toLowerCase()
  const source = String(property?.sourceType || '').toLowerCase()
  if (tier === 'live') return 'Live'
  if (tier === 'claimed') return 'Owner Updating Details'
  if (source === 'field_list') return 'Partner Listing'
  return 'Partner Listing'
}

const MyClaims = () => {
  const { user, getToken, axios } = useAppContext()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState([])

  const approvedCount = useMemo(() => claims.filter((c) => c.status === 'approved').length, [claims])
  const pendingCount = useMemo(() => claims.filter((c) => c.status === 'pending').length, [claims])

  const fetchClaims = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const token = await getToken()
      const { data } = await axios.get('/api/properties/claims/my', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data?.success) {
        setClaims(Array.isArray(data.claims) ? data.claims : [])
      } else if (!silent) {
        toast.error(data?.message || 'Failed to load claims')
      }
    } catch (error) {
      if (!silent) toast.error('Failed to load claims')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    fetchClaims()
  }, [user])

  useEffect(() => {
    if (!user) return undefined
    const timer = setInterval(() => fetchClaims({ silent: true }), 45000)
    return () => clearInterval(timer)
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
          <p className='mt-1 text-gray-600 dark:text-gray-400'>Track review progress, admin notes, and your next action.</p>
        </div>
        <div className='flex items-center gap-2 text-sm flex-wrap'>
          <span className='px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'>Pending: {pendingCount}</span>
          <span className='px-3 py-1.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'>Approved: {approvedCount}</span>
          <button
            onClick={() => fetchClaims()}
            className='px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
          >
            Refresh
          </button>
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
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>Open any partner listing and use Claim to get started.</p>
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
            const isCaretakerClaim = String(claim.claimRole || '').toLowerCase() === 'caretaker'
            const manageRoute = isCaretakerClaim ? '/managed-properties' : '/owner/list-room'
            const manageLabel = isCaretakerClaim ? 'Manage Houses' : 'My Listings'
            const journey = getClaimJourney(claim.status, claim.claimRole)
            const readiness = property.liveReadiness || {}
            const missing = Array.isArray(readiness.missing) ? readiness.missing : []

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
                      <span className='px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'>
                        {getListingTypeLabel(property)}
                      </span>
                    </div>

                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      {property.estate || 'Estate'}, {property.place || 'Location'}
                    </p>

                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
                      Submitted: {new Date(claim.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>

                    <div className='mt-2 rounded-lg p-2 border border-indigo-100 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/20'>
                      <p className='text-xs font-semibold text-indigo-700 dark:text-indigo-300'>Stage: {journey.stage}</p>
                      <p className='text-xs text-indigo-700/90 dark:text-indigo-300 mt-0.5'>Next: {journey.next}</p>
                    </div>

                    {isApproved && missing.length > 0 && (
                      <div className='mt-2 rounded-lg p-2 border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'>
                        <p className='text-xs font-semibold text-amber-800 dark:text-amber-300'>Still missing for live:</p>
                        <p className='text-xs text-amber-800/90 dark:text-amber-300 mt-0.5'>{missing.join(', ')}</p>
                      </div>
                    )}

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
                          onClick={() => navigate(manageRoute)}
                          className='px-3 py-1.5 rounded-md bg-emerald-700 text-white text-sm hover:bg-emerald-800'
                        >
                          Open {manageLabel}
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
