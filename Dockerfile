# Build y serve en un solo paso - Railway
FROM node:20-alpine

# Variables de entorno pasadas en tiempo de BUILD para que Expo las compile en el bundle
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_FIREBASE_API_KEY
ARG EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
ARG EXPO_PUBLIC_SENTRY_DSN
ARG EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY

# Si Railway no pasa las variables, usa estos valores por defecto
ENV EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL:-https://qdetjpnzwvdjzwlgswtz.supabase.co}
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZXRqcG56d3Zkanp3bGdzd3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDA2NjcsImV4cCI6MjA5MDQ3NjY2N30.l70qphCQezBDc5XVfUkknUa_ImhmknNrnQmoZHZMv4M}
ENV EXPO_PUBLIC_FIREBASE_API_KEY=$EXPO_PUBLIC_FIREBASE_API_KEY
ENV EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
ENV EXPO_PUBLIC_SENTRY_DSN=$EXPO_PUBLIC_SENTRY_DSN
ENV EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY=${EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY:-TEST-12345678901234567890123456789012}

WORKDIR /app

# Copiar dependencias primero (cache de Docker)
COPY package*.json ./
RUN npm ci

# Instalar serve para SPA
RUN npm install -g serve

# Copiar código
COPY . .

# Crear .env.production dinámicamente con las variables (Expo lo leerá al compilar)
RUN cat > .env.production << EOF
EXPO_PUBLIC_SUPABASE_URL=${EXPO_PUBLIC_SUPABASE_URL:-https://qdetjpnzwvdjzwlgswtz.supabase.co}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${EXPO_PUBLIC_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZXRqcG56d3Zkanp3bGdzd3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDA2NjcsImV4cCI6MjA5MDQ3NjY2N30.l70qphCQezBDc5XVfUkknUa_ImhmknNrnQmoZHZMv4M}
EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY=${EXPO_PUBLIC_MERCADOPAGO_PUBLIC_KEY:-TEST-12345678901234567890123456789012}
EOF

# Ahora Expo leerá .env.production y compilará las variables en el bundle
RUN npx expo export --platform web --clear && node scripts/inject-pwa.js

EXPOSE 3000

# Railway inyecta $PORT en runtime; si no está definido, usa 3000
CMD sh -c "serve dist --single --listen ${PORT:-3000}"
