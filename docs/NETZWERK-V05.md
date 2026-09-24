# Netzwerkvertrag und Messung · v0.5

## Implementiert

Aushandlung über `/api/stream?codec=delta-v1`. Ohne Codec bleibt das bisherige Vollzustandsformat verfügbar. Jede neue Verbindung beginnt mit einem Vollzustand. Mindestens jeder 50. Frame ist ebenfalls voll; Welt, Seed, Wire-Epoche oder Protokollwechsel erzwingen eine neue Basis. Ist eine Differenz größer als ein Vollzustand, wird der Vollzustand gesendet.

Der Codec vergleicht Root-Felder und ID-basierte Sammlungen. Neue Objekte werden hinzugefügt; verschwundene entfernt; geänderte Attribute ersetzt; Reihenfolge bleibt gleich. Doppelte IDs, etwa über mehrere Chatkanäle, führen zur kompletten Ersetzung der betreffenden Sammlung statt zum Verlust einer Nachricht. Alle Zahlenwerte bleiben exakt. Der Empfänger lehnt fehlende/falsche Grundlagen, unbekannte Sammlungen und gefährliche Objekt-Schlüssel ab.

Wichtig: Die letzte SSE-Basis ist nicht gleich der zuletzt dargestellten Antwort. Eine neuere HTTP-Aktionsantwort kann vor einer älteren SSE-Nachricht eintreffen. Der Assembler wendet SSE-Differenzen auf seine eigene Basis an; die vorhandene Revisionsprüfung entscheidet anschließend über die Darstellung. Dadurch wird kein Delta auf den falschen HTTP-Zustand angewandt.

Unveränderte Eingaben werden maximal alle 250 ms erneut gesendet. Tatsächlich veränderte Eingaben behalten den vorhandenen kürzeren Sendetakt. Ein dringender Neutralzustand darf eine laufende Anfrage überholen; Sequenz und Request-Lease verhindern, dass deren spätere Antwort neuere Eingaben zurücksetzt. Serverseitig läuft ein Watchdog von etwa einer Sekunde. Dadurch wird niemand unverwundbar und ein Verbindungsabbruch ist keine Fluchtfunktion.

## Tatsächlich ausgeführter Test

`artifacts/v05/soak.json`: 24 echte lokale HTTP-/SSE-Clients, zwei Realms, 300 Sekunden Laufphase, 82 Aktionen, 14 bewusst abgebrochene und 14 wiederhergestellte Streams. Private Inventare blieben verborgen, Welten getrennt, Identitäten erhalten. Jeder Client empfing Differenzzustände.

SSE-Anwendungsbytes einschließlich `data:`-Framing: **423.795.675**. Die hypothetischen Vollzustände genau derselben tatsächlich gesendeten Frames hätten **1.602.667.874** Bytes belegt; relative Einsparung **73,56 %**. Kein unabhängiger Vorher-/Nachher-Benchmark. HTTP-Header, TCP/TLS und Eingabeanfragen sind nicht eingerechnet. Kein Mobilfunk, kein echter Browser-Netzlauf, kein externer Host.

898 Vollzustände und 41.855 Differenzzustände wurden gezählt. Im Mittel entspricht das für diese Laufphase ungefähr sechs Zustandsframes pro Sekunde und Client, nicht dauerhaft der eingestellten Zielrate 10 Hz. Im gemeinsamen Prozess liefen Server und Testclients; gemessene Eventloop-Verzögerung p99 158,47 ms, Maximum 226,75 ms. Diese Spitzen sind eine offene Performancegrenze, kein Anlass, einen stabilen MMO-Produktionsbetrieb zu behaupten. Die Clientdatenrate blieb im Test trotz Einsparung erheblich.

Der kurze Test fand vor den letzten ergänzenden Retentions- und Build-Vorprüfungen statt; Transport-/Client-Code war bereits auf dem Stand dieses Pakets. Weitere abschließende Tests nutzen die finale extrahierte Lieferung.

## Reproduzieren

```sh
npm run test:soak
# macOS/Linux: fünf Minuten wie der obige Lauf
SOAK_SECONDS=300 SOAK_CLIENTS=24 NYRATHEN_TEST_REPORT_DIR=artifacts/local node tools/soak.mjs
```

Standard ohne Variablen: 120 Sekunden und 24 Clients. Das Skript erstellt und entfernt eine eigene temporäre Datenbank; vorhandene Spielkonten werden nicht verwendet. Abbruch, Fehler oder ein fehlgeschlagener Prüfschritt ergeben einen Fehlerstatus. Kein Hosting und keine Kostenbuchung.
