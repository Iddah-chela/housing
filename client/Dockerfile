# Build static React app, then serve with nginx
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite bakes these at build time — pass via docker compose build args
ARG VITE_BACKEND_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PUBLISHABLE_KEY_FALLBACK
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_CURRENCY=Ksh

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
    VITE_CLERK_PUBLISHABLE_KEY_FALLBACK=$VITE_CLERK_PUBLISHABLE_KEY_FALLBACK \
    VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY \
    VITE_CURRENCY=$VITE_CURRENCY

RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
