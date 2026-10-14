# [MODÜL: DOCKER İMAJI]
# Amaç: Astro SSR (Node standalone) uygulamasını küçük ve root olmayan bir imajda çalıştırmak.
# Neden çok aşamalı: Derleme araçları (devDependencies, kaynak kod) son imaja girmez.
# Apache bu container'ın önünde reverse proxy olarak durur (bkz. deploy/apache-youthside.conf).

# ── 1. Bağımlılıklar ─────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── 2. Derleme ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
# `PUBLIC_API_URL` istemci koduna derleme anında gömülür (astro:env/client); çalışma anında değiştirilemez.
ARG PUBLIC_API_URL=https://api.youthside.co/api
ENV PUBLIC_API_URL=${PUBLIC_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── 3. Çalışma imajı ────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY scripts ./scripts
# Oturum klasörü volume'a bağlanır; sahibi `node` olmalı ki uygulama yazabilsin.
RUN mkdir -p /app/.sessions && chown node:node /app/.sessions
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4321/robots.txt >/dev/null || exit 1
CMD ["node", "dist/server/entry.mjs"]
