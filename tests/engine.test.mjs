// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine, cleanProfile, cleanName } from '../shared/engine.mjs';
import { HOME, ALTAR, CLASSES, TILE, WORLD_W, makeMap, walkable } from '../shared/data.mjs';
import { projectileSpec } from '../shared/projectile.mjs';
function fixture(cls='warden'){
  const e=new Engine();e.enemies=[];for(const tile of e.map.tiles)if(tile.type===2)tile.type=0;
  const p=e.addPlayer('p','Tester',cls);p.x=1000;p.y=820;return{e,p};
}
function tick(e,n=20,input=null){for(let i=0;i<n;i++){if(input)e.setInput('p',input);e.step(.05);}}
const item=(id,slot='weapon',rarity=1)=>({id,slot,rarity,name:'Eigene Testklinge',stat:8});
test('Map is deterministic, all spawn points are walkable and safe zone exists',()=>{
  assert.deepEqual(makeMap(10),makeMap(10));assert.notDeepEqual(makeMap(10).decorations,makeMap(11).decorations);
  const e=new Engine();assert.equal(e.enemies.length,18);assert(walkable(e.map,HOME.x,HOME.y,13));
  for(const p of e.enemies)assert(walkable(e.map,p.x,p.y,p.radius));assert(!walkable(e.map,0,0,13));
});
test('Projectile descriptor: values, units and presence flags',()=>{
 const d=projectileSpec({damage:12,speed:'420',lifetime:2,multiHit:true,piercing:true});
 assert.equal(d.damage,12);assert.equal(d.speed,420);assert.equal(d.lifetime,2);assert.equal(d.multiHit,true);assert.equal(d.piercing,true);assert(Object.isFrozen(d));
 assert.equal(projectileSpec({damage:5}).damage,5);
});
test('Projectile descriptor rejects infinite, negative and unreasonable parameters',()=>{
 for(const raw of [{speed:Infinity},{damage:-3},{lifetime:0},{speed:5001},{damage:'bad'}])assert.throws(()=>projectileSpec(raw),RangeError);
});
test('Profiles tolerate corrupt/null values and clamp fields',()=>{
 assert.equal(cleanProfile(null).classId,'warden');const p=cleanProfile({classId:'bad',name:'<script>!',level:999,hp:Infinity,xp:Infinity,bank:-20,inventory:[{}],potions:44});
 assert.equal(p.classId,'warden');assert.equal(p.level,20);assert.equal(p.bank,0);assert.equal(p.hp,null);assert.equal(p.inventory.length,0);assert.equal(p.potions,3);assert(!p.name.includes('<'));assert(cleanName('💥').length>0);
});
test('Legacy base engine: original three classes retain independent stats and abilities',()=>{
 for(const cls of ['warden','ranger','weaver']){const{e,p}=fixture(cls);assert.equal(p.hp,CLASSES[cls].hp);assert.equal(e.action('p',{type:'ability'}),true);assert.equal(p.mp,CLASSES[cls].mp-CLASSES[cls].cost);assert(p.abilityCd>0);assert.equal(e.bullets.length,cls==='ranger'?7:cls==='weaver'?12:0);}
});
test('Diagonal speed is normalized and positions cannot be client assigned',()=>{
 const{e,p}=fixture();const start={x:p.x,y:p.y};tick(e,10,{dx:900,dy:900,x:1e6,y:1e6,bank:999});
 assert(Math.abs(Math.hypot(p.x-start.x,p.y-start.y)-CLASSES.warden.speed*.5)<.001);assert.equal(p.bank,0);
});
test('Invalid input and delta time never inject NaN',()=>{
 const{e,p}=fixture();e.setInput('p',{dx:NaN,dy:Infinity,angle:'bad',fire:'yes'});e.step(NaN);e.step(-1);e.step(Infinity);assert.equal(e.time,0);e.step(20);assert.equal(e.time,.05);assert(Number.isFinite(p.x));assert.equal(p.input.fire,false);
});
test('Stale input times out rather than walking forever',()=>{
 const{e,p}=fixture();e.setInput('p',{dx:1});tick(e,20);const x=p.x;tick(e,20);assert.equal(p.x,x);
});
test('Movement and dash cannot tunnel through walls',()=>{
 const{e,p}=fixture();p.x=998;p.y=820;const tx=26,ty=20;e.map.tiles[ty*WORLD_W+tx].type=2;
 e.setInput('p',{dx:1,angle:0});assert(e.action('p',{type:'dash'}));tick(e,6,{dx:1});assert(p.x<tx*TILE-12);assert(walkable(e.map,p.x,p.y,p.radius));
});
test('Gun fire obeys cooldown and cannot fire in sanctuary',()=>{
 const{e,p}=fixture();tick(e,20,{fire:true,angle:0});const shots=e.events.filter(v=>v.type==='shoot');assert(shots.length>=2&&shots.length<=4);
 p.x=HOME.x;p.y=HOME.y;const count=e.eventSeq;tick(e,20,{fire:true});assert.equal(e.events.filter(v=>v.seq>count&&v.type==='shoot').length,0);
});
test('Ability costs, sanctuary restriction and cooldown are enforced',()=>{
 const{e,p}=fixture();assert(e.action('p',{type:'ability'}));const mana=p.mp;assert.equal(e.action('p',{type:'ability'}),false);assert.equal(p.mp,mana);
 p.abilityCd=0;p.mp=0;assert.equal(e.action('p',{type:'ability'}),false);p.mp=100;p.x=HOME.x;p.y=HOME.y;assert.equal(e.action('p',{type:'ability'}),false);
});
test('Health potion requires damage and consumes a limited charge',()=>{
 const{e,p}=fixture();assert.equal(e.action('p',{type:'heal'}),false);p.hp=1;assert(e.action('p',{type:'heal'}));assert.equal(p.potions,2);assert(p.hp>100);p.potions=0;p.hp=1;assert.equal(e.action('p',{type:'heal'}),false);
});
test('Safe area, invulnerability and shield reduce or prevent damage',()=>{
 const{e,p}=fixture();p.x=HOME.x;p.y=HOME.y;e.damagePlayer(p,100);assert.equal(p.hp,220);p.x=1000;p.shield=3;e.damagePlayer(p,100);assert.equal(p.hp,199);e.damagePlayer(p,100);assert.equal(p.hp,199);
});
test('Damage interrupts extraction; successful extraction banks only carried coins',()=>{
 const{e,p}=fixture();p.runCoins=44;assert(e.action('p',{type:'nexus'}));e.damagePlayer(p,20);assert.equal(p.nexus,0);assert.equal(p.bank,0);
 assert(e.action('p',{type:'nexus'}));tick(e,52);assert.equal(p.x,HOME.x);assert.equal(p.y,HOME.y);assert.equal(p.runCoins,0);assert.equal(p.bank,44);
});
test('Permadeath loses run and equipment, keeps secured bank; rebirth works',()=>{
 const{e,p}=fixture();p.bank=30;p.runCoins=20;p.inventory=[item('bag')];p.equipment.weapon=item('w');p.level=5;p.xp=100;e.damagePlayer(p,10000);
 assert(p.dead);assert.equal(p.hp,0);assert.equal(p.bank,30);assert.equal(p.runCoins,0);assert.equal(p.inventory.length,0);assert.deepEqual(p.equipment,{});assert.equal(p.level,1);assert.equal(p.deaths,1);
 assert(e.action('p',{type:'rebirth'}));assert(!p.dead);assert.equal(p.potions,3);assert.equal(p.x,HOME.x);assert.equal(e.action('p',{type:'rebirth'}),false);
});
test('Eight-slot inventory swap preserves every item',()=>{
 const{e,p}=fixture();p.inventory=Array.from({length:8},(_,i)=>item('bag'+i));p.equipment.weapon=item('old');assert(e.action('p',{type:'equip',itemId:'bag0'}));assert.equal(p.inventory.length,8);assert(p.inventory.some(i=>i.id==='old'));assert.equal(p.equipment.weapon.id,'bag0');assert.equal(e.action('p',{type:'equip',itemId:'not-owned'}),false);
});
test('Loot range and full inventory enforced; coins can be collected once',()=>{
 const{e,p}=fixture();e.loot=[{id:'l',kind:'item',item:item('new'),x:p.x+100,y:p.y,life:99}];assert.equal(e.action('p',{type:'interact'}),false);e.loot[0].x=p.x;assert(e.action('p',{type:'interact'}));assert.equal(p.inventory.length,1);assert.equal(e.loot.length,0);
 e.loot=[{id:'coin',kind:'coin',amount:17,x:p.x,y:p.y,life:99}];tick(e,2);assert.equal(p.runCoins,17);
 p.inventory=Array.from({length:8},(_,i)=>item('i'+i));e.loot=[{id:'full',kind:'item',item:item('extra'),x:p.x,y:p.y,life:99}];assert.equal(e.action('p',{type:'interact'}),false);assert.equal(e.loot.length,1);
});
test('Salvage and potion refill require sanctuary and sufficient bank',()=>{
 const{e,p}=fixture();p.inventory=[item('x')];assert.equal(e.action('p',{type:'salvage',itemId:'x'}),false);p.x=HOME.x;p.y=HOME.y;assert(e.action('p',{type:'salvage',itemId:'x'}));assert.equal(p.bank,10);p.potions=0;assert.equal(e.action('p',{type:'refill'}),false);p.bank=24;assert(e.action('p',{type:'refill'}));assert.equal(p.potions,3);assert.equal(p.bank,0);
});
test('XP is shared only with nearby living allies and capped at level 20',()=>{
 const{e,p}=fixture();const ally=e.addPlayer('ally','Ally');ally.x=p.x+100;ally.y=p.y;const far=e.addPlayer('far','Far');far.x=100;far.y=100;
 const enemy=e.spawnEnemy('hollow',p.x+90,p.y);e.damageEnemy(enemy,1000,p.id);assert(p.xp>0);assert.equal(p.xp,ally.xp);assert.equal(far.xp,0);e.giveXP(p,1e9);assert.equal(p.level,20);assert.equal(p.xp,0);
});
test('Eight kills awaken exactly one boss, with ally scaling',()=>{
 const{e,p}=fixture();const ally=e.addPlayer('q','Friend');ally.x=p.x;
 for(let i=0;i<8;i++)e.damageEnemy(e.spawnEnemy('hollow',p.x+100,p.y),10000,p.id);
 assert.equal(e.bossState,'awake');const bosses=e.enemies.filter(v=>v.kind==='boss');assert.equal(bosses.length,1);assert.equal(bosses[0].maxHP,3960);
 e.damageEnemy(e.spawnEnemy('hollow',p.x+100,p.y),10000,p.id);assert.equal(e.enemies.filter(v=>v.kind==='boss').length,1);
});
test('Boss changes phase and telegraphs before releasing projectiles',()=>{
 const{e,p}=fixture();p.x=1200;p.y=800;const boss=e.spawnEnemy('boss',1500,800);boss.hp=boss.maxHP*.2;boss.cooldown=0;e.step(.05);assert.equal(boss.phase,3);assert(boss.telegraph>0);assert.equal(e.bullets.length,0);tick(e,18);assert(e.bullets.filter(b=>b.team==='enemy').length>=20);
});
test('Boss defeat, relic loot and next-depth interaction work',()=>{
 const{e,p}=fixture();const boss=e.spawnEnemy('boss',ALTAR.x,ALTAR.y);e.damageEnemy(boss,99999,p.id);assert.equal(e.bossState,'defeated');assert(e.loot.some(l=>l.kind==='item'&&l.item.rarity>=2));assert.equal(e.action('p',{type:'descend'}),false);p.x=ALTAR.x;p.y=ALTAR.y;assert(e.action('p',{type:'descend'}));assert.equal(e.wave,2);assert.equal(e.bossState,'sealed');assert.equal(e.enemies.length,18);
});
test('Armor piercing bypasses defense instead of being only a visual flag',()=>{
 const{e,p}=fixture();const a=e.spawnEnemy('brute',1200,800),b=e.spawnEnemy('brute',1200,900);e.damageEnemy(a,20,p.id,false);e.damageEnemy(b,20,p.id,true);assert.equal(a.hp-b.hp,8);
});
test('Swept projectiles hit fast crossed targets and multi-hit does not double-damage',()=>{
 const{e,p}=fixture();p.x=1000;p.y=800;const a=e.spawnEnemy('brute',1030,800),b=e.spawnEnemy('brute',1060,800);a.cooldown=100;b.cooldown=100;
 e.projectile(p,0,'player',50,1000,1,true,true);tick(e,3);assert.equal(a.hp,170);assert.equal(b.hp,170);tick(e,3);assert.equal(a.hp,170);
});
test('Profile round-trip keeps health, position, gear and cooldowns',()=>{
 const{e,p}=fixture();p.hp=57;p.mp=23;p.bank=28;p.x=1012;p.abilityCd=7;p.inventory=[item('owned')];const saved=JSON.parse(JSON.stringify(e.profile(p.id)));const f=new Engine();const q=f.addPlayer('p','Tester','warden',saved);
 assert.equal(q.hp,57);assert.equal(q.mp,23);assert.equal(q.x,1012);assert.equal(q.bank,28);assert.equal(q.abilityCd,7);assert.deepEqual(q.inventory,p.inventory);
});
test('Item instance IDs stay distinct across restarted engines',()=>{const a=new Engine(),b=new Engine();assert.notEqual(a.id('item'),b.id('item'));});
test('Snapshots reveal own inventory only and do not mutate world through copies',()=>{
 const{e,p}=fixture();p.inventory=[item('private')];e.addPlayer('other');const a=e.snapshot('p'),b=e.snapshot('other');assert.equal(a.players[0].inventory.length,1);assert.equal(b.players[0].inventory,undefined);assert.equal(b.players[0].bank,undefined);a.players[0].inventory[0].name='bad';assert.notEqual(p.inventory[0].name,'bad');
});
test('Resource limits and stale loot clean up in long simulations',()=>{
 const{e,p}=fixture();for(let i=0;i<800;i++)e.projectile(p,0,'player',1,10,1);assert.equal(e.bullets.length,650);tick(e,30);assert.equal(e.bullets.length,0);
 e.loot=Array.from({length:200},(_,i)=>({id:String(i),kind:'coin',amount:1,x:1500,y:1000,life:1}));e.step(.05);assert.equal(e.loot.length,120);tick(e,25);assert.equal(e.loot.length,0);
});
