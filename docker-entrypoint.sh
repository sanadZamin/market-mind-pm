#!/bin/sh
set -e

echo "Running database schema push..."
cd /app/lib/db
if npx drizzle-kit push --config ./drizzle.config.ts; then
  echo "Schema push succeeded."
else
  echo "WARNING: Schema push failed (tables may already exist or DB is unreachable)."
  echo "Attempting to start API server anyway..."
fi

cd /app
exec node --enable-source-maps ./artifacts/api-server/dist/index.mjs
