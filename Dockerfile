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

# Instalar serve para servir archivos estáticos
RUN npm install -g serve

# Puerto que Railway usa (8081 para healthcheck)
EXPOSE 8081

# Servir la carpeta dist
CMD ["serve", "dist", "-l", "8081"]

