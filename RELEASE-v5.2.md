# Nyrathen v5.2 — Production Systems

v5.2 hardens the mobile-only multiplayer release without importing third-party game assets or GPL runtime code.

Implemented production primitives: server-side anomaly scoring for movement/fire/damage/replay signals; idempotent economy ledger; attributable GM/admin audit trail; signed monotonic LiveOps revisions; cluster placement/drain primitives; bounded privacy-neutral telemetry; push outbox; verified store-entitlement adapter; existing transactional trade/persistence, moderation, backups, HA/failover and leaderboards retained.

External deployment remains intentionally credential-gated. APNs/FCM, Apple/Google store verification, TLS/domain, backup target, production database/hosts and signed AAB/IPA require publisher-owned accounts and infrastructure. `npm run production:preflight` fails closed when enabled integrations lack credentials.
