# Nyrathen v5.5 — Operations runbook

## Release qualification

Run from a clean checkout/build:

```bash
npm run check
npm test
npm run test:fuzz
npm run test:dr
npm run test:economy-race
npm run test:chaos
SNAPSHOT_HZ=5 STRESS_CLIENTS=100 STRESS_SECONDS=60 npm run test:stress-node
npm run release:preflight
```

`npm run release:qualify` executes the deterministic local qualification subset automatically. Long or multi-node stress runs are kept separate so CI does not accidentally overcommit a small runner.

## Readiness, drain and rolling updates

- `/healthz` means the process is alive.
- `/readyz` means the node may receive new sessions.
- Drain mode immediately removes the node from readiness while existing authenticated reconnects remain allowed.
- Wait for active sessions to leave or for the 45-second drain deadline, then stop the process.
- A hard crash leaves a lock file; v5.4 reclaims it only when it proves the lock belongs to a dead PID on the same host. Unknown or remote locks remain fail-closed.

## Monitoring

`/metrics` is bearer-token protected and must stay on a private ops path. Alert on at least:

- `nyrathen_tick_delay_p99_ms`
- `nyrathen_sessions` versus `nyrathen_ready_capacity_limit`
- `nyrathen_memory_rss_bytes`
- HTTP 5xx / 4xx rates
- SSE disconnects and slow-client disconnects
- backpressure skips
- storage health
- backup freshness and restore-drill success

Two consecutive unhealthy windows page by default. Canary promotion requires consecutive healthy windows; any SLO failure requests rollback.

## Backup and disaster recovery

- Primary rotating backups are not sufficient; copy encrypted backups to a separate failure domain.
- Run `npm run test:dr` in every release qualification. The drill copies the SQLite database, verifies SHA-256, restores into a fresh database, runs SQLite integrity checks and verifies representative player/world data.
- Default policy: RPO <= 15 minutes and RTO <= 15 minutes. Production teams may set stricter values.
- Never use `docker compose down -v` on production data.

## Security / economy

- `npm run test:fuzz` sends malformed local protocol requests and fails on server 5xx responses.
- `npm run test:economy-race` fires duplicate concurrent economy actions and verifies one item copy / one ledger transaction.
- `npm run admin -- ...` is an offline GM tool. Mutating commands require an actor plus `--confirm=WRITE` and acquire the data lock. Do not expose it as a public HTTP endpoint.
- Ban, mute, report and admin changes remain attributable in the audit trail.

## Crash/failover qualification

`npm run test:chaos` creates active sessions, streams and idempotent actions, sends SIGKILL, restarts on persistent storage, recovers the stale same-host lock, and verifies identities plus action receipts. Signed resume tickets are short-lived metadata only and never replace account authentication.

## Soak strategy

The stress harness accepts `STRESS_SECONDS` up to 24 hours. `SOAK_HOURS=6 npm run test:soak-long` runs a fail-closed local endurance check with p99/RSS/backpressure/input-timeout gates. This local soak does **not** satisfy the external 1,000-player multi-node soak evidence; production-like infrastructure must provide that separately. Track starting/ending RSS, tick p99, error rate, input timeouts and backpressure; a process merely staying alive is not a pass.

## 1k / 2k / 5k / 10k growth

Do not vertically inflate one worker. Use the capacity table in `PRODUCTION-SCALING-v5.4.md`, three workers per logical node maximum, 20% session headroom, and at least one spare worker. `npm run capacity:plan` is the source of truth for required worker/node counts.

## Publisher integrations

APNs/FCM, Apple/Google IAP receipt verification, public TLS/DNS and signed AAB/IPA require publisher-owned credentials. `npm run production:preflight` fails closed when an enabled integration lacks its credentials. Secrets belong in the deployment secret store, never in the repository or mobile bundle.


## Railway staging topology (v5.5)

- `nyrathen-state`: private central State Authority with persistent Railway volume.
- `nyrathen-game-01..03`: dedicated GameServer services; each has a stable public HTTPS endpoint for mobile failover.
- `nyrathen-load-01`: disposable certification runner.
- State Authority stays private; do not attach a public domain to it.
- Mobile builds should advertise dedicated GameServer HTTPS endpoints, never the State Authority URL.

Railway built-in logs/metrics are sufficient for staging and early production. External observability remains optional; SLO/readiness gates in the application remain authoritative.
