#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${BACKUP_RECIPIENT:?Set your public age recipient key; never use a private key here}"
command -v age >/dev/null || { echo 'Install age before running encrypted backups.' >&2; exit 1; }
umask 077
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
database_tmp="backups/${stamp}-postgres.sql.age.partial"
media_tmp="backups/${stamp}-synapse.tar.age.partial"
trap 'rm -f "$database_tmp" "$media_tmp"' EXIT
# Stop writers for a consistent small-deployment snapshot. Restart even if backup fails.
docker compose stop backend synapse
trap 'rm -f "$database_tmp" "$media_tmp"; docker compose start synapse backend >/dev/null' EXIT
docker compose exec -T postgres pg_dumpall -U postgres | age -r "$BACKUP_RECIPIENT" > "$database_tmp"
docker compose run --rm --no-deps --entrypoint tar synapse -C /data -cf - . | age -r "$BACKUP_RECIPIENT" > "$media_tmp"
mv "$database_tmp" "backups/${stamp}-postgres.sql.age"
mv "$media_tmp" "backups/${stamp}-synapse.tar.age"
docker compose start synapse backend
trap - EXIT
echo "Encrypted backup files created under backups/. Restore-test them in an isolated environment."
