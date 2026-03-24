import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'
import { Gift, Unlock, PartyPopper, Smartphone, Check, ArrowLeft } from 'lucide-react'

const PaymentModal = ({ property, onClose, onSuccess, freeReason, referralInfo, guestMode = false, isFreeUnlockProp = null }) => {
    const { axios, getToken, user } = useAppContext()
    const [phoneNumber, setPhoneNumber] = useState('')
    const [passType, setPassType] = useState('1day')
    const [loading, setLoading] = useState(false)
    const isFreeUnlock = guestMode ? false : isFreeUnlockProp === true
    const [paymentInitiated, setPaymentInitiated] = useState(false)
    const [unlockId, setUnlockId] = useState(null)

    const PASS_OPTIONS = [
        { value: '1day',  label: '1 Day',   price: 50, color: 'indigo' },
        { value: '7day',  label: '7 Days',  price: 250, color: 'purple' },
    ]

    // Claim free access (no phone needed)
    const handleClaimFree = async () => {
        if (!user) { toast.error('Please sign in'); return }
        setLoading(true)
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/payment/initiate-unlock', {
                phoneNumber: '0000',
                passType: '1day',
                propertyId: property._id
            }, { headers: { Authorization: `Bearer ${token}` } })

            if (data.success) {
                toast.success(data.message)
                onSuccess && onSuccess(data.unlock)
                onClose()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error('Failed to claim free access')
        } finally {
            setLoading(false)
        }
    }

    // Initiate paid M-Pesa payment (works for both logged-in and guest)
    const handleInitiatePayment = async (e) => {
        e.preventDefault()

        const phoneRegex = /^(\+?254|0)?[17]\d{8}$/
        if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
            toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)')
            return
        }

        setLoading(true)
        try {
            if (guestMode) {
                // Guest payment — no auth needed
                const { data } = await axios.post('/api/payment/guest-unlock', {
                    phoneNumber,
                    passType,
                    propertyId: property._id
                })
                if (data.success) {
                    if (data.alreadyUnlocked) {
                        toast.success(data.message)
                        onSuccess && onSuccess(data.unlock)
                        onClose()
                    } else {
                        setPaymentInitiated(true)
                        setUnlockId(data.unlockId)
                        toast.success(data.message)
                    }
                } else {
                    toast.error(data.message)
                }
            } else {
                // Logged-in payment
                if (!user) { toast.error('Please sign in to unlock property'); return }
                const token = await getToken()
                const { data } = await axios.post('/api/payment/initiate-unlock', {
                    phoneNumber,
                    passType,
                    propertyId: property._id
                }, { headers: { Authorization: `Bearer ${token}` } })

                if (data.success) {
                    if (data.isFree) {
                        toast.success(data.message)
                        onSuccess && onSuccess(data.unlock)
                        onClose()
                    } else {
                        setPaymentInitiated(true)
                        setUnlockId(data.unlockId)
                        toast.success(data.message)
                    }
                } else {
                    toast.error(data.message)
                }
            }
        } catch (error) {
            toast.error('Failed to initiate payment')
        } finally {
            setLoading(false)
        }
    }

    // Manual confirm after paying (test / fallback until webhook is live)
    const handleConfirmPayment = async () => {
        setLoading(true)
        try {
            if (guestMode) {
                // Guest confirm — no auth, but must match phone for security
                const { data } = await axios.post('/api/payment/guest-confirm', { unlockId, phoneNumber })
                if (data.success) {
                    toast.success(data.message)
                    // Include unlockId in the unlock record so PropertyDetails can pass it as x-guest-token
                    onSuccess && onSuccess({ ...data.unlock, unlockId })
                    onClose()
                } else {
                    toast.error(data.message)
                }
            } else {
                const token = await getToken()
                const { data } = await axios.post('/api/payment/confirm-payment', {
                    unlockId
                }, { headers: { Authorization: `Bearer ${token}` } })

                if (data.success) {
                    toast.success(data.message)
                    onSuccess && onSuccess(data.unlock)
                    onClose()
                } else {
                    toast.error(data.message)
                }
            }
        } catch (error) {
            toast.error('Failed to confirm payment')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md my-8 overflow-hidden">

                {/* Header */}
                <div className={`text-white p-4 sticky top-0 z-10 ${isFreeUnlock ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold mb-0.5">
                                {isFreeUnlock ? <span className='flex items-center gap-2'><Gift className='w-5 h-5' /> {freeReason === 'referral' ? 'Referral Unlock!' : 'Free Unlock!'}</span> : <span className='flex items-center gap-2'><Unlock className='w-5 h-5' /> Unlock Property</span>}
                            </h2>
                            <p className="text-white/80 text-xs">
                                {isFreeUnlock 
                                  ? (freeReason === 'referral' 
                                    ? 'Use your referral credit — 24hr access, no payment' 
                                    : 'Your first 2 property views are free — no payment needed')
                                  : 'Get owner contact details via M-Pesa'}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl leading-none">×</button>
                    </div>
                </div>

                <div className="p-4">
                    {isFreeUnlock ? (
                        /* ── FREE UNLOCK FLOW ─────────────────────────────── */
                        <>
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-0.5">{property.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{property.estate}, {property.place}</p>
                            </div>

                            <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700 rounded-lg text-center">
                                <PartyPopper className='w-10 h-10 text-green-600 mx-auto mb-2' />
                                <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
                                  {freeReason === 'referral' ? 'Referral unlock — earned from a friend!' : 'Free unlock — on us!'}
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300">
                                  {freeReason === 'referral' 
                                    ? `You have ${referralInfo?.referralUnlocksAvailable || 1} free day pass${(referralInfo?.referralUnlocksAvailable || 1) > 1 ? 'es' : ''} available — earned by referring friends.`
                                    : "Get the owner's phone, WhatsApp, and address free for this property. Your first 2 properties are free; from the 3rd, Ksh 50/day or Ksh 250/week. Refer a friend to earn a free day."}
                                </p>
                            </div>

                            <div className="mb-4 space-y-1.5 text-xs text-gray-700 dark:text-gray-200">
                                {["Owner's phone number", "Direct WhatsApp link", "Exact address", "24-hour access to this property"].map(item => (
                                    <div key={item} className="flex items-center gap-2">
                                        <Check className='w-3.5 h-3.5 text-green-600' />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleClaimFree}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 text-sm"
                            >
                                {loading ? 'Unlocking...' : <span className='flex items-center justify-center gap-2'><Gift className='w-4 h-4' /> {freeReason === 'referral' ? 'Use Referral Unlock' : 'Claim Free Access'}</span>}
                            </button>
                            <p className="text-xs text-gray-400 text-center mt-2">
                              {freeReason === 'referral' ? '24-hour access to this property · Earned via referral' : 'No credit card or M-Pesa needed · Access this property for 24 hours'}
                            </p>
                        </>
                    ) : !paymentInitiated ? (
                        /* ── PAID FLOW — phone number input ──────────────── */
                        <>
                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-0.5">{property.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{property.estate}, {property.place}</p>
                            </div>

                            <div className="mb-4 space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                                {["Owner's phone number", "Direct WhatsApp link", "Exact address & plot number",
                                  passType === '7day' ? '7-day access to all properties' : '24-hour access to all properties'
                                ].map(item => (
                                    <div key={item} className="flex items-center gap-2">
                                        <Check className='w-3.5 h-3.5 text-green-600' />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-700 rounded-lg">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Select Pass Duration</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {PASS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setPassType(opt.value)}
                                            className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                                                passType === opt.value
                                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-300'
                                            }`}
                                        >
                                            <div className="font-bold text-sm">{opt.label}</div>
                                            <div className={`text-xs ${passType === opt.value ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}>Ksh {opt.price}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>


                            <form onSubmit={handleInitiatePayment}>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">M-Pesa Phone Number</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="e.g., 0712345678"
                                    required
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 mb-3 dark:bg-gray-700 dark:text-gray-200"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 text-sm"
                                >
                                    {loading ? 'Processing...' : `Pay Ksh ${passType === '7day' ? 250 : 50} via M-Pesa`}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* ── PAID FLOW — awaiting confirmation ───────────── */
                            <div className="text-center py-4">
                            <Smartphone className='w-12 h-12 text-indigo-600 mx-auto mb-3' />
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Check Your Phone</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                                M-Pesa prompt sent to <span className="font-medium">{phoneNumber}</span>
                            </p>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4 text-left">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Steps:</p>
                                <ol className="text-xs text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-0.5">
                                    <li>Enter your M-Pesa PIN</li>
                                    <li>Confirm the Ksh {passType === '7day' ? 250 : 50} payment</li>
                                    <li>Click "Verify Payment" below</li>
                                </ol>
                            </div>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={loading}
                                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 mb-2 text-sm"
                            >
                                {loading ? 'Verifying with M-Pesa...' : <span className='flex items-center justify-center gap-2'><Check className='w-4 h-4' /> Verify Payment — Activate {passType === '7day' ? '7-Day' : '1-Day'} Pass</span>}
                            </button>
                            <button
                                onClick={() => setPaymentInitiated(false)}
                                className="w-full text-gray-500 hover:text-gray-700 text-xs flex items-center justify-center gap-1"
                            >
                                <ArrowLeft className='w-3 h-3' /> Try different number
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PaymentModal
