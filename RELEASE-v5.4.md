# Nyrathen v5.4.0 — production release-candidate hardening

v5.4 adds evidence-driven production certification, 2026 store-policy gates, a provider-neutral multi-node Kubernetes reference, adversarial API auditing, synthetic economy health checks, a first-party LiveOps launch seed and explicit beta/device/support/operations runbooks. External infrastructure and physical-device claims remain fail-closed until real evidence is attached.

The final hardening pass also fixes an empty-leaderboard cache bug that caused repeated SQLite scans in the snapshot hot path, adds 24-hour-capable soak tooling with explicit SLO/resource gates, and blocks multi-node production unless a certified shared transactional state backend is evidenced.
