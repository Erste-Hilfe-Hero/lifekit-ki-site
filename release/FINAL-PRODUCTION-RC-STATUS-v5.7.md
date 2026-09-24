# Nyrathen v5.7 — Final Production RC Status

Stand: 24.09.2026

## Engineering / gameplay / server — PASS

- Hotfix 14 live: `v5.7.0-prod-hotfix14-dungeon-boss-reward`.
- Hard account progression locked: `102 × (Level−1)^2`, normal kill 4 XP, normal boss 55 XP, dungeonboss 105 XP total.
- Dungeonboss reward accelerates the representative normal mix by 4.90%, while the +20% hard curve remains unchanged.
- Full regression: 397/397 PASS.
- Mobile UI: 50/50 PASS.
- Syntax/build: 115 modules PASS; native WebView assets synchronized.
- Security audit: 325 cases, 0 server 5xx.
- Fuzz: 480 cases, 0 server 5xx.
- DR restore: integrity OK.
- Economy race: idempotent / PASS.
- Chaos recovery: 80/80 recovered and replayed.
- Local worker stress: 100/100 clients, p99 121.5 ms, 0 input timeouts/backpressure/4xx/5xx.
- Product contract: 13/13 IDs PASS.
- Runtime and store localization: 7/7 locales PASS.
- Store policy gate: PASS.

## Railway Hotfix 14 certification — PASS

- 1008/1008 clients connected.
- 14/14 workers passed, layout 5/5/4.
- 456,497 frames.
- Max event-loop p99: 134 ms; SLO <= 180 ms.
- Post-cleanup storage/state health: PASS.
- State volume current usage during final check: ~0.446 GB / 0.500 GB; hourly alert watch configured.

## Legal / native / store evidence — fail-closed, externally blocked

The code and templates are prepared, but the following cannot be truthfully completed without external identity, accounts, hardware, credentials or elapsed time:

- Publisher/company legal name, support/privacy email, postal address, privacy contact, effective date, server operator.
- Public activation of Privacy, Terms, Support, Delete Account and Imprint with those real details.
- Android release AAB: this host lacks Android SDK 36 and release signing credentials.
- iOS release archive: this host is not macOS/Xcode and has no Apple Development Team configured.
- App Store Connect / Google Play Console product creation, prices and territories: no authenticated connector is available in this chat.
- Physical Android/iPhone test matrix and actual Apple/Google sandbox/license purchase/restore/refund/revocation.
- Uninterrupted 6–24h soak: segment tests pass, but elapsed-time evidence cannot be fabricated.
- Closed beta, external security/privacy/legal/trademark review, age-rating submission, crash/ANR review, off-site restore and DDoS/canary evidence.

No external release gate is represented as complete without evidence.
