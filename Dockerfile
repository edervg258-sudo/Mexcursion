# Etapa 1: Construir la app Expo para web
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar todo el código
COPY . .

# Construir la app para web
RUN npx expo export --platform web

# Etapa 2: Servidor nginx para producción
FROM nginx:alpine

# Copiar los archivos estáticos construidos
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Puerto expuesto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
