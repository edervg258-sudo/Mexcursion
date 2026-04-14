# Build y serve en un solo paso - Railway
FROM node:20-alpine

# Variables de entorno pasadas en tiempo de BUILD para que Expo las compile en el bundle
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_FIREBASE_API_KEY
ARG EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
ARG EXPO_PUBLIC_SENTRY_DSN
ARG EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY

ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_FIREBASE_API_KEY=$EXPO_PUBLIC_FIREBASE_API_KEY
ENV EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
ENV EXPO_PUBLIC_SENTRY_DSN=$EXPO_PUBLIC_SENTRY_DSN
ENV EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY=$EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY

WORKDIR /app

# Copiar dependencias primero (cache de Docker)
COPY package*.json ./
RUN npm ci

# Instalar serve para SPA
RUN npm install -g serve

# Copiar código y construir
COPY . .
RUN npx expo export --platform web --clear && node scripts/inject-pwa.js

EXPOSE 3000

# Railway inyecta $PORT en runtime; si no está definido, usa 3000
CMD sh -c "serve dist --single --listen ${PORT:-3000}"
