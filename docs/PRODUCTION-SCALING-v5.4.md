# Nyrathen v5.4 — Production scaling and capacity contract

Nyrathen is mobile-only. The authoritative simulation runs at 20 Hz; production snapshots default to 5 Hz and the client interpolates between authoritative frames. Capacity is controlled by readiness and SLOs, not by filling a process until it crashes.

## Measured worker envelope

Measurements were taken in the release qualification environment (5 logical CPU cores, about 5.8 GiB RAM) with real SSE streams plus movement/fire input traffic.

| Active players / worker | Event-loop p99 | Result |
|---:|---:|---|
| 80 | 69.8 ms | pass / safe operating point |
| 100 | 91.0 ms | pass / nominal capacity |
| 120 | 154.4 ms | pass, reduced headroom |
| 150 | 423.9 ms | fail: input timeouts / SLO breach |

The production contract is therefore **100 nominal sessions per worker, 80 safe active sessions at readiness**, with `READY_SESSION_PERCENT=80`. A worker leaves load-balancer readiness when it is draining, storage is unhealthy, tick-delay p99 exceeds the configured SLO, or safe session capacity is reached.

## Leaderboard-cache hot path fixed in v5.4

A load-profile found that an empty leaderboard was treated as an uncached leaderboard, causing repeated SQLite scans during snapshot fanout on fresh servers. v5.4 uses an explicit null sentinel, so an empty leaderboard is cached for the same 15-second TTL. The full 326-test suite remained green after the change.

## Local horizontal validation

On the same 5-core host:

- 3 × 100 = **300 active players**: pass, max p99 **118.95 ms** in the final full certification run; an earlier post-fix run measured 165.02 ms, also below the 180 ms SLO.
- 4 × 80 = **320 active players**: passed an earlier safe-capacity run (max p99 157 ms).
- 4 × 100 = **400 active players**: functional but not release-certified on this host; the post-fix run kept all 400 connected but reached max p99 **387.19 ms**, beyond the 180 ms SLO.
- 5 × 100 = **500 active players**: functional connections, but SLO fail from host CPU saturation; post-fix max p99 **1098.91 ms**.
- 1,000 active players on 13 local workers: intentionally **not certified**; the host was overcommitted and several workers exceeded the latency SLO.

The 1,000-player target is therefore a **multi-node deployment target**, not a claim that a 5-core machine can host 1,000 realtime players. Final host qualification uses at most three workers per logical node; four 100-player workers on this host were not stable enough for the 180 ms release SLO.

## Capacity plans

The planner keeps 20% per-worker headroom and one spare worker. It places at most three workers on one logical node.

| Concurrent target | Active workers required | Workers incl. spare | Minimum logical nodes | Safe capacity |
|---:|---:|---:|---:|---:|
| 1,000 | 13 | 14 | 5 | 1,120 |
| 2,000 | 25 | 26 | 9 | 2,080 |
| 5,000 | 63 | 64 | 22 | 5,120 |
| 10,000 | 125 | 126 | 42 | 10,080 |

Generate the authoritative table with `npm run capacity:plan`.

## SLOs and backpressure

Release defaults:

- Event-loop / tick-delay p99: <= 180 ms per worker.
- HTTP error rate: <= 0.5%.
- Reconnect rate: <= 3% per measurement window.
- Input timeout rate: <= 2%.
- Snapshot backpressure rate: <= 1%.
- RSS guardrail: <= 768 MiB per worker.

Slow SSE consumers may skip transient delta frames. If their server-side buffer continues to grow, the stream is disconnected and must reconnect to obtain a fresh baseline. Authoritative game state is never taken from the client.

## Scaling rule

Scale out before readiness is exhausted. Never raise `MAX_SESSIONS` above the measured worker envelope merely to absorb demand. New workers enter through canary stages, must pass healthy windows, and are drained before termination or rolling updates.

`npm run production:preflight` rejects a configuration when worker count, node count, per-node worker density, secrets, backup separation or enabled publisher integrations do not satisfy the release contract.
