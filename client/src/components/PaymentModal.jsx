import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'

const PaymentModal = ({ property, onClose, onSuccess }) => {
    const { axios, getToken, user } = useAppContext()
    const [phoneNumber, setPhoneNumber] = useState('')
    const [passType, setPassType] = useState('7day')
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true) // checking if first unlock
    const [isFreeUnlock, setIsFreeUnlock] = useState(false)
    const [paymentInitiated, setPaymentInitiated] = useState(false)
    const [unlockId, setUnlockId] = useState(null)

    const PASS_OPTIONS = [
        { value: '7day',  label: '7 Days',  price: 200, color: 'indigo' },
        { value: '30day', label: '30 Days', price: 400, color: 'purple' },
    ]

    // On mount: check if this is user's first unlock (free)
    useEffect(() => {
        const checkFree = async () => {
            if (!user) { setChecking(false); return }
            try {
                const token = await getToken()
                const { data } = await axios.get('/api/payment/is-first-unlock', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (data.success) setIsFreeUnlock(data.isFree)
            } catch (_) { /* default to paid */ }
            finally { setChecking(false) }
        }
        checkFree()
    }, [user])

    // Claim free access (no phone needed)
    const handleClaimFree = async () => {
        if (!user) { toast.error('Please sign in'); return }
        setLoading(true)
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/payment/initiate-unlock', {
                phoneNumber: '0000',
                passType: '7day'
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

    // Initiate paid M-Pesa payment
    const handleInitiatePayment = async (e) => {
        e.preventDefault()
        if (!user) { toast.error('Please sign in to unlock property'); return }

        const phoneRegex = /^(\+?254|0)?[17]\d{8}$/
        if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
            toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)')
            return
        }

        setLoading(true)
        try {
            const token = await getToken()
            const { data } = await axios.post('/api/payment/initiate-unlock', {
                phoneNumber,
                passType
            }, { headers: { Authorization: `Bearer ${token}` } })

            if (data.success) {
                if (data.isFree) {
                    // Edge case: became free mid-session
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
        } catch (error) {
            toast.error('Failed to confirm payment')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-8 overflow-hidden">

                {/* Header */}
                <div className={`text-white p-4 sticky top-0 z-10 ${isFreeUnlock ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold mb-0.5">
                                {checking ? '...' : isFreeUnlock ? '🎁 Your First Unlock is FREE!' : '🔓 Unlock Property'}
                            </h2>
                            <p className="text-white/80 text-xs">
                                {isFreeUnlock ? 'No payment needed — enjoy your free access' : 'Get landlord contact details via M-Pesa'}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl leading-none">×</button>
                    </div>
                </div>

                <div className="p-4">
                    {checking ? (
                        <div className="text-center py-8 text-gray-500 text-sm">Checking your account...</div>
                    ) : isFreeUnlock ? (
                        /* ── FREE UNLOCK FLOW ─────────────────────────────── */
                        <>
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold text-gray-800 text-sm mb-0.5">{property.name}</h3>
                                <p className="text-xs text-gray-500">{property.estate}, {property.place}</p>
                            </div>

                            <div className="mb-5 p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                                <div className="text-4xl mb-2">🎉</div>
                                <p className="font-semibold text-green-800 mb-1">First unlock is on us!</p>
                                <p className="text-xs text-green-700">Get the landlord's phone number, WhatsApp, and address — completely free. Future unlocks are Ksh 200.</p>
                            </div>

                            <div className="mb-4 space-y-1.5 text-xs text-gray-700">
                                {["Landlord's phone number", "Direct WhatsApp link", "Exact address", "7-day access"].map(item => (
                                    <div key={item} className="flex items-center gap-2">
                                        <span className="text-green-600">✓</span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleClaimFree}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 text-sm"
                            >
                                {loading ? 'Unlocking...' : '🎁 Claim Free Access'}
                            </button>
                            <p className="text-xs text-gray-400 text-center mt-2">No credit card or M-Pesa needed</p>
                        </>
                    ) : !paymentInitiated ? (
                        /* ── PAID FLOW — phone number input ──────────────── */
                        <>
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <h3 className="font-semibold text-gray-800 text-sm mb-0.5">{property.name}</h3>
                                <p className="text-xs text-gray-500">{property.estate}, {property.place}</p>
                            </div>

                            <div className="mb-4 space-y-1.5 text-xs text-gray-700">
                                {["Landlord's phone number", "Direct WhatsApp link", "Exact address & plot number", "7-day access"].map(item => (
                                    <div key={item} className="flex items-center gap-2">
                                        <span className="text-green-600">✓</span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-4 p-3 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Select Pass Duration</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {PASS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setPassType(opt.value)}
                                            className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                                                passType === opt.value
                                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                                            }`}
                                        >
                                            <div className="font-bold text-sm">{opt.label}</div>
                                            <div className={`text-xs ${passType === opt.value ? 'text-indigo-100' : 'text-indigo-600'}`}>Ksh {opt.price}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>


                            <form onSubmit={handleInitiatePayment}>
                                <label className="block text-xs font-medium text-gray-700 mb-1">M-Pesa Phone Number</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="e.g., 0712345678"
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 mb-3"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 text-sm"
                                >
                                    {loading ? 'Processing...' : `Pay Ksh ${passType === '30day' ? 400 : 200} via M-Pesa`}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* ── PAID FLOW — awaiting confirmation ───────────── */
                        <div className="text-center py-4">
                            <div className="text-5xl mb-3">📱</div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Check Your Phone</h3>
                            <p className="text-gray-600 mb-4 text-sm">
                                M-Pesa prompt sent to <span className="font-medium">{phoneNumber}</span>
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-left">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Steps:</p>
                                <ol className="text-xs text-gray-600 list-decimal list-inside space-y-0.5">
                                    <li>Enter your M-Pesa PIN</li>
                                    <li>Confirm the Ksh {passType === '30day' ? 400 : 200} payment</li>
                                    <li>Click "I've Paid" below</li>
                                </ol>
                            </div>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={loading}
                                className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 mb-2 text-sm"
                            >
                                {loading ? 'Verifying...' : `✓ I've Paid — Activate ${passType === '30day' ? '30' : '7'}-Day Pass`}
                            </button>
                            <button
                                onClick={() => setPaymentInitiated(false)}
                                className="w-full text-gray-500 hover:text-gray-700 text-xs"
                            >
                                ← Try different number
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PaymentModal
