#!/bin/sh
set -e

echo "Running migrations..."
for f in infra/migrations/*.sql; do
  echo "  applying $f"
  psql "$DATABASE_URL" -f "$f"
done

echo "Migrations done. Starting $@"
exec "$@"
