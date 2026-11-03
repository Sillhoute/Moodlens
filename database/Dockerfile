# ---- Database: PostgreSQL 16 dengan skema aplikasi bawaan ----
FROM postgres:16-alpine

# Skrip di folder ini dijalankan otomatis SEKALI saat volume data masih kosong
COPY init.sql /docker-entrypoint-initdb.d/01_init.sql

EXPOSE 5432
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" || exit 1
