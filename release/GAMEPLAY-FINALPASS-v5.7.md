# Nyrathen v5.7 — Gameplay Finalpass / Hard Progression

Stand: 24.09.2026

## New Account → Character Endgame / Account Long-Term Progression

Die Charakterprogression und die dauerhafte Account-Progression sind absichtlich getrennt:

- Charakter-Level 1–20 bleibt unverändert und kann im normalen Spiel erreicht werden.
- Account-Level 1–50 ist der langfristige Grind für dauerhafte System-Unlocks.
- Die Account-Kurve wurde auf den ursprünglichen schweren Stand zurückgestellt und anschließend exakt **20 % schwerer** gemacht.

Ein deterministischer Lauf mit **600 normalen Kills + 12 Bossen** erreicht Charakter-Level 20, erzeugt aber nur **3.060 Account-XP = Account-Level 6**. Damit bleiben Enchanter (17), Forge (23) und Crucible (27) bewusst langfristige Ziele.

## Progressionslock

- Kurve: `102 × (Level−1)²`
- Normaler Kill: 4 Account-XP
- Boss: 55 Account-XP
- Dungeonboss-Bonus: +50 Account-XP; Dungeonboss gesamt 105 Account-XP (~4,9 % Progressionsbeschleunigung im normalen Mix)
- Pets: 1.632 XP
- Enchanter: 26.112 XP
- Forge: 49.368 XP
- Crucible: 68.952 XP
- Account-Maximum 50: 244.902 XP

Ein eigener Regressionstest blockiert zukünftige versehentliche Beschleunigungen dieser Werte.

## Economy / Loot / Systeme

Die Economy-Gates bleiben unverändert grün:

- 1.000 Transaktionen
- Source/Sink-Ratio: 1,14985
- Inflation: 2,997 %
- Duplicate Receipts: 0

Forge, Enchanting, Guild, Daily/Weekly/Season Rollover, Death/Rebirth, Disconnect/Reconnect und AFK/Stale-Input sind weiterhin separat funktional und persistent getestet. Die härtere Account-Kurve ändert nur, **wann** langfristige Systeme freigeschaltet werden, nicht deren Funktionsweise.

## Verifikation

- Hard-Progression-Targeted Tests: 5/5 PASS
- Vollständige Regression: **397/397 PASS**
- Mobile UI: **50/50 PASS**
- Syntax/build: **115 Module**, Build `c386de46dd81`
- Store/Product/Localization/Economy Gates: PASS
