# Build y serve en un solo paso - más simple para Railway
FROM node:20-alpine

# Instalar git y python3
RUN apk add --no-cache git python3

WORKDIR /app

# Copiar dependencias primero (cache de Docker)
COPY package*.json ./
RUN npm ci

# Copiar código y construir (cache-bust: 1)
COPY . .
RUN echo "Cache bust 2" && npx expo export --platform web

# Puerto estándar de Railway
EXPOSE 3000

# Copiar y hacer ejecutable el script de inicio
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Servir la carpeta dist
CMD ["/start.sh"]

