# Dockerfile
# ──────────────────────────────────────────────────────────────────────────────
# 1) Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# copy package manifest & install deps via npm
COPY package*.json ./
RUN npm install

# bring in source + build‑time env
ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL
COPY web/ ./
RUN npx quasar build -m pwa

# ──────────────────────────────────────────────────────────────────────────────
# 2) Runtime stage
FROM nginx:stable-alpine
# copy built PWA
COPY --from=builder /app/dist/pwa /usr/share/nginx/html

# copy your custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# mount your certs at build‑time (read‑only)
# see docker‑compose.yml below
RUN mkdir -p /etc/nginx/certs

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
