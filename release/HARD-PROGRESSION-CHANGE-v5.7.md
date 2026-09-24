# Nyrathen v5.7 — Hard Progression Change

Stand: 24.09.2026

Auf ausdrückliche Product-Owner-Vorgabe wurde die dauerhafte Account-Progression wieder auf den ursprünglichen schweren Stand zurückgestellt und anschließend um exakt 20 % verschärft.

## Vorheriger Originalstand
- Kurve: `85 × (Level−1)²`
- Normaler Kill: 4 Account-XP
- Boss: 55 Account-XP
- Moderater Dungeonboss-Bonus: +50 Account-XP (105 gesamt statt 55), kalibriert auf ca. +4,9 % im normalen Mix

## Final gesperrter Stand
- Kurve: `102 × (Level−1)²`
- Normaler Kill: 4 Account-XP
- Boss: 55 Account-XP
- Moderater Dungeonboss-Bonus: +50 Account-XP (105 gesamt statt 55), kalibriert auf ca. +4,9 % im normalen Mix

Die Charakter-XP-Kurve Level 1–20 wurde nicht verändert.

## Account-Schwellen
- Level 5: 1.632 XP
- Level 10: 8.262 XP
- Level 17 / Enchanter: 26.112 XP
- Level 23 / Forge: 49.368 XP
- Level 27 / Crucible: 68.952 XP
- Level 50: 244.902 XP

## Reine Normal-Kill-Äquivalente
- Level 5: 408
- Level 10: 2.066
- Enchanter: 6.528
- Forge: 12.342
- Crucible: 17.238
- Level 50: 61.226

## Schutz gegen spätere versehentliche Vereinfachung
Der automatisierte Progressions-Test prüft die oben genannten Schwellen sowie 4 XP pro Normal-Kill und 55 XP pro Boss. Jede unbeabsichtigte Absenkung macht die Regression rot.
