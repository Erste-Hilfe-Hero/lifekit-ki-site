# Nyrathen v5.6 — Scale Certification & Release Hardening

v5.6 hardens the v5.5 distributed-state architecture and closes certification gaps found by real Railway load tests.

## Changes
- Stress evidence arrays are snapshotted before cleanup so account deletion/stream teardown cannot mutate an already-computed pass/fail report.
- Railway load-runner exposes `/healthz` immediately while a long certification is running; `/report` carries the live/final evidence.
- Native Android/iOS release identifiers synchronized to 5.6.0 / build 56.
- High-density GameServer operation may use `SNAPSHOT_HZ=5`; authoritative simulation remains 20 Hz and the client continues interpolation/delta decoding.
- Railway certification evidence is kept separate from local constrained-host evidence.

## Release rule
A 1,000-active-player claim is only allowed from a real multi-service test with >=1,000 simultaneously connected SSE clients, authoritative inputs, reconnect exercise, all target readiness checks green, and server p99 <= configured SLO. Session-only burst tests never satisfy this gate.
