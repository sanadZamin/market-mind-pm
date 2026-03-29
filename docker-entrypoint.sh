#!/bin/sh
set -e

echo "Running database schema push..."
cd /app/lib/db
npx drizzle-kit push --config ./drizzle.config.ts

echo "Starting API server..."
cd /app
exec node --enable-source-maps ./artifacts/api-server/dist/index.mjs
