# Nyrathen v5.7 — Six-hour Endurance Run

Status: **RUNNING — not yet certified**

Started: 24.09.2026, 12:49 UTC
Runtime: `v5.7.0-prod-hotfix14-dungeon-boss-reward`

- Railway targets: 14 game workers
- Clients per target: 6
- Planned concurrent clients: 84
- Active duration: 21,600 seconds / 6 hours
- p99 SLO: <= 180 ms
- Target ramp: 90 seconds
- Session ramp: 30 seconds
- Setup grace: 60 seconds

The run must not be marked PASS until the final `NYR_LOAD_REPORT` exists and confirms every target passed, all planned clients connected, max p99 stayed within SLO and post-cleanup State/storage readiness is healthy. A scheduled completion check will capture the evidence and restore the load service to its normal 1008-certification settings.
