# Nyrathen v5.7 — Regression Evidence Fix

Stand: 24.09.2026

## Ausgangsfehler

Der Test `v5.5 external evidence strict mode blocks a release without real-world evidence` erwartete veraltet, dass `multiNode1000` weiterhin in `pending` liegt. Nach der realen Railway-Zertifizierung mit 1008/1008 verbundenen Clients und 14 Workern (5/5/4) ist dieses Gate jedoch erfüllt.

## Korrektur

- `ReleaseEvidenceGate` akzeptiert für das 1k-Gate entweder die ältere 5-Node-Topologie oder mindestens 14 zertifizierte Worker bei mindestens 1000 Spielern.
- Der Strict-Mode-Test prüft deshalb nun korrekt `checks.multiNode1000 === true`.
- Der Release bleibt weiterhin fail-closed, weil reale externe Gates wie `iosDevices` und `soak6h` weiter in `pending` stehen.
- Eine unterprovisionierte 13-Worker-Topologie wird weiterhin abgelehnt.

## Verifikation

- Targeted `production-v55.test.mjs`: 17/17 bestanden.
- Vollständige Regression: 392/392 bestanden.
- Mobile UI: 50/50 bestanden.
- Syntax/Build Check: 112 Module, Build `c386de46dd81`, native assets synchron.
- Runtime-Lokalisierung: 7/7 Sprachen bestanden.
- Store-Lokalisierung: 7/7 Locales bestanden.
- Product Contract: 13/13 Produkt-IDs bestanden.
- Store Policy: vollständig grün.

Der zuvor rote Test ist damit reproduzierbar behoben; kein Release-Gate wurde weichgeschaltet.
