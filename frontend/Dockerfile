# 1. Base Image menggunakan Node.js Alpine yang stabil
FROM node:20-alpine AS base

# Install dependencies hanya jika diperlukan
FROM base AS deps
WORKDIR /app

# Salin file package manager (mendukung npm/pnpm/yarn/bun)
COPY package.json package-lock.json* bun.lockb* ./
RUN \
  if [ -f bun.lockb ]; then npm install -g bun && bun install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else npm install; \
  fi

# 2. Builder Stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Jalankan build Next.js menggunakan npm/npx standar Node.js
RUN npm run build

# 3. Runner Stage (Production image yang ringan)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 4000

# Jalankan server Next.js standalone menggunakan Node
CMD ["node", "server.js"]