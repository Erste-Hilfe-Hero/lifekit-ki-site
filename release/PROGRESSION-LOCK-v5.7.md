# Nyrathen v5.7 — Hard Progression Lock

Stand: 24.09.2026

## Verbindliche Designregel

Die dauerhafte Account-Progression basiert wieder exakt auf dem früheren schweren Nyrathen-Stand und ist zusätzlich **20 % schwerer**.

- Alte Kurve: `85 × (Level−1)²`
- Gesperrte Kurve: `102 × (Level−1)²`
- Normaler Kill: **4 Account-XP**
- Boss: **55 Account-XP**
- Dungeonboss-Account-XP-Bonus: **+50** (105 gesamt), Ziel: ca. **4–6 %** schnellere Progression im normalen Mix
- Charakter-Level 1–20: **nicht verändert**

Diese Werte dürfen ohne ausdrückliche Freigabe des Product Owners nicht automatisch vereinfacht oder beschleunigt werden. Ein Regressionstest sperrt die Schwellen und Belohnungen technisch ab.

## Schwellen

| Ziel | früher | jetzt (+20 %) | reine normale Kills jetzt |
|---|---:|---:|---:|
| Account-Level 5 / Pets | 1.360 | **1.632** | 408 |
| Account-Level 10 | 6.885 | **8.262** | 2.066 |
| Account-Level 17 / Enchanter | 21.760 | **26.112** | 6.528 |
| Account-Level 23 / Forge | 41.140 | **49.368** | 12.342 |
| Account-Level 27 / Crucible | 57.460 | **68.952** | 17.238 |
| Account-Level 50 / Maximum | 204.085 | **244.902** | 61.226 |

## Verifikation

Der repräsentative Lauf mit **600 normalen Kills + 12 Bossen** ergibt exakt **3.060 Account-XP** und damit erst **Account-Level 6**. Charakter-Level 20 bleibt unabhängig davon erreichbar. Forge/Enchanter bleiben bewusst Langzeitziele.

Die Forge-, Enchant-, Pet- und Crucible-Systeme selbst bleiben durch ihre separaten Funktions-/Persistenztests abgedeckt; nur ihr Account-Unlock wurde wieder auf den schweren Langzeitpfad gesetzt.
