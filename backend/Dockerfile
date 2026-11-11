# ==========================================
# 1. BUILDER STAGE (Instalasi & Kompilasi)
# ==========================================
# Gunakan image Python slim sebagai pondasi utama agar TensorFlow & OpenCV kompatibel
FROM python:3.10-slim AS builder

# Install build tools sistem dan pustaka grafis yang dibutuhkan OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install JavaScript Runtime (Bun) ke dalam container
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Tentukan direktori kerja utama
WORKDIR /app

# Salin konfigurasi dependensi JavaScript
COPY package.json bun.lockb* ./

# Install dependencies backend menggunakan Bun
RUN bun install

# Salin seluruh sisa source code backend
COPY . .

# Buat virtual environment Python dan install pustaka Machine Learning (TensorFlow, NumPy, OpenCV)
RUN python3 -m venv venv && \
    ./venv/bin/pip install --no-cache-dir --upgrade pip && \
    ./venv/bin/pip install --no-cache-dir tensorflow numpy 'opencv-python<5'

# Generate Prisma Client untuk database
RUN bun run db:generate

# Build TypeScript backend menjadi JavaScript (diabaikan jika error sementaranya pakai || true)
RUN bun run build || true


# ==========================================
# 2. RUNNER STAGE (Production Image)
# ==========================================
# Tahap akhir yang bersih untuk menjalankan aplikasi secara efisien
FROM python:3.10-slim AS runner

# Install ulang runtime dependencies sistem yang dibutuhkan saat aplikasi berjalan (OpenCV & Bun)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# Salin file hasil racikan dari tahap builder ke runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/services/model ./src/services/model
COPY --from=builder /app/venv ./venv
COPY package.json bun.lockb* ./

# Ekspose port backend Express
EXPOSE 9000

# Jalankan migrasi database saat container aktif, lalu jalankan server
CMD ["sh", "-c", "bun run db:push && bun run start"]