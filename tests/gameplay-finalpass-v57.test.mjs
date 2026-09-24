// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import { AdventureEngine } from '../shared/adventure.mjs';
import { accountLevelFromXP, accountXPForLevel, SYSTEM_UNLOCKS, SEASON } from '../shared/endgame-data.mjs';
import { makeItem } from '../shared/realm-data.mjs';

const kill=(e,p,kind='brute')=>{const w=e.world(p),m=w.spawnEnemy(kind,p.x+24,p.y);w.damageEnemy(m,1e9,p.id);e.step(.05);w.enemies=w.enemies.filter(x=>x.hp>0);};

test('v5.7 account progression is locked to the original hard curve plus 20 percent',()=>{
  assert.equal(accountXPForLevel(5),1632);
  assert.equal(accountXPForLevel(10),8262);
  assert.equal(accountXPForLevel(SYSTEM_UNLOCKS.enchanter),26112);
  assert.equal(accountXPForLevel(SYSTEM_UNLOCKS.forge),49368);
  assert.equal(accountXPForLevel(SYSTEM_UNLOCKS.crucible),68952);
  assert.equal(accountXPForLevel(50),244902);
});

test('v5.7 hard account XP rewards keep a moderate dungeon-boss premium',()=>{
  const e=new AdventureEngine({seed:5701}),p=e.addPlayer('xp-lock','XPLock','weaver');
  assert(e.action(p.id,{type:'realm',target:'realm-1'}));p.invulnerable=0;
  const w=e.world(p);
  const normal=w.spawnEnemy('brute',p.x+24,p.y);w.damageEnemy(normal,1e9,p.id);e.step(.05);assert.equal(p.account.accountXP,4);
  const boss=w.spawnEnemy('boss',p.x+24,p.y);w.damageEnemy(boss,1e9,p.id);e.step(.05);assert.equal(p.account.accountXP,59);
  const dungeonBoss=w.spawnEnemy('boss',p.x+24,p.y);dungeonBoss.dungeonBoss=true;w.theme='lab';w.startedAt=w.time;w.damageEnemy(dungeonBoss,1e9,p.id);e.step(.05);assert.equal(p.account.accountXP,164);
});

test('v5.7 daily rollover clears daily counters and daily tinkerer claims',()=>{
  let now=Date.UTC(2026,8,24,10);const e=new AdventureEngine({seed:57,now:()=>now}),p=e.addPlayer('d','Daily','weaver');p.account.materialStorage.iron=16;
  assert(e.action(p.id,{type:'tinkererTurnIn',recipe:'ironCache'}));assert(p.account.tinkererClaims.includes('ironCache'));
  p.account.cadence.daily.kills=7;now+=24*60*60*1000;e.snapshot(p.id);
  assert.deepEqual(p.account.cadence.daily,{kills:0,dungeons:0,bosses:0});assert.deepEqual(p.account.tinkererClaims,[]);assert.equal(p.account.cadence.dailyResets,1);
  assert(e.action(p.id,{type:'tinkererTurnIn',recipe:'ironCache'}));
});

test('v5.7 weekly rollover clears weekly counters and live-event score without deleting lifetime totals',()=>{
  let now=Date.UTC(2026,8,24,10);const e=new AdventureEngine({seed:58,now:()=>now}),p=e.addPlayer('w','Weekly','weaver');assert(e.action(p.id,{type:'realm',target:'realm-1'}));p.invulnerable=0;kill(e,p,'brute');
  p.account.eventStats={completions:3,echoCompletions:2,score:900};const lifetime=p.account.totals.kills;assert(p.account.cadence.weekly.kills>0);now+=7*24*60*60*1000;e.snapshot(p.id);
  assert.deepEqual(p.account.cadence.weekly,{kills:0,dungeons:0,bosses:0});assert.deepEqual(p.account.eventStats,{completions:0,echoCompletions:0,score:0});assert.equal(p.account.totals.kills,lifetime);assert.equal(p.account.cadence.weeklyResets,1);
});

test('v5.7 season rollover resets seasonal claims safely and archives seasonal stash to gift chest',()=>{
  let now=Date.UTC(2026,8,24,10);const e=new AdventureEngine({seed:59,now:()=>now}),p=e.addPlayer('s','Season','weaver');p.account.season.xp=777;p.account.season.claims=['s-kills-25'];p.account.missionTreeClaims=['root'];p.account.seasonalStash=[makeItem('season-safe',p.classId,'weapon',4,2)];
  const next={...SEASON,id:'S2-TEST',startsAt:'2026-09-24T00:00:00Z',endsAt:'2026-12-31T23:59:59Z'};e.syncCadence(p,next);
  assert.equal(p.account.season.id,'S2-TEST');assert.equal(p.account.season.xp,0);assert.deepEqual(p.account.season.claims,[]);assert.deepEqual(p.account.missionTreeClaims,[]);assert.equal(p.account.seasonalStash.length,0);assert(p.account.giftChest.some(i=>i.id==='season-safe'));assert.equal(p.account.cadence.seasonResets,1);
});
