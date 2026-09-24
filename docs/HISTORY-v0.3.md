# Historischer Arbeitsstand v0.3 · kein Nachweis für v0.4

# Arbeitslog · Gesamtstand v0.3

Ausgangspunkt war das unveränderte v0.2-Gesamtprojekt. Oathenfell wurde nicht verwendet oder bearbeitet. Die ursprünglichen v0.1-/v0.2-Pakete bleiben separate Artefakte.

1. Projekt extrahiert, Struktur und bestehende Tests geprüft. Bestehende Welt- und Datenverträge nicht durch einen neuen isolierten Prototyp ersetzt.
2. Klassen auf 18 erweitert; zusätzliche Fähigkeiten serverseitig mit ihren jeweiligen Effekten implementiert. Zehn Dungeon-Themen, neue Gegner/Bosse, sechs neue Kammeranordnungen und Warnfelder ergänzt.
3. Konto-/Charaktermodell Version 3 mit vier getrennten Figuren, geteiltem Kontofortschritt und v0.2-Migration aufgebaut. Gefährten, Aufträge, Schmiede, Portal-Schlüssel, Bestiarium und Chronik integriert.
4. Gildenmitgliedschaft, Leiterberechtigungen, Spenden, privater regionsübergreifender Chat und Persistenz implementiert. Handel mit revisionsgebundenen Angeboten, beidseitiger Bestätigung, Eigentums-/Kapazitätsprüfung und Abbruchbedingungen implementiert.
5. Benannte Konten, Gastverknüpfung, scrypt-Passwörter, einmalige Recovery-Codes, Tokenrotation und serverseitige Begrenzungen ergänzt. Erneute Anmeldung übernimmt die laufende Figur statt einen Kampf-Rückzug zu ermöglichen.
6. SQLite-Transaktionen und Fehlermodus abgesichert. Simulierter Schreibfehler beim Handel stoppt weitere Simulation; Test kontrolliert die unveränderte letzte Datenbanktransaktion beider Teilnehmer.
7. Journal mit acht verbundenen Bereichen, Spielerhandel und Kontodialogen gebaut. Pixel-Sprites, Gefährten, Gebäude, Dungeon-Böden, Effekte, kompakte Statusleiste und mobile Layouts überarbeitet.
8. Solo-Dateisicherung und validierte Wiederherstellung ergänzt. Native Quelltexte für System-Dokumentpicker bzw. Teilen-Dialog ergänzt, aber nicht als native Laufzeit zertifiziert. Swift-Parser und Ressourcenprüfung ausgeführt.
9. Automatisierte Kern-/API-/Netzwerktests und tatsächliche Chromium-Bedienung ausgeführt. Gefundene mobile Überbreite korrigiert. Ein Bedienungstest blieb im Kampf stehen und starb; der Test wurde auf tatsächliches Ausweichen und rechtzeitige Rückkehr umgestellt, nicht der Tod als Erfolg gezählt.
10. Finale Testlogs, Start-/Buildanleitung, Herkunftshinweise, offene Grenzen und Original-Laufzeitansichten zusammengeführt. Paket wird nach Erstellung separat entpackt, per SHA-256 geprüft und darin erneut gebaut/geprüft.

Maßgebliche Ergebnisse sind die finalen Protokolle unter `artifacts/v03/` und der Testbericht, nicht Zwischenläufe. Es wurden kein öffentlicher Server, kein kostenpflichtiges Deployment und keine Store-Veröffentlichung ausgeführt.
