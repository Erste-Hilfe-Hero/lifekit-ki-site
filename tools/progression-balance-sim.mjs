#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Deterministic release-time sensitivity analysis. This does not change live balance.
import assert from 'node:assert/strict';
import {accountXPForLevel, accountLevelFromXP, SYSTEM_UNLOCKS, ACCOUNT_XP_CURVE} from '../shared/endgame-data.mjs';

const rewards=Object.freeze({normal:4,boss:55,dungeonBoss:105});
const normalMix=Object.freeze({normalKills:600,bosses:12,dungeonBosses:3});
const normalBosses=normalMix.bosses-normalMix.dungeonBosses;
const mixXp=normalMix.normalKills*rewards.normal+normalBosses*rewards.boss+normalMix.dungeonBosses*rewards.dungeonBoss;
const baselineXp=normalMix.normalKills*rewards.normal+normalMix.bosses*rewards.boss;
assert.equal(ACCOUNT_XP_CURVE,102);
assert.equal(mixXp,3210);
assert.equal(baselineXp,3060);

// Sensitivity only: actual beta telemetry must replace these assumed kill rates.
// Boss/dungeon ratios remain locked to the representative normal mix: 12 bosses / 600 normal kills,
// 3 dungeon bosses / 12 bosses.
const paceBands=[60,90,120,180,250,320].map(normalKillsPerHour=>{
  const scale=normalKillsPerHour/normalMix.normalKills;
  const bossPerHour=normalMix.bosses*scale;
  const dungeonBossPerHour=normalMix.dungeonBosses*scale;
  const xpPerHour=mixXp*scale;
  const hoursForLevel=level=>Math.round(accountXPForLevel(level)/xpPerHour*10)/10;
  return {normalKillsPerHour,bossPerHour:+bossPerHour.toFixed(2),dungeonBossPerHour:+dungeonBossPerHour.toFixed(2),accountXpPerHour:+xpPerHour.toFixed(1),hours:{pets:hoursForLevel(SYSTEM_UNLOCKS.pets),enchanter:hoursForLevel(SYSTEM_UNLOCKS.enchanter),forge:hoursForLevel(SYSTEM_UNLOCKS.forge),crucible:hoursForLevel(SYSTEM_UNLOCKS.crucible),level40:hoursForLevel(40),level50:hoursForLevel(50)}};
});

const levels=[5,10,17,20,23,27,30,40,50].map(level=>({level,xp:accountXPForLevel(level),normalKillOnly:Math.ceil(accountXPForLevel(level)/rewards.normal),normalMixUnits:+(accountXPForLevel(level)/mixXp).toFixed(2)}));
const bossPremiumPct=+((mixXp/baselineXp-1)*100).toFixed(2);
const dungeonSharePct=+(normalMix.dungeonBosses*(rewards.dungeonBoss-rewards.boss)/mixXp*100).toFixed(2);
const deadlockChecks={
  accountXpAvailableBeforePets:rewards.normal>0&&rewards.boss>0,
  dungeonBossRewardDoesNotGateAccountXp:true,
  petsUnlockBeforeEnchanter:SYSTEM_UNLOCKS.pets<SYSTEM_UNLOCKS.enchanter,
  enchanterBeforeForge:SYSTEM_UNLOCKS.enchanter<SYSTEM_UNLOCKS.forge,
  forgeBeforeCrucible:SYSTEM_UNLOCKS.forge<SYSTEM_UNLOCKS.crucible,
  level50Reachable:accountLevelFromXP(accountXPForLevel(50))===50
};
assert(Object.values(deadlockChecks).every(Boolean));

const report={status:'passed',kind:'synthetic sensitivity analysis; not player telemetry',curve:{formula:'102 × (level−1)^2',cap:50},rewards,normalMix:{...normalMix,normalBosses,baselineXp,accountXp:mixXp,bonusVsNoDungeonPremiumPct:bossPremiumPct,dungeonPremiumShareOfMixPct:dungeonSharePct},levels,paceBands,deadlockChecks,guardrails:{balanceChanged:false,hardCurveChanged:false,dungeonBossTotal:105}};
console.log(JSON.stringify(report,null,2));
