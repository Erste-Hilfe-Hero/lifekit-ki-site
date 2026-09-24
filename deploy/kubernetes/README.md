# Nyrathen v5.5 multi-node reference

The bundled production topology now has an actual shared-state path rather than a placeholder:

- **1 State Authority StatefulSet** is the only SQLite writer and owns account/profile/world/social/receipt/economy persistence plus account leases.
- **14 GameServer StatefulSet workers** are the measured 1,000-player tier. Worker pod ordinals are stable, so `STATE_WORLD_NAMESPACE` remains stable across pod replacement.
- HPA scales GameServer workers from 14 to 126. State Authority is intentionally single-writer; its persistent volume must be backed up off-node and its restore drill must be evidenced before production.
- GameServer pods have no durable data volume and use only in-memory state caches. They authenticate every State Authority RPC with `STATE_AUTHORITY_SECRET`.

This removes per-worker SQLite split-brain risk. It does **not** turn a one-pod State Authority into infrastructure-level HA. A provider-side volume snapshot/offsite restore plus a tested replacement/restore procedure remains mandatory evidence. For larger or multi-region production, replace the State Authority storage implementation with a certified distributed SQL service behind the same RPC contract.

For higher tiers keep the measured GameServer contract: 26 workers for 2k, 64 for 5k and 126 for 10k. Do not increase per-worker session capacity instead of scaling horizontally.
