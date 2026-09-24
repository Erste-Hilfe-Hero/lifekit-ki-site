# Nyrathen v5.5 — Distributed State + Railway Staging RC

**Generated:** 2026-09-23T08:25:07Z

## Completed
- 346/346 regression tests.
- 94 syntax-checked modules; Android/iOS runtime synchronized; mobile-only.
- Central authenticated State Authority for accounts, characters, worlds, social state, safety, action receipts and economy idempotency.
- Account leases with epochs, dead-node heartbeat takeover and graceful node-down handoff.
- 1,000-account State Authority burst: 1,000/1,000, p99 373.47 ms, 370.2 opens/s.
- Railway staging: State Authority + three GameServers live; 300/300 active SSE clients, max server p99 35 ms (SLO 180 ms).
- Three dedicated HTTPS mobile failover endpoints.
- Fuzz 320 cases / 0 5xx; security 225 cases / 0 5xx; backup/restore, economy race, economy health and 80-client hard-crash failover pass.
- 1,000-player production topology preflight passes at 14 workers / 5 logical nodes / safe capacity 1,120.

## Deliberately still fail-closed
A real 1,000-active-player certification cannot be honestly claimed on the current Railway free-plan resource ceiling. Production release also still requires physical-device, signed-store, store-account, beta and legal/privacy evidence. `release:evidence` keeps those gates closed.
