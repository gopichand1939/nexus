# Deployment runbook

No deployment was performed in the authoring environment. The existing remote database was not accessed or changed.

## Local prerequisites

- Linux VPS or local Linux host; Node 24 and npm 11 for source work.
- Docker Engine with Compose v2; sufficient storage for PostgreSQL and encrypted media.
- DNS and a reachable domain for public deployment.
- A TURN hostname and public IP for cross-network calls.
- Optional SMTP credentials for email verification/recovery.

## First deployment

From the repository root, install packages and complete `npm test`, `npm run check`, and `npm run build`. Review the dependencies and Docker images. The lockfile freezes npm dependencies; images should be reviewed and pinned by digest before production.

For a public domain:

```bash
python3 scripts/setup.py --origin https://chat.example.com --server-name chat.example.com --turn-host turn.example.com --turn-ip YOUR_PUBLIC_IP
docker compose up -d --build
docker compose exec -T backend node backend/scripts/bootstrap.js
```

Verify the private, loopback-bound deployment before starting the public edge. The generated production Origin intentionally rejects browser auth through the temporary localhost origin; use API health checks or configure the intended HTTPS host for verification.

Then start the TLS edge:

```bash
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

Caddy requests certificates for `NEXUS_DOMAIN` and forwards to Nginx. Keep TCP 80 and 443 reachable for issuance and clients. For TURN, allow UDP/TCP 3478 and UDP 49160–49200. Do not expose PostgreSQL, the API port, Synapse 8008 or Redis (not used) publicly. Review TURN private-address restrictions for your network topology. This profile does not configure TURN-over-TLS on port 5349.

Keep the Matrix server name stable after creating accounts. It is part of every Matrix identity and cannot be changed like a display name.

## Email and registration

Set `EMAIL_ENABLED=true` and complete SMTP settings to require email verification during public registration. Configure SMTP STARTTLS support; the renderer requires transport security. Re-render configuration and restart Synapse/backend after changing settings. Owner/service bootstrapping uses the internal shared-secret interface and does not require email.

Set `REGISTRATION_OPEN=false` to close NEXUS registration. Re-render Synapse configuration as well when email-based native registration was enabled. The proxy blocks direct public registration calls, but internal network protection remains essential.

## Database roles

The local Compose database initializes two databases with different owner roles. Production should split the NEXUS migration role from its DML-only runtime role. `migrate` is an explicit, additive SQL runner guarded by an advisory lock. Do not use database resets or destructive schema pushes on an existing server.

Using a remote application DB requires updating `.env` and mounting a CA certificate if needed. Synapse still uses its dedicated configured DB. `REALTIME_DATABASE_URL` is unused by this Matrix architecture. Verify external TLS and firewall rules before running any migration.

## Validation checklist

1. Run the API smoke script only on a disposable deployment. It creates and deactivates two test accounts.
2. Use two real browsers/devices to verify key comparison, message confidentiality in database inspection, reconnection and tamper failures.
3. Repeat tests with a revoked device, changed key, suspended account and expired upstream session.
4. Test audio/video with peers on different networks, with direct connectivity blocked so TURN is actually used.
5. Verify email verification and reset against a test mailbox when SMTP is enabled.
6. Verify responsive UI, keyboard interaction, microphone permissions and attachment downloads.
7. Run dependency vulnerability scans and an independent security review before production claims.

## Backups and restore

Install `age`. Set `BACKUP_RECIPIENT` to the public recipient key and run `bash scripts/backup.sh`. It pauses writers, encrypts a cluster SQL dump and Synapse data archive, and restarts services. The script is supplied but was not executed here. This maintenance operation causes downtime. For an external application DB, adapt the backup plan; the bundled script backs up the Compose cluster only.

Restore only into an isolated environment first: decrypt the SQL archive using the separately held private age key, restore to a fresh PostgreSQL cluster, restore Synapse data with UID 991 ownership, restore encrypted configuration, start services, and verify access and media. Never restore over an existing production cluster without a separately reviewed recovery plan. Store backup decryption keys apart from backup objects.

## Operational tasks still needed

Configure alerts, disk limits, retention and deletion schedules, encrypted off-host backup storage, certificate/TURN health checks, tested upgrades and rollback procedures. In-memory request throttling assumes one API replica; distributed deployments need a shared rate-limit store. Group calling and offline push are not deployment switches in this release; they require additional implementation.
