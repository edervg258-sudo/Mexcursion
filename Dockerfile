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

# Servir la carpeta dist con Python en todas las interfaces
CMD ["python3", "-c", "import http.server, socketserver, os; os.chdir('dist'); handler = http.server.SimpleHTTPRequestHandler; httpd = socketserver.TCPServer(('0.0.0.0', 3000), handler); httpd.serve_forever()"]

