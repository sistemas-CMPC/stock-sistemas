#!/bin/sh
set -e

echo "Applying database migrations..."
pnpm exec prisma migrate deploy

echo "Seeding database..."
pnpm exec tsx prisma/seed.ts

echo "Starting app..."
exec "$@"
