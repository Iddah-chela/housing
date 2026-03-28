import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { assets, facilityIcons } from '../assets/assets'
import ChatInterface from '../components/ChatInterface'
import ViewingRequestForm from '../components/ViewingRequestForm'
import ReportModal from '../components/ReportModal'
import VerificationBadge from '../components/VerificationBadge'
import PaymentModal from '../components/PaymentModal'
import { useAppContext } from '../context/AppContext'
import { toast } from 'react-hot-toast'
import { SignInButton, SignUpButton } from '@clerk/clerk-react'
import { Gift, Lock, Unlock, Key, CreditCard, MessageCircle, Smartphone, PartyPopper, Check, Share2, Copy, Users, User as UserIcon } from 'lucide-react'
import { PropertyDetailSkeleton } from '../components/Skeletons'

const PropertyDetails = () => {
    const {id} = useParams() // This is now property ID, not room ID
  const { user, getToken, axios, darkMode, isOwner, isAdmin, navigate } = useAppContext()
    const [property, setProperty] = useState(null)
    const [selectedBuilding, setSelectedBuilding] = useState(0)
    const [zoomedBuilding, setZoomedBuilding] = useState(null)
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [mainImage, setMainImage] = useState(null)
    const [showChat, setShowChat] = useState(false)
    const [showViewingForm, setShowViewingForm] = useState(false)
    const [showDirectApplyForm, setShowDirectApplyForm] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [unlockData, setUnlockData] = useState(null)
    const [isFreeUnlock, setIsFreeUnlock] = useState(null)  // null = checking, true = free, false = paid
    const [freeReason, setFreeReason] = useState(null) // 'signup' or 'referral'
    const [referralInfo, setReferralInfo] = useState(null)
    const [referralCopied, setReferralCopied] = useState(false)
    const [loading, setLoading] = useState(true)
    const [showGuestPayment, setShowGuestPayment] = useState(false)
    const [claimData, setClaimData] = useState(null)
    const [showClaimForm, setShowClaimForm] = useState(false)
    const [claimSubmitting, setClaimSubmitting] = useState(false)
    const [alertSubmitting, setAlertSubmitting] = useState(false)
    const [claimForm, setClaimForm] = useState({
      claimantName: '',
      claimPhone: '',
      claimRole: 'owner',
      landlordPhone: '',
      landlordEmail: '',
      claimNotes: '',
    })
    const [claimEvidenceFiles, setClaimEvidenceFiles] = useState([])

    useEffect(()=>{
      const fetchProperty = async () => {
        try {
          setLoading(true)

          // Build optional headers so backend can decide whether to include contact info
          const headers = {}
          // 1) Auth token for logged-in users
          const token = await getToken().catch(() => null)
          if (token) headers['Authorization'] = `Bearer ${token}`
          // 2) Stored guest unlock token
          try {
            const guestUnlocks = JSON.parse(localStorage.getItem('guestUnlocks') || '{}')
            const guestData = guestUnlocks[id]
            if (guestData?.unlockId && guestData?.expiresAt && new Date(guestData.expiresAt) > new Date()) {
              headers['x-guest-token'] = guestData.unlockId
            }
          } catch (_) {}

          const response = await axios.get(`/api/properties/${id}`, { headers })
          // using context axios (has correct baseURL)
          
          if(response.data.success) {
            const fetchedProperty = response.data.property
            setProperty(fetchedProperty)
            setMainImage(fetchedProperty.images[0])
          } else {
            toast.error(response.data.message)
          }
          
        } catch (error) {
          toast.error('Failed to load property details')
        } finally {
          setLoading(false)
        }
      }
      fetchProperty()
    }, [id])

    // For logged-in users: fetch unlock info immediately using URL id (parallel with property fetch)
    useEffect(() => {
      if (!user) return
      const fetchUnlockInfo = async () => {
        try {
          const token = await getToken()
          const { data } = await axios.get('/api/payment/property-unlock-info', {
            params: { propertyId: id },
            headers: { Authorization: `Bearer ${token}` }
          })
          if (data.success) {
            if (data.unlocked) {
              setIsUnlocked(true)
              setUnlockData(data.unlock)
            }
            setIsFreeUnlock(data.isFree)
            setFreeReason(data.reason || null)
            setReferralInfo(data)
          }
        } catch (error) {
          setIsFreeUnlock(false)
        }
      }
      fetchUnlockInfo()
    }, [user, id])

    useEffect(() => {
      if (!user) return
      const fetchClaimStatus = async () => {
        try {
          const token = await getToken()
          const { data } = await axios.get(`/api/properties/${id}/claim-status`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (data?.success) {
            setClaimData(data)
          }
        } catch (_) {
          // Ignore claim status errors - listing still renders.
        }
      }
      fetchClaimStatus()
    }, [user, id])

    // For guest users: check localStorage unlock (needs property loaded)
    useEffect(() => {
      if (user || !property) return
      try {
        const guestUnlocks = JSON.parse(localStorage.getItem('guestUnlocks') || '{}')
        let changed = false
        for (const pid of Object.keys(guestUnlocks)) {
          if (!guestUnlocks[pid]?.expiresAt || new Date(guestUnlocks[pid].expiresAt) <= new Date()) {
            delete guestUnlocks[pid]
            changed = true
          }
        }
        if (changed) localStorage.setItem('guestUnlocks', JSON.stringify(guestUnlocks))
        const guestData = guestUnlocks[property._id]
        if (guestData) {
          setIsUnlocked(true)
          setUnlockData(guestData)
          return
        }
      } catch (_) {}
      setIsFreeUnlock(false)
    }, [user, property])

    const handleCopyReferral = () => {
      if (!referralInfo?.referralCode) return
      const link = `${window.location.origin}/sign-up?ref=${referralInfo.referralCode}`
      navigator.clipboard.writeText(link)
      setReferralCopied(true)
      toast.success('Referral link copied!')
      setTimeout(() => setReferralCopied(false), 2000)
    }

    const handleShareWhatsApp = () => {
      if (!referralInfo?.referralCode) return
      const link = `${window.location.origin}/sign-up?ref=${referralInfo.referralCode}`
      const text = `Hey! I found great rental houses on PataKeja. Sign up with my link and we both get free unlocks to view owner contacts: ${link}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }

    const handlePaymentSuccess = (unlockRecord) => {
      setIsUnlocked(true)
      setUnlockData(unlockRecord)
      // For guest users, persist unlock in localStorage (include unlockId for re-auth on refresh)
      if (!user && property) {
        try {
          const guestUnlocks = JSON.parse(localStorage.getItem('guestUnlocks') || '{}')
          guestUnlocks[property._id] = unlockRecord
          localStorage.setItem('guestUnlocks', JSON.stringify(guestUnlocks))
        } catch (_) {}
      }
      toast.success('Property unlocked! Contact details now visible.')
    }

    // Compute sequential room number within a building grid
    const getRoomNumber = (grid, rowIndex, colIndex) => {
      let count = 0
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c].type === 'room') {
            count++
            if (r === rowIndex && c === colIndex) return count
          }
        }
      }
      return 0
    }

    const getCellDisplay = (building, rowIndex, colIndex, cellPx = bCellPx) => {
      const cell = building.grid[rowIndex][colIndex]
      const numSize = Math.max(8, Math.floor(cellPx * 0.22))
      
      if (cell.type === 'room') {
        const roomNum = getRoomNumber(building.grid, rowIndex, colIndex)
        return (
          <div className='relative w-full flex flex-col items-center justify-center h-full'>
            {roomNum > 0 && <span style={{ fontSize: numSize + 'px', lineHeight: '1' }} className='text-gray-700 font-extrabold absolute top-0.5 left-1'>R{roomNum}</span>}
            <div className='hidden sm:block absolute bottom-0 left-1/2 -translate-x-1/2' style={{ width: '30%', height: '22%', background: '#7c2d12', borderRadius: '3px 3px 0 0', minHeight: '6px', minWidth: '8px' }}></div>
          </div>
        )
      }
      
      if (cell.type === 'common') {
        return <div style={{ fontSize: fontSize + 'px' }} className='text-gray-500 font-medium'>Common</div>
      }
      
      return <div className='text-gray-300 text-lg'>-</div>
    }

    const handleCellClick = (building, rowIndex, colIndex) => {
      const cell = building.grid[rowIndex][colIndex]
      if (cell.type !== 'room') return
      
      // Create room object from cell data
      const roomData = {
        buildingId: building.id,
        buildingName: building.name,
        row: rowIndex,
        col: colIndex,
        roomType: cell.roomType,
        pricePerMonth: cell.pricePerMonth,
        amenities: cell.amenities || [],
        isVacant: cell.isVacant,
        isMoveOutSoon: !!cell.isMoveOutSoon,
        availableFrom: cell.availableFrom || null
      }
      
      setSelectedRoom(roomData)
      if (cell.isMoveOutSoon) {
        toast.success(`Selected: ${cell.roomType} - available from ${cell.availableFrom ? new Date(cell.availableFrom).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : 'scheduled date'}`)
      } else {
        toast.success(`Selected: ${cell.roomType} - Ksh ${cell.pricePerMonth}/month`)
      }
    }

    const handleRequestViewing = () => {
      if (isAdminManagedWithoutSteward) {
        toast('This listing has no landlord/caretaker account active in-app yet. Please call or WhatsApp first to confirm availability.')
        return
      }
      if (property?.actionability !== 'full_transaction') {
        toast('This is an informational listing. Save it and wait for a live vacancy update.')
        return
      }
      if (!user) {
        toast.error('Please sign in to request a viewing')
        return
      }
      if (!hasUnlockAccess) {
        toast.error('Please unlock this property first to request a viewing')
        return
      }
      if (!selectedRoom) {
        toast.error('Please select a room from the grid first')
        return
      }
      if (!selectedRoom.isVacant && !selectedRoom.isMoveOutSoon) {
        toast.error('This room is currently occupied')
        return
      }
      setShowViewingForm(true)
    }

    const handleDirectApply = () => {
      if (isAdminManagedWithoutSteward) {
        toast('Direct apply is disabled until a landlord/caretaker account is active in-app. Please call or WhatsApp first.')
        return
      }
      if (property?.actionability !== 'full_transaction') {
        toast('This listing is not accepting direct applications yet.')
        return
      }
      if (!user) {
        toast.error('Please sign in to apply directly')
        return
      }
      if (!hasUnlockAccess) {
        toast.error('Please unlock this property first to apply')
        return
      }
      if (!selectedRoom) {
        toast.error('Please select a room from the grid first')
        return
      }
      if (!selectedRoom.isVacant && !selectedRoom.isMoveOutSoon) {
        toast.error('This room is currently occupied')
        return
      }
      setShowDirectApplyForm(true)
    }

    const submitClaim = async () => {
      if (!user) {
        toast.error('Please sign in to claim this listing')
        return
      }
      if (!claimForm.claimantName.trim()) {
        toast.error('Please provide your full name')
        return
      }

      if (!claimForm.claimPhone.trim()) {
        toast.error('Please provide your phone number')
        return
      }

      const phoneDigits = claimForm.claimPhone.replace(/\D/g, '')
      if (phoneDigits.length < 9) {
        toast.error('Phone number looks invalid')
        return
      }

      if (claimForm.claimRole === 'caretaker' && claimEvidenceFiles.length < 1) {
        toast.error('Caretaker claims require at least one uploaded proof file')
        return
      }

      if (claimForm.claimRole === 'owner' && !isOwner && !isAdmin) {
        toast('Owner claim requires landlord account approval first. Opening landlord application...')
        navigate('/?applyLandlord=1')
        return
      }

      if (claimForm.claimRole === 'caretaker') {
        const landlordPhoneDigits = String(claimForm.landlordPhone || '').replace(/\D/g, '')
        if (landlordPhoneDigits.length < 9) {
          toast.error('Please provide a valid landlord phone number')
          return
        }
      }

      setClaimSubmitting(true)
      try {
        const token = await getToken()
        const payload = new FormData()
        payload.append('claimantName', claimForm.claimantName)
        payload.append('claimPhone', claimForm.claimPhone)
        payload.append('claimRole', claimForm.claimRole)
        payload.append('landlordPhone', claimForm.landlordPhone || '')
        payload.append('landlordEmail', claimForm.landlordEmail || '')
        payload.append('claimNotes', claimForm.claimNotes)
        claimEvidenceFiles.forEach((file) => payload.append('evidenceFiles', file))

        const { data } = await axios.post(`/api/properties/${id}/claim`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (data?.success) {
          toast.success('Claim submitted. Admin review is pending.')
          setShowClaimForm(false)
          setClaimEvidenceFiles([])
          setProperty((prev) => prev ? { ...prev, claimStatus: 'pending' } : prev)
          setClaimData((prev) => ({
            ...(prev || {}),
            claim: data.claim,
            property: {
              ...(prev?.property || {}),
              claimStatus: 'pending'
            }
          }))
        } else {
          toast.error(data?.message || 'Failed to submit claim')
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to submit claim')
      } finally {
        setClaimSubmitting(false)
      }
    }

    const subscribeToVacancyAlerts = async () => {
      const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''
      const inputEmail = window.prompt('Enter your email for vacancy alerts:', userEmail)
      const email = String(inputEmail || '').trim().toLowerCase()

      if (!email) {
        toast('Email is required to receive alerts.')
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Please enter a valid email address.')
        return
      }

      setAlertSubmitting(true)
      try {
        const { data } = await axios.post('/api/newsletter/subscribe', { email })
        if (data?.success) {
          toast.success('Alert subscription saved. We will email you when live listings update.')
        } else if ((data?.message || '').toLowerCase().includes('already subscribed')) {
          toast.success('You are already subscribed for alerts on new/updated listings.')
        } else {
          toast.error(data?.message || 'Could not subscribe right now')
        }
      } catch (error) {
        toast.error('Could not subscribe right now')
      } finally {
        setAlertSubmitting(false)
      }
    }

  if (loading) {
    return <PropertyDetailSkeleton />
  }

  if (!property) {
    return <div className='py-28 text-center'>Property not found</div>
  }

  const listingTier = String(property?.listingTier || '').toLowerCase()
  const hasRoomGrid = Array.isArray(property.buildings) && property.buildings.length > 0
  const isPartnerListing =
    String(property?.sourceType || '').toLowerCase() === 'field_list' ||
    listingTier === 'directory' ||
    (String(property?.owner?.role || '').toLowerCase() === 'admin' && !!String(property?.landlordName || '').trim())
  const hasVerifiedSteward =
    String(property?.claimStatus || '').toLowerCase() === 'verified' &&
    (
      !!String(property?.claimedBy || '').trim() ||
      String(property?.owner?.role || '').toLowerCase() !== 'admin'
    )
  const hasInAppStewardAccount =
    String(property?.owner?.role || '').toLowerCase() !== 'admin' ||
    !!String(property?.claimedBy || '').trim() ||
    (Array.isArray(property?.caretakers) && property.caretakers.length > 0)
  const isAdminManagedWithoutSteward =
    listingTier === 'live' &&
    !hasInAppStewardAccount
  const shouldHideGridUntilSteward = isPartnerListing && listingTier !== 'live' && !hasVerifiedSteward
  const canShowRoomGrid = hasRoomGrid && !shouldHideGridUntilSteward
  const isAdminVerifiedNoStewardLive =
    isAdminManagedWithoutSteward &&
    !!property?.isVerified &&
    String(property?.owner?.role || '').toLowerCase() === 'admin'
  const listingTierLabel =
    property?.listingTier === 'live'
      ? 'Live'
      : property?.listingTier === 'claimed'
        ? 'Owner Updating Details'
        : 'Partner Listing'
  const userClaimStatus = claimData?.claim?.status || null
  const userClaimRole = String(claimData?.claim?.claimRole || '').toLowerCase()
  const propertyClaimStatus = claimData?.property?.claimStatus || property?.claimStatus || 'none'
  const claimReviewNote = claimData?.claim?.reviewNote || claimData?.property?.claimReviewNote || property?.claimReviewNote || ''
  const isApprovedForCurrentUser = userClaimStatus === 'approved' || (
    propertyClaimStatus === 'verified' && claimData?.property?.claimedBy && user?.id && claimData.property.claimedBy === user.id
  )
  const hasPendingClaim = userClaimStatus === 'pending' || propertyClaimStatus === 'pending'
  const showClaimStatusPanel = !!userClaimStatus
  const manageRoute = userClaimRole === 'caretaker' ? '/managed-properties' : '/owner/list-room'
  const manageLabel = userClaimRole === 'caretaker' ? 'Manage Houses' : 'My Listings'
  const hasUnlockAccess = isUnlocked || isAdmin
  const roomPrices = []
  ;(property?.buildings || []).forEach((building) => {
    ;(building?.grid || []).forEach((row) => {
      ;(row || []).forEach((cell) => {
        if (cell?.type === 'room' && Number(cell?.pricePerMonth) > 0) {
          roomPrices.push(Number(cell.pricePerMonth))
        }
      })
    })
  })
  const derivedMinPrice = roomPrices.length ? Math.min(...roomPrices) : null
  const derivedMaxPrice = roomPrices.length ? Math.max(...roomPrices) : null
  const fallbackMinPrice = Number(property?.listedRentMin || 0) > 0 ? Number(property.listedRentMin) : null
  const fallbackMaxPrice = Number(property?.listedRentMax || 0) > 0 ? Number(property.listedRentMax) : null
  const propertyPriceMin = derivedMinPrice ?? fallbackMinPrice
  const propertyPriceMax = derivedMaxPrice ?? fallbackMaxPrice ?? propertyPriceMin
  const hasPropertyPrice = Number(propertyPriceMin || 0) > 0
  const compoundRoadSurface = String(property?.compoundRoadSurface || '').toLowerCase() === 'murram' ? 'murram' : 'tarmac'
  const isMurramRoad = compoundRoadSurface === 'murram'
  const compoundRoadBgClass = isMurramRoad ? 'bg-[#b08968] dark:bg-[#8a6a4e]' : 'bg-gray-500 dark:bg-gray-600'
  const compoundRoadDashColor = isMurramRoad ? 'rgba(77,52,30,0.45)' : 'rgba(255,255,255,0.55)'

  // Informational mode fallback for directory records with no room map.
  if (!canShowRoomGrid) {
    const image = mainImage || property.images?.[0] || assets.house1
    return (
      <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-3xl md:text-4xl font-medium'>{property.name}</h1>
            <p className='text-gray-600 dark:text-gray-400 mt-1'>{property.propertyType}</p>
            <div className='flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-2'>
              <img src={assets.locationIcon} alt='' className='w-5 h-5' />
              <span>{property.estate}, {property.place}</span>
            </div>
            {hasPropertyPrice && (
              <p className='text-sm mt-2 font-medium text-indigo-700 dark:text-indigo-300'>
                Price range: Ksh {propertyPriceMin.toLocaleString()}
                {Number(propertyPriceMax || 0) > Number(propertyPriceMin || 0) ? ` - ${propertyPriceMax.toLocaleString()}` : ''}
                /month
              </p>
            )}
          </div>
          <div className='flex flex-wrap gap-2'>
            <span className='px-4 py-2 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'>
              {listingTierLabel.toUpperCase()}
            </span>
            <span className='px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'>
              {property.vacancyStatus === 'unknown' ? 'AVAILABILITY NOT CONFIRMED' : (property.vacancyStatus || 'available').toUpperCase()}
            </span>
          </div>
        </div>

        <img src={image} alt='' className='w-full max-h-[420px] rounded-xl object-cover border border-gray-200 dark:border-gray-700' />

        <div className='mt-6 p-5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200'>
          <p className='font-semibold'>{listingTier === 'live' ? 'Listing Details Pending Final Update' : 'Informational Listing'}</p>
          <p className='text-sm mt-1'>
            {listingTier === 'live'
              ? 'This listing is live but full unit grid details are still being finalized. Check back soon or follow for updates.'
              : 'This listing is not live yet. Follow it to get notified when room details and availability are published.'}
          </p>
          {hasRoomGrid && shouldHideGridUntilSteward && (
            <p className='text-xs mt-2'>Room grid is hidden until a verified landlord or caretaker logs in and confirms listing updates.</p>
          )}
          {showClaimStatusPanel && (
            <div className='mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-gray-900/30'>
              <p className='text-sm font-semibold'>Your claim status: {userClaimStatus.replaceAll('_', ' ')}</p>
              {hasPendingClaim && (
                <p className='text-xs mt-1'>Next: admin verifies your claim evidence. After approval, open {manageLabel} to complete unit grid, pricing, and contact display name before this can go live.</p>
              )}
              {isApprovedForCurrentUser && (
                <div className='mt-2'>
                  <p className='text-xs'>Your claim is approved. Go to {manageLabel} and edit this property to add the required details: room grid, pricing, contact, and landlord display name.</p>
                  <button
                    onClick={() => window.location.assign(manageRoute)}
                    className='mt-2 px-3 py-1.5 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-medium'
                  >
                    Open {manageLabel}
                  </button>
                </div>
              )}
              {(userClaimStatus === 'rejected' || propertyClaimStatus === 'rejected') && (
                <p className='text-xs mt-1'>Claim was rejected. {claimReviewNote || 'You can submit a new claim with clearer evidence.'}</p>
              )}
            </div>
          )}
          <div className='mt-4 flex flex-wrap gap-3'>
            <button
              onClick={subscribeToVacancyAlerts}
              disabled={alertSubmitting}
              className='px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-60'
            >
              {alertSubmitting ? 'Saving...' : 'Notify Me'}
            </button>
            {property.listingTier === 'directory' && (
              user ? (
                <button
                  onClick={() => setShowClaimForm((s) => !s)}
                  disabled={hasPendingClaim}
                  className='px-4 py-2 rounded-lg border border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-sm font-medium'
                >
                  {hasPendingClaim ? 'Under Review' : (showClaimForm ? 'Close' : 'This is my property')}
                </button>
              ) : (
                <SignInButton mode='modal'>
                  <button className='px-4 py-2 rounded-lg border border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-sm font-medium'>
                    Sign In to Claim
                  </button>
                </SignInButton>
              )
            )}
          </div>

          {showClaimForm && (
            <div className='mt-4 p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-gray-900/30'>
              <p className='text-sm font-semibold mb-2'>Submit Claim Request</p>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                <input
                  value={claimForm.claimantName}
                  onChange={(e) => setClaimForm((prev) => ({ ...prev, claimantName: e.target.value }))}
                  placeholder='Your full name'
                  className='px-3 py-2 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm'
                />
                <input
                  value={claimForm.claimPhone}
                  onChange={(e) => setClaimForm((prev) => ({ ...prev, claimPhone: e.target.value }))}
                  placeholder='Phone number'
                  className='px-3 py-2 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm'
                />
                <select
                  value={claimForm.claimRole}
                  onChange={(e) => setClaimForm((prev) => ({ ...prev, claimRole: e.target.value }))}
                  className='px-3 py-2 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm'
                >
                  <option value='owner'>Owner</option>
                  <option value='caretaker'>Caretaker</option>
                </select>
                {claimForm.claimRole === 'caretaker' && (
                  <>
                    <input
                      value={claimForm.landlordPhone}
                      onChange={(e) => setClaimForm((prev) => ({ ...prev, landlordPhone: e.target.value }))}
                      placeholder='Landlord phone number (required)'
                      className='px-3 py-2 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm'
                    />
                    <input
                      value={claimForm.landlordEmail}
                      onChange={(e) => setClaimForm((prev) => ({ ...prev, landlordEmail: e.target.value }))}
                      placeholder='Landlord email (optional)'
                      className='px-3 py-2 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm'
                    />
                    <input
                      type='file'
                      multiple
                      accept='image/*,.pdf'
                      onChange={(e) => setClaimEvidenceFiles(Array.from(e.target.files || []).slice(0, 4))}
                      className='px-3 py-2 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm md:col-span-2'
                    />
                  </>
                )}
              </div>
              <p className='text-xs mt-2 text-amber-800/80 dark:text-amber-200/80'>
                {claimForm.claimRole === 'owner'
                  ? 'Owner claims require an approved landlord account. If not approved yet, use Apply to be Landlord first. Once approved, claim with your name and phone.'
                  : 'Caretaker claims require landlord phone and at least one proof file (caretaker letter, utility bill, signed note, or management letter).'}
              </p>
              <textarea
                value={claimForm.claimNotes}
                onChange={(e) => setClaimForm((prev) => ({ ...prev, claimNotes: e.target.value }))}
                placeholder='Notes for admin review (optional)'
                rows={3}
                className='w-full mt-2 px-3 py-2 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm'
              />
              <div className='mt-3'>
                <button
                  onClick={submitClaim}
                  disabled={claimSubmitting}
                  className='px-4 py-2 rounded-lg bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-60 text-sm font-medium'
                >
                  {claimSubmitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const currentBuilding = property.buildings[selectedBuilding]
  const vacantCount = property.vacantRooms || 0
  const soonAvailableCount = property.buildings.reduce((sum, b) =>
    sum + (b.grid || []).flat().filter(cell => cell?.type === 'room' && cell?.isMoveOutSoon && !cell?.isVacant && !cell?.isBooked).length
  , 0)

  // Dynamic cell size for compound thumbnail view
  const numBuildings = property.buildings.length
  const totalCols = property.buildings.reduce((sum, b) => sum + (b.cols || 5), 0)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const bCellPx = (() => {
    if (isMobile) {
      // Shrink to fit on small screens - scrolls only when truly extreme
      const availableWidth = Math.max(200, window.innerWidth - 80)
      const fixedOverhead = numBuildings * 16 + Math.max(0, numBuildings - 1) * 18 + 24
      const maxCell = totalCols > 0 ? Math.floor((availableWidth - fixedOverhead) / totalCols) : 42
      return Math.max(16, Math.min(42, maxCell))
    }
    // Original formula for large screens
    return Math.max(32, Math.min(42, Math.floor(520 / (totalCols + numBuildings))))
  })()

  // Days since last refresh
  const daysSinceRefresh = property.lastVerifiedAt
    ? Math.floor((Date.now() - new Date(property.lastVerifiedAt)) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - new Date(property.createdAt)) / (1000 * 60 * 60 * 24))

  return (
    <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>

        {/* Freshness warning banner */}
        {property.needsRefresh && (
          <div className='mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200'>
            <svg className='w-4 h-4 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z'/></svg>
            <span><strong>Heads up:</strong> This listing was last updated {daysSinceRefresh} days ago. Availability may have changed - confirm directly with the house owner.</span>
          </div>
        )}
        {/* Property Header */}
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
            <div>
              <h1 className='text-3xl md:text-4xl font-medium'>{property.name}</h1>
              <p className='text-gray-600 dark:text-gray-400 mt-1'>{property.propertyType}</p>
              <div className='flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-2'>
                <img src={assets.locationIcon} alt="" className='w-5 h-5' />
                <span>{property.estate}, {property.place}</span>
              </div>
              {hasPropertyPrice && (
                <p className='text-sm mt-2 font-medium text-indigo-700 dark:text-indigo-300'>
                  Price range: Ksh {propertyPriceMin.toLocaleString()}
                  {Number(propertyPriceMax || 0) > Number(propertyPriceMin || 0) ? ` - ${propertyPriceMax.toLocaleString()}` : ''}
                  /month
                </p>
              )}
            </div>
            <div className='flex flex-col items-end gap-2'>
              <div className='flex items-center gap-2'>
                {property.isVerified && !isAdminVerifiedNoStewardLive && (
                    <div className='px-4 py-2 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 flex items-center gap-1'>
                      <Check className='w-4 h-4' /> Verified
                    </div>
                  )}
                {isAdminVerifiedNoStewardLive && (
                  <div className='px-4 py-2 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'>
                    Verified by Admin
                  </div>
                )}
                {property.vacancyStatus === 'unknown' ? (
                  <div className='px-4 py-2 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'>
                    Availability Not Confirmed
                  </div>
                ) : (
                  <div className='px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'>
                    {vacantCount} {vacantCount === 1 ? 'Vacancy' : 'Vacancies'}
                  </div>
                )}
                {soonAvailableCount > 0 && (
                  <div className='px-4 py-2 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'>
                    {soonAvailableCount} Available Soon
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowReportModal(true)}
                className='text-red-600 hover:text-red-800 text-sm font-medium'
              >
                Report listing
              </button>
            </div>
        </div>

        {/* Images */}
        <div className='flex flex-col lg:flex-row mt-8 gap-4'>
          <div className='lg:w-2/3 w-full'>
            <img src={mainImage} alt="" className='w-full h-96 rounded-lg object-cover' />
          </div>
          <div className='grid grid-cols-2 gap-2 lg:w-1/3 w-full'>
            {property.images.slice(0, 4).map((image, index)=>(
              <img 
                onClick={()=> setMainImage(image)}
                key={index} 
                src={image} 
                alt=''
                className={`w-full h-44 rounded-lg object-cover cursor-pointer ${mainImage === image ? 'ring-2 ring-primary' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Grid Selector */}
        <div className='mt-10 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-700'>
          <div className='flex items-center gap-2 mb-2'>
            <svg className='w-6 h-6 text-indigo-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
            </svg>
            <h2 className='text-2xl font-bold'>Select Your Room</h2>
          </div>
          <p className='text-gray-600 dark:text-gray-400 mb-4'>Click on any vacant (green) room in the grid below to view details and request viewing</p>

          {/* All buildings inside ONE compound fence / Zoom mode */}
          {zoomedBuilding !== null ? (() => {
            const bld = property.buildings[zoomedBuilding]
            const zCellPx = Math.max(52, Math.min(84, Math.floor(680 / (bld.cols + 2))))
            return (
              <div className='py-2'>
                <div className='flex items-center gap-3 mb-3'>
                  <button onClick={() => setZoomedBuilding(null)} className='flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-700 px-3 py-1.5 rounded-lg transition-all'>
                    {'<'} All Buildings
                  </button>
                  <span className='font-bold text-gray-800'>{bld.name}</span>
                  <span className='text-xs text-gray-400'>{bld.rows} floors - {bld.cols} units wide</span>
                </div>
                <div className='overflow-x-auto overflow-y-visible pt-12 -mt-8'>
                  <div className='inline-block'>
                    <div className='flex justify-center' style={{ marginLeft: -Math.round(zCellPx * 0.15), marginRight: -Math.round(zCellPx * 0.15) }}>
                      <svg width={bld.cols * zCellPx + Math.round(zCellPx * 0.3)} height='32' className='drop-shadow-sm'>
                        <polyline points={`0,32 ${(bld.cols * zCellPx + Math.round(zCellPx * 0.3)) / 2},2 ${bld.cols * zCellPx + Math.round(zCellPx * 0.3)},32`} fill={darkMode ? '#4338ca' : '#ede9fe'} stroke='#4f46e5' strokeWidth='3.5' strokeLinejoin='round' />
                      </svg>
                    </div>
                    <div className='bg-white dark:bg-gray-700 shadow border-2 border-indigo-400'>
                      {bld.grid.map((row, rowIndex) => (
                        <div key={rowIndex} className='flex'>
                          {row.map((cell, colIndex) => {
                            const isSelected = selectedRoom && selectedRoom.buildingId === bld.id && selectedRoom.row === rowIndex && selectedRoom.col === colIndex
                            const roomNum = cell.type === 'room' ? getRoomNumber(bld.grid, rowIndex, colIndex) : 0
                            const numSz = Math.max(9, Math.floor(zCellPx * 0.22))
                            return (
                              <div
                                key={colIndex}
                                onClick={() => handleCellClick(bld, rowIndex, colIndex)}
                                style={{ width: zCellPx + 'px', height: zCellPx + 'px' }}
                                className={`group relative border border-gray-300 flex items-center justify-center transition-all text-xs ${
                                  isSelected ? 'ring-4 ring-indigo-500 bg-indigo-200 dark:bg-indigo-700 z-10' :
                                  cell.type === 'room' && cell.isBooked ? 'bg-amber-200 dark:bg-amber-800 border-amber-400 cursor-not-allowed' :
                                  cell.type === 'room' && cell.isMoveOutSoon ? 'bg-orange-200 dark:bg-orange-800 border-orange-400 cursor-pointer hover:bg-orange-300' :
                                  cell.type === 'room' && cell.isVacant ? 'bg-emerald-200 dark:bg-emerald-700 border-emerald-400 hover:bg-emerald-300 cursor-pointer' :
                                  cell.type === 'room' && !cell.isVacant ? 'bg-red-200 dark:bg-red-800 border-red-400 cursor-not-allowed' :
                                  cell.type === 'common' ? 'bg-gray-200 dark:bg-gray-600 border-gray-400' : 'bg-gray-50'
                                }`}
                              >
                                {cell.type === 'room' && (
                                  <div className='relative w-full flex flex-col items-center justify-center h-full'>
                                    {roomNum > 0 && <span style={{ fontSize: numSz + 'px', lineHeight: '1' }} className='text-gray-700 dark:text-gray-200 font-extrabold absolute top-0.5 left-1'>R{roomNum}</span>}
                                    <div className='absolute bottom-0 left-1/2 -translate-x-1/2' style={{ width: '30%', height: '22%', background: '#7c2d12', borderRadius: '3px 3px 0 0', minHeight: '6px', minWidth: '8px' }}></div>
                                  </div>
                                )}
                                {cell.type === 'common' && <div style={{ fontSize: Math.max(7, Math.floor(zCellPx * 0.15)) + 'px' }} className='text-gray-500 dark:text-gray-400 font-medium'>Common</div>}
                                {cell.type !== 'room' && cell.type !== 'common' && <div className='text-gray-300'>-</div>}
                                {cell.type === 'room' && (
                                  <div className='hidden group-hover:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none items-center'>
                                    <div className='bg-gray-900 text-white rounded-lg px-2.5 py-1.5 shadow-xl text-left max-w-xs overflow-hidden'>
                                      <div className='font-bold text-[11px] truncate'>R{roomNum} - {cell.roomType}</div>
                                      <div className='text-[10px] text-gray-300 mt-0.5'>Ksh {cell.pricePerMonth?.toLocaleString()}/mo</div>
                                      <div className={`text-[10px] font-medium mt-0.5 ${cell.isBooked ? 'text-amber-300' : cell.isMoveOutSoon ? 'text-orange-300' : cell.isVacant ? 'text-green-300' : 'text-red-300'}`}>
                                        {cell.isBooked ? 'Booked' : cell.isMoveOutSoon ? 'Available Soon' : cell.isVacant ? 'Vacant' : 'Occupied'}
                                      </div>
                                      {cell.isMoveOutSoon && (
                                        <div className='text-[10px] text-orange-200 break-words'>
                                          From {cell.availableFrom ? new Date(cell.availableFrom).toLocaleDateString('en-KE', { day:'numeric', month:'short' }) : 'scheduled date'}
                                        </div>
                                      )}
                                    </div>
                                    <div className='w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 -mt-1 shrink-0'></div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                    <div className='h-2 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                  </div>
                </div>
              </div>
            )
          })() : (
          <div className='py-4 overflow-x-auto'>
            <div className='w-fit mx-auto'>
              {(() => {
                const gs = property.compoundGate?.side || 'bottom'
                const posClass = {
                  'top':          'absolute top-0 left-1/2',
                  'bottom':       'absolute bottom-0 left-1/2',
                  'left':         'absolute left-0 top-1/2',
                  'right':        'absolute right-0 top-1/2',
                  'top-left':     'absolute top-0 left-0',
                  'top-right':    'absolute top-0 right-0',
                  'bottom-left':  'absolute bottom-0 left-0',
                  'bottom-right': 'absolute bottom-0 right-0',
                }[gs] || 'absolute bottom-0 left-1/2'
                const gateTransform = {
                  'top':          'translate(-50%, -50%)',
                  'bottom':       'translate(-50%, 50%)',
                  'left':         'translate(-50%, -50%) rotate(-90deg)',
                  'right':        'translate(50%, -50%) rotate(-90deg)',
                  'top-left':     'translate(calc(-50% + 24px), calc(-50% + 24px)) rotate(-45deg)',
                  'top-right':    'translate(calc(50% - 24px), calc(-50% + 24px)) rotate(45deg)',
                  'bottom-left':  'translate(calc(-50% + 24px), calc(50% - 24px)) rotate(45deg)',
                  'bottom-right': 'translate(calc(50% - 24px), calc(50% - 24px)) rotate(-45deg)',
                }[gs] || 'translate(-50%, 50%)'
                const cornerClip = {
                  'top-left':     'polygon(48px 0, 100% 0, 100% 100%, 0 100%, 0 48px)',
                  'top-right':    'polygon(0 0, calc(100% - 48px) 0, 100% 48px, 100% 100%, 0 100%)',
                  'bottom-left':  'polygon(0 0, 100% 0, 100% 100%, 48px 100%, 0 calc(100% - 48px))',
                  'bottom-right': 'polygon(0 0, 100% 0, 100% calc(100% - 48px), calc(100% - 48px) 100%, 0 100%)',
                }[gs]
                // Extra padding pushes buildings away from the chamfered corner
                const cornerPad = {
                  'top-left':     { paddingTop: 40, paddingLeft: 40 },
                  'top-right':    { paddingTop: 40, paddingRight: 40 },
                  'bottom-left':  { paddingBottom: 40, paddingLeft: 40 },
                  'bottom-right': { paddingBottom: 40, paddingRight: 40 },
                }[gs] || {}
                return (
              <div className='relative'>
                {/* Compound fence - gate-connected path network */}
                <div className='border-2 border-dashed border-gray-500 dark:border-gray-500 p-3 bg-gradient-to-br from-green-50 to-slate-100 dark:from-gray-800 dark:to-gray-900 relative'
                  style={{ ...(cornerClip ? { clipPath: cornerClip } : {}), ...cornerPad }}>
                  {(() => {
                    const isColLayout = (property.compoundGate?.layout || 'row') === 'col'
                    const trunkList = []
                    if (!isColLayout) {
                      trunkList.push({ dir: 'h', pos: ['top','top-left','top-right'].includes(gs) ? 'top' : 'bottom' })
                      if (gs === 'left')  trunkList.push({ dir: 'v', pos: 'left' })
                      if (gs === 'right') trunkList.push({ dir: 'v', pos: 'right' })
                    } else {
                      if (isMurramRoad) {
                        // Murram: one side trunk with per-building feeders.
                        trunkList.push({ dir: 'v', pos: ['right','top-right','bottom-right'].includes(gs) ? 'right' : 'left' })
                      } else {
                        // Tarmac: original end-to-end corridor network.
                        trunkList.push({ dir: 'v', pos: ['right','top-right','bottom-right'].includes(gs) ? 'right' : 'left' })
                        if (['top','top-left','top-right'].includes(gs))          trunkList.push({ dir: 'h', pos: 'top' })
                        if (['bottom','bottom-left','bottom-right'].includes(gs)) trunkList.push({ dir: 'h', pos: 'bottom' })
                      }
                    }
                    const primaryTrunk = trunkList[0] || { dir: isColLayout ? 'v' : 'h', pos: isColLayout ? 'left' : 'bottom' }
                    const stackedGapPx = 32 // matches mb-8 spacing between stacked building rows
                    const stackedFeedBottomPx = -22
                    const stackedTrunkSidePx = 22
                    const stackedTrunkCenterPx = stackedTrunkSidePx + 6
                    const stackedHeights = isColLayout
                      ? property.buildings.map((b) => {
                          const cols = Math.max(1, Number(b.cols || 1))
                          const cell = Math.max(bCellPx, Math.min(62, Math.floor(150 / cols)))
                          const rows = Math.max(1, Array.isArray(b.grid) ? b.grid.length : 1)
                          const roofHeight = 28
                          const labelGap = 22
                          const foundationHeight = 8
                          return roofHeight + labelGap + (rows * cell) + foundationHeight
                        })
                      : []
                    const stackedTotalHeight = stackedHeights.reduce((sum, h) => sum + h, 0)
                    const stackedFeedCenters = isColLayout
                      ? stackedHeights.map((h, idx) => {
                          const prev = stackedHeights.slice(0, idx).reduce((sum, x) => sum + x, 0)
                          return prev + (idx * stackedGapPx) + (h - stackedFeedBottomPx - 6)
                        })
                      : []
                    const stackedTrunkTop = isColLayout && stackedFeedCenters.length
                      ? Math.max(8, Math.round(stackedFeedCenters[0] + 5))
                      : 10
                    const stackedTrunkHeight = isColLayout && stackedFeedCenters.length
                      ? Math.max(24, Math.round(stackedFeedCenters[stackedFeedCenters.length - 1] - stackedFeedCenters[0] + 16))
                      : Math.max(60, stackedTotalHeight + ((Math.max(0, property.buildings.length - 1)) * stackedGapPx))
                    const isTopCornerGate = gs === 'top-left' || gs === 'top-right'
                    const isBottomCornerGate = gs === 'bottom-left' || gs === 'bottom-right'
                    const stackedTrunkTopAdjusted = isColLayout
                      ? Math.max(4, stackedTrunkTop - (isTopCornerGate ? 12 : 0))
                      : stackedTrunkTop
                    const stackedTrunkHeightAdjusted = isColLayout
                      ? (stackedTrunkHeight + (isTopCornerGate ? 12 : 0) + (isBottomCornerGate ? 24 : 0))
                      : stackedTrunkHeight
                    const stackedFlowHeight = stackedTotalHeight + (Math.max(0, property.buildings.length - 1) * stackedGapPx)
                    const stackedGateY = Math.round(stackedFlowHeight / 2)
                    const isDiagonalGate = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(gs)
                    const isSideGate = gs === 'left' || gs === 'right'
                    const stackedHouseShiftPx = 0
                    const stackedFeederExtendPx = isDiagonalGate ? 40 : 30
                    const stackedFeederTrunkInsetPx = Math.max(-20, (stackedTrunkSidePx + 2) - stackedFeederExtendPx)
                    const stackedGateEdgeOverflow = 0
                    const stackedGateConnectorWidth = stackedTrunkCenterPx + 6
                    const stackedGateConnectorTop = (() => {
                      if (!isColLayout || !stackedFeedCenters.length) return null
                      if (gs === 'left' || gs === 'right') return 'calc(50% - 6px)'
                      if (gs === 'top-left' || gs === 'top-right') return Math.max(4, Math.round(stackedTrunkTopAdjusted) - 2)
                      if (gs === 'bottom-left' || gs === 'bottom-right') return Math.round(stackedTrunkTopAdjusted + stackedTrunkHeightAdjusted - 8)
                      return null
                    })()
                    return (
                      <>
                        {trunkList.map((t, i) => t.dir === 'h' ? (
                          <div key={i} className={`absolute overflow-hidden rounded-sm ${compoundRoadBgClass}`}
                            style={isMurramRoad
                              ? (t.pos === 'top'
                                ? { top: 22, left: 10, right: 10, height: 12, zIndex: 1 }
                                : { bottom: 22, left: 10, right: 10, height: 12, zIndex: 1 })
                              : (t.pos === 'top'
                                ? { top: 0, left: 0, right: 0, height: 14, zIndex: 1 }
                                : { bottom: 0, left: 0, right: 0, height: 14, zIndex: 1 })}>
                            <div className='absolute inset-0 flex items-center' style={{ padding: '0 8px' }}>
                              <div style={{ borderTop: `2px dashed ${compoundRoadDashColor}`, width: '100%' }}></div>
                            </div>
                          </div>
                        ) : (
                          <div key={i} className={`absolute overflow-hidden rounded-sm ${compoundRoadBgClass}`}
                            style={t.pos === 'left'
                              ? (isColLayout
                                ? (isMurramRoad
                                  ? { left: stackedTrunkSidePx, top: stackedTrunkTopAdjusted, height: stackedTrunkHeightAdjusted + (isBottomCornerGate ? 16 : 0), width: 12, zIndex: 1 }
                                  : { left: 0, top: 0, bottom: 0, width: 14, zIndex: 1 })
                                : { left: 22, top: ['top-left','top-right'].includes(gs) ? 6 : 10, bottom: ['bottom-left','bottom-right'].includes(gs) ? -2 : 10, width: 12, zIndex: 1 })
                              : (isColLayout
                                ? (isMurramRoad
                                  ? { right: stackedTrunkSidePx, top: stackedTrunkTopAdjusted, height: stackedTrunkHeightAdjusted + (isBottomCornerGate ? 16 : 0), width: 12, zIndex: 1 }
                                  : { right: 0, top: 0, bottom: 0, width: 14, zIndex: 1 })
                                : { right: 22, top: ['top-left','top-right'].includes(gs) ? 6 : 10, bottom: ['bottom-left','bottom-right'].includes(gs) ? -2 : 10, width: 12, zIndex: 1 })}>
                            <div className='absolute inset-0 flex justify-center'>
                              <div style={{ borderLeft: `2px dashed ${compoundRoadDashColor}`, height: '100%' }}></div>
                            </div>
                          </div>
                        ))}
                        {isMurramRoad && isColLayout && stackedGateConnectorTop !== null && ['left','right'].includes(gs) && (
                          <div
                            className={`absolute overflow-hidden rounded-sm ${compoundRoadBgClass}`}
                            style={['left','top-left','bottom-left'].includes(gs)
                              ? { left: -stackedGateEdgeOverflow, top: stackedGateConnectorTop, width: stackedGateConnectorWidth, height: 12, zIndex: 1 }
                              : { right: -stackedGateEdgeOverflow, top: stackedGateConnectorTop, width: stackedGateConnectorWidth, height: 12, zIndex: 1 }}
                          >
                            <div className='absolute inset-0 flex items-center px-2'>
                              <div style={{ borderTop: `2px dashed ${compoundRoadDashColor}`, width: '100%' }}></div>
                            </div>
                          </div>
                        )}
                        <div className={`relative flex ${isColLayout ? 'flex-col items-start w-full' : 'flex-row items-end'}`} style={{ zIndex: 2 }}>
                    {property.buildings.map((building, buildingIdx) => {
                      const isActive = buildingIdx === selectedBuilding
                      const buildingCols = Math.max(1, Number(building.cols || 1))
                      const buildingCellPx = Math.max(bCellPx, Math.min(62, Math.floor(150 / buildingCols)))
                      const buildingCoreWidth = building.cols * buildingCellPx
                      const centerX = Math.round(buildingCoreWidth / 2) + 12

                      return (
                        <React.Fragment key={building.id}>
                          {!isMurramRoad && buildingIdx > 0 && (isColLayout ? (
                            <div style={{ height: 14, alignSelf: 'stretch', flexShrink: 0, marginLeft: '-12px', marginRight: '-12px' }} className='my-1.5 relative'>
                              <div className={`h-full w-full ${compoundRoadBgClass}`}>
                                <div className='absolute inset-0 flex items-center px-2'>
                                  <div style={{ borderTop: `2px dashed ${compoundRoadDashColor}`, width: '100%' }}></div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ width: 18, alignSelf: 'stretch', flexShrink: 0, marginTop: '-12px', marginBottom: '-12px' }} className='flex items-stretch mx-1.5 relative'>
                              <div className={`w-full h-full ${compoundRoadBgClass}`}>
                                <div className='absolute inset-0 flex justify-center'>
                                  <div style={{ borderLeft: `2px dashed ${compoundRoadDashColor}`, height: '100%' }}></div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div
                            className={`relative ${isColLayout ? 'w-full pl-2 mb-8' : ''}`}
                            style={isColLayout && stackedHouseShiftPx
                              ? (gs === 'left' ? { transform: `translateX(${stackedHouseShiftPx}px)` } : { transform: `translateX(-${stackedHouseShiftPx}px)` })
                              : undefined}
                          >
                        <div
                          onClick={() => { setZoomedBuilding(buildingIdx); setSelectedBuilding(buildingIdx) }}
                          className={`relative transition-all duration-200 cursor-pointer hover:opacity-80 ${isColLayout ? 'inline-block' : 'mx-2 my-2'}`}
                          title={`Click to zoom into ${building.name}`}
                        >
                          {/* Branch connector from trunk lane to building center for side-by-side layout */}
                          {!isColLayout && isMurramRoad && (
                            <div
                              className={`absolute overflow-hidden rounded-sm ${compoundRoadBgClass}`}
                              style={primaryTrunk.pos === 'top'
                                ? { top: -16, left: '50%', width: 12, height: 16, transform: 'translateX(-50%)', zIndex: 1 }
                                : { bottom: -16, left: '50%', width: 12, height: 16, transform: 'translateX(-50%)', zIndex: 1 }}
                            >
                              <div className='absolute inset-0 flex justify-center'>
                                <div style={{ borderLeft: `2px dashed ${compoundRoadDashColor}`, height: '100%' }}></div>
                              </div>
                            </div>
                          )}

                          {/* Building label */}
                          <div className={`text-center text-xs font-semibold mb-1 ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {building.name}
                          </div>

                          {/* Roof - outlined triangle with overhang, no bottom border */}
                          <div className='flex justify-center' style={{ marginLeft: -Math.round(buildingCellPx * 0.15), marginRight: -Math.round(buildingCellPx * 0.15) }}>
                            <svg width={building.cols * buildingCellPx + Math.round(buildingCellPx * 0.3)} height='28' className='drop-shadow-sm'>
                              <polyline
                                points={`0,28 ${(building.cols * buildingCellPx + Math.round(buildingCellPx * 0.3)) / 2},2 ${building.cols * buildingCellPx + Math.round(buildingCellPx * 0.3)},28`}
                                fill={isActive ? (darkMode ? '#4338ca' : '#ede9fe') : 'transparent'}
                                stroke={isActive ? '#4f46e5' : '#9ca3af'}
                                strokeWidth={isActive ? '3.5' : '2'}
                                strokeLinejoin='round'
                              />
                            </svg>
                          </div>

                          {/* Grid */}
                          <div className={`bg-white dark:bg-gray-700 shadow border-2 ${isActive ? 'border-indigo-400' : 'border-gray-300 dark:border-gray-600'}`}>
                            {building.grid.map((row, rowIndex) => (
                              <div key={rowIndex} className='flex'>
                                {row.map((cell, colIndex) => {
                                  const isSelected = selectedRoom &&
                                    selectedRoom.buildingId === building.id &&
                                    selectedRoom.row === rowIndex &&
                                    selectedRoom.col === colIndex
                                  return (
                                    <div
                                      key={colIndex}
                                      onClick={(e) => { e.stopPropagation(); setZoomedBuilding(buildingIdx); setSelectedBuilding(buildingIdx) }}
                                      style={{ width: buildingCellPx + 'px', height: buildingCellPx + 'px' }}
                                      className={`group relative border border-gray-300 flex items-center justify-center transition-all text-xs ${
                                        isSelected ? 'ring-4 ring-indigo-500 bg-indigo-200 dark:bg-indigo-900 z-10' :
                                        cell.type === 'room' && cell.isBooked ? 'bg-amber-200 dark:bg-amber-900 border-amber-400 cursor-not-allowed' :
                                        cell.type === 'room' && cell.isMoveOutSoon ? 'bg-orange-200 dark:bg-orange-900 border-orange-400 cursor-pointer hover:bg-orange-300' :
                                        cell.type === 'room' && cell.isVacant ? 'bg-emerald-200 dark:bg-emerald-900 border-emerald-400 hover:bg-emerald-300 cursor-pointer' :
                                        cell.type === 'room' && !cell.isVacant ? 'bg-red-200 dark:bg-red-900 border-red-400 cursor-not-allowed' :
                                        cell.type === 'common' ? 'bg-gray-200 dark:bg-gray-600 border-gray-400' :
                                        'bg-gray-50'
                                      }`}
                                    >
                                      {getCellDisplay(building, rowIndex, colIndex, buildingCellPx)}
                                      {cell.type === 'room' && (
                                        <div className='hidden group-hover:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none items-center'>
                                          <div className='bg-gray-900 text-white rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl text-left'>
                                            <div className='font-bold text-[11px]'>R{getRoomNumber(building.grid, rowIndex, colIndex)} - {cell.roomType}</div>
                                            <div className='text-[10px] text-gray-300 mt-0.5'>Ksh {cell.pricePerMonth?.toLocaleString()}/mo</div>
                                            <div className={`text-[10px] font-medium mt-0.5 ${cell.isBooked ? 'text-amber-300' : cell.isMoveOutSoon ? 'text-orange-300' : cell.isVacant ? 'text-green-300' : 'text-red-300'}`}>
                                              {cell.isBooked ? 'Booked' : cell.isMoveOutSoon ? 'Available Soon' : cell.isVacant ? 'Vacant' : 'Occupied'}
                                            </div>
                                            {cell.isMoveOutSoon && (
                                              <div className='text-[10px] text-orange-200'>
                                                From {cell.availableFrom ? new Date(cell.availableFrom).toLocaleDateString('en-KE', { day:'numeric', month:'short' }) : 'scheduled date'}
                                              </div>
                                            )}
                                          </div>
                                          <div className='w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 -mt-1 shrink-0'></div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>

                          {/* Foundation */}
                          <div className='h-2 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                        </div>

                        {/* For stacked buildings: center branch + feeder to side trunk */}
                        {isMurramRoad && isColLayout && (
                          <>
                            <div
                              className={`absolute overflow-hidden rounded-sm ${compoundRoadBgClass}`}
                              style={{ left: centerX, bottom: stackedFeedBottomPx, width: 12, height: 25, transform: 'translateX(-50%)', zIndex: 1 }}
                            >
                              <div className='absolute inset-0 flex justify-center'>
                                <div style={{ borderLeft: `2px dashed ${compoundRoadDashColor}`, height: '100%' }}></div>
                              </div>
                            </div>
                            <div
                              className={`absolute overflow-hidden rounded-sm ${compoundRoadBgClass}`}
                              style={primaryTrunk.pos === 'right'
                                ? { left: centerX, right: stackedFeederTrunkInsetPx, bottom: stackedFeedBottomPx, height: 12, zIndex: 1 }
                                : { left: stackedFeederTrunkInsetPx, right: `calc(100% - ${centerX}px)`, bottom: stackedFeedBottomPx, height: 12, zIndex: 1 }}
                            >
                              <div className='absolute inset-0 flex items-center px-2'>
                                <div style={{ borderTop: `2px dashed ${compoundRoadDashColor}`, width: '100%' }}></div>
                              </div>
                            </div>
                          </>
                        )}
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                      </>
                    )
                  })()}
                </div>

                {/* ONE gate on the compound fence */}
                <div
                  className={`${posClass} bg-amber-50 dark:bg-amber-900 border border-amber-400 rounded px-2 py-0.5 flex items-center gap-1 z-10`}
                  style={{ transform: gateTransform }}
                >
                  <svg className='w-3 h-3 text-amber-700 dark:text-amber-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18' />
                  </svg>
                  <span className='text-[9px] font-bold text-amber-800 dark:text-amber-500 uppercase tracking-wide'>Gate</span>
                  <svg className='w-3 h-3 text-amber-700 dark:text-amber-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 3v18' />
                  </svg>
                </div>
              </div>
                )
              })()}
            </div>
          </div>
          )}

          <div className='mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium'>
            <div className='flex items-center gap-2 text-gray-700 dark:text-gray-200'><div className='w-4 h-4 bg-emerald-200 dark:bg-emerald-700 border border-emerald-400 dark:border-emerald-500 rounded-sm'></div><span>Vacant</span></div>
            <div className='flex items-center gap-2 text-gray-700 dark:text-gray-200'><div className='w-4 h-4 bg-red-200 dark:bg-red-700 border border-red-400 dark:border-red-500 rounded-sm'></div><span>Occupied</span></div>
            <div className='flex items-center gap-2 text-gray-700 dark:text-gray-200'><div className='w-4 h-4 bg-amber-200 dark:bg-amber-700 border border-amber-400 dark:border-amber-500 rounded-sm'></div><span>Booked</span></div>
            <div className='flex items-center gap-2 text-gray-700 dark:text-gray-200'><div className='w-4 h-4 bg-orange-200 dark:bg-orange-700 border border-orange-400 dark:border-orange-500 rounded-sm'></div><span>Available Soon</span></div>
            <div className='flex items-center gap-2 text-gray-700 dark:text-gray-200'><div className='w-4 h-4 bg-gray-200 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 rounded-sm'></div><span>Common</span></div>
            <div className='flex items-center gap-2 text-gray-700 dark:text-gray-200'><div className={`w-4 h-4 border rounded-sm ${compoundRoadBgClass}`}></div><span>Compound Road: {isMurramRoad ? 'Murram' : 'Tarmac'}</span></div>
          </div>
        </div>

        {/* Selected Room Details */}
        {selectedRoom ? (
          <div className='mt-10'>
            <h2 className='text-2xl font-bold mb-4'>Selected Room Details</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <h3 className='text-xl font-semibold text-indigo-600'>{selectedRoom.roomType}</h3>
                <p className='text-3xl font-bold mt-2'>Ksh {selectedRoom.pricePerMonth.toLocaleString()}<span className='text-lg text-gray-600 dark:text-gray-400 font-normal'>/month</span></p>
                
                <div className='mt-4'>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>Building: {selectedRoom.buildingName}</p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>Status: <span className={selectedRoom.isBooked ? 'text-yellow-600 font-medium' : selectedRoom.isMoveOutSoon ? 'text-orange-600 font-medium' : selectedRoom.isVacant ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{selectedRoom.isBooked ? 'Booked' : selectedRoom.isMoveOutSoon ? 'Available Soon' : selectedRoom.isVacant ? 'Vacant' : 'Occupied'}</span></p>
                  {selectedRoom.isMoveOutSoon && (
                    <p className='text-xs text-orange-600 dark:text-orange-400 mt-1'>Expected availability: {selectedRoom.availableFrom ? new Date(selectedRoom.availableFrom).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : 'scheduled date'}</p>
                  )}
                </div>

                {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                  <div className='mt-6'>
                    <h4 className='font-semibold mb-3 text-gray-800 dark:text-gray-200'>Room Features:</h4>
                    <div className='flex flex-wrap gap-3'>
                      {selectedRoom.amenities.map((amenity, index) => (
                        <div key={index} className='flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700'>
                          {facilityIcons[amenity] && <img src={facilityIcons[amenity]} alt={amenity} className='w-5 h-5' />}
                          <p className='text-sm font-medium'>{amenity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className='flex flex-col gap-3'>
                {hasUnlockAccess ? (
                  <>
                    {/* Unlocked - Show contact buttons */}
                    {!isPartnerListing && !isAdminManagedWithoutSteward && (
                      <div className='mb-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
                        <div className='flex items-center gap-2 text-sm text-green-700'>
                          <Unlock className='w-4 h-4' />
                          <span className='font-medium'>{isAdmin && !isUnlocked ? 'Admin Access' : 'Active Pass'}</span>
                          {unlockData && (
                            <span className='text-xs text-green-600'>
                              {unlockData.passType === '7day' ? '7-day' : '1-day'} pass - {unlockData.daysRemaining > 0 ? `${unlockData.daysRemaining} day${unlockData.daysRemaining > 1 ? 's' : ''} left` : 'expires today'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!isPartnerListing && !isAdminManagedWithoutSteward && (
                      <button 
                        onClick={() => setShowChat(true)}
                        className='px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium flex items-center justify-center gap-2'
                      >
                        <MessageCircle className='w-5 h-5' /> Message Owner
                      </button>
                    )}
                    
                    {property.whatsappNumber && (
                      <a
                        href={`https://wa.me/${property.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your ${selectedRoom.roomType} room at ${property.name}. Please confirm if it is currently available.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className='px-6 py-3 rounded-lg border-2 border-green-600 bg-green-50 text-green-700 hover:bg-green-100 transition-all inline-flex items-center justify-center gap-2 font-medium'
                      >
                        <Smartphone className='w-5 h-5' /> {isAdminVerifiedNoStewardLive ? 'WhatsApp Owner (Confirm Availability)' : 'WhatsApp Owner'}
                      </a>
                    )}

                    {(isPartnerListing || isAdminManagedWithoutSteward) && property.contact && (
                      <a
                        href={`tel:${String(property.contact).replace(/[^0-9+]/g, '')}`}
                        className='px-6 py-3 rounded-lg border-2 border-gray-400 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all inline-flex items-center justify-center gap-2 font-medium'
                      >
                        <Smartphone className='w-5 h-5' /> {isAdminVerifiedNoStewardLive ? 'Call Owner (Confirm Availability)' : 'Call Owner'}
                      </a>
                    )}

                    {(isPartnerListing || isAdminManagedWithoutSteward) && (
                      <p className='text-xs text-amber-700 dark:text-amber-300'>Use WhatsApp or Call to confirm current availability before requesting viewing.</p>
                    )}

                    {/* Share & Earn (also visible when unlocked) */}
                    {referralInfo && (
                      <div className='p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg'>
                        <div className='flex items-center gap-2 mb-1.5'>
                          <Share2 className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                          <span className='text-xs font-semibold text-gray-800 dark:text-gray-200'>Refer a friend, earn a free day</span>
                        </div>
                        <div className='flex gap-2'>
                          <button onClick={handleCopyReferral} className='flex-1 py-1.5 text-xs font-medium rounded border border-amber-300 dark:border-amber-600 bg-white dark:bg-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 dark:text-gray-200 flex items-center justify-center gap-1'>
                            {referralCopied ? <><Check className='w-3 h-3 text-green-600' /> Copied</> : <><Copy className='w-3 h-3' /> Copy Link</>}
                          </button>
                          <button onClick={handleShareWhatsApp} className='flex-1 py-1.5 text-xs font-medium rounded border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 flex items-center justify-center gap-1'>
                            <Smartphone className='w-3 h-3' /> WhatsApp
                          </button>
                        </div>
                        {referralInfo.referralCount > 0 && (
                          <p className='text-xs text-amber-700 dark:text-amber-400 mt-1.5 flex items-center gap-1 flex-wrap'>
                            <Users className='w-3 h-3' />
                            {referralInfo.referralCount} friend{referralInfo.referralCount !== 1 ? 's' : ''} joined
                            {referralInfo.referralUnlocksAvailable > 0
                              ? <span className='text-green-600 font-medium ml-1'>{referralInfo.referralUnlocksAvailable} free day{referralInfo.referralUnlocksAvailable !== 1 ? 's' : ''} ready!</span>
                              : referralInfo.referralUnlocksUsed > 0
                                ? <span className='ml-1'>{referralInfo.referralUnlocksUsed} used - Invite another!</span>
                                : <span className='ml-1'>Invite another for a free day</span>
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Locked - Show unlock button */}
                    <div className='p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg mb-2'>
                      <div className='text-center'>
                        {(isAdminVerifiedNoStewardLive || property.needsRefresh) && (
                          <p className='text-xs text-amber-700 dark:text-amber-300 mb-2'>Confirm current availability first before paying to unlock contacts.</p>
                        )}
                        {isAdminManagedWithoutSteward ? (
                          <>
                            <div className='text-2xl mb-2'>
                              <Smartphone className='w-8 h-8 text-amber-600 mx-auto' />
                            </div>
                            <p className='text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1'>No in-app landlord/caretaker account yet</p>
                            <p className='text-xs text-amber-700 dark:text-amber-300 mb-3'>Please call or WhatsApp to confirm availability first. In-app viewing and booking are disabled for this listing until an account is active.</p>
                            <div className='flex flex-col gap-2'>
                              {property.whatsappNumber && (
                                <a
                                  href={`https://wa.me/${property.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in ${property.name}. Please confirm current availability.`}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='w-full py-2.5 rounded-lg border-2 border-green-600 bg-green-50 text-green-700 hover:bg-green-100 transition-all inline-flex items-center justify-center gap-2 font-semibold'
                                >
                                  <Smartphone className='w-4 h-4' /> WhatsApp to Confirm
                                </a>
                              )}
                              {property.contact && (
                                <a
                                  href={`tel:${String(property.contact).replace(/[^0-9+]/g, '')}`}
                                  className='w-full py-2.5 rounded-lg border-2 border-gray-400 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all inline-flex items-center justify-center gap-2 font-semibold'
                                >
                                  <Smartphone className='w-4 h-4' /> Call to Confirm
                                </a>
                              )}
                            </div>
                          </>
                        ) : !user ? (
                          /* Not logged in - two options: free sign-in OR pay without login */
                          <>
                            <Gift className='w-8 h-8 text-indigo-400 mx-auto mb-2' />
                            <p className='text-sm font-semibold text-gray-800 mb-1'>Access owner contact details</p>
                            <p className='text-xs text-gray-500 mb-4'>Phone number, WhatsApp & exact address</p>

                            {/* Option A: free with sign-in */}
                            <div className='mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
                              <p className='text-xs font-bold text-green-700 dark:text-green-300 mb-0.5 flex items-center gap-1'><PartyPopper className='w-3.5 h-3.5' /> FREE - First 2 unlocks</p>
                              <p className='text-xs text-green-600 dark:text-green-400 mb-2'>Sign in or create a free account</p>
                              <SignInButton mode='modal'>
                                <button className='w-full py-2 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all text-sm flex items-center justify-center gap-2'>
                                  <Key className='w-4 h-4' /> Sign In for Free Access
                                </button>
                              </SignInButton>
                            </div>

                            {/* Divider */}
                            <div className='flex items-center gap-2 mb-3'>
                              <div className='flex-1 h-px bg-gray-200'></div>
                              <span className='text-xs text-gray-400'>or</span>
                              <div className='flex-1 h-px bg-gray-200'></div>
                            </div>

                            {/* Option B: pay without login via M-Pesa */}
                            <div className='p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg'>
                              <p className='text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-0.5 flex items-center gap-1'><Lock className='w-3.5 h-3.5' /> Ksh 50/day or Ksh 250/week - via M-Pesa</p>
                              <p className='text-xs text-indigo-600 dark:text-indigo-400 mb-2'>Pay directly, no account needed</p>
                              <button
                                onClick={() => setShowGuestPayment(true)}
                                className='w-full py-2 rounded-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-sm flex items-center justify-center gap-2'
                              >
                                <CreditCard className='w-4 h-4' /> Pay via M-Pesa
                              </button>
                            </div>
                          </>
                        ) : (() => {
                          // Show card immediately - no "Checking..." block
                          // isFreeUnlock: null = still loading (show paid as default), true = free, false = paid
                          const showFree = isFreeUnlock === true
                          return (
                          <>
                            <div className='text-3xl mb-2'>{showFree ? <Gift className='w-8 h-8 text-green-500 mx-auto' /> : <Lock className='w-8 h-8 text-indigo-500 mx-auto' />}</div>
                            <p className='text-sm text-gray-700 font-medium mb-1'>Unlock owner contact details</p>
                            <p className='text-xs text-gray-600 mb-3'>Phone number, WhatsApp & exact address</p>
                            {showFree ? (
                              <>
                                <div className='text-2xl font-bold text-green-600 mb-1'>FREE</div>
                                <p className='text-xs text-green-700 mb-3'>
                                  {freeReason === 'referral' 
                                    ? `Referral unlock - ${referralInfo?.referralUnlocksAvailable || 1} free unlock${(referralInfo?.referralUnlocksAvailable || 1) > 1 ? 's' : ''} available!`
                                    : 'Free unlock - first 2 are on us!'}
                                </p>
                              </>
                            ) : (
                              <div className='mb-3'>
                                {isFreeUnlock === null ? (
                                  <div className='h-8 w-32 mx-auto bg-gray-200 rounded animate-pulse' />
                                ) : (
                                  <>
                                    <div className='text-2xl font-bold text-indigo-600'>from Ksh 50</div>
                                    <p className='text-xs text-indigo-500'>Ksh 50/day or Ksh 250/week</p>
                                  </>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              disabled={isFreeUnlock === null}
                              className={`w-full py-3 rounded-lg font-semibold transition-all ${
                                isFreeUnlock === null
                                  ? 'bg-gray-200 text-gray-500'
                                  : showFree
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                              }`}
                            >
                              {isFreeUnlock === null 
                                ? <span className='flex items-center justify-center gap-2 animate-pulse'>Loading...</span>
                                : showFree 
                                  ? <span className='flex items-center justify-center gap-2'><Gift className='w-4 h-4' /> Claim Free Access</span> 
                                      : <span className='flex items-center justify-center gap-2'><Unlock className='w-4 h-4' /> Unlock - from Ksh 50</span>}
                            </button>
                          </>
                        )})()}
                      </div>
                    </div>
                    
                    {/* Blurred contact buttons */}
                    {!isPartnerListing && (
                    <div className='relative'>
                      <div className='blur-sm pointer-events-none opacity-50'>
                        <button className='w-full px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 font-medium flex items-center justify-center gap-2'>
                          <MessageCircle className='w-5 h-5' /> Message Owner
                        </button>
                      </div>
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <span className='text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow flex items-center gap-1'><Lock className='w-3 h-3' /> Unlock to contact</span>
                      </div>
                    </div>
                    )}

                    {/* Share & Earn Referral Section */}
                    {user && (referralInfo ? (
                      <div className='p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg'>
                        <div className='flex items-center gap-2 mb-2'>
                          <Share2 className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                          <span className='text-sm font-semibold text-gray-800 dark:text-gray-100'>Share & Earn Free Days</span>
                        </div>
                        <p className='text-xs text-gray-600 dark:text-gray-300 mb-2.5'>
                          Invite a friend to sign up - you get a free 1-day unlock for any property!
                        </p>
                        <div className='flex gap-2 mb-2'>
                          <button
                            onClick={handleCopyReferral}
                            className='flex-1 py-2 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-600 bg-white dark:bg-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 dark:text-gray-200 transition-all flex items-center justify-center gap-1.5'
                          >
                            {referralCopied ? <><Check className='w-3.5 h-3.5 text-green-600' /> Copied!</> : <><Copy className='w-3.5 h-3.5' /> Copy Link</>}
                          </button>
                          <button
                            onClick={handleShareWhatsApp}
                            className='flex-1 py-2 text-xs font-medium rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 transition-all flex items-center justify-center gap-1.5'
                          >
                            <Smartphone className='w-3.5 h-3.5' /> WhatsApp
                          </button>
                        </div>
                        {referralInfo.referralUnlocksAvailable > 0 && (
                          <p className='text-xs text-green-700 font-medium flex items-center gap-1 mb-1'>
                            <Gift className='w-3 h-3' /> {referralInfo.referralUnlocksAvailable} free day{referralInfo.referralUnlocksAvailable > 1 ? 's' : ''} ready to use!
                          </p>
                        )}
                        {referralInfo.referralCount > 0 && (
                          <p className='text-xs text-amber-700 flex items-center gap-1 flex-wrap'>
                            <Users className='w-3 h-3' />
                            {referralInfo.referralCount} friend{referralInfo.referralCount !== 1 ? 's' : ''} joined
                            {referralInfo.referralUnlocksUsed > 0 && <span className='ml-1'>{referralInfo.referralUnlocksUsed} day{referralInfo.referralUnlocksUsed !== 1 ? 's' : ''} used</span>}
                            {referralInfo.referralUnlocksAvailable === 0 && <span className='ml-1'>Invite another!</span>}
                          </p>
                        )}
                        {referralInfo.referralCount === 0 && (
                          <p className='text-xs text-amber-600 flex items-center gap-1'>
                            <Users className='w-3 h-3' /> Invite a friend - each signup = 1 free day for any property!
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className='p-3 bg-amber-50/50 border border-amber-100 rounded-lg animate-pulse'>
                        <div className='flex items-center gap-2 mb-2'>
                          <div className='w-4 h-4 bg-amber-200 rounded' />
                          <div className='h-3.5 w-32 bg-amber-200 rounded' />
                        </div>
                        <div className='h-3 w-full bg-amber-100 rounded mb-2.5' />
                        <div className='flex gap-2 mb-2'>
                          <div className='flex-1 h-8 bg-amber-100 rounded-lg' />
                          <div className='flex-1 h-8 bg-green-100 rounded-lg' />
                        </div>
                      </div>
                    ))}
                  </>
                )}
                
                <button 
                  onClick={handleRequestViewing}
                  disabled={isAdminManagedWithoutSteward || ((!selectedRoom.isVacant && !selectedRoom.isMoveOutSoon) || selectedRoom.isBooked)}
                  className='px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold disabled:bg-gray-400'
                >
                  {isAdminManagedWithoutSteward ? 'Viewing Disabled (No Steward Yet)' : selectedRoom.isBooked ? 'Room Booked' : (selectedRoom.isVacant || selectedRoom.isMoveOutSoon) ? 'Request Viewing' : 'Room Occupied'}
                </button>
                {(selectedRoom.isVacant || selectedRoom.isMoveOutSoon) && !selectedRoom.isBooked && !isAdminManagedWithoutSteward && (
                  <button
                    onClick={handleDirectApply}
                    className='px-6 py-3 rounded-lg border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all font-semibold'
                  >
                    {selectedRoom.isMoveOutSoon ? 'Apply for Move-In Date' : 'Apply Directly'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className='mt-10 text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg'>
            <p className='text-gray-500 dark:text-gray-400 text-lg'>Select a room from the grid above to view details</p>
          </div>
        )}

        {/* Owner Info */}
        <div className='mt-10 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800'>
          <div className='flex items-start gap-4'>
            {(() => {
              const hasLandlordDisplayName = !!String(property?.landlordName || '').trim()
              if (!hasLandlordDisplayName) {
                return (
                  <div className='w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center'>
                    <UserIcon className='w-7 h-7 text-gray-500 dark:text-gray-300' />
                  </div>
                )
              }

              const displayName = property.landlordName || property.owner?.username || 'Property Contact'
              const fallbackAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=e5e7eb&color=111827&bold=true'
              const avatarSrc = isPartnerListing ? fallbackAvatar : (property.owner?.image || fallbackAvatar)
              return (
                <img
                  src={avatarSrc}
                  alt=""
                  onError={(e) => { e.target.src = fallbackAvatar }}
                  className='w-16 h-16 rounded-full object-cover'
                />
              )
            })()}
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <p className='text-lg font-medium'>
                  {!String(property?.landlordName || '').trim()
                    ? ''
                    : (property.landlordName || property.owner?.username || 'Property Owner')}
                </p>
              </div>
              <p className='text-gray-600 dark:text-gray-400 text-sm mt-1'>{isPartnerListing ? 'Partner Contact' : 'Property Owner'}</p>
              {/* <p className='text-gray-500 text-sm mt-2'>
                Contact: {property.contact}
              </p> */}
            </div>
          </div>
        </div>

        {/* Modals */}
        {showViewingForm && selectedRoom && (
          <ViewingRequestForm 
            room={selectedRoom}
            propertyId={property._id}
            ownerId={property.owner._id}
            onClose={() => setShowViewingForm(false)}
            onSuccess={() => {
              setShowViewingForm(false)
              toast.success('Viewing request sent!')
            }}
          />
        )}

        {showDirectApplyForm && selectedRoom && (
          <ViewingRequestForm 
            room={selectedRoom}
            propertyId={property._id}
            ownerId={property.owner._id}
            isDirectApply={true}
            onClose={() => setShowDirectApplyForm(false)}
            onSuccess={() => {
              setShowDirectApplyForm(false)
              toast.success('Application submitted!')
            }}
          />
        )}

        {showChat && selectedRoom && !isPartnerListing && !isAdminManagedWithoutSteward && (
          <ChatInterface 
            room={selectedRoom}
            propertyId={property._id}
            houseOwner={property.owner} 
            onClose={() => setShowChat(false)} 
          />
        )}

        {showReportModal && (
          <ReportModal
            type="listing"
            itemId={property._id}
            userId={property.owner._id}
            onClose={() => setShowReportModal(false)}
          />
        )}

        {showPaymentModal && (
          <PaymentModal
            property={property}
            freeReason={freeReason}
            referralInfo={referralInfo}
            isFreeUnlockProp={isFreeUnlock}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {showGuestPayment && (
          <PaymentModal
            property={property}
            guestMode={true}
            onClose={() => setShowGuestPayment(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}
    </div>
  )
}

export default PropertyDetails
