# Nyrathen v5.7 — Localization / Store / Products / Soak Report

Stand: 24.09.2026  
Build: `998778d6d05c`

## Lokalisierung — erledigt

- Runtime-Sprachen: Deutsch + Englisch, auswählbar in den Einstellungen.
- Menü/HUD/Settings, 19 Klassen, Klassenfähigkeiten, 18 Dungeons und Boss-/Systemtexte in den DE/EN-Pfad aufgenommen.
- Dynamische Klassenanzeige wird direkt beim Rendern lokalisiert (u. a. Mage / Starbreak).
- Reale Headless-Chromium-Prüfung des gebauten Clients bestanden, ohne Page-Errors.
- Englisch-Screenshots: `release/verification/v5.7/localization/menu-en.png` und `settings-en.png`.
- Store-Lokalisierung: de-DE + en-US.

## Store-Dokumente — engineering-seitig erledigt

- Privacy Policy, Terms, Support und Account Deletion bilingual als Templates.
- Privacy nennt Produkt-/Transaktionskennung bzw. Kaufbeleg sowie Restore/Refund/Revocation-Daten.
- Terms decken Nyr-Splitter sowie Erstattungen, Widerrufe und Chargebacks ab.
- Apple App Privacy und Google Play Data Safety Worksheets aktualisiert.
- App Store Review Notes / Legal Release Checklist aktualisiert.
- Synthetischer Render-Test der Compliance-Seiten erfolgreich und ohne Restplatzhalter.
- Extern offen: echte Publisheridentität/Kontakte und öffentliche HTTPS-URLs.

## Produkte — erledigt bis zur externen Console

- 13 Product IDs konsistent über Katalog, Apple- und Google-Metadaten.
- DE/EN-Titel und Beschreibungen validiert.
- Consumable/Entitlement-Verhalten dokumentiert; Nyr-Shards sind repeatable consumables.
- Produktvertrag SHA-256: `c394a805720b162baa1f7cd7052619d26d5a40b5b7cbd8ac70dcd0d13ecc1da7`.
- Extern offen: Produkte/Preise/Territorien in App Store Connect und Play Console anlegen.

## Soak — weitergeführt

- Aktueller Gameplay-Nachweis: 2 × 24 lokale HTTP/SSE-Clients, zusammen 50 angeforderte Sekunden, 2/2 erzwungene Stream-Reconnects erfolgreich.
- Event-Loop-p99 im aktuellen Nachweis maximal 161.35 ms.
- 0 Backpressure-Skips, 0 Slow-Disconnects, Privacy/Isolation/Identity/Delta-Checks bestanden.
- Commerce: 5928 Grants, 1186 Replays, 847 Revokes, 0 doppelte Transaction IDs, 0 beschädigte Profile.
- Ununterbrochener 6–24h-Endurance-Test bleibt offen; der segmentierte lokale Nachweis wird nicht als 24h-Zertifizierung ausgegeben.

## Regression nach diesen Änderungen

- 388/388 Regressionstests: PASS.
- 50/50 Mobile-UI-Checks: PASS.
- 109 Module syntaxgeprüft; Android/iOS-Webassets synchron.
- Build: `998778d6d05c`.
