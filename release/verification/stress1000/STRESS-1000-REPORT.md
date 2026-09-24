# Nyrathen v5.2 – 1,000-player stress audit

- Baseline SHA-256: 63c370975dd50ee9f56d5e196e12924218beb8034e72e3f888e33711440bc5b2
- Regression before changes: 305/305 pass.
- 1,000 session/input burst: PASS as four concurrent 250-client GameServer processes, 1,000/1,000 sessions, 0 request failures.
- 250-client node p95 session latency: 1509.69–1695.42 ms; p99: 1514.60–1698.49 ms.
- Per-node RSS after burst: 139.1–163.7 MiB.
- 100-client real HTTP/SSE movement/fire soak: PASS, 0 errors. Peak sampled RSS 309.3 MiB; event loop p99 551.03 ms, max 1032.32 ms.
- 250-client real HTTP/SSE soak: CAPACITY FAIL/TIMEOUT in this local environment (>150 s for a requested 5 s simulation). Therefore 1,000 simultaneous streaming players are NOT certified.

## Defect fixed
Server TCP connection ceiling was hard-coded at 256 even when MAX_SESSIONS was configured higher. It now scales from configured MAX_SESSIONS (capped at 2048).

## Additional optimization
Hot snapshot deep copies use structuredClone rather than JSON stringify/parse. Privacy regressions remain green.

## Correctness verification after fixes
- Full regression: 305/305 pass.
- Focused account/trade/persistence/multiplayer/HA/production suite: 31/31 pass.
- Mobile release preflight: PASS.

## Conclusion
The server accepts a 1,000-session/input burst across four nodes without request failures, but the current per-player snapshot/SSE fanout is too CPU/event-loop intensive to claim 1,000 active real-time players at four 250-player nodes. Scale-out should use smaller per-node active populations until snapshot fanout is redesigned/profiled on production hardware.
