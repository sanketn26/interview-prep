#!/bin/bash
# Custom entrypoint for the replicas: clone from the primary via
# pg_basebackup on first boot (empty data dir), then hand off to the
# standard postgres entrypoint. -R writes standby.signal and
# primary_conninfo for us — that's what makes this a streaming replica.
set -e

if [ -z "$(ls -A "$PGDATA" 2>/dev/null)" ]; then
  echo "[$APP_NAME] data dir empty — waiting for primary, then cloning"
  until pg_isready -h "$PRIMARY_HOST" -U repl_user -d postgres; do sleep 1; done
  pg_basebackup -h "$PRIMARY_HOST" -U repl_user -D "$PGDATA" -Fp -Xs -P -R \
    -d "application_name=${APP_NAME}"
  chmod 700 "$PGDATA"
fi

exec docker-entrypoint.sh postgres
