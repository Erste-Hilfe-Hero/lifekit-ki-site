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

## Native CI Proven (2026-09-24)

- ✅ Android AUTO V8 CI: API 36 debug APK → install → launch → Store Bridge init ✅
- ✅ iOS Test V4 CI: Xcode 26.6 simulator build → install → launch ✅
- 🔶 Signed AAB/IPA: Awaiting manual Store CI trigger + real-device validation
- 🔶 Real-device sandbox purchases: External gate
- 🔶 Store console uploads: External gate

## Definition of Done (Updated)

- [x] Complete regression ✅ (407/407)
- [x] Mobile UI ✅ (50/50)
- [x] Native CI proven ✅ (AUTO V8 + Test V4 validated)
- [ ] Signed AAB/IPA (blocked on Store CI trigger)
- [ ] Real-device purchase testing (blocked on signed builds)
- [ ] Production stores live (blocked on device testing)

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
