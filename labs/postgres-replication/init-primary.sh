#!/bin/bash
# Runs once, on first boot of the primary only (docker-entrypoint-initdb.d).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE repl_user WITH REPLICATION LOGIN;
EOSQL

# Lab-only auth: trust connections from anywhere on the compose network.
# Never do this outside a throwaway local lab.
echo "host replication repl_user all trust" >> "$PGDATA/pg_hba.conf"
echo "host all all all trust" >> "$PGDATA/pg_hba.conf"
