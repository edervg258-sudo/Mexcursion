# Build y serve en un solo paso - más simple para Railway
FROM node:20-alpine

# Instalar git necesario para Expo
RUN apk add --no-cache git

WORKDIR /app

# Copiar dependencias primero (cache de Docker)
COPY package*.json ./
RUN npm ci

# Copiar código y construir
COPY . .
RUN npx expo export --platform web

# Puerto estándar de Railway
EXPOSE 3000

# Servir la carpeta dist
CMD ["npx", "serve", "dist", "-p", "3000", "-s"]

