# Tahap 1: build aset statis React menggunakan Node.js
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Commit SHA dari pipeline CI ditampilkan sebagai "Versi deploy" di halaman.
ARG APP_VERSION=local
ENV VITE_APP_VERSION=$APP_VERSION
RUN npm run build

# Tahap 2: image akhir hanya berisi Nginx dan hasil build, tanpa Node.js
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
