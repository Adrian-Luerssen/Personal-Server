# Release readiness

Assessment date: 2026-07-13
Code readiness: release candidate
Paid public launch: blocked on the external gates below

## Verified product surface

- Premium brand and interaction system across landing, authentication, Today, Gym, Habits, Cash, Series, Spotify, Assistant, and You.
- Managed-service and self-host positioning, integration roadmap, commercial model, and launch checklist are documented.
- Contactless Android capture keeps raw notification text in local parse scope, uploads normalized fields only, deduplicates events, offers Confirm/Edit/Ignore, and requires review before ledger creation.
- Route-level frontend splitting removes the previous monolithic page bundle. Assistant rendering and chart code are isolated from the initial shell.
- Android notification, Health Connect, widget, payment, update, and navigation contracts compile together.

## Verification record

| Check | Result |
|---|---|
| Frontend Node contract suite | PASS: 138 tests |
| Payment normalization/native contract suite | PASS |
| Transaction-suggestion backend tests | PASS, including correction and repeat-confirm behavior |
| Backend Jest suite | PASS: 212 tests across 32 suites |
| Backend Nest build | PASS |
| Frontend production Vite build | PASS; pages, Assistant, and charts are split into separate chunks |
| Native Playwright product suite | PASS: 28/28 serial Chromium journeys |
| Contactless review Playwright journey | PASS |
| Responsive native route matrix | PASS at 320, 412, and 486 px without page or local horizontal overflow |
| Android Gradle unit/compile task | PASS |

The legacy authenticated desktop Playwright files require a running API at `localhost:4051` and seeded test account. In this audit environment that API was not running; their failures were connection refusals in fixture setup, not browser assertions. Mocked domain journeys, public routes, production builds, and the complete native suite are the authoritative local evidence.

## Android artifact

The local release build produced `frontend/android/app/build/outputs/apk/release/app-release-unsigned.apk` (5,696,809 bytes; SHA-256 `24F738C0B3E0E61A235BB475ABCA49A44D17B19FD4516D902675EDBB556E6DFF`). It is compile evidence, not a distributable artifact. The GitHub release workflow refuses unsigned publication, verifies the signed APK with `apksigner`, generates SHA-256 metadata, and uploads both the APK and release metadata.

Required CI secrets:

- `VITE_API_BASE` using a public HTTPS origin
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `APP_RELEASE_SYNC_SECRET`

## App-store and customer launch gates

- Complete trademark, domain, social handle, and store-name clearance for Personal Record / Record.
- Have counsel approve a source-available noncommercial license, commercial license, contributor terms, privacy notice, consumer terms, and launch jurisdictions.
- Publish support, privacy, terms, and account-deletion URLs and connect them to store listings.
- Complete Google Data Safety and Apple privacy labels against actual runtime collection and processors.
- Decide billing provider, store billing treatment, VAT, invoicing, refunds, cancellation, grace periods, and chargebacks.
- Run tenant-isolation and independent security reviews; verify MFA recovery, imports, agent keys, SSRF boundaries, and processor configuration.
- Perform a production backup restoration and account export/deletion drill.
- Test contactless detection on physical devices against the notification formats of supported banks; maintain package-specific parser fixtures.
- Configure production Spotify, AI, email, error-reporting, payment, and optional media integration credentials.

## Release and rollback

1. Tag the exact reviewed commit and build only through the Android release workflow with HTTPS API and signing secrets present.
2. Retain the prior signed APK, database migration state, release metadata, and server image.
3. If a client regression is found, raise the backend minimum-version policy only for security-critical cases; otherwise restore the prior stable tag and publish the prior signed artifact.
4. Contactless parsing can be disabled from Connections without deleting ledger data. A bad parser release should be disabled first, then corrected with fixture coverage.
5. Route and UI rollout can be reverted independently of customer records because this redesign does not rewrite existing domain data.

## Commercial readiness decision

The interface and implementation are suitable for a controlled beta after production infrastructure, legal text, store assets, and physical-device checks are complete. Do not accept paid public customers until every unchecked item in `LEGAL_LAUNCH_CHECKLIST.md` has a named owner and dated evidence.
