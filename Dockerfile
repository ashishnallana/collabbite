# ============================================================
# Stage 1: Build the Backend (TypeScript → JavaScript)
# ============================================================
FROM node:20-bookworm-slim AS backend-builder

WORKDIR /build/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY backend/ ./

RUN npm run build

# ============================================================
# Stage 2: Build the Frontend (Next.js standalone)
# ============================================================
FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /build/frontend

COPY frontend/package*.json ./

RUN npm install

COPY frontend/ ./

# Build time env so NEXT_PUBLIC vars are baked into the bundle.
# On Render, set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL
# as environment variables; they override these defaults at build time.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}

RUN npm run build

# ============================================================
# Stage 3: Production image (Debian-based for apt packages)
# ============================================================
FROM node:20-bookworm-slim

# ── Install system dependencies ────────────────────────────
RUN apt-get update && apt-get install -y \
    postgresql-15 \
    redis-server \
    supervisor \
    gosu \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Configure PostgreSQL ────────────────────────────────────
ENV PGDATA=/var/lib/postgresql/data
RUN mkdir -p "$PGDATA" && chown -R postgres:postgres "$PGDATA" && chmod 700 "$PGDATA"

USER postgres
RUN /usr/lib/postgresql/15/bin/initdb -D "$PGDATA"
RUN echo "host all all 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf" && \
    echo "listen_addresses='localhost'" >> "$PGDATA/postgresql.conf"
# Start postgres temporarily to create the DB and set password
RUN /usr/lib/postgresql/15/bin/pg_ctl start -D "$PGDATA" -w && \
    psql -c "ALTER USER postgres WITH PASSWORD 'password';" && \
    psql -c "CREATE DATABASE collabbitedb;" && \
    /usr/lib/postgresql/15/bin/pg_ctl stop -D "$PGDATA"

USER root

# ── Copy backend build ──────────────────────────────────────
WORKDIR /app/backend
COPY --from=backend-builder /build/backend/dist ./dist
COPY --from=backend-builder /build/backend/node_modules ./node_modules
COPY --from=backend-builder /build/backend/prisma ./prisma
COPY --from=backend-builder /build/backend/package.json ./

# ── Copy frontend standalone build ─────────────────────────
WORKDIR /app/frontend
COPY --from=frontend-builder /build/frontend/.next/standalone ./
COPY --from=frontend-builder /build/frontend/.next/static ./.next/static
COPY --from=frontend-builder /build/frontend/public ./public

# ── Copy supervisord config ─────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/collabbite.conf

# ── Startup script: push Prisma schema, then start supervisor
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000
EXPOSE 5000

CMD ["/start.sh"]
