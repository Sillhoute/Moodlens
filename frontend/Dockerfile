# Gunakan image resmi Bun yang ringan di atas Alpine Linux
FROM oven/bun:1-alpine

WORKDIR /app

# Salin seluruh kode sumber proyek ke dalam container
COPY . .

# Install seluruh dependencies menggunakan Bun
RUN bun install --frozen-lockfile

# Tangkap ARG untuk API URL, lalu jadikan ENV saat proses build Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Jalankan build Next.js
RUN bun run build

# Konfigurasi port dan host untuk server produksi
ENV PORT=4000
ENV HOSTNAME="0.0.0.0"

EXPOSE 4000

# Jalankan server Next.js secara langsung
CMD ["bun", "run", "start"]