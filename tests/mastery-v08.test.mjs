// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import { AdventureEngine, cleanAdventureProfile } from '../shared/adventure.mjs';
import { masteryRank, masteryStars, MASTERY_FAME_THRESHOLDS } from '../shared/adventure-data.mjs';
import { CLASSES } from '../shared/data.mjs';
import { ProfileStore } from '../server/store.mjs';

test('mastery sanitizes every class and computes bounded ranks',()=>{
  const p=cleanAdventureProfile({classId:'weaver',account:{mastery:{weaver:350,warden:-10,unknown:999999}}});
  assert.equal(Object.keys(p.account.mastery).length,Object.keys(CLASSES).length);
  assert.equal(p.account.mastery.weaver,350);
  assert.equal(p.account.mastery.warden,0);
  assert.equal(p.account.mastery.unknown,undefined);
  assert.equal(masteryRank(350),3);
  assert.equal(masteryRank(Infinity),0);
  assert.equal(masteryRank(1e9),MASTERY_FAME_THRESHOLDS.length);
  assert.equal(masteryStars(p.account.mastery),3);
});

test('permadeath records best class fame without lowering previous mastery',()=>{
  const e=new AdventureEngine(),p=e.addPlayer('mastery-a','Alpha','weaver');
  assert(e.action(p.id,{type:'realm',target:'realm-1'}));p.x=2860;p.y=3450;p.invulnerable=0;p.characterFame=350;
  e.world(p).damagePlayer(p,100000,'Test Boss');
  assert(p.dead);assert.equal(p.account.mastery.weaver,350);assert.equal(e.snapshot(p.id).players.find(q=>q.id===p.id).account.masteryStars,3);
  assert(e.action(p.id,{type:'rebirth',classId:'weaver'}));assert(e.action(p.id,{type:'realm',target:'realm-1'}));p.x=2860;p.y=3450;p.invulnerable=0;p.characterFame=80;
  e.world(p).damagePlayer(p,100000,'Test Boss');
  assert.equal(p.account.mastery.weaver,350);
  const restored=cleanAdventureProfile(JSON.parse(JSON.stringify(e.profile(p.id))));assert.equal(restored.account.mastery.weaver,350);
});

test('leaderboard exposes mastery star total without account credentials',()=>{
  const store=new ProfileStore(':memory:');
  try{
    const a=store.create('Alpha','weaver'),p=cleanAdventureProfile(a.profile);p.fame=500;p.account.mastery.weaver=1500;p.account.mastery.warden=700;store.save(a.id,p);
    const board=store.leaderboard(5);assert.equal(board[0].masteryStars,9);assert.equal(board[0].name,'Alpha');
    assert.equal('token' in board[0],false);assert.equal('username' in board[0],false);assert.equal('mastery' in board[0],false);
  }finally{store.close();}
});
