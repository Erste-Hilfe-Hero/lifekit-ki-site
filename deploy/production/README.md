# Production reference deployment · Nyrathen v5.4

This directory is an **API-only, single-worker security/reference deployment**. It never serves a browser game. Caddy terminates HTTPS and forwards to the authoritative Node GameServer.

It is intentionally not labelled as the 1,000-player topology. The measured 1k plan requires 14 workers across at least five logical nodes; use `npm run capacity:plan` and `docs/PRODUCTION-SCALING-v5.4.md` when translating this reference into your production orchestrator.

## Before first start

1. Point `NYRATHEN_DOMAIN` DNS to the ingress endpoint.
2. Copy `.env.example` to `.env` and replace every placeholder.
3. Generate independent random secrets; never reuse mobile/store signing keys as server secrets.
4. Run `npm run production:preflight` with the intended target capacity/topology.
5. For this single-worker reference only, set a single-node target that fits one worker. Do not claim 1k capacity from this compose file.
6. Start with `docker compose --env-file .env up -d --build`.
7. Verify `/healthz`, `/readyz`, private `/metrics`, account creation/deletion and real iOS/Android reconnect behavior.

## Data safety

`nyrathen-data` stores SQLite state and rotating local backups. Never run `docker compose down -v` on production. A local backup does not satisfy disaster recovery: copy encrypted backups into a separate failure domain and routinely run the restore drill.

## Metrics and drain

`/metrics` requires `Authorization: Bearer <METRICS_TOKEN>` and Caddy blocks it from the public route. `/readyz` is the load-balancer signal: a draining, overloaded or unhealthy worker must receive no new sessions.
