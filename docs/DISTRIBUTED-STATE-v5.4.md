# Distributed state requirement — v5.4

The bundled `ProfileStore` is a single-process SQLite implementation and is safe for local/single-worker operation. It must **not** be mounted read/write by multiple GameServer pods and must not be copied independently across workers while presenting them as one account cluster.

For multi-node production, the publisher must connect a single-writer account/state service or another transactional shared backend with equivalent semantics for account identity, character/profile saves, action receipts, social state, moderation and economy idempotency. The backend must be independently qualified for failover and duplicate-write prevention.

`npm run production:preflight` therefore rejects `DEPLOYMENT_MODE=multi-node` unless `STATE_BACKEND_MODE=external-certified` and a `DISTRIBUTED_STATE_EVIDENCE` reference is supplied. This is an intentional fail-closed gate; a Kubernetes replica count alone is not a distributed persistence system.
