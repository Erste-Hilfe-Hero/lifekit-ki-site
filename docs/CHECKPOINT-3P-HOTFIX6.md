# Nyrathen v5.7 – 3-Punkte-Checkpoint / Hotfix 6

Datum: 2026-09-23
Basis: Nyrathen v5.7 GitHub Client Design
Railway Runtime Revision: `v5.7.0-prod-hotfix6-timeout-retry`

## Genau bearbeitete Punkte

### 1. Railway-State stabilisieren — ERLEDIGT
- Backup-Retention auf 2 begrenzt; alte Backups werden bereinigt.
- Frühere `database or disk is full`, Rollback-Folgefehler und Foreign-Key-Races wurden gehärtet.
- HTTP 408/429/502/503/504 der zentralen State-Authority werden als temporäre Backend-Fehler behandelt und frieren den Game-Worker nicht mehr dauerhaft als `storageHealthy=false` ein.
- Railway-State-Volume nach den Fixes: ca. 0.404 GB belegt statt vorher ca. 0.495 GB.
- State Deployment: `5b26bca6-bd09-4a49-8889-2e3bf765cb2f` — SUCCESS.

### 2. Alle Railway-Services auf denselben v5.7-Stand bringen — ERLEDIGT
Alle fünf Services laufen mit `v5.7.0-prod-hotfix6-timeout-retry`.

- nyrathen-state: `5b26bca6-bd09-4a49-8889-2e3bf765cb2f` — SUCCESS
- nyrathen-game-01: `65892b60-4730-44ff-8390-69eda1da973d` — SUCCESS
- nyrathen-game-02: `6ca7d678-91fb-4e3c-9a5c-eb346a20b505` — SUCCESS
- nyrathen-game-03: `18b7266f-56cf-432d-a795-eb114f074516` — SUCCESS
- nyrathen-load-01: `4f505db9-07eb-402c-8568-77ac4ffdf35c` — SUCCESS

Game-Worker verwenden für zentrale State-Aufrufe jetzt `STATE_AUTHORITY_TIMEOUT_MS=20000`.

### 3. 1.000-Spieler-Livetest wiederholen — AUSGEFÜHRT, NOCH NICHT VOLL GRÜN
Letzter Lauf: 1005 simulierte Clients auf 15 Game-Workern.

- Verbunden: **1005/1005**
- Frames: **284058**
- Storage blieb beim letzten Lauf grundsätzlich verfügbar; der frühere volle-Datenträger-Fehler ist beseitigt.
- Max p99: **246 ms** bei Ziel <= 180 ms.
- Drei Game-01-Worker lagen am Testende über dem Readiness-Latenzlimit (246 / 208 / 185 ms).
- Vier Game-02-Worker hatten trotz erfolgreicher 67/67 Session-Verbindungen anschließend Request-Timeouts im Testablauf.
- Test-Gesamtstatus deshalb weiterhin `failed`.

Das ist der nächste klar abgegrenzte Performance-Blocker; er wurde in diesem Checkpoint absichtlich nicht weiter bearbeitet, weil nur drei Punkte beauftragt waren.

## Hotfix-6-Änderungen
- Temporäre State-HTTP-Fehler (408/429/502/503/504) werden nicht mehr als dauerhafter Speicherdefekt gewertet.
- State-Timeout auf Game-Workern auf 20 Sekunden angehoben.
- 1000er-Stressharness wiederholt Session-Erstellung bei temporären Netzwerk-/State-Fehlern mit Backoff.
- Lokale Regression nach dem Codefix: **388/388 Tests bestanden**.

## Designstand
Dieser Checkpoint enthält weiterhin den Nyrathen-v5.7-GitHub-Client-Designstand (AlloyClient-inspirierte UI-Struktur) und die bisherigen v5.7-Funktionen.
