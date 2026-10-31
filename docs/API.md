# API contract

NEXUS endpoints use the same-origin `/api` prefix. Success returns `{data: ...}`; errors return `{error:{code,message,requestId?}}`. SQL statements use bound values. Opaque sessions use HttpOnly cookies. Mutations require the exact configured Origin; authenticated mutations additionally require `X-CSRF-Token` from the `nexus_csrf` cookie.

| Method | Path | Request / response | Access |
|---|---|---|---|
| GET | /health | Database-backed readiness | Public; no internals |
| GET | /config | Server name, registration/email flags | Public |
| POST | /auth/register | username, displayName, password; optional verified email sid/clientSecret → user and in-memory SDK session | Public, throttled |
| POST | /auth/login | username/password → user and SDK session | Public, throttled |
| GET | /auth/me | Current user and SDK credentials | Authenticated |
| POST | /auth/logout | Revoke Matrix token, expire cookies | Authenticated + CSRF |
| POST | /auth/email/request | purpose register/reset, email, clientSecret → sid | Public, throttled; SMTP required |
| POST | /auth/password/reset | verified sid/clientSecret, new password in password → reset result | Email identity verification |
| GET | /users/search?username=… | Exact normalized username → public ID/name | Authenticated |
| PATCH | /users/me | displayName, preferences.readReceipts/presence | Current user only |
| DELETE | /users/me | password → upstream deactivation and local deletion | Current user + password |
| GET | /contacts | Own saved contacts, maximum 500 | Current user |
| POST | /contacts | userId | Current user |
| DELETE | /contacts/:id | Remove owner/contact association | Current user |
| POST | /reports | userId, category, evidence, consent=true | Authenticated, throttled |
| POST | /admin/unlock | Six-digit code → ten-minute grant | Owner role, throttled |
| GET | /admin/dashboard | Total, active and suspended counts | Owner + MFA |
| GET | /admin/users?offset=0 | Page of 50 users | Owner + MFA |
| PATCH | /admin/users/:id/status | ACTIVE/SUSPENDED and reason | Owner + MFA; owner protected |
| GET | /admin/audit?offset=0 | Page of audit events | Owner + MFA |
| GET | /admin/reports?offset=0 | Explicitly submitted report evidence | Owner + MFA; access logged |
| PATCH | /admin/reports/:id | resolution → resolved report | Owner + MFA |
| GET | /admin/health | Sanitized database and messaging health | Owner + MFA |

The browser uses the standard Matrix Client–Server API through `/_matrix/` for rooms, invitations, message ciphertext, device public keys, encrypted attachments, receipts, typing and calls. Synapse administrator endpoints under `/_synapse/` are blocked by the public reverse proxy. The two standard Synapse email-verification submit-token routes are allowed when used by emailed verification links. Direct public Matrix registration is also blocked; NEXUS sends allowed registration requests internally.

SDK tokens are returned only to the authenticated browser and held in memory, not browser localStorage. The application session cookie is not readable by JavaScript. XSS still threatens the active browser session and its message contents, so this is not a claim of protection against malicious frontend code.

Uploaded application reports are plaintext by explicit consent. Private attachments are encrypted before upload; NEXUS does not claim server-side malware inspection of ciphertext. Maximum client attachment size is 20 MB; the reverse proxy/Synapse limits leave room for upload overhead.
