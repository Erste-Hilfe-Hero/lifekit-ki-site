# Nyrathen v5.7 — Closed Beta Test Plan

Basis: ProductionRC Hotfix14 BetaPrepared

## Entry criteria

- 401/401+ regression green.
- 50/50 mobile UI green.
- Android AAB and iOS IPA signed from the same source checkpoint.
- Hotfix 14 backend healthy.
- Legal/support URLs resolve publicly before external testers are invited.

## Tester cohorts

Use at least three behavior cohorts, not demographic targeting:

1. New-player cohort: starts with no prior Nyrathen knowledge.
2. Core-action cohort: focuses on combat, dungeons and bosses.
3. Meta-progression cohort: focuses on account levels, pets, enchant, forge, crucible and economy.

## Required test paths

- Fresh install → guest account → named account registration → logout/login/recovery.
- Character create/switch/delete, death/rebirth and second-character continuity.
- Realm combat, Level 20 character progression and extraction.
- At least three different dungeons and their dungeonbosses.
- Verify dungeonboss Account-XP reward is 105 and ordinary boss reward is 55.
- Trade, friend request/direct chat and guild join/create/donation/chat.
- Inventory full condition, drop/recover, salvage/dismantle, forge and enchant flows when unlocked.
- Network interruption during combat and reconnect without state duplication.
- Background/foreground app transitions on mobile.
- Shop browsing without purchase, then one sandbox purchase/restore/refund path when store accounts are active.
- Daily/weekly reset boundary when practical; season state must survive ordinary app restart.

## Balance observations to record

Per test session record manually or via aggregate beta metrics:

- session duration;
- normal kills;
- ordinary bosses;
- dungeonbosses;
- starting/ending Account-XP and Account Level;
- deaths;
- dungeon attempts / completions;
- boss attempts / wins;
- Riftmarks earned/spent;
- forge/enchant attempts and whether blocked by resources;
- crashes, ANRs, disconnects and reconnect failures.

Derived metrics: normal kills/hour, Account-XP/hour, boss win-rate, dungeon completion rate, deaths/hour and resource source/sink balance.

## Release acceptance criteria

- No reproducible progression blocker or item/commerce duplication.
- No account loss after restart/reconnect.
- No crash affecting more than one tester without a known fix/workaround.
- Backend p99 remains <=180 ms under certified load envelope.
- No server 5xx caused by malformed normal client traffic.
- Dungeonboss XP remains 105; hard Account-XP curve remains unchanged.
- No P0/P1 security, privacy, account-loss or payment defects open.
- Android/iOS purchase, restore, refund/revocation evidence recorded before store release.

## Balance escalation rules

- Do not automatically make progression easier because one tester reports it feels slow.
- Compare median plus P25/P75 Account-XP/hour against `release/PROGRESSION-BALANCE-SIM-v5.7.md`.
- Any change to Account-XP curve, 4/55/105 rewards, unlock levels or monetized acceleration requires explicit product-owner approval and a new regression lock.
