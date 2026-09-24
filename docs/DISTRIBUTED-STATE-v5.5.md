# Distributed State v5.5

Nyrathen v5.5 replaces per-GameServer authoritative account state in multi-node mode with one authenticated State Authority. GameServers keep only local simulation/cache state. The authority persists profiles/worlds/social state, owns account leases, receipts and economy idempotency, and provides dead-node lease takeover.

Railway staging uses a private `nyrathen-state` service with persistent volume and three separate GameServer services. The State Authority is not publicly exposed. Public mobile clients use dedicated HTTPS GameServer endpoints and can fail over between them.

Production remains fail-closed unless `STATE_BACKEND_MODE=central-authority` (or another externally certified shared backend), routing is stable/dedicated, and capacity/evidence gates pass.
