# ==========================================
# 1. BUILDER STAGE (Kompilasi Aplikasi)
# ==========================================
# Gunakan image resmi Bun di atas Alpine Linux yang ringan
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Salin file konfigurasi dependensi frontend
COPY package.json bun.lockb* ./

# Install seluruh dependencies menggunakan Bun
RUN bun install --frozen-lockfile

# Salin seluruh sisa source code frontend
COPY . .

# Tangkap ARG untuk API URL, lalu jadikan ENV saat proses build Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Jalankan proses build produksi Next.js (Standalone mode)
RUN bun run build


# ==========================================
# 2. RUNNER STAGE (Production Image)
# ==========================================
# Tahap akhir yang bersih dan ringan khusus untuk menjalankan server
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

# Salin file hasil build dan aset publik yang bersih dari tahap builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Ekspose port frontend Next.js
EXPOSE 4000

# Jalankan server Next.js menggunakan runtime Bun
CMD ["bun", "server.js"]