# Serverbetrieb und Sicherungen · v5.0.0

## Start und Konfiguration

Der Server läuft als ein Node-Prozess mit einer SQLite-Datei. Der Standardstarter bindet nur an `127.0.0.1:3000`. `npm run lan` bindet ausdrücklich an alle IPv4-Schnittstellen; Firewall und Router werden nicht geändert. Nur im vertrauenswürdigen privaten Netz verwenden. Internetzugriff benötigt einen selbst eingerichteten HTTPS-Proxy. Es wurde kein Hosting gebucht oder veröffentlicht.

`npm run dev` baut den Client und startet; `npm start` nutzt die bereits gelieferten Builddateien. Beide lesen eine optionale `.env`, ebenso die Datenbankbefehle. Nur die in `.env.example` genannten Einstellungen werden akzeptiert, keine Shellbefehle oder Interpolation. Vorhandene Prozess-Umgebungsvariablen haben Vorrang. Bei direktem `node server/server.mjs` werden ausschließlich Umgebungsvariablen verwendet, nicht automatisch `.env`.

| Einstellung | Standard / Bedeutung |
|---|---|
| HOST, PORT | 127.0.0.1 und 3000 beim Starter. PORT 1–65535. |
| DATA_PATH | `.data/nyrathen.sqlite`; möglichst lokaler, dauerhafter Datenträger. |
| BACKUP_SECONDS | 900; ganze Zahl 30–86400. |
| BACKUP_RETAIN | 8; ganze Zahl 1–100. |
| BACKUP_DIRECTORY | Ohne Vorgabe DATA_PATH plus `.backups`. In `.env.example` ausdrücklich `.data/backups`. |
| PUBLIC_URL | Optional die selbst eingerichtete HTTPS-Basisadresse. Bucht oder konfiguriert keinen Server. |
| ALLOWED_ORIGINS | Zusätzlich zum eigenen Host standardmäßig die beiden nativen Ursprünge. Nicht pauschal auf `null` oder beliebige Hosts öffnen. |
| TRUSTED_PROXY_IPS | Standard leer. Kommagetrennte exakte Peer-IPs eines eigenen Proxys; nur von diesen wird eine gültige einzelne X-Real-IP übernommen. |

`/health` gibt nur Zustand, Version, Gesamtzahlen und den letzten erfolgreichen Sicherungszeitpunkt aus, keine Token, Dateipfade oder Passwörter. `/api/realms` liefert tatsächlich geladene Regionen und die Belegung ihrer Realms. Ein frisch gestarteter Server kann noch keine geladene Region haben; die erste Sitzung erzeugt PUBLIC.

## Daten und Ausfälle

Profile, Charaktere, Tresor, Weltcheckpoints, Gilden, Zugangsdaten-Hashes und Aktionsbelege werden gespeichert. Chat, Gruppen, offene Verhandlungen, temporäre Effekte und Projektile sind flüchtig. Akzeptierte Aktionen werden direkt transaktional gespeichert; reguläre Weltbewegung wird zusätzlich ungefähr alle fünf Sekunden checkpointed. Ein harter Prozess-/Maschinenabbruch kann noch nicht gespeicherte Bewegung seit diesem Checkpoint verlieren. Keine Zusage von null Datenverlust.

Eine Dateisperre verhindert einen zweiten schreibenden Server und eine Wiederherstellung auf dieselbe aktiv gesperrte Datenbank. Die Sperrdatei enthält die Prozess-ID. Nach einem harten Abbruch kann sie liegen bleiben. Erst Betriebssystemprozessliste prüfen, alle betreffenden Server stoppen und sicherstellen, dass kein anderer Prozess diese Datenbank benutzt; dann die verwaiste `.lock` entfernen. Sie wird absichtlich nicht allein anhand einer vermuteten alten PID automatisch entfernt.

Wenn eine Speichertransaktion scheitert, pausiert der Server seine Simulation und lehnt weitere Aktionen mit 503 ab. Zuerst Speicherplatz, Zugriffsrechte und Dateisystem prüfen, dann kontrolliert neu starten. Nicht einfach den Lock bei einem laufenden Server löschen.

## Konsistente Sicherung

Die Sicherung verwendet die SQLite-Backup-API, nicht das Kopieren der offenen Hauptdatei ohne WAL. Das Ergebnis wird zu einer eigenständigen Datenbank ohne WAL-Abhängigkeit gemacht, mit `quick_check` und erforderlichen Tabellen geprüft, atomar umbenannt und um eine SHA256-Seitendatei ergänzt. Bei Erfolg werden alte automatische Sicherungen nach der eingestellten Anzahl entfernt. Unter Unix sind private Dateirechte gesetzt.

```sh
npm run backup
npm run db:inspect
# Beliebige Sicherung untersuchen:
node tools/database.mjs inspect "/pfad/zur/sicherung.sqlite"
```

Dies sichert nur auf dem gewählten Datenträger. Ein Backup auf derselben Festplatte schützt nicht vor deren Ausfall. Mindestens eine kontrollierte Kopie auf einen getrennten Datenträger gehört zum echten Betrieb; das wurde nicht automatisch eingerichtet. Backups enthalten private Kontoinformationen und Zugangsdaten-Hashes: nicht in Git, öffentliche Downloads oder Chatlogs legen.

## Wiederherstellung

Server zuerst normal mit Strg+C beenden. Die passende `DATA_PATH`-Einstellung muss auf die gewünschte Ziel-Datenbank zeigen. Die folgende Bestätigung ersetzt deren Zustand:

```sh
node tools/database.mjs restore "/pfad/zur/sicherung.sqlite" --confirm=RESTORE
```

Ohne diese Bestätigung wird nichts wiederhergestellt. Integrität, optionale SHA256-Seitendatei und Schreibsperre werden geprüft. Vor dem Ersetzen wird eine zusätzliche Sicherung des bisherigen Zielzustands im Verzeichnis `DATA_PATH.before-restore` angelegt. Der Restore übernimmt den Stand der Sicherung; spätere Fortschritte der aktuellen Datenbank sind danach nicht mehr aktiv. Anschließend Server starten und Konto, Tresor und Realm-Zustand kontrollieren.

## Update von v0.3

Den v0.3-Server sauber beenden und zunächst den ganzen Datenordner sichern. v0.4 in einen getrennten Programmordner entpacken. Die beendete v0.3-Datenbank bzw. den gesamten Datenordner übernehmen oder DATA_PATH ausdrücklich darauf setzen. Niemals zwei Versionen auf dieselbe Datenbank starten. Bei einer noch laufenden alten WAL-Datenbank nicht nur die Hauptdatei kopieren.

Kontoformat 3, Weltformat 2 und Protokollkennung 2 bleiben erhalten. Die neue Tabelle für Aktionsbelege wird ergänzt. Der Regressionstest prüft das Öffnen einer Datenbank ohne diese Tabelle bei erhaltenen Profilen. Das ist keine Zusage für jede manuell bearbeitete fremde Datenbank. Client und Server aus v0.5 gemeinsam verwenden; die ursprüngliche Adresse/Port beibehalten, wenn gespeicherte lokale Gastzugänge weiter gelten sollen. Ein registriertes Konto lässt sich alternativ erneut anmelden.

## Optionaler öffentlicher Betrieb

`docs/Caddyfile.example` ist ein Rezept für einen Caddy-Prozess auf demselben Host wie ein an 127.0.0.1 gebundener Node-Server. Exakte Loopback-IP explizit als Proxy vertrauen; Client-IP wird durch den eigenen Proxy überschrieben. DNS, Domain, TLS, Firewall, Updates und Überwachung müssen vom Betreiber eingerichtet werden. Die Datei wurde nicht mit Caddy ausgeführt. Primärreferenz: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy

`compose.yaml` ist dagegen ein separates lokales Docker-Rezept mit dauerhaftem Datenvolume und ausschließlich an Loopback veröffentlichtem Port. `docker compose up --build -d` würde es manuell starten; hier wurde Docker weder gebaut noch gestartet. `docker compose down` stoppt Container ohne Datenlöschung. `--volumes` würde Daten löschen und darf nicht versehentlich verwendet werden. Caddy-Host-Rezept und Docker-Proxy-IP-Vertrauen nicht ungeprüft mischen.

Ein einzelner Prozess unterstützt konfigurierte Obergrenzen, aber der Nachweis hier ist nur ein kurzer lokaler 24-Client-Test. Vor öffentlichem Betrieb fehlen mehrstündige Belastungs-/Mobilfunkversuche, echte Gerätesitzungen, Monitoring, Alarmierung, Abuse-Management und eigene Betriebsentscheidungen. Keine öffentlichen Portfreigaben oder externen Kosten wurden ausgelöst.


## Erweiterungen in v0.5

Der Server ergänzt beim Start `player_blocks`, `player_reports` und `chat_restrictions` in derselben SQLite-Datei. Die vorhandenen Profil-/Weltversionen bleiben unverändert; Migration ist additiv. Vor dem Update eine Sicherung erstellen, Server stoppen und die Datenbank im neuen Paket über DATA_PATH zuweisen. Keine alten oder fremden Zugangsdaten sind im Lieferpaket enthalten.

`/health` und `/healthz` enthalten zusätzlich aggregierte Transportzähler (Vollzustände, Deltas, SSE-Anwendungsbytes und hypothetische Vollzustandsbytes derselben Frames). Keine Kontonamen oder Token. Der 24-Client-Test dauerte in v0.5 fünf Minuten; er ersetzt weder mehrere Stunden Belastung noch mobile Latenz-/Paketverlustmessungen. Zielraten 20 Hz Simulation/10 Hz Zustandsversand sind Zeitgeber-Einstellungen, keine unter beliebiger Last garantierten Raten.

Moderationszugriff erfolgt ausschließlich lokal durch `tools/moderate.mjs`. Kein Web-Dashboard und keine öffentliche Adminroute. Bedienung und Aufbewahrung: `SICHERHEIT-UND-MELDUNGEN.md`. Außer der bewusst übernommenen Meldungsnachricht bleibt normaler Chat flüchtig.
