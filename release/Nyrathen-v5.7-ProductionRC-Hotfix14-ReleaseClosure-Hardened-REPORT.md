# Nyrathen v5.7 — Release Closure Hardened

Stand: 24.09.2026, 13:18 UTC
Basis: ProductionRC Hotfix14 ReleaseClosure / Soak Running
Gameplay runtime: `v5.7.0-prod-hotfix14-dungeon-boss-reward` (unchanged)

## Completed in this pass

- Release regression: **407/407 PASS**.
- Mobile UI: **50/50 PASS**.
- Syntax/build: **121 modules PASS**; Android/iOS WebView assets synchronized.
- Store products: **13/13 PASS**.
- Store/app localization: **7/7 PASS**.
- Store policy: **PASS**.
- Closed-beta local preparation: **PASS**; credentials/public URLs remain intentionally fail-closed.
- Six-hour endurance evidence gate hardened. `hours: 6` alone can no longer certify the release.
- Certification now requires a real final `NYR_LOAD_REPORT` proving:
  - at least 6 real elapsed hours and 21,600 active seconds;
  - at least 14 targets and 84 clients;
  - all clients connected;
  - p99 <= 180 ms;
  - every target passed active readiness;
  - every target passed post-cleanup readiness with State/storage healthy.
- `npm run release:soak-evidence -- --report <report.json> --write-evidence` added for fail-closed final evidence ingestion.
- Current Railway load deployment `3a7b7e02-c1ab-4397-a2ef-6aba081d2f05` was verified as `SUCCESS`; runner announced 84 clients at 12:49 UTC. The six-hour gate is **not** marked complete because the end report does not exist yet.

## Gameplay/balance unchanged

- Account curve: `102 × (Level−1)^2`.
- Normal kill: 4 Account-XP.
- Normal boss: 55 Account-XP.
- Dungeon boss: 105 Account-XP total.

## Still external / real-evidence only

- Six-hour endurance final report.
- Destructive ~1000-player chaos/failover.
- Off-site production restore.
- Observed application-specific DDoS/WAF edge evidence.
- External security/privacy/legal/trademark review.
- Signed Android AAB + physical Android matrix.
- Signed iOS archive/IPA + physical iPhone matrix.
- Authenticated App Store Connect / Google Play setup and product creation.
- Real publisher identity/public legal URLs and age-rating submission.
- Real closed beta + crash/ANR review.
- Measured 2k/5k/10k capacity benchmarks.

No external gate is represented as complete without real evidence.
