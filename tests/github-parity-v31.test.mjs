// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import {AdventureEngine,cleanAdventureProfile} from '../shared/adventure.mjs';
import {GuildService} from '../shared/social.mjs';
import {makeItem} from '../shared/realm-data.mjs';
import {CHARACTER_SLOTS_BASE,CHARACTER_SLOTS_MAX,CHARACTER_SLOT_COST} from '../shared/adventure-data.mjs';

const fixture=()=>{const e=new AdventureEngine(),p=e.addPlayer('a','Alpha','weaver');return{e,p};};

test('GitHub parity: character slots start at four, can be expanded to eight, and persist',()=>{
  const {e,p}=fixture();assert.equal(p.account.characterSlots,CHARACTER_SLOTS_BASE);
  for(let i=0;i<3;i++)assert(e.action(p.id,{type:'characterCreate',classId:'ninja',name:'N'+i}));
  assert.equal(p.account.characters.length,4);assert(!e.action(p.id,{type:'characterCreate',classId:'bard',name:'Blocked'}));
  p.bank=10000;let expectedBank=p.bank;
  while(p.account.characterSlots<CHARACTER_SLOTS_MAX){const cost=CHARACTER_SLOT_COST(p.account.characterSlots);expectedBank-=cost;assert(e.action(p.id,{type:'characterSlotPurchase'}));assert.equal(p.bank,expectedBank);}
  assert.equal(p.account.characterSlots,8);assert(!e.action(p.id,{type:'characterSlotPurchase'}));
  for(let i=4;i<8;i++)assert(e.action(p.id,{type:'characterCreate',classId:'bard',name:'B'+i}));
  assert.equal(p.account.characters.length,8);assert(!e.action(p.id,{type:'characterCreate',classId:'bard',name:'Overflow'}));
  const saved=cleanAdventureProfile(e.profile(p.id));assert.equal(saved.account.characterSlots,8);assert.equal(saved.account.characters.length,8);
});

test('GitHub parity: guild board is leader-controlled and persists through social export/import',()=>{
  const social=new GuildService(),e=new AdventureEngine({social}),p=e.addPlayer('a','Alpha','weaver'),q=e.addPlayer('b','Beta','weaver');p.bank=200;
  assert(e.action(p.id,{type:'guildCreate',name:'Wardens'}));const g=social.get(p.id);assert(g);
  assert(e.action(p.id,{type:'guildSetBoard',text:'Treffen um 20 Uhr. Bitte Schlüssel sichern.'}));assert.match(social.view(p.id).board,/Treffen um 20 Uhr/);
  const code=g.code;assert(e.action(q.id,{type:'guildRequest',code}));assert(e.action(p.id,{type:'guildApprove',playerId:q.id}));assert(!e.action(q.id,{type:'guildSetBoard',text:'forged'}));
  const restored=new GuildService(JSON.parse(JSON.stringify(social.export())));assert.equal(restored.view(p.id).board,'Treffen um 20 Uhr. Bitte Schlüssel sichern.');assert.equal(restored.view(q.id).members.length,2);
});

test('GitHub parity: inventory drop is authoritative, personal, recoverable and not duplicating',()=>{
  const {e,p}=fixture();p.inventory=[makeItem('drop-me','weaver','weapon',2,1)];const w=e.world(p);p.angle=0;
  assert(e.action(p.id,{type:'dropItem',itemId:'drop-me'}));assert.equal(p.inventory.length,0);const bag=w.loot.find(l=>l.item?.id==='drop-me');assert(bag);assert.equal(bag.owner,p.id);assert.equal(bag.dropped,true);
  assert(!e.action(p.id,{type:'dropItem',itemId:'drop-me'}));p.x=bag.x;p.y=bag.y;assert(e.action(p.id,{type:'interact'}));assert.equal(p.inventory.filter(i=>i.id==='drop-me').length,1);assert(!w.loot.some(l=>l.item?.id==='drop-me'));
});
