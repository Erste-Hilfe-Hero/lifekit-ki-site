# Nyrathen v5.7 — DDoS / Edge Incident Runbook

## Current posture

- State Authority remains private and must never receive a public domain.
- Only player-facing GameServer endpoints require public exposure.
- Railway private service traffic stays on the provider private network.
- Application authentication, payload limits, session rate limits and security guards remain active regardless of provider edge controls.

## During an attack

1. Confirm whether the event is L4/network or L7/HTTP pressure using Railway service metrics and HTTP logs.
2. Do not expose the State Authority or internal data services.
3. Activate Railway Under Attack Mode / WAF for affected public GameServer domains through the Railway dashboard when an L7 flood is observed.
4. Watch p99, 429/5xx rates, active sessions, State health and memory.
5. If a game node becomes unhealthy, drain/rollback that node rather than changing State data.
6. Preserve deployment/log evidence for the incident review.

## Release evidence rule

Platform capability alone is not counted as Nyrathen DDoS certification. The release evidence remains false until the actual edge/WAF configuration has been activated or otherwise observed and its effect documented.
