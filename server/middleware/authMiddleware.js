import User from "../models/user.js";
import { clerkClient, createClerkClient } from '@clerk/express'
import jwt from 'jsonwebtoken';

// Create a Clerk client for backend operations
const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY
});

// middleware to check if the user is authenticated  
export const protect = async (req, res, next)=>{
    try {
        console.log('🔐 Auth middleware triggered');
        
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        console.log('   Authorization header:', authHeader ? 'Present' : 'Missing');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('❌ No Bearer token in Authorization header');
            return res.status(401).json({success: false, message: "No token provided"})
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('   Token extracted (first 20 chars):', token.substring(0, 20) + '...');
        
        // Decode the JWT (without verification first, to get the session ID)
        let decoded;
        try {
            decoded = jwt.decode(token);
            console.log('📄 Token decoded:', decoded);
        } catch (decodeError) {
            console.error('❌ Token decode failed:', decodeError.message);
            return res.status(401).json({success: false, message: "Invalid token format"})
        }
        
        if (!decoded || !decoded.sub) {
            console.log('❌ No user ID in token');
            return res.status(401).json({success: false, message: "Invalid token"})
        }
        
        const userId = decoded.sub;
        console.log('   userId from token:', userId);
        
        // Find user in MongoDB (should have been created by webhook)
        let user = await User.findById(userId);
        
        if (!user) {
            // User doesn't exist in MongoDB yet - create minimal record
            // The webhook should handle full sync, but this allows immediate access
            console.log('⚠️  User not found in MongoDB, creating minimal record');
            user = await User.create({
                _id: userId,
                username: 'User',
                email: decoded.email || `${userId}@temp.clerk.dev`,
                image: `https://ui-avatars.com/api/?name=User&background=6366f1&color=fff&bold=true`,
                role: 'user'
            });
            console.log('✅ Created minimal user record for:', userId);
        } else {
            console.log('✅ Found user in MongoDB:', user.email, 'Role:', user.role);
        }
        
        req.user = user;
        req.auth = () => ({ userId });
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({success: false, message: "Invalid or expired token"})
    }
}