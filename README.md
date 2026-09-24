# Nyrathen v5.7.0 — Mobile-only production-hardened project

Nyrathen is an original cooperative pixel bullet-hell RPG for **iOS and Android** with an authoritative multiplayer server. There is **no public browser/PWA game release**.

## Included

- 19 classes, 18 dungeons, open rifts, multi-phase bosses, permadeath, loot, vaults, character slots, mastery, seasons, trials, companions, forge/dismantling, material storage, enchantments/engravings, mission tree, Tinkerer contracts, Crucible, Journey onboarding and LiveOps configuration.
- Server-authoritative accounts/guest access, parties, guilds, friends/DM, trade, block/report, reconnect, leaderboards, backups, delta snapshots, economy idempotency and moderation/audit tooling.
- Production hardening: bounded SSE backpressure, slow-client eviction, incremental persistence, anti-cheat input validation, persistent bans, drain/readiness, canary/rollback policy, SLO/alerting, crash/restore drills, fuzzing and capacity planning.
- v5.7 commerce: Black Counter shop, Nyr-Splitter wallet, StoreKit 2, Google Play Billing 9.1.0, server-verified entitlements, Season Premium, Wishlist/Restore and weekly rotations with no combat-power sales.
- Android project in `native/android` and iOS project in `native/ios` including `PrivacyInfo.xcprivacy`.
- Stateful Node multiplayer server in `server` and embedded mobile runtime assets; no remotely loaded game website is required.

## Verify the release

```bash
npm run check
npm test
npm run release:certify
npm run release:preflight
npm run release:evidence
```

Capacity and production topology:

```bash
npm run capacity:plan
npm run production:preflight
```

For a final production gate, run `REQUIRE_EXTERNAL_EVIDENCE=true npm run release:evidence`; it deliberately fails until real infrastructure/device/store evidence has been supplied.

See `docs/PRODUCTION-SCALING-v5.5.md` and `docs/OPERATIONS-RUNBOOK-v5.5.md` before production deployment.

## Capacity contract

The measured release envelope is **100 nominal / 80 safe active players per GameServer worker**. A 1,000-player target is planned as 14 workers across at least five logical nodes; larger targets scale horizontally using the same SLO/readiness contract. A small single host is never treated as a valid 1k certification merely because it can open 1,000 sessions. Multi-node production additionally requires a certified shared transactional state backend; local SQLite is intentionally rejected by the production preflight.

## Native signing / external infrastructure

Signed AAB/IPA require the publisher's Android/iOS SDKs and signing credentials. Public DNS/TLS, production orchestration, off-site backups, APNs/FCM and Apple/Google commerce verification require publisher-owned accounts/credentials. Release gates fail closed when enabled integrations are not configured.

## Legal / IP boundary

Nyrathen uses its own names, graphics, sounds, maps, UI and content. The runtime contains no code imported from the previously reviewed GPL source `iDilly/sharp`. Public server projects were used only as technical/function references; see `THIRD_PARTY_NOTICES.md`, `docs/REFERENCE-SOURCES.md` and `docs/GITHUB-SERVER-FUNCTION-AUDIT.md`.

Before commercial publication, complete the publisher/contact/privacy/store fields and the checks in `docs/LEGAL-RELEASE-CHECKLIST.md`.


## Hard Progression Lock

Nyrathen's permanent account progression is intentionally difficult. The locked v5.7 curve is `102 × (level−1)^2`, using 4 Account XP per normal kill, 55 per normal boss and 105 total per dungeon boss (55 + 50 bonus). The dungeon premium is calibrated to about 4.9% faster permanent progression in the representative normal mix. This is the original hard progression plus 20% required XP. Do not reduce it without explicit product-owner approval. Automated regression tests enforce the thresholds.
