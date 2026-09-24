# Nyrathen v5.7 — Release Closure Status

Stand: 24.09.2026
Basis: ProductionRC Hotfix14 BetaOps
Live gameplay/runtime: `v5.7.0-prod-hotfix14-dungeon-boss-reward`

## Newly completed

- Full regression: **407/407 PASS**.
- Mobile UI: **50/50 PASS**.
- Syntax/build: **121 modules PASS**, native WebView assets synchronized.
- Store product contract: **13/13 PASS**.
- Store localization: **7/7 PASS**.
- Store policy: **PASS**.
- Beta local preparation: **PASS**.
- Railway production infrastructure inspected directly and recorded as PASS.
- Observed staged Hotfix-14 rollout recorded as canary evidence.
- Admin operations drill PASS (status, ban, unban, audit, commerce report).
- `admin status` hardened for freshly migrated databases where optional tables do not yet exist.
- Push-notification production evidence is no longer a false blocker when push is explicitly disabled for the release.
- Six-hour distributed Railway endurance run started with 84 clients over all 14 workers; exact current deployment is live and healthy, but final PASS remains pending until real elapsed-time evidence exists.
- Endurance release gate hardened: a PASS now requires the real `NYR_LOAD_REPORT`, at least six elapsed hours, 14/14 targets, 84/84 connected clients, p99 <= 180 ms and healthy post-cleanup State/storage on every target.
- `release:soak-evidence` added to validate and ingest the final report without allowing manual `hours: 6` shortcuts.

## Native mobile CI (v5.7 canonical native CI cleanup)

- Android: `.github/workflows/nyrathen-android-auto-v8.yml` ("Nyrathen Android AUTO V8") — run **36035507949, SUCCESS**, commit `04ee69a6904c5d7f67d55aecdbe7fb6fc7ed75b6`, 410/410 tests, API36 emulator install/launch/crash-smoke.
- iOS: `.github/workflows/nyrathen-ios-test-V4.yml` ("Nyrathen iOS Test ONLY", V4) — run **36029164149, SUCCESS**, commit `0ac02e9d2b304db2091768db7db303bd5c240791`, 410/410 tests, Mobile UI 50/50, Xcode 26.6, iPhone 17 Pro Max / iOS 26.5 simulator install/launch.
- Native Billing-Bridges compilation is complete on both platforms via these two canonical, GitHub-hosted workflows; obsolete Android v6/v7 and iOS V2/V3 workflow variants have been removed. See `docs/CANONICAL-CI-WORKFLOWS-v5.7.md` and `release/ANDROID-GITHUB-CI-STATUS-v5.7.md` for details.
- The native CI phase is now considered complete. Signed builds, physical-device testing, store publication, and in-app-purchase live verification remain **OPEN** external gates — nothing above changes their status.

## Live production remains unchanged

The gameplay/account-progression runtime remains Hotfix 14:

- hard curve: `102 × (Level−1)^2`;
- normal kill: 4 Account-XP;
- normal boss: 55 Account-XP;
- dungeon boss: 105 Account-XP;
- representative-mix acceleration: ~4.9%.

No gameplay balance value was changed in this closure pass.

## Remaining external evidence

- 6h endurance completion (currently running).
- 1000-player destructive chaos/failover evidence.
- off-site production backup/restore.
- observed application-specific DDoS/WAF edge evidence.
- external security/privacy/legal/trademark review.
- real publisher identity and public legal pages.
- signed Android AAB + physical Android matrix.
- signed iOS archive/IPA + physical iPhone matrix.
- authenticated App Store Connect / Google Play setup and real product creation.
- real closed beta + crash/ANR evidence.
- store age-rating submission.
- measured 2k/5k/10k future-capacity benchmarks.

These gates remain fail-closed and are not represented as complete without real evidence.
