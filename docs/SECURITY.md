# Security model and review requirements

This project is an implementation candidate. Neither the new application code nor its integration has received an independent security audit. Passing unit tests does not establish cryptographic or production security.

## Implemented controls

- Client-side Olm/Megolm integration through the Matrix SDK's Rust crypto implementation; no custom chat cryptography.
- Encrypted rooms created explicitly; sending is disabled in unencrypted rooms.
- Explicit recipient-device verification gate before sending text/files/reactions or starting/answering calls.
- Fingerprints are fetched again before marking a device verified, preventing the UI from verifying a changed key based on a stale value.
- Authenticated encryption for server-held access tokens at rest. Private message keys do not enter this token vault.
- Random opaque browser sessions with stored hashes, CSRF hashes, exact-Origin checks and HttpOnly/SameSite cookies.
- Administrator role and ten-minute TOTP gate, with replay protection backed by a conditional database update.
- Parameterized SQL, request limits, protected owner identity, redacted server errors and explicit report disclosure.
- Current upstream token checks on authenticated API calls, including after device revocation or password reset.

## Limitations that affect users

1. The operator serves the browser JavaScript. A malicious or compromised release can steal plaintext or keys while the app runs. Browser E2EE does not remove this trust dependency.
2. Manual fingerprint comparison is required. Comparing an identifier only through the same unverified conversation is not independent verification.
3. Clearing browser data or losing device keys can make old history inaccessible. This release does not supply a key-backup/export/import or cross-signing onboarding UX.
4. Recipients may copy or screenshot messages. Deletion cannot revoke already-read copies.
5. Room names, membership, timing, sizes, Matrix event metadata and call setup information can be visible to infrastructure operators. Encrypted payloads do not conceal all metadata.
6. Ignore is the Matrix ignored-user behavior. It does not remove a person from shared groups or constitute comprehensive server-enforced blocking.
7. WebRTC uses encrypted media transport. The application requests verified room devices, but cross-browser, cross-network and peer-identity binding tests remain necessary before stronger call-security claims.
8. Notifications are generic while the app is running. There is no offline Web Push delivery service.
9. TOTP is configured for one owner account. Do not clone the same owner account/session across independent administrator operators.
10. Audit writes are application-enforced, not an external immutable ledger. Database administrators can alter database records.

## Production requirements

Pin and review dependency/image versions and licenses; run vulnerability checks after packages can be installed. Review CSP/WASM behavior in real browsers. Use dedicated database roles and validated TLS for external PostgreSQL. Protect .env, signing keys, database credentials and TURN secrets; rotate any credentials exposed previously. Use HTTPS for every remote client and restrict internal ports.

Test register/login/reset/logout, owner impersonation, CSRF, malformed requests, report disclosure, account lock reconciliation, object authorization, device replacement, key changes, malicious message edits, attachment integrity, interrupted sync and TURN abuse. Test and measure backup restoration. Add accountable operational monitoring and retention jobs before production use.

The included backup script encrypts data to an age public recipient. Back up the private deployment configuration separately in encrypted form. Losing TOKEN_ENCRYPTION_KEY invalidates stored token access; losing Matrix signing keys or user device keys has different recovery consequences.
