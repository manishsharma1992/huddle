#!/usr/bin/env bash
# Huddle: build and run planning poker on this laptop, reachable by everyone on the LAN.
#
#   ./run.sh               build (if needed) and start on port 8080
#   ./run.sh --rebuild     force a fresh frontend + backend build
#
# Database settings (override with environment variables):
#   DB_HOST=localhost DB_PORT=5432 DB_NAME=planning_poker DB_USERNAME=postgres DB_PASSWORD=...
set -euo pipefail
cd "$(dirname "$0")"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-planning_poker}"
DB_USERNAME="${DB_USERNAME:-postgres}"
PORT="${PORT:-8080}"

PG_BIN=""
for candidate in /Library/PostgreSQL/17/bin /Library/PostgreSQL/16/bin /opt/homebrew/bin /usr/local/bin; do
  [[ -x "$candidate/psql" ]] && PG_BIN="$candidate" && break
done

if [[ -z "${DB_PASSWORD:-}" ]]; then
  read -r -s -p "Postgres password for '$DB_USERNAME': " DB_PASSWORD
  echo
fi
export PGPASSWORD="$DB_PASSWORD"

if [[ -n "$PG_BIN" ]]; then
  if ! "$PG_BIN/psql" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d postgres -tAc \
      "select 1 from pg_database where datname = '$DB_NAME'" | grep -q 1; then
    echo "→ Creating database $DB_NAME"
    "$PG_BIN/createdb" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" "$DB_NAME"
  fi
else
  echo "! psql not found; make sure the database '$DB_NAME' exists."
fi

JAR=backend/target/huddle.jar
if [[ "${1:-}" == "--rebuild" || ! -f "$JAR" ]]; then
  echo "→ Building the React frontend"
  (cd frontend && { [[ -d node_modules ]] || npm ci --no-audit --no-fund; } && npm run build)
  echo "→ Building the Spring Boot backend (runs the DDD architecture tests too)"
  (cd backend && mvn -q -B package)
fi

echo
echo "  🃏  Huddle is starting. Share one of these links with your team:"
for ip in $(ifconfig 2>/dev/null | awk '/inet / && $2 !~ /^127\./ {print $2}'); do
  echo "      http://$ip:$PORT"
done
echo

export DB_URL="jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME" DB_USERNAME DB_PASSWORD PORT
exec java -jar "$JAR"
