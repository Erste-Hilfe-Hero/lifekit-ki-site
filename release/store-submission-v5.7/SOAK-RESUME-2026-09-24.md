# Nyrathen v5.7 — Soak Evidence, 24.09.2026

Status: **Segmentierter lokaler Soak bestanden.** Der ununterbrochene 6–24h-Endurance-Lauf bleibt ausdrücklich offen.

## Gameplay / HTTP / SSE

- 2 bestandene Segmente mit jeweils 24 echten lokalen HTTP/SSE-Clients.
- Insgesamt 50 angeforderte Simulationssekunden über beide Segmente.
- 2 absichtlich abgerissene SSE-Streams, **2/2 erfolgreich wiederverbunden**.
- Private Inventare verborgen: **ja**.
- Weltenisolation: **ja**.
- Identitäten erhalten: **ja**.
- Alle Clients erhielten Delta-Snapshots: **ja**.
- Backpressure-Skips: **0**.
- Slow-Disconnects: **0**.
- Höchstes Event-Loop-p99: **161.35 ms**.
- Höchster Einzel-Peak: **472.65 ms**.
- Kombinierte Transportersparnis gegenüber Vollsnapshots: **74.53%**.
- `inputTimeouts`/Stale-Input-Safety-Stops: **26**. Dieser Serverzähler wird gesetzt, wenn länger als 1 s kein frischer Bewegungsinput kam und der Server die Figur sicher neutralisiert; er ist **kein HTTP-Request-Timeout-Zähler**.

## Commerce / Entitlements

Aktueller 20-Sekunden-Lauf mit 48 Profilen und Batch 8:

- Grants: **5928**
- Receipt-Replays: **1186**
- Refund/Revocation-Zyklen: **847**
- Ledger-Zeilen: **5928**
- Doppelte Transaction IDs: **0**
- Beschädigte Commerce-Profile: **0**
- Ergebnis: **PASS**

## Grenze dieses Nachweises

Dieser Bericht ersetzt **nicht** den ununterbrochenen 6–24h-Endurance-Test, einen mobilen Funk/TLS-Test, physische Geräte oder Apple-/Google-Sandboxkäufe. Diese Punkte bleiben externe Release-Gates.
