// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import assert from 'node:assert/strict';
import { AdventureEngine } from '../shared/adventure.mjs';
import { accountLevelFromXP, accountXPForLevel, SYSTEM_UNLOCKS, SEASON } from '../shared/endgame-data.mjs';

const OLD_CURVE=85;
const HARD_CURVE=102; // exact +20% over the original curve.
assert.equal(HARD_CURVE,OLD_CURVE*1.2);
assert.equal(accountXPForLevel(5),1632);
assert.equal(accountXPForLevel(10),8262);
assert.equal(accountXPForLevel(SYSTEM_UNLOCKS.enchanter),26112);
assert.equal(accountXPForLevel(SYSTEM_UNLOCKS.forge),49368);
assert.equal(accountXPForLevel(SYSTEM_UNLOCKS.crucible),68952);
assert.equal(accountXPForLevel(50),244902);

let now=Date.UTC(2026,8,24,10,0,0);
const e=new AdventureEngine({seed:570,now:()=>now});
const p=e.addPlayer('finalpass','Finalpass','weaver');
assert(e.action(p.id,{type:'realm',target:'realm-1'}));p.invulnerable=0;
let normalKills=0,bossKills=0;
const kill=(kind='brute')=>{
  const w=e.world(p),mob=w.spawnEnemy(kind,p.x+24,p.y);w.damageEnemy(mob,1e9,p.id);e.step(.05);w.enemies=w.enemies.filter(x=>x.hp>0);
  if(kind==='brute')normalKills++;else bossKills++;
};
while(p.level<20&&normalKills<2500)kill('brute');
assert.equal(p.level,20,'character level 20 should remain reachable independently of account grind');

// Representative hard-mode account sample: 600 normal kills + 12 bosses.
while(normalKills<600)kill('brute');
while(bossKills<12)kill('boss');
const expectedAccountXP=600*4+12*55;
assert.equal(p.account.accountXP,expectedAccountXP);
assert.equal(expectedAccountXP,3060);
assert.equal(accountLevelFromXP(p.account.accountXP),6);
assert(!p.account.unlocks?.forge);

const normalKillEquivalents={
  pets:Math.ceil(accountXPForLevel(SYSTEM_UNLOCKS.pets)/4),
  enchanter:Math.ceil(accountXPForLevel(SYSTEM_UNLOCKS.enchanter)/4),
  forge:Math.ceil(accountXPForLevel(SYSTEM_UNLOCKS.forge)/4),
  crucible:Math.ceil(accountXPForLevel(SYSTEM_UNLOCKS.crucible)/4),
  max:Math.ceil(accountXPForLevel(50)/4)
};
const report={
  status:'passed',
  policy:'original hard account progression +20%; locked',
  characterLevel:p.level,
  sample:{normalKills,bossKills,accountXP:p.account.accountXP,accountLevel:accountLevelFromXP(p.account.accountXP)},
  thresholds:{pets:accountXPForLevel(5),level10:accountXPForLevel(10),enchanter:accountXPForLevel(SYSTEM_UNLOCKS.enchanter),forge:accountXPForLevel(SYSTEM_UNLOCKS.forge),crucible:accountXPForLevel(SYSTEM_UNLOCKS.crucible),max:accountXPForLevel(50)},
  normalKillEquivalents,
  rewards:{normalKill:4,boss:55,dungeonBossBonus:50,dungeonBossTotal:105},
  normalMix:{normalKills:600,bosses:12,dungeonBosses:3,baselineAccountXP:3060,accountXP:3210,progressionIncreasePct:Math.round(((3210/3060)-1)*10000)/100},
  season:SEASON.id
};
console.log(JSON.stringify(report,null,2));
