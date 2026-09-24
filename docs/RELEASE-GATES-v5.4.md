# Nyrathen v5.4 — Release certification gates

## Local/internal gates

These are executable from the package and must be green for every release candidate:

- Full regression suite.
- Mobile release preflight and Android/iOS embedded-runtime sync.
- Android API 36 policy check.
- iOS Xcode 26+ / iOS 26 SDK gate for signed archives.
- Protocol fuzzing and adversarial API security audit.
- Backup/restore drill with integrity verification.
- Economy idempotency race and synthetic supply/sink health check.
- Crash/failover drill.
- 100-active-player worker qualification and measured SLOs.
- SHA-256 package manifest and clean-unpack requalification.

Run `npm run release:certify`.

## External evidence gates

The package deliberately refuses to manufacture evidence for infrastructure or hardware it cannot access. `npm run release:evidence` records the state; `REQUIRE_EXTERNAL_EVIDENCE=true npm run release:evidence` fails until all current evidence is fresh and passing.

Required evidence covers: a certified shared transactional account/state backend for multi-node production, 1,000-player multi-node test, 1,000-player chaos test, >=6h soak, production ingress/TLS/database, off-site restore, edge DDoS controls, monitoring/alerts, admin operation drill, external security review, real iOS/Android device matrix, signed AAB/iOS archive, store accounts, production push, IAP when enabled, public legal pages, privacy and trademark review, age ratings, closed beta, crash/ANR review, economy review, prepared LiveOps content, support/moderation drill, observed canary rollout, measured 2k/5k/10k future-capacity benchmarks, and frozen RC.

Evidence older than 30 days is rejected by default.


## Multi-node state safety

The bundled SQLite profile database is a **single-worker/local development backend**. Multi-node production is fail-closed unless `STATE_BACKEND_MODE=external-certified` and a non-empty `DISTRIBUTED_STATE_EVIDENCE` value is supplied to `npm run production:preflight`. Do not mount or copy one SQLite database across multiple GameServer writers.
