# Gunakan image resmi Python 3.11 slim yang ringan namun stabil untuk TensorFlow & OpenCV
FROM python:3.11-slim

# curl & unzip untuk memasang Bun, openssl dibutuhkan oleh Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Bun (JavaScript Runtime) dengan versi yang dikunci
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.0"

# Tambahkan Bun ke PATH sistem
ENV PATH="/root/.bun/bin:$PATH"

# Tentukan direktori kerja di dalam container
WORKDIR /app

# 1) Library Python dulu, karena paling lama dipasang.
#    Lapisan ini di-cache selama requirements.txt tidak berubah.
COPY requirements.txt ./
RUN python3 -m venv venv && \
    ./venv/bin/pip install --no-cache-dir -r requirements.txt

# 2) Dependensi Node.js / Bun, di-cache selama package.json dan bun.lock tidak berubah
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 3) Baru kemudian kode backend
COPY . .

# Generate Prisma Client lalu build TypeScript ke JavaScript.
# Kalau build gagal, build image juga harus gagal (jangan disembunyikan).
RUN bun run db:generate && bun run build

# Ekspose port backend Express
EXPOSE 9000

# Saat container menyala: buat/sesuaikan tabel database dari schema.prisma, lalu jalankan server
CMD ["sh", "-c", "bun run db:push --skip-generate && bun run start"]
