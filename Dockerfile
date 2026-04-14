# Serve pre-built dist — Railway no necesita compilar nada
FROM node:20-alpine

RUN npm install -g serve

WORKDIR /app

# Solo copiamos el dist ya compilado
COPY dist/ ./dist/

EXPOSE 3000

CMD sh -c "serve dist --single --listen ${PORT:-3000}"
