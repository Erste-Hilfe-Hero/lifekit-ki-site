# Multiplayer hosting · Nyrathen v5.4

Nyrathen is **mobile-only**. There is no browser release and no static web game to publish. iOS and Android connect to an authoritative HTTPS/SSE API.

## Development / single-node deployment

The root `compose.yaml` is for local or controlled single-node operation. Persistent SQLite data must live on a durable volume. It is not a 1,000-player production topology.

## Production topology

The measured release contract is 100 nominal / 80 safe active players per GameServer worker, maximum three workers per logical node, plus spare capacity. Use `npm run capacity:plan` and `npm run production:preflight` before a deployment.

A 1,000-player target requires 14 workers across at least five logical nodes. 2k/5k/10k targets scale horizontally using the same worker contract. Never place all planned workers on one small machine; v5.4 explicitly rejects undersized node counts.

## Required infrastructure responsibilities

- Public HTTPS/TLS endpoint and DNS owned by the publisher.
- Health/readiness-aware load balancing; draining nodes receive no new sessions.
- Durable state/backups and a genuinely separate off-site copy.
- Private metrics scraping and alert delivery.
- Publisher secret storage for cluster, LiveOps, resume-ticket, push and commerce credentials.
- Canary/rollback and rolling-update orchestration.
- Production-like multi-node stress before certifying a concurrency tier.

The checked-in `deploy/production/compose.yaml` remains a secure **single-worker reference**. It deliberately does not pretend that Docker Compose on one machine is a five-node production cluster. Use the runbook and capacity contract when translating it to the publisher's orchestrator.

## Health endpoints

- `/healthz`: process liveness.
- `/readyz`: admission readiness; fails during drain, storage faults, capacity exhaustion or excessive tick delay.
- `/metrics`: private bearer-token-protected Prometheus text. Never expose publicly.
