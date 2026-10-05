#!/usr/bin/env bash
# Kjører migrasjonene og RLS-testene mot en tom Postgres-database.
# Bruk: DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres scripts/test-db.sh
set -euo pipefail

: "${DATABASE_URL:?Sett DATABASE_URL til en Postgres-server (brukeren må kunne lage databaser og roller)}"
DB="hytte_test_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_URL="$DATABASE_URL"
TEST_URL="${DATABASE_URL%/*}/$DB"

psql "$ADMIN_URL" -qc "create database $DB" >/dev/null
cleanup() {
  psql "$ADMIN_URL" -qc "drop database if exists $DB with (force)" >/dev/null
  # Rollene er felles for hele serveren; fjern dem hvis ingen andre databaser bruker dem.
  psql "$ADMIN_URL" -qc "drop role if exists anon; drop role if exists authenticated; drop role if exists service_role" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run() { psql "$TEST_URL" -X -q -v ON_ERROR_STOP=1 -o /dev/null -f "$1"; }

run "$ROOT/supabase/tests/supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "Migrasjon: $(basename "$f")"
  run "$f"
done
run "$ROOT/supabase/tests/rls_test.sql" 2>&1 | sed 's/^psql:[^:]*:[0-9]*: NOTICE:  //'
