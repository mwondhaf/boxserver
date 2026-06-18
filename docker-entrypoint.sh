#!/bin/sh
# Container entrypoint: bring the database schema up to date, then hand off to
# whatever command was passed (the API server).
#
# Drizzle workflow (generate + migrate):
#   1. When DB_AUTO_GENERATE=true, run drizzle-kit generate to turn any
#      uncommitted src/db/schema changes into a new migration file + snapshot.
#      Keep this ON for local dev only — the generated files are written back to
#      your working tree via the bind mount, and you should review
#      drizzle/00XX_*.sql before committing. In production leave it unset so the
#      container only applies migrations that were generated and reviewed ahead
#      of time.
#   2. Always run drizzle-kit migrate to apply pending versioned migrations.
#
# After the schema is current, exec the passed command so the server runs as
# PID 1 (correct signal handling). If no command was passed, the entrypoint just
# performs the migration step and exits (used by a one-shot migrate service).
set -e

if [ "${DB_AUTO_GENERATE:-false}" = "true" ]; then
  echo "[entrypoint] DB_AUTO_GENERATE=true — generating migrations from schema..."
  npm run db:generate
fi

echo "[entrypoint] applying migrations..."
npm run db:migrate

if [ "$#" -gt 0 ]; then
  echo "[entrypoint] starting: $*"
  exec "$@"
fi
