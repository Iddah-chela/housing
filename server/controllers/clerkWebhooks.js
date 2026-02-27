import User from "../models/user.js";
import { Webhook } from "svix";



import crypto from 'crypto';

// Generate a short unique referral code from userId
const generateReferralCode = (userId) => {
    const hash = crypto.createHash('sha256').update(userId + Date.now().toString()).digest('hex')
    return 'PS' + hash.substring(0, 6).toUpperCase()  // e.g. PS3A7F2B
}

const MAX_REFERRAL_UNLOCKS = 5  // max free unlocks a referrer can earn

const clerkWebhooks = async (req, res) =>{
    try {
        // create a svix instance with clerk webhook secret
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        // GETTING HEADERS
        const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

        // verifying headers
        await whook.verify(JSON.stringify(req.body), headers)

        // Getting data from request body
        const {data, type} = req.body
        
        console.log(`📥 Clerk Webhook: ${type} for user ${data.id}`);
        
        const userData = {
            _id: data.id,
            email: data.email_addresses[0]?.email_address || '',
            username: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User',
            image: data.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((data.first_name || 'U') + ' ' + (data.last_name || ''))}&background=6366f1&color=fff`,
            role: data.public_metadata?.role || 'user' // Get role from Clerk metadata
        }

        // switch case for different events
        switch (type) {
            case "user.created": {
                // Generate unique referral code
                userData.referralCode = generateReferralCode(data.id)
                
                // Check if referred by someone (referral code stored in Clerk unsafe_metadata)
                const referralCode = data.unsafe_metadata?.referralCode
                if (referralCode) {
                    const referrer = await User.findOne({ referralCode })
                    if (referrer) {
                        userData.referredBy = referrer._id
                        // Credit the referrer with a free unlock (up to max)
                        if (referrer.referralUnlocks < MAX_REFERRAL_UNLOCKS) {
                            referrer.referralCount = (referrer.referralCount || 0) + 1
                            referrer.referralUnlocks = (referrer.referralUnlocks || 0) + 1
                            await referrer.save()
                            console.log(`🎁 Referrer ${referrer.email} earned a free unlock! (${referrer.referralUnlocks}/${MAX_REFERRAL_UNLOCKS})`)
                        }
                    }
                }

                const newUser = await User.create(userData);
                console.log('✅ User created in MongoDB:', newUser.email, newUser.referralCode);
                 break;
            }

            case "user.updated": {
                await User.findByIdAndUpdate(data.id, userData);
                console.log('✅ User updated in MongoDB:', userData.email);
                 break;
            }

             case "user.deleted": {
                await User.findByIdAndDelete(data.id);
                console.log('✅ User deleted from MongoDB:', data.id);
                 break;
            }

            default:
                console.log('⚠️  Unhandled webhook type:', type);
                break;
        }
        res.json({success: true, message: "Webhook Received"})

    } catch (error) {
        console.error('❌ Webhook Error:', error.message);
        res.status(400).json({success: false, message: error.message})
    }
}

export default clerkWebhooks;
