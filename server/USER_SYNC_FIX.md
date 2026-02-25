# User Sync Issue - Quick Fix Guide

## Problem
User created account via Clerk but not showing in MongoDB database.

## Root Cause
Clerk webhooks need to sync users from Clerk to your MongoDB database. This requires:
1. Ngrok running to expose your local server
2. Webhook URL configured in Clerk dashboard

## Solutions

### Option 1: Enable Clerk Webhooks (Recommended for Production)

**Step 1: Start Ngrok**
```powershell
ngrok http 3000
```
Copy the HTTPS URL (e.g., `https://abc-123-xyz.ngrok-free.app`)

**Step 2: Configure Clerk Webhook**
1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to **Webhooks** → **Add Endpoint**
4. **Endpoint URL**: `https://abc-123-xyz.ngrok-free.app/api/clerk`
5. **Subscribe to events**:
   - ✅ user.created
   - ✅ user.updated
   - ✅ user.deleted
6. Copy the **Signing Secret**
7. Add to `server/.env`:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

**Step 3: Restart Backend**
```powershell
cd server
npm start
```

**Step 4: Test**
- Sign out and sign up with a new account
- User should automatically sync to MongoDB
- Check: `db.users.find()` in MongoDB

---

### Option 2: Manual User Creation (Quick Fix for Development)

**Step 1: Get Your Clerk User ID**
Open browser console while logged in, run:
```javascript
console.log("Clerk ID:", window.Clerk?.user?.id);
console.log("Email:", window.Clerk?.user?.primaryEmailAddress?.emailAddress);
console.log("Name:", window.Clerk?.user?.fullName);
```

**Step 2: Create User in MongoDB**
```powershell
cd server
node createUser.js <clerkId> <email> "<Full Name>"
```

Example:
```powershell
node createUser.js user_2abc123xyz iddahchelangat1@gmail.com "Iddah Chelangat"
```

**Step 3: Set Admin Role (if needed)**
```powershell
node setAdmin.js iddahchelangat1@gmail.com
```

---

## Verification

Check if user exists in database:
1. **MongoDB Compass**: Connect and browse `users` collection
2. **MongoDB Shell**:
   ```javascript
   db.users.find({ email: "iddahchelangat1@gmail.com" })
   ```

## Current Status

✅ **Fixed Issues:**
- 413 Payload Too Large error (increased body size limit to 50mb)
- Webhook endpoint enabled at `/api/clerk`

⚠️ **Pending:**
- User sync (choose Option 1 or Option 2 above)

---

## Next Steps

**For Development:**
Use Option 2 (manual creation) - faster and simpler

**For Production:**
Use Option 1 (webhooks) - automatic user sync
