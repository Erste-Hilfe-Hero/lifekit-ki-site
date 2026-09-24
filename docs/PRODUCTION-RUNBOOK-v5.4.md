# Production operations runbook — v5.4

1. Deploy staging using the same image and secrets layout as production.
2. Run `npm run production:preflight` with expected concurrency and topology.
3. Run `npm run release:certify` and archive output with the build hash.
4. Verify off-site restore into a clean environment.
5. Start canary at 1%; require three healthy SLO windows before 5/25/50/100% promotion.
6. Any SLO breach rolls back; draining workers stop receiving new sessions before termination.
7. Page on sustained tick p99, HTTP errors, reconnect spike, backpressure, storage fault, backup age, crash/ANR or economy anomaly.
8. Keep at least one spare worker in every capacity tier and never exceed three measured workers per logical node without requalification.
9. Incident response: freeze LiveOps, drain affected node, preserve logs/audit ledger, restore service, then reconcile economy/account integrity before reopening writes.
10. Quarterly: restore drill, key rotation, moderation-access review, dependency review, and capacity re-benchmark.

The Kubernetes reference under `deploy/kubernetes/` encodes topology spread, PDB, rolling update, readiness, HPA and security context. Provider-specific ingress, DDoS, secrets and durable account/database services must be attached before deployment.
