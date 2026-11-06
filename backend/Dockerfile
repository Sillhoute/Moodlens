# Gunakan image resmi Python 3.10 slim yang ringan namun stabil untuk TensorFlow & OpenCV
FROM python:3.10-slim AS python-base

# Instal dependensi sistem yang dibutuhkan OpenCV & build tool
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Bun (JavaScript Runtime)
RUN apt-get update && apt-get install -y curl unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && rm -rf /var/lib/apt/lists/*

# Tambahkan Bun ke PATH sistem
ENV PATH="/root/.bun/bin:$PATH"

# Tentukan direktori kerja di dalam container
WORKDIR /app

# Salin package.json dan lockfile terlebih dahulu untuk caching dependensi JS
COPY package.json bun.lockb* ./

# Instal dependensi Node.js / Bun
RUN bun install

# Salin seluruh kode backend ke container
COPY . .

# Buat virtual environment Python dan instal pustaka ML di dalamnya
RUN python3 -m venv venv && \
    ./venv/bin/pip install --no-cache-dir --upgrade pip && \
    ./venv/bin/pip install --no-cache-dir tensorflow numpy 'opencv-python<5'

# Generate Prisma Client
RUN bun run db:generate

# Build TypeScript ke JavaScript
RUN bun run build || true

# Ekspose port internal backend sesuai file .env (port 9000)
EXPOSE 9000

# Jalankan migrasi database saat start, lalu jalankan server
CMD ["sh", "-c", "bun run db:push && bun run start"]