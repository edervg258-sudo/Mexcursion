FROM node:20-alpine

RUN npm install -g serve

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx expo export -p web

EXPOSE 3000

CMD sh -c "serve dist --single --listen ${PORT:-3000}"
