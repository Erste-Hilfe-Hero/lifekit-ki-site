# Nyrathen v5.3 — stress, resilience and future-capacity report

Qualification host: Linux x64, 5 logical CPUs, ~5.81 GiB RAM.

## Correctness / release gates

- Full regression: **315/315 passed**.
- Mobile UI: **50/50 passed** (390×844 and 412×915).
- Syntax/check: **74 modules**, native Android/iOS assets synchronized, no browser artifact.
- Mobile release preflight: **PASS**.
- Protocol/API fuzz: **320 malformed cases, 0 server 5xx**.
- Economy race: **8 concurrent duplicate confirmations, exactly one copy of each item, one ledger row**.
- Hard-crash/restart: **80/80 identities recovered; 80/80 action receipts replayed; stale same-host lock safely reclaimed**.
- Backup/restore: SHA-256 verified; SQLite integrity `ok`; restore drill completed in ~8.81 ms in the local test environment.

## Realtime worker results

- 100 active players, 8 s qualification: p99 85.66 ms, 0 failures, 0 input timeouts.
- 100 active players, 30 s soak: **PASS**; 11,690 inputs, 10 reconnects, 0 failures/timeouts/backpressure, p99 79.89 ms, RSS 40.1 MiB → 210.9 MiB.
- 3 × 100 = 300 active players, 8 s: **PASS**; max worker p99 111.21 ms, 0 failures.
- 4 × 100 = 400 active players, 8 s: **SLO FAIL** on repeat; all 400 connected but one worker p99 reached 245.63 ms (>180 ms).
- 500 local active players: **not certified**; five workers saturated the qualification host.
- 1,000 local active players: **not certified**; a 13-worker run overcommitted the 5-core host and exceeded SLO / reset some workers.

## Final production capacity contract

- 100 nominal sessions / worker.
- 80 safe active sessions / worker (`READY_SESSION_PERCENT=80`).
- At most 3 GameServer workers / logical node in the default planner.
- Event-loop/tick p99 release SLO: <= 180 ms / worker.

Planner targets:

- 1,000 players → 14 workers / >=5 logical nodes / safe capacity 1,120.
- 2,000 → 26 / >=9 / safe 2,080.
- 5,000 → 64 / >=22 / safe 5,120.
- 10,000 → 126 / >=42 / safe 10,080.

`production:preflight` rejects insufficient worker count, logical node count, excessive worker density, single-node claims for multi-node targets, missing/weak secrets, same-location backup targets and missing enabled publisher credentials.

## Interpretation

The codebase is release-qualified for the measured worker envelope and for horizontal scaling by the documented capacity contract. **1,000 simultaneously active realtime players have not been certified on an actual five-node production topology in this environment.** That final tier requires the publisher's real multi-node infrastructure; v5.3 deliberately fails closed rather than treating a 5-core local host as equivalent.
