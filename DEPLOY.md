# Deploy PataKeja (Docker)

Two modes:

1. **Full stack on one VPS** — API + website + HTTPS (Caddy)
2. **API only on VPS** — website stays on Vercel

---

## Before you start

- Friend’s server: Ubuntu/Debian, public IP, Docker + Docker Compose installed
- DNS ready (or update after first deploy):
  - `patakejaa.co.ke` → VPS IP
  - `api.patakejaa.co.ke` → same VPS IP
- Secrets from existing Render/Vercel (copy carefully; do not paste into chat/git)

---

## 1. Clone and env

```bash
git clone https://github.com/Iddah-chela/housing.git
cd housing
cp .env.docker.example .env
nano .env   # fill every value — see “Production env checklist” below
```

---

## 2a. Full stack (recommended for friend’s server)

```bash
docker compose up -d --build
docker compose ps
curl -s https://api.YOURDOMAIN/api/health
```

Caddy gets Let’s Encrypt certs automatically once DNS points at the VPS.

Open firewall if needed:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Later updates:

```bash
cd housing
git pull
docker compose up -d --build
```

---

## 2b. API only (Vercel keeps the frontend)

```bash
docker compose up -d --build api
```

Then:

1. Set Vercel `VITE_BACKEND_URL=https://api.YOURDOMAIN`
2. Redeploy the client
3. Still put Caddy (or Nginx) in front of port 3000 for HTTPS, or use a host reverse proxy

---

## 3. Point external services at the new API

### Clerk

Dashboard → Webhooks → endpoint URL:

`https://api.YOURDOMAIN/api/clerk`

(use your existing Clerk webhook path if different — match `server` clerk webhook mount)

Also allow your production frontend URL in Clerk allowed origins.

### IntaSend

1. Dashboard → **API Keys** — copy **live** publishable + secret into `.env`
2. Set `INTASEND_LIVE=true`
3. Set `PAYMENT_TEST_MODE=false` (required — test mode is blocked in production anyway)
4. Webhooks → URL: `https://api.YOURDOMAIN/api/payment/webhook`
5. Set a long random **challenge** string in IntaSend and the **same** value in `INTASEND_WEBHOOK_CHALLENGE`  
   (production rejects webhooks without a valid challenge)

### Cloudinary / Resend / VAPID

Copy the same values you use on Render. No URL change required for Cloudinary/Resend.  
VAPID keys must match between server `.env` and `VITE_VAPID_PUBLIC_KEY` used when building the web image.

### MongoDB Atlas

Keep Atlas. In Atlas Network Access, allow the VPS IP (or temporarily `0.0.0.0/0` only while testing).

---

## 4. Smoke test

- [ ] `GET /api/health` returns ok
- [ ] Login / signup (Clerk)
- [ ] Browse houses
- [ ] Small STK unlock (live) completes
- [ ] Admin panel loads
- [ ] Become caretaker upload works
- [ ] Emails / push still fire

When stable, turn off the old Render service.

---

## Production env checklist

| Variable | What to do |
|----------|------------|
| `CLIENT_HOST` / `API_HOST` | Domains Caddy serves |
| `CLIENT_URL` / `SERVER_URL` | `https://…` used in emails & push |
| `VITE_BACKEND_URL` | Must be `https://api.…` (rebuild web after change) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Same publishable key as Clerk dashboard |
| `MONGODB_URI` | Atlas connection string |
| `CLERK_*` | Live keys + webhook secret |
| `INTASEND_*` | **Live** keys; `INTASEND_LIVE=true` |
| `INTASEND_WEBHOOK_CHALLENGE` | Long random; match IntaSend dashboard |
| `PAYMENT_TEST_MODE` | `false` |
| `RESEND_API_KEY` | Email |
| `VAPID_*` | Same pair as before |
| `CLOUDINARY_*` | Same as before |

Generate a challenge:

```bash
openssl rand -hex 24
```

---

## Security notes (already in code)

- Feedback admin routes require admin role
- Payment test mode cannot activate passes when `NODE_ENV=production`
- IntaSend webhook challenge is **required** in production
- ID uploads (caretaker/landlord) are stored as Cloudinary **authenticated** assets; admin APIs return short-lived signed URLs

---

## Troubleshooting

- **Caddy no certificate** — DNS not pointing at VPS yet, or ports 80/443 blocked
- **CORS errors** — set `CLIENT_URL` to the exact frontend origin and restart API
- **Blank frontend after env change** — `VITE_*` are build-time; rebuild web: `docker compose up -d --build web`
- **Payments stuck** — check IntaSend live keys, webhook URL, and challenge match
