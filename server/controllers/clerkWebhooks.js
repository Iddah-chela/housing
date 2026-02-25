import User from "../models/user.js";
import { Webhook } from "svix";



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
            image: data.image_url || 'https://avatar.iran.liara.run/public',
            role: data.public_metadata?.role || 'user' // Get role from Clerk metadata
        }

        // switch case for different events
        switch (type) {
            case "user.created": {
                const newUser = await User.create(userData);
                console.log('✅ User created in MongoDB:', newUser.email);
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
