# Nyrathen v5.0.0 — finaler Test- und Freigabebericht

## Automatisiert

- Node-Regression: **284/284 bestanden**.
- v4-spezifische Finalmechanik: **10/10 bestanden** (Teil der 284).
- Syntaxprüfung: **57 Module**.
- Build: `efb7d86e4924`.
- Native WebView-Assets Android/iOS: synchron.
- Mobile Release Preflight: alle Gates bestanden.

## Mobile UI

- **50/50 Prüfungen bestanden**.
- Viewports: 390×844 (iPhone-artig), 412×915 (Android-artig).
- Geprüft wurden Boot, Version, 19 Klassen, Viewport/Touchgrößen, Community-Gate, Legal-Links, Online-Konfiguration, Riftwacht, Charaktere und Inventar.

## Multiplayer-Soak

- **40 Clients**, **2 Realms**, **10 Sekunden**.
- Keine erzwungene Reconnect-Probe in diesem finalen 10-Sekunden-Lauf; Reconnect bleibt separat regressionsgeprüft.
- 0 Fehler.
- Private Inventare blieben privat; Weltisolation und Identitäten blieben korrekt.
- 120 Full Frames + 2.557 Delta Frames.
- Delta-Ersparnis: **76,44 %** gegenüber Full-Snapshot-Referenz derselben Frames.

## V4-Funktionschecks

Journey, 18-Dungeon-Content, neue Endgame-Bosse, Echo-Instanzen, Live-Rotation, Portal-sichere Drops, No-Heal/Rush-Prüfungen, Rang-III-Verzauberungen, Bestzeiten/Eventscore, Status-Timer und getrennte SQLite-Ranglisten sind separat regressionsgeprüft.

## Grenzen

Der Soak läuft lokal in einem Node-Prozess und ist kein Mobilfunk-/TLS-Langzeit-Kapazitätszertifikat. Signierte AAB/IPA und physische Geräte benötigen externe Toolchains/Credentials.
