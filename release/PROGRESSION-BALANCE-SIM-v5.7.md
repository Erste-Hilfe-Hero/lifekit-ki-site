# Nyrathen v5.7 — Progression / Balance Simulation

Stand: 24.09.2026
Basis: ProductionRC Hotfix14 BetaPrepared

## Locked values — unchanged

- Account curve: `102 × (Level−1)^2`.
- Normal kill: 4 Account-XP.
- Normal boss: 55 Account-XP.
- Dungeonboss: 105 Account-XP total.
- Character level 1–20 unchanged.

No balance value was changed by this analysis.

## Representative normal mix

Reference mix: 600 normal kills + 12 bosses, including 3 dungeonbosses.

- Without dungeon premium: 3,060 Account-XP.
- With 105-XP dungeonboss reward: 3,210 Account-XP.
- Progression acceleration: 4.90%.
- The extra dungeon premium itself contributes 4.67% of the resulting mix XP.

## Progression volume

| Account level | Required XP | Normal-kill-only equivalent |
|---:|---:|---:|
| 5 | 1,632 | 408 |
| 10 | 8,262 | 2,066 |
| 17 / Enchanter | 26,112 | 6,528 |
| 23 / Forge | 49,368 | 12,342 |
| 27 / Crucible | 68,952 | 17,238 |
| 30 | 85,782 | 21,446 |
| 40 | 155,142 | 38,786 |
| 50 | 244,902 | 61,226 |

## Hour sensitivity — synthetic, not player telemetry

The table keeps the reference boss ratio fixed at 12 bosses per 600 normal kills and 3 dungeonbosses per 12 bosses. Actual beta telemetry must replace the assumed normal-kill pace.

| Normal kills/hour | Account XP/hour | Forge L23 | Crucible L27 | L40 | L50 |
|---:|---:|---:|---:|---:|---:|
| 60 | 321.0 | 153.8 h | 214.8 h | 483.3 h | 762.9 h |
| 90 | 481.5 | 102.5 h | 143.2 h | 322.2 h | 508.6 h |
| 120 | 642.0 | 76.9 h | 107.4 h | 241.7 h | 381.5 h |
| 180 | 963.0 | 51.3 h | 71.6 h | 161.1 h | 254.3 h |
| 250 | 1,337.5 | 36.9 h | 51.6 h | 116.0 h | 183.1 h |
| 320 | 1,712.0 | 28.8 h | 40.3 h | 90.6 h | 143.1 h |

## Deadlock result

PASS. Account XP is available before every meta-system unlock, and the unlock order remains Pets → Enchanter → Forge → Crucible. No system is required to earn the Account-XP needed to unlock itself.

## Beta decision rule

Do not rebalance from this synthetic table. During closed beta, record real normal kills/hour, bosses/hour and dungeonbosses/hour. Compare median and P25/P75 progression pace to this sensitivity table. Any future difficulty change requires explicit product-owner approval because the hard curve is locked.
