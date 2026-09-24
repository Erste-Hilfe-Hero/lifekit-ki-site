# Blockieren, Melden und Betreiberzugriff · v5.0.0

## Im Spiel

Online: Einstellungen → Spieler & Sicherheit. Bis zu 64 andere Konten blockieren. Dadurch werden deren Chatnachrichten aus dem eigenen Zustand entfernt und direkte Gegenstandshandelsanfragen in beiden Richtungen abgelehnt. Eine laufende Verhandlung zwischen diesen Spielern wird beim Blockieren beendet. Figuren, Gegner und Projektile bleiben sichtbar; Blockieren verändert keine Kampfkollisionen und schützt nicht vor Schaden.

Für eine Meldung müssen Ziel und Grund ausdrücklich bestätigt werden. Das Ziel muss in der eigenen aktuellen Welt, im eigenen Chat oder bereits auf der eigenen Blockliste vorkommen. Gründe: Belästigung, Spam, Cheating-Verdacht oder Sonstiges. Eine Meldung ist ein Hinweis, kein automatischer Schuldspruch und keine automatische Spielsperre.

Gespeichert werden zufällige Referenz, Reporter-/Zielkonto-ID, Grund, Zeitpunkt, Bearbeitungsstatus und gegebenenfalls die letzte Nachricht des Ziels im eigenen serverseitigen Kanal (höchstens 600 Zeichen). Vom meldenden Client zugesandte frei formulierte Beweisnachrichten/Passwörter werden nicht übernommen. Es wird kein vollständiger Chatverlauf archiviert. Derselbe Reporter/Ziel/Grund innerhalb von 24 Stunden erhält dieselbe Referenz. Authentifizierung, Sichtbarkeitsprüfung und Ratenbegrenzung bleiben erforderlich.

Meldungen sind nicht für andere Spieler oder über eine Admin-HTTP-Route abrufbar. Die Anzeige verspricht keinen ständig besetzten Support; Betreiber müssen die Bearbeitung selbst organisieren.

## Aufbewahrung

Die aktive Datenbank behält höchstens 2.000 Meldungen. Inhalte älter als 30 Tage werden beim Start, vor neuen Meldungen und bei laufendem Server etwa alle zehn Sekunden entfernt. Ein gestoppter Server führt keinen Löschprozess aus; beim nächsten Start wird aufgeräumt. Abgelaufene Chatsperren werden ebenfalls entfernt. Das Löschen eines Kontos entfernt seine verknüpften Block-/Meldungs-/Chatsperreinträge durch Fremdschlüssel.

**Backups sind separate Kopien:** Die Bereinigung der aktiven Datenbank entfernt Inhalte nicht aus bereits erstellten Sicherungen. Deren Aufbewahrungsregel und Offsite-Kopien muss der Betreiber separat verwalten. Die Standardautomatik behält acht Sicherungen, keine unbegrenzt wachsende Sammlung. Keine rechtliche Zusage zur Eignung einer bestimmten Aufbewahrungsfrist.

## Lokale Bedienung

Meldungen anzeigen (Dateizugriff des Betreibers nötig, funktioniert auch bei laufendem Server):

```sh
npm run moderation -- list
```

Schreibende Aktionen: Spielserver vorher normal stoppen, passende DATA_PATH/.env verwenden. Beispiele mit selbst aus der Ausgabe entnommenen IDs:

```sh
node tools/moderate.mjs review REPORT_ID dismissed "Geprüft, kein Verstoß festgestellt" --confirm
node tools/moderate.mjs review REPORT_ID actioned "Geprüft, Chatsperre gesetzt" --confirm
node tools/moderate.mjs mute PLAYER_ID 60 "Spam nach Prüfung" --confirm
node tools/moderate.mjs mute PLAYER_ID 0 "Sperre aufgehoben" --confirm
```

`review ... actioned` markiert eine Meldung nur; es setzt nicht automatisch eine Sanktion. `mute` sperrt ausschließlich Chat, höchstens sieben Tage; null hebt sie auf. Ohne `--confirm` oder bei aktiver Datenbanksperre wird nicht geschrieben. Keine Netzwerk-Adminrechte, kein externer Moderatorzugriff, keine automatischen Uploads.

Die vorhandenen SQLite-Sicherungen umfassen die neuen Tabellen. Für echten öffentlichen Betrieb fehlen weiterhin unabhängiges Sicherheitsreview, organisatorische Bearbeitung, angemessene Betriebs-/Datenschutzhinweise und reale Missbrauchs-/Lasttests.
