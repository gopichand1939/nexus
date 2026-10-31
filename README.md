# NEXUS

A single-repository, self-hosted communication application with a React frontend and a modular Node.js MVC backend.

**Delivery status: implementation candidate, not a production-certified or deployed system.** Read [docs/STATUS.md](docs/STATUS.md) for the latest local verification results and remaining work. Do not interpret passing unit tests or a production build as an end-to-end security audit.

## One application, one repository

```text
nexus/
├── frontend/                  React views, feature modules and Matrix integration
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   ├── messaging/
│       │   ├── contacts/
│       │   ├── calls/
│       │   ├── security/
│       │   ├── settings/
│       │   ├── reports/
│       │   └── admin/
│       └── shared/
├── backend/                   Node.js / Express MVC application
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           routes → controller → service → model
│   │   │   ├── users/
│   │   │   ├── contacts/
│   │   │   ├── reports/
│   │   │   └── admin/
│   │   ├── providers/         Matrix HTTP integration
│   │   ├── middleware/        Authentication, CSRF, role and MFA gates
│   │   ├── config/
│   │   ├── shared/
│   │   └── database/migrations/
│   ├── scripts/
│   └── tests/
├── infra/                     Nginx, Caddy and PostgreSQL setup
├── scripts/                   Setup, validation, smoke tests and backup
├── docs/                      Architecture, API, deployment and status
├── .github/workflows/ci.yml
├── package.json               One npm workspace root
├── package-lock.json          One dependency lockfile
├── Dockerfile                 Web and API build targets
├── docker-compose.yml
├── docker-compose.dev.yml
└── docker-compose.production.yml
```

The frontend is the MVC view layer. Backend controllers handle HTTP, services enforce business rules, models own parameterized SQL, and the Matrix provider handles the communication engine. There are no nested repositories.

## Architecture decision

NEXUS uses **self-hosted Matrix/Synapse and the Matrix Rust crypto SDK** for messaging rather than a homemade encryption protocol. Synapse supplies messaging storage, devices, synchronization, encrypted-room transport and WebRTC signalling; the NEXUS backend supplies browser sessions, contacts, profiles, reports and an owner console. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

This deliberately revises the earlier Signal/Socket.IO/Prisma proposal. The implementation uses JavaScript ES modules, React, Express and `pg` with SQL migrations. Synapse manages passwords using its own authentication implementation; the NEXUS API does **not** implement the earlier proposed Argon2id password store. No application promises that an administrator can secretly decrypt private conversations.

## Local Docker startup

Requirements: Node.js 24, npm 11, Python 3, and Docker Engine with Compose v2. Use Linux for the included host-network Coturn configuration. Docker Desktop users must adapt TURN networking before testing calls across networks.

Run all commands from this `nexus/` directory:

```bash
npm ci
npm test
npm run check
npm run build
python3 scripts/setup.py
docker compose up -d --build
docker compose exec -T backend node backend/scripts/bootstrap.js
```

Open **http://localhost:8080**. Sign in as `owner` using the password chosen during setup. Add the private `ADMIN_TOTP_SECRET` from `.env` to your authenticator with SHA1, six digits and a 30-second period. The owner console requires this code in addition to login. The secret is not printed or included in the delivered archive.

`setup.py` generates random secrets and refuses to replace an existing `.env`. Docker creates separate application and Matrix database roles and databases. Do not expose the frontend publicly until bootstrapping has completed and deployment checks pass. Public registration defaults to enabled for development.

The Matrix service administrator is separate from the NEXUS owner. Its credentials stay server-side and must never be used in the browser.

### Trying messaging

1. Register two ordinary users in **separate browser profiles or different devices**. One active tab per browser profile is supported.
2. Search the other user's exact username and start a conversation.
3. Accept the invitation on the other device.
4. Open **Verify devices** on both sides. Compare the displayed fingerprints through an independent trusted channel, and enter the other device's full fingerprint to verify it.
5. Send messages. The app explicitly checks recipient-device verification before sending. New or unverified devices must be checked first.
6. Test files, edits, replies, forwarding, encrypted reactions and voice recording. Emoji reactions currently expose one-click thumbs-up; the application wire format supports the documented small emoji set.
7. Audio/video controls are for **one-to-one calls**. Verify devices and configure reachable TURN before cross-network testing.

This client stores private keys in browser IndexedDB. Do not clear site data if you need the history on that device. There is no automated encrypted key backup or history recovery UI in this release. New login sessions create new Matrix devices; verify them and revoke stale devices as needed.

## Working on frontend and backend

```bash
npm ci
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build backend synapse postgres
docker compose exec -T backend node backend/scripts/bootstrap.js
npm run dev:frontend
```

Open http://localhost:5173. The development overlay sets the backend's allowed origin to that address and exposes its port only on loopback. Backend source is mounted and watched by Node; Vite provides frontend hot reload. Avoid simultaneously running the bundled frontend against the development backend origin.

## Existing PostgreSQL server

The supplied database URL is configured in the private root `.env`, and a read-only connection query succeeded. No remote migrations or account tests were run. Keep credentials out of `.env.example` and shared archives. For deployment, set `DATABASE_URL` to a dedicated NEXUS database/role. Use verified TLS (`sslmode=verify-full` with a valid server certificate, or a mounted CA file through `DB_CA_FILE`) or a secure private network. Never set `rejectUnauthorized:false`.

`REALTIME_DATABASE_URL` is retained as a documented configuration name but is **not consumed by this implementation**: Matrix provides real-time synchronization. It is not a second independent message store. Synapse has its own database and schema. Do not point Synapse at an existing application's tables.

Run `npm run migrate` only with the intended configuration. Migrations create `nexus_*` tables; they do not drop existing tables or reset the supplied database. Production runtime credentials should have DML-only privileges, with a separate role used for migrations. The development Docker role owns its schema for convenience.

## Optional email verification and recovery

Email is disabled until SMTP is configured. Set these values in the private `.env`:

```dotenv
EMAIL_ENABLED=true
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM='NEXUS <noreply@your-domain>'
```

Recreate the configuration and affected services:

```bash
docker compose up --force-recreate config
docker compose up -d --force-recreate synapse backend
```

The form first requests a verification email. Complete the emailed verification, return to the still-open form, and continue. Recovery uses Synapse's standard email identity flow and resets account access, not encryption keys. Real SMTP delivery and email round trips were not tested here. Existing accounts without a verified email cannot use this recovery path.

## Testing

```bash
npm test                       # Dependency-free security/service/model unit tests
npm run check                  # JS syntax, JSON and required MVC structure
npm run build                  # Compile frontend after npm ci succeeds
node scripts/smoke.mjs          # Real API test against an isolated running dev deployment
```

The smoke test creates and deletes test accounts; run it only on a disposable test deployment with email verification disabled. It does not test browser encryption or calls. The CI workflow installs dependencies and runs unit checks and a frontend build.

### Isolated two-account tests with an existing remote database configured

The test overlay forces the backend and migrations to use the local PostgreSQL service. Keep the project name `nexus-local-test` to give this deployment its own Docker volumes. The private `.env` remains unchanged, including its remote database URL. Port 8080 must be available.

```bash
docker compose -p nexus-local-test -f docker-compose.yml -f docker-compose.test.yml up -d --build frontend
docker compose -p nexus-local-test -f docker-compose.yml -f docker-compose.test.yml exec -T backend node backend/scripts/bootstrap.js
node scripts/smoke.mjs
npx playwright install chromium
```

Run the browser test in PowerShell:

```powershell
$env:NEXUS_DISPOSABLE_TEST = 'true'
npm run test:browser
```

On Linux/macOS use `NEXUS_DISPOSABLE_TEST=true npm run test:browser`. To use an installed Chrome or Edge instead of downloading Chromium, set `PLAYWRIGHT_CHANNEL` to `chrome` or `msedge`. The test uses separate browser contexts, registers two accounts, checks the unverified-device sending gate, compares device fingerprints, exchanges encrypted messages, and reloads to check history. It deletes the accounts afterwards. Calls, SMTP and the remaining feature checklist need separate tests.

Stop this deployment with `docker compose -p nexus-local-test -f docker-compose.yml -f docker-compose.test.yml down`. Its volumes are preserved for inspection.

## Deployment and limits

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/SECURITY.md](docs/SECURITY.md), and [docs/STATUS.md](docs/STATUS.md). No live deployment URL is supplied. Group calls, encrypted key-backup UX, server-enforced per-user blocking, advanced presence policy, scheduled retention/monitoring and an independent security review remain unfinished.
