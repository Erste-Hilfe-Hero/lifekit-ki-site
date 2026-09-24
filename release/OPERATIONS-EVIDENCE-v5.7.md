# Nyrathen v5.7 — Operations Evidence

Stand: 24.09.2026

## Production infrastructure — PASS

- Connected Railway production project inspected directly.
- `nyrathen-state`, `nyrathen-game-01`, `nyrathen-game-02`, `nyrathen-game-03` and `nyrathen-load-01` report successful deployments.
- Runtime remains `v5.7.0-prod-hotfix14-dungeon-boss-reward`.
- State Authority is not publicly exposed and mounts persistent `/state` storage.
- Game nodes use dedicated public endpoints; State/game/load health checks are configured.
- Certified worker layout remains 5/5/4 = 14 workers.
- State volume was reduced from the prior ~0.495 GB high-water mark; most recent observed value during this pass was ~0.368 GB / 0.500 GB.
- Backup retention remains 1 to reduce local volume pressure without changing gameplay data or runtime logic.

## Observed canary / staged rollout — PASS

Hotfix 14 was rolled service-by-service instead of replacing the entire game tier at once:

1. Game-01 reached a successful Hotfix-14 deployment.
2. Game-02 was then promoted and verified.
3. Game-03 was then promoted and verified.
4. A full 1008-client certification followed on the complete cluster.

The post-rollout certification connected 1008/1008 clients across 14/14 workers and observed max p99 133 ms against the 180 ms SLO.

## Admin operations — PASS

A synthetic offline operator drill exercised the real GM CLI:

- status/read path on a freshly migrated ProfileStore database;
- attributed ban;
- attributed unban;
- audit-log inspection;
- commerce-report inspection.

A robustness defect found during this drill was fixed: `admin status` now reports zero for optional tables that do not yet exist instead of aborting. The new behavior is regression-tested.

## DDoS / edge posture — NOT YET CERTIFIED

Railway supplies network-layer mitigation and supports on-demand edge/WAF attack mode. Nyrathen still lacks observed, application-specific WAF/edge-protection evidence, so the external DDoS/edge gate remains fail-closed.
