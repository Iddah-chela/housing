import User from "../models/user.js";
import { createClerkClient, verifyToken } from '@clerk/express'

// Create a Clerk client for backend operations
const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY
});

const upsertUserSafely = async (userId, userData) => {
    try {
        return await User.findOneAndUpdate(
            { _id: userId },
            { $setOnInsert: { _id: userId, ...userData } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (err) {
        // If two requests try creating the same user at once, fetch the winner.
        if (err?.code === 11000) {
            const existing = await User.findById(userId);
            if (existing) return existing;
        }
        throw err;
    }
};

// middleware to check if the user is authenticated  
export const protect = async (req, res, next)=>{
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({success: false, message: "No token provided"})
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // ── VERIFY the JWT signature using Clerk's secret key ──
        let payload;
        try {
            payload = await verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
            });
        } catch (verifyError) {
            return res.status(401).json({success: false, message: "Invalid or expired token"})
        }
        
        if (!payload || !payload.sub) {
            return res.status(401).json({success: false, message: "Invalid token"})
        }
        
        const userId = payload.sub;
        
        // Find user in MongoDB (should have been created by webhook)
        let user = await User.findById(userId);
        
        if (!user) {
            // User doesn't exist in MongoDB yet — fetch real info from Clerk API
            try {
                const clerkUser = await clerk.users.getUser(userId);
                const realEmail = clerkUser.emailAddresses?.[0]?.emailAddress || '';
                const realName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
                const realImage = clerkUser.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=6366f1&color=fff&bold=true`;

                user = await upsertUserSafely(userId, {
                    username: realName,
                    email: realEmail,
                    image: realImage,
                    role: clerkUser.publicMetadata?.role || 'user'
                });
            } catch (clerkErr) {
                // Clerk API failed — last resort fallback
                console.warn('[Auth] Clerk API fetch failed for new user:', clerkErr.message);
                user = await upsertUserSafely(userId, {
                    username: 'User',
                    email: `${userId}@temp.clerk.dev`,
                    image: `https://ui-avatars.com/api/?name=User&background=6366f1&color=fff&bold=true`,
                    role: 'user'
                });
            }
        } else if (user.email?.endsWith('@temp.clerk.dev')) {
            // Fix users stuck with temp emails — sync real data from Clerk
            try {
                const clerkUser = await clerk.users.getUser(userId);
                const realEmail = clerkUser.emailAddresses?.[0]?.emailAddress || '';
                if (realEmail && !realEmail.endsWith('@temp.clerk.dev')) {
                    user.email = realEmail;
                    user.username = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || user.username;
                    if (clerkUser.imageUrl) user.image = clerkUser.imageUrl;
                    await user.save();
                }
            } catch (clerkErr) {
                // Non-critical, skip
            }
        }
        
        // Enforce account suspension
        if (user.isSuspended) {
            return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact support.' });
        }

        req.user = user;
        req.auth = () => ({ userId });
        next();
    } catch (error) {
        console.error('[Auth] Middleware error:', error.message);
        return res.status(401).json({success: false, message: "Invalid or expired token"})
    }
}

// Optional auth — authenticates if token present but does NOT reject on missing/invalid token.
// Sets req.user if valid, leaves it undefined otherwise.
export const optionalProtect = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
        const token = authHeader.substring(7);
        let payload;
        try {
            payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        } catch {
            return next();
        }
        if (!payload?.sub) return next();
        const user = await User.findById(payload.sub);
        if (user && !user.isSuspended) req.user = user;
        next();
    } catch {
        next();
    }
}