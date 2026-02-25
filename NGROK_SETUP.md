# NGROK SETUP FOR CLERK AUTHENTICATION

## Why Ngrok?

Clerk webhooks require a publicly accessible URL to send authentication events. Ngrok creates a secure tunnel from the internet to your local server.

## Setup Steps

### 1. Start Your Backend Server

```bash
cd server
npm start
```

Your server should be running on `http://localhost:3000`

### 2. Start Ngrok Tunnel

In a new terminal:

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### 3. Update Clerk Webhook URL

1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to **Webhooks** in the sidebar
4. Click **+ Add Endpoint**
5. Paste your ngrok URL: `https://abc123.ngrok.io/api/clerk`
6. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
7. Copy the **Signing Secret**

### 4. Update Environment Variables

In `server/.env`:

```env
# Add your Clerk webhook secret
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# If needed, update these
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

### 5. Update Client API URL (if needed)

In `client/.env`:

```env
# Point to your ngrok URL
VITE_BACKEND_URL=https://abc123.ngrok.io
```

### 6. Restart Both Servers

**Backend:**
```bash
cd server
npm start
```

**Frontend:**
```bash
cd client
npm run dev
```

## Testing

1. Sign up a new user in your app
2. Check ngrok terminal - you should see webhook requests
3. Check your MongoDB - new user should be created

## Important Notes

⚠️ **Ngrok URLs change** every time you restart ngrok (free tier)
- Update Clerk webhook URL each time
- Consider ngrok paid plan for static URLs

⚠️ **Security**
- Never commit ngrok URLs to git
- Rotate secrets if exposed

⚠️ **Development Only**
- For production, use a real domain
- Deploy backend to Heroku/Railway/Vercel

## Troubleshooting

**Webhooks not working?**
1. Check ngrok is running
2. Verify webhook URL in Clerk dashboard
3. Check `CLERK_WEBHOOK_SECRET` is correct
4. Look at ngrok dashboard: `http://localhost:4040`

**Port already in use?**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill it (replace PID)
taskkill /PID <process_id> /F
```

**CORS issues?**
- Check `cors()` is enabled in server.js
- Verify VITE_BACKEND_URL matches ngrok URL

## Alternative: Use Clerk Development Mode

Clerk also has a dev mode that doesn't require webhooks for basic auth. But for full user sync to MongoDB, webhooks are recommended.

---

**Quick Command Summary:**

Terminal 1:
```bash
cd server && npm start
```

Terminal 2:
```bash
ngrok http 3000
```

Terminal 3:
```bash
cd client && npm run dev
```
