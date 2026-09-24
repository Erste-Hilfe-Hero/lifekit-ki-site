# Nyrathen v5.7 — State Storage Risk / Mitigation

Stand: 24.09.2026
Runtime: `v5.7.0-prod-hotfix14-dungeon-boss-reward`

## Live observation

- Railway State volume capacity: 0.500 GB.
- Current observed usage after mitigation and prune completion: ~0.363 GB (~72.6%).
- 24h observed maximum before mitigation: ~0.495 GB (~99.1%).
- State service remained healthy after the mitigation deployment.

## Mitigation completed

`STATE_AUTHORITY_BACKUP_RETAIN` was reduced from the default/current two-backup posture to **1**. This does not change game balance, player profiles, Hotfix 14 code, or service capacity. It only limits local retained backup copies on the constrained 500 MB volume. After the redeploy/prune settled, volume usage fell by roughly 0.09 GB.

## Likely remaining cause

The production 1008-client certifications create and then delete many synthetic accounts/receipts. SQLite reuses deleted pages internally but does not automatically shrink the database file on the filesystem. This explains why filesystem usage can remain high even after synthetic accounts are cleaned up.

## Safety decision

No live `VACUUM`, file replacement or manual deletion is performed while the volume has limited free headroom. A full SQLite compaction can temporarily require substantial extra space and is therefore not safe to run blindly on this 500 MB volume.

## Operational thresholds

- `< 0.460 GB`: acceptable for ordinary beta traffic; keep monitoring.
- `0.460–0.480 GB`: warning; avoid synthetic 1000-client certification runs.
- `0.480–0.490 GB`: critical; only essential writes, investigate immediately.
- `>= 0.490 GB`: stop non-essential load tests; prepare controlled compaction/migration.

## Next safe storage action

Before another production-scale synthetic load run, either (a) perform a controlled off-volume SQLite compaction/migration with verified rollback, or (b) provide a larger state volume after explicit cost approval. Neither is executed automatically.
