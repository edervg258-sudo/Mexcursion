# Build y serve en un solo paso - más simple para Railway
FROM node:20-alpine

# Instalar git necesario para Expo
RUN apk add --no-cache git

WORKDIR /app

# Copiar dependencias primero (cache de Docker)
COPY package*.json ./
RUN npm ci

# Copiar código y construir (cache-bust: 1)
COPY . .
RUN echo "Cache bust 1" && npx expo export --platform web

# Puerto estándar de Railway
EXPOSE 3000

# Servir la carpeta dist con Python (más confiable)
CMD ["python3", "-m", "http.server", "3000", "--directory", "dist"]

