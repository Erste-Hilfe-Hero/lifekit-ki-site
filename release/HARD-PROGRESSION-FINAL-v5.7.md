# Nyrathen v5.7 — Final Hard Progression

## Product-owner lock

The account progression is intentionally punishing. Do not make it easier without an explicit product-owner instruction.

### Baseline and final curve
- Original hard curve: `85 × (level−1)^2`
- Final curve: `102 × (level−1)^2`
- Difficulty delta: **+20% required Account XP**
- Normal kill: **4 Account XP**
- Boss: **55 Account XP**
- Dungeon-boss extra Account XP: **0**
- Character level curve 1–20: unchanged

### Locked thresholds
| Account level / unlock | XP |
|---|---:|
| 5 / Pets | 1,632 |
| 10 | 8,262 |
| 17 / Enchanter | 26,112 |
| 23 / Forge | 49,368 |
| 27 / Crucible | 68,952 |
| 50 / cap | 244,902 |

### Pure normal-kill equivalents
| Goal | Kills |
|---|---:|
| Level 5 | 408 |
| Level 10 | 2,066 |
| Enchanter | 6,528 |
| Forge | 12,342 |
| Crucible | 17,238 |
| Level 50 | 61,226 |

The game is expected to progress faster than these pure-mob figures when bosses and other content are used, but no automatic account-XP shortcut has been added.

### Automated evidence
- Representative sample: 600 normal kills + 12 bosses = 3,060 Account XP = Account Level 6.
- Hard progression targeted tests: 5/5 PASS.
- Full regression: 397/397 PASS.
- Mobile UI: 50/50 PASS.
- Syntax/build: 115 modules, build `c386de46dd81`.

### Live Railway certification
- Runtime: `v5.7.0-prod-hotfix13-hard-progression-lock`
- 1008/1008 realtime clients connected
- 14/14 workers passed
- Max event-loop p99: 106 ms (SLO <=180 ms)
- Post-cleanup state/storage healthy
