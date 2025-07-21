# Dockerfile
# ──────────────────────────────────────────────────────────────────────────────
# 1) Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# copy package manifest & install deps via npm
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# bring in source + build‑time env
ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL
COPY . .

RUN npm run postinstall

RUN npx quasar build -m pwa

# ──────────────────────────────────────────────────────────────────────────────
# 2) Runtime stage
FROM nginx:stable-alpine
# copy built PWA
COPY --from=builder /app/dist/pwa /usr/share/nginx/html

# copy your custom Nginx config
COPY --from=builder nginx_https.conf /etc/nginx/conf.d/default.conf

# mount your certs at build‑time (read‑only)
# see docker‑compose.yml below
RUN mkdir -p /etc/nginx/certs

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
