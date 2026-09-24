# Architektur · v5.0.0

## Ein gemeinsamer Spielkern

`shared/engine.mjs` liefert getestete Grundfunktionen aus v0.1: Bewegung, Projektilerzeugung, XP, Grundwerte. `RealmWorld` und `RealmEngine` in `shared/realm.mjs` steuern Nexus, offene Welten, Instanzen, Beute, Gruppen und Weltwechsel. Die alte Arena ist nicht mehr der Hauptspielmodus.

`AdventureEngine` in `shared/adventure.mjs` erweitert diesen Kern um Charakterplätze, Kontofortschritt, Aufträge, Gefährten, Schmiede, weitere Fähigkeiten/Bosse, Effekte und Handel. `shared/social.mjs` enthält die Gildenrechte und Gildenverwaltung; `shared/adventure-data.mjs` die zugehörigen Definitionen. `realm-data.mjs` enthält Karten, Ausrüstungskompatibilität und Dungeon-Themen. Dieselben Module laufen offline im Browser oder autoritativ auf dem Node-Server.

## Datenhoheit

Online sendet der Client Richtung, Zielwinkel, Schusszustand und Aktionen mit Objekt-IDs. Der Server berechnet die Ergebnisse, prüft Entfernungen, Besitz, Abklingzeiten, Kosten und Berechtigungen. Fremde Inventare, Charakterlisten, Aufträge, Handelsangebote und Gildenanträge werden nicht allgemein übertragen. Persönliche Beute gehört dem beitragenden Spieler; XP-Nähe und Beutebeitrag sind unterschiedliche Regeln.

Der aktuelle Zustand nutzt Protokollkennung 2 mit additiven v0.3-/v0.4-/v0.5-Feldern. Client und Server dieser Distribution gehören zusammen; alte v0.2-Clients nicht absichtlich mit dem neuen Server mischen. Weltcheckpoint-Schema bleibt Version 2, Kontoprofil-Schema bleibt Version 3. Der Migrationstest übernimmt v0.2-Ausrüstung, Tresor, Zustand und aktiven Charakter ohne neuen Goldbonus.

## Konten und vier Figuren

Ein Profil besitzt einen aktiven Charakter sowie bis zu drei weitere gespeicherte Figuren. Figurbezogen: Klasse, Name, Level, XP, Ausrüstung, Gepäck, Stat-Boni, Lebenszustand. Kontobezogen: Tresor, Riftmarken, Ruhm, Todesanzahl/-chronik, Aufgaben, Gefährten. Gegenstands-IDs werden beim Einlesen über diese Bereiche hinweg dedupliziert.

Charakterwechsel ist nur im Nexus oder nach dem Tod möglich, nicht während eines Handels. Ein neuer Login übernimmt die vorhandene aktive Serverfigur statt sie im Kampf zu löschen. Sitzungsrotation entwertet das alte Token und ersetzt gegebenenfalls den alten SSE-Stream. Kontonamen sind eindeutig, Passwörter werden mit scrypt gespeichert; der Wiederherstellungscode ist einmalig nutzbar und wird nach erfolgreicher Wiederherstellung erneuert. Keine externen Authentifizierungsdienste.

## Welten und Transport

Jede Region besitzt einen Nexus und zwei offene Realms; Dungeon-Instanzen entstehen pro betretenem Portal. Gemeinsame Portal-ID bedeutet gemeinsame Instanz. Ein isolierter Serverprozess führt die Simulation mit 20 Hz aus und sendet Snapshots mit 10 Hz per authentifiziertem SSE. Eingaben und Aktionen gehen über HTTP. Es wird nicht das Netzwerkprotokoll des Originalspiels verwendet.

Konfigurierte Grenzen: 40 je Realm, 64 je Region, acht geladene Regionen, 128 Sitzungen im Prozess, 24 Dungeon-Instanzen je Region. Gemessen ist ein kurzer lokaler Test mit 24 Verbindungen. Das ist kein Beleg für einen großen öffentlichen MMO-Betrieb. Alle Welten eines Prozesses teilen denselben Node-Eventloop und dieselbe SQLite-Instanz.

## Handel und Speicherung

Ein Handel durchläuft Einladung, Annahme, versionierte Angebote und zwei Bestätigungen derselben Revision. Beide Inventarkapazitäten und Besitzverhältnisse werden erneut geprüft. Angebotsänderung löscht Bestätigungen. Entfernung, Weltwechsel, Tod, Trennung oder Timeout beenden den Handel. Andere Inventaraktionen sind währenddessen gesperrt.

Der Tausch geschieht synchron in der Simulation; der akzeptierte Zustand beider Spieler, Welt und Gilden wird anschließend gemeinsam in einer SQLite-Transaktion geschrieben. Scheitert das Schreiben, pausiert der Prozess seine Simulation und weitere Aktionen, statt einen nicht dauerhaften Tausch fortzuführen. Ein Regressionstest injiziert diesen Fehler und kontrolliert beide unveränderten Profile der letzten Datenbanktransaktion. Ein Restart lädt den letzten erfolgreichen Checkpoint.

SQLite verwendet WAL und private Dateiberechtigungen, soweit das Betriebssystem sie unterstützt. Profile, Credentials, Weltcheckpoints und Gilden haben getrennte Tabellen. Gruppen, Chat, offene Beitrittsanträge, Verhandlungen, Projektile und temporäre Zauber sind flüchtig. Konto-/Gildenmitgliedschaft, Inventare, Bossschaden, Bodenbeute und Weltzugehörigkeit werden wiederhergestellt. Harte Abbrüche können Änderungen seit dem letzten Checkpoint verlieren.

## Darstellung und Dateiexport

`client/art.mjs` erzeugt Original-Pixelgrafiken und caches sie; `renderer.mjs` zeichnet Karten, Akteure, Projektile, Gefährten, Warnzonen, Effekte und Minikarte. `systems.mjs` enthält die acht Journalbereiche sowie Konten- und Handelsdialoge. `main.mjs` verbindet DOM, Simulation bzw. Netzwerk, Speicher, Diagnose und UI-Lebenszyklus; `input.mjs` verarbeitet Tastatur, Maus und zwei Touchpunkte.

Solo-Speicherung legt Profil und Welten in einem gemeinsamen v3-localStorage-Eintrag ab. JSON-Backup-Import wird vor dem Bestätigungsdialog in einer neuen Engine instanziiert und validiert. Browserexport nutzt einen Blob-Download. Native Export-Bridges erlauben nur drei festgelegte Text-/JSON-Dateinamen und erfordern einen expliziten System-Datei-/Teilen-Dialog; keine stillen Uploads. Native Laufzeit und Dateidialoge wurden nicht auf Geräten validiert.

## Build

`tools/build.mjs` bündelt eigene ES-Module und CSS zu einer unabhängigen HTML-Datei und synchronisiert sie in beide nativen Projekte. Keine Laufzeit-CDNs oder Fontdateien. `tools/check.mjs` prüft Syntax, Bundlehash und Bytegleichheit der Mobile-Assets; es ist ausdrücklich kein Android-/iOS-Compiler. Native App-IDs, Signierung und Betriebshinweise stehen in `MOBILE-BUILD.md`.

## v0.4: Transport und Betrieb

`client/protocol.mjs` validiert Server-/Einladungsadressen und liest begrenzte SSE-Frames einschließlich geteiltem UTF-8 und CRLF. `GameNetwork` verwirft Antworten aus alten Verbindungs-Generationen; innerhalb einer Sitzung ordnen wireEpoch und revision die Snapshots. Wiederanmeldung setzt keine lebende Serverfigur zurück. Ein Server-Neustart oder Netzfehler ist kein Schutz vor dem gespeicherten Charaktertod.

Der Client wiederholt eine verlorene Aktionsantwort einmal mit derselben requestId. Der Server speichert den Hash des vollständigen Inhalts und die Annahme zusammen mit dem Spielzustand. Unterschiedlicher Inhalt unter derselben Kennung führt zu 409. Letzte 4096 Belege je Konto werden aufbewahrt, mehr als fünf Minuten bei maximaler Aktionsrate; der Client wiederholt höchstens für zehn Sekunden. Keine unbegrenzte globale Exactly-once-Garantie.

`server/operations.mjs` liefert exklusive Dateisperre, geprüfte SQLite-Backups, Aufbewahrung und Restore mit Vorabsicherung. `server/addresses.mjs` ignoriert Weiterleitungsheader ohne explizit vertraute Peer-IP. `tools/launch.mjs` und `tools/database.mjs` lesen nur bekannte .env-Werte; `tools/doctor.mjs` installiert nichts.

`client/presentation.mjs` prüft Darstellungseinstellungen und berechnet Zielmarkierungen. Die Kamerastufe verändert die Darstellung, nicht die Weltkoordinaten. Reduzierte Verbündeten-Sichtbarkeit betrifft nur eigene/verbündete Darstellung; gegnerische Gefahren bleiben sichtbar. Niedrige Qualität begrenzt den Renderer auf 30 Bilder/s, nicht den 20-Hz-Spielkern. Native Pause/Resume-Hooks setzen Eingaben zurück; native Laufzeit bleibt ungeprüft.


## v0.5: Differenzprotokoll und Kommunikation

`shared/snapshot-wire.mjs` ist auf beiden Seiten enthalten. Ein eigener Encoder je SSE-Stream sendet `snapshot`-Vollzustände oder `delta`-Nachrichten mit genauer Basisrevision. Der Assembler hält die Streambasis getrennt von HTTP-Aktionsantworten. Er rekonstruiert den vollständigen Zustand für den bisherigen Renderer. Fehlende Basis oder ungültige Änderung löst Wiederverbindung/Vollzustand aus. Weder quantisierte Trefferwerte noch versteckte Kampfteilnehmer werden eingeführt. Details und Messgrenzen: `NETZWERK-V05.md`.

Eingaben besitzen monotone Sequenzen und einen Notfall-Neutralpfad. Der Server stoppt bei ausbleibender Eingabe nach etwa einer Sekunde; offene SSE-Verbindungen sind kein Lebenszeichen für die Steuerung. `server/safety.mjs` filtert nur die eigenen Chatdaten und Handelspaarungen. Kampfzustände werden nicht durch Blocklisten verändert.
