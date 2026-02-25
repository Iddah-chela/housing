# QUICK START GUIDE

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 2: Setup Ngrok (for Clerk webhooks)

```bash
# In a new terminal
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 3: Configure Clerk

1. Go to https://dashboard.clerk.com
2. **Webhooks** → **Add Endpoint**
3. URL: `https://abc123.ngrok.io/api/clerk`
4. Subscribe to: `user.created`, `user.updated`, `user.deleted`
5. Copy the **Signing Secret**

### Step 4: Environment Variables

**Create `server/.env`:**
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

**Create `client/.env`:**
```env
VITE_BACKEND_URL=https://abc123.ngrok.io
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CURRENCY=Ksh
```

### Step 5: Start the Servers

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Keep ngrok running:**
```bash
ngrok http 3000
```

**Terminal 3 - Frontend:**
```bash
cd client
npm run dev
```

### Step 6: Create First Admin

After signing up through the website, you need to set your admin role in MongoDB:

**Option 1: Using MongoDB Compass or Shell:**
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

**Option 2: Using Node.js Script:**
Create `server/setAdmin.js`:
```javascript
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  role: String
}));

async function setAdmin(email) {
  await User.updateOne({ email }, { $set: { role: 'admin' } });
  console.log(`✅ Set ${email} as admin`);
  process.exit(0);
}

setAdmin('your-email@example.com');
```

Then run:
```bash
cd server
node setAdmin.js
```

After updating the database, refresh your browser and navigate to: `http://localhost:5173/admin`

---

## 🎯 Test the Platform

### As a Renter:
1. Browse to `http://localhost:5173`
2. Search for a location
3. Click on a listing
4. Request a viewing
5. Check status message

### As an Owner:
1. Navigate to `/owner/viewing-requests`
2. See your pending requests
3. Confirm or decline a viewing

### As an Admin:
1. Go to `/admin`
2. View dashboard stats
3. Manage users and listings
4. Review reports

---

## ⚠️ Troubleshooting

**Backend won't start?**
- Check MongoDB connection
- Verify all env variables are set
- Port 3000 might be in use: `netstat -ano | findstr :3000`

**Clerk auth failing?**
- Ensure ngrok is running
- Update webhook URL in Clerk dashboard
- Check CLERK_WEBHOOK_SECRET matches

**Frontend not loading?**
- Check VITE_BACKEND_URL matches ngrok URL
- Clear browser cache
- Restart Vite dev server

---

## 📚 Documentation

- [FINAL_IMPLEMENTATION.md](./FINAL_IMPLEMENTATION.md) - Complete feature list
- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Changes made
- [NGROK_SETUP.md](./NGROK_SETUP.md) - Detailed ngrok guide

---

## 🎉 You're Ready!

The platform is now running with:
✅ Trust-first rental journey
✅ Viewing request system
✅ Owner management
✅ Admin panel
✅ Reporting system
✅ Verification badges

Happy renting! 🏠
