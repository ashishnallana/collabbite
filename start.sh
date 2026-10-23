#!/bin/bash
set -e

echo "==> Starting PostgreSQL..."
gosu postgres /usr/lib/postgresql/15/bin/pg_ctl start -D "$PGDATA" -w -t 30

echo "==> Running Prisma DB push..."
cd /app/backend
DATABASE_URL="postgresql://postgres:password@localhost:5432/collabbitedb" \
  npx prisma db push --accept-data-loss

echo "==> Starting all services via supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
