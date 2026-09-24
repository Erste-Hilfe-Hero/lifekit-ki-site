# Observability reference

`prometheus-rules.yaml` encodes the v5.4 SLO alert thresholds. Production must route `severity=page` to an on-call target and test the route before release. Metrics are private and must never be exposed through the public edge.
