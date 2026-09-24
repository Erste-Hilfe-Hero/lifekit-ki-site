// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import { AdventureEngine } from '../shared/adventure.mjs';
import { CLASSES, ENEMY_TYPES, VERSION, dist } from '../shared/data.mjs';
import { DUNGEONS, makeItem } from '../shared/realm-data.mjs';
import { PETS } from '../shared/adventure-data.mjs';
import { SYSTEM_UNLOCKS, accountXPForLevel, PET_RARITIES, SEASON, CRUCIBLE_MODES, JOURNEY_STEPS, liveEventFor, enchantRank } from '../shared/endgame-data.mjs';
import { ProfileStore } from '../server/store.mjs';

const fresh=(cls='weaver')=>{const e=new AdventureEngine({seed:4040}),p=e.addPlayer('p','FinalQA',cls);p.account.accountXP=accountXPForLevel(50);return{e,p};};
const enter=(e,p,theme,echo=false)=>{p.bank=100000;if(theme==='void')p.account.totals['boss:sovereign']=1;assert(e.action(p.id,{type:'openDungeon',theme,echo}));const portal=e.world(p).portals.find(q=>q.owner===p.id&&q.theme===theme);assert(portal);p.x=portal.x;p.y=portal.y;assert(e.action(p.id,{type:'portal',portalId:portal.id}));return e.world(p);};

test('v5 content contract exposes 19 classes, 18 dungeons, eight pets and six challenge modes',()=>{
  assert.equal(VERSION,'5.7.0');assert.equal(Object.keys(CLASSES).length,19);assert.equal(Object.keys(DUNGEONS).length,18);assert.equal(Object.keys(PETS).length,8);assert.equal(Object.keys(CRUCIBLE_MODES).length,6);assert.equal(SEASON.maxPass,30);assert.equal(PET_RARITIES.at(-1).id,'mythic');
  for(const id of ['mirror','spore','storm','abyss'])assert(DUNGEONS[id]&&ENEMY_TYPES[DUNGEONS[id].boss]);
});

test('Journey onboarding is account-wide, one-time and pays only when the goal is met',()=>{
  const{e,p}=fresh();const step=JOURNEY_STEPS.find(v=>v.id==='j-kills-5');const before=p.bank;assert(!e.action(p.id,{type:'claimJourney',stepId:step.id}));p.account.totals.kills=step.goal;assert(e.action(p.id,{type:'claimJourney',stepId:step.id}));assert.equal(p.bank,before+step.reward.coins);assert(p.account.journeyClaims.includes(step.id));assert(!e.action(p.id,{type:'claimJourney',stepId:step.id}));
});

test('Enchantments upgrade deterministically through rank III and then stop',()=>{
  const{e,p}=fresh();p.account.accountXP=accountXPForLevel(SYSTEM_UNLOCKS.enchanter);p.account.dust.green=10000;const item=makeItem('rank3',p.classId,'weapon',4,2);p.inventory=[item];
  assert(e.action(p.id,{type:'enchant',itemId:item.id,enchantment:'keen'}));assert.equal(enchantRank(item),1);
  assert(e.action(p.id,{type:'enchant',itemId:item.id,enchantment:'keen'}));assert.equal(enchantRank(item),2);
  assert(e.action(p.id,{type:'enchant',itemId:item.id,enchantment:'keen'}));assert.equal(enchantRank(item),3);
  assert(!e.action(p.id,{type:'enchant',itemId:item.id,enchantment:'keen'}));assert.equal(enchantRank(item),3);
});

test('Echo paths are harder event instances with explicit flags and guaranteed modifiers',()=>{
  const{e,p}=fresh();const theme=liveEventFor().theme,w=enter(e,p,theme,true);assert.equal(w.echo,true);assert.equal(w.liveEvent,true);assert(w.modifiers.includes('elite'));assert(w.modifiers.length<=3);assert.equal(w.theme,theme);
});

test('Portal-safe loot placement pushes dropped items away from portal interaction space',()=>{
  const{e,p}=fresh();const w=e.world(p);w.portals.push({id:'portal-test',x:p.x+34,y:p.y,life:90,kind:'realm'});p.inventory=[makeItem('drop-safe',p.classId,'weapon',2,1)];assert(e.action(p.id,{type:'dropItem',itemId:'drop-safe'}));const bag=w.loot.find(v=>v.item?.id==='drop-safe');assert(bag);assert(dist(bag,w.portals.at(-1))>=95);
});

test('No-heal challenge blocks active healing and rush changes the combat profile',()=>{
  const{e,p}=fresh('warden');p.crucibleMode='noheal';p.hp=50;p.potions=2;assert.equal(e.action(p.id,{type:'heal'}),false);assert.equal(p.potions,2);const normal=e.stats(p);p.crucibleMode='rush';const rushed=e.stats(p);assert(rushed.speed>normal.speed);
});

test('Dungeon completion records an authoritative best time and event score',()=>{
  const{e,p}=fresh();const theme=liveEventFor().theme,w=enter(e,p,theme,false);w.startedAt=w.time-12.5;const boss=w.enemies.find(v=>v.dungeonBoss);assert(boss);w.damageEnemy(boss,1e9,p.id);assert(p.account.bestTimes[theme]>0&&p.account.bestTimes[theme]<20);assert(p.account.eventStats.completions>=1);assert(p.account.eventStats.score>0);
});

test('New endgame bosses execute distinct multi-phase projectile/hazard signatures',()=>{
  const signatures=[];for(const theme of ['mirror','spore','storm','abyss']){const{e,p}=fresh();assert(e.action(p.id,{type:'realm',target:'realm-1'}));p.x=2860;p.y=3450;p.invulnerable=0;const w=e.world(p);w.enemies=[];w.bullets=[];const b=w.spawnEnemy(DUNGEONS[theme].boss,p.x+180,p.y);b.phase=3;b.pattern=2;b.angle=.4;b.spin=.2;assert(e.bossPattern(w,b,p,ENEMY_TYPES[b.kind]));const sig=JSON.stringify([w.bullets.length,e.effects.length,w.bullets.slice(0,8).map(v=>Math.round(v.angle*100))]);signatures.push(sig);assert(w.bullets.length||e.effects.length);}assert.equal(new Set(signatures).size,4);
});

test('Player snapshot exposes temporary effect timers and current live rotation',()=>{
  const{e,p}=fresh('druid');p.empowered=3.5;p.haste=2.25;p.inspired=4.75;p.formTimer=7.5;const s=e.snapshot(p.id),me=s.players.find(v=>v.id===p.id);assert.equal(me.empowered,3.5);assert.equal(me.haste,2.25);assert.equal(me.inspired,4.75);assert.equal(me.formTimer,7.5);assert(DUNGEONS[s.progression.liveEvent.theme]);
});

test('SQLite leaderboards expose fame, dungeon best times and live-event score independently',()=>{
  const store=new ProfileStore(':memory:');try{const a=store.create('Alpha','weaver'),b=store.create('Beta','druid');a.profile.account.bestTimes.tide=42.3;a.profile.account.eventStats={completions:3,echoCompletions:1,score:300};a.profile.fame=50;b.profile.account.bestTimes.tide=38.1;b.profile.account.eventStats={completions:4,echoCompletions:2,score:600};b.profile.fame=20;store.save(a.id,a.profile);store.save(b.id,b.profile);assert.equal(store.speedLeaderboard('tide')[0].name,'Beta');assert.equal(store.eventLeaderboard()[0].name,'Beta');assert.equal(store.leaderboard()[0].name,'Alpha');}finally{store.close();}
});
