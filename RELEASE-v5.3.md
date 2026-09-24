# Nyrathen v5.3 — Production hardening and future-capacity release

v5.3 keeps Nyrathen mobile-only and hardens the server around measured realtime capacity instead of theoretical connection limits.

Implemented in this release:

- bounded SSE backpressure and slow-client eviction;
- reduced snapshot/delta allocation and serialization work;
- incremental persistence rather than room-wide saves per action;
- adaptive readiness based on session headroom and event-loop/tick SLO;
- drain-aware rolling updates and signed short-lived resume metadata;
- same-host stale-lock recovery after hard process crashes;
- anti-cheat input validation, persistent bans and auditable admin operations;
- idempotent economy ledger plus concurrent duplicate-action regression;
- deterministic network/API fuzzing;
- backup -> SHA-256 -> restore -> SQLite integrity disaster-recovery drill;
- capacity planner, SLO monitor, alerts, canary promotion/rollback and production preflight;
- stress tooling for real SSE streams and multi-worker qualification;
- future capacity plans for 1k, 2k, 5k and 10k concurrent players.

Measured release envelope: 100 nominal / 80 safe active players per worker. On the qualification host, 300 active clients (3x100) passed the final horizontal run with max p99 111.21 ms; an earlier 320 (4x80) run also passed. A repeated 400-client (4x100) run breached the 180 ms release SLO, and 500/1,000 local attempts exceeded the five-core host's CPU envelope. Those tiers are deliberately not misreported as local passes. The production 1k plan is 14 workers on at least five logical nodes and must be certified again on that real topology.

External publisher infrastructure remains credential-gated: public DNS/TLS, production orchestration, off-site backup target, APNs/FCM when enabled, Apple/Google commerce verification when enabled, signed AAB/IPA and physical-device beta.
