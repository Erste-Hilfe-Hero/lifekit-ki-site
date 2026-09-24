// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import { AdventureEngine, cleanAdventureProfile } from '../shared/adventure.mjs';
import { CLASSES } from '../shared/data.mjs';
import { DUNGEONS, makeItem } from '../shared/realm-data.mjs';
import { PETS } from '../shared/adventure-data.mjs';
import { SYSTEM_UNLOCKS, accountXPForLevel, accountLevelFromXP, ENCHANTMENTS, PET_RARITIES, SEASON, SEASON_MISSIONS, CRUCIBLE_MODES, FORGE_RECIPES, ASCENSION_STATS } from '../shared/endgame-data.mjs';

const fresh=(cls='weaver')=>{const e=new AdventureEngine({seed:8128}),p=e.addPlayer('p','Tester',cls);return{e,p};};
const enterDungeon=(e,p,theme)=>{p.bank=10000;if(theme==='void')p.account.totals['boss:sovereign']=1;assert(e.action(p.id,{type:'openDungeon',theme}));const portal=e.world(p).portals.find(q=>q.owner===p.id&&q.theme===theme);assert(portal);p.x=portal.x;p.y=portal.y;assert(e.action(p.id,{type:'portal',portalId:portal.id}));return e.world(p);};

test('content expansion exposes 19 original Nyrathen classes and 18 dungeons',()=>{
  assert.equal(Object.keys(CLASSES).length,19);assert(CLASSES.druid);assert.equal(Object.keys(DUNGEONS).length,18);
  for(const id of ['blood','lab','bastion','dusk'])assert(DUNGEONS[id]);
});

test('account levels gate pets, enchanter, forge and crucible at their configured thresholds',()=>{
  const{e,p}=fresh();p.bank=5000;
  assert.equal(accountLevelFromXP(p.account.accountXP),1);assert(!e.action(p.id,{type:'petAdopt',petId:'moth'}));
  p.account.accountXP=accountXPForLevel(SYSTEM_UNLOCKS.pets);assert(e.action(p.id,{type:'petAdopt',petId:'moth'}));
  p.inventory=[makeItem('wand',p.classId,'weapon',2,1)];p.account.dust.green=999;assert(!e.action(p.id,{type:'enchant',itemId:'wand',enchantment:'keen'}));
  p.account.accountXP=accountXPForLevel(SYSTEM_UNLOCKS.enchanter);assert(e.action(p.id,{type:'enchant',itemId:'wand',enchantment:'keen'}));
  p.account.blueprints=['refine'];p.account.forgeMaterials={metal:99,essence:99};assert(!e.action(p.id,{type:'forgeRecipe',recipe:'refine',itemId:'wand'}));
  p.account.accountXP=accountXPForLevel(SYSTEM_UNLOCKS.forge);assert(e.action(p.id,{type:'forgeRecipe',recipe:'refine',itemId:'wand'}));
  assert.equal(p.inventory[0].tier,3);
});

test('druid builds form energy and gains a temporary wild-form combat buff',()=>{
  const{e,p}=fresh('druid');assert(e.action(p.id,{type:'realm',target:'realm-1'}));p.x=2860;p.y=3450;p.invulnerable=0;e.world(p).enemies=[];
  const base=e.stats(p);for(let i=0;i<3;i++){p.abilityCd=0;p.mp=999;assert(e.action(p.id,{type:'ability'}));}
  assert(p.formTimer>0);assert.equal(p.formMeter,0);const transformed=e.stats(p);assert(transformed.damage>base.damage);assert(transformed.speed>base.speed);assert(transformed.defense>base.defense);
});

test('pet eggs, feeding and fusion create persistent rarity progression',()=>{
  const{e,p}=fresh();p.account.accountXP=accountXPForLevel(SYSTEM_UNLOCKS.pets);p.account.petEggs.woodland=2;
  assert(e.action(p.id,{type:'petHatch',eggId:'woodland',petId:'fox'}));assert.equal(p.account.petActive,'fox');assert.equal(p.account.petTier.fox,0);
  assert(e.action(p.id,{type:'petHatch',eggId:'woodland',petId:'fox'}));assert.equal(p.account.petDuplicates.fox,1);
  p.account.petFood.feast=1;assert(e.action(p.id,{type:'petFeed',petId:'fox',food:'feast'}));assert(p.account.petXP.fox>=250);
  assert(e.action(p.id,{type:'petFuse',petId:'fox'}));assert.equal(p.account.petTier.fox,1);assert.equal(PET_RARITIES[p.account.petTier.fox].id,'uncommon');
  const q=cleanAdventureProfile(e.profile(p.id));assert.equal(q.account.petTier.fox,1);assert.equal(q.account.petActive,'fox');
});

test('enchantments spend dust, persist on items and modify equipped combat stats',()=>{
  const{e,p}=fresh();p.account.accountXP=accountXPForLevel(SYSTEM_UNLOCKS.enchanter);p.account.dust.green=1000;const w=makeItem('ench',p.classId,'weapon',4,2);p.inventory=[w];
  const before=e.stats(p).damage,spent=Math.ceil(ENCHANTMENTS.keen.cost*(1+w.tier*.15));assert(e.action(p.id,{type:'enchant',itemId:w.id,enchantment:'keen'}));assert.equal(p.account.dust.green,1000-spent);assert.equal(w.enchantment,'keen');
  assert(e.action(p.id,{type:'equip',itemId:w.id}));assert(e.stats(p).damage>before);assert.equal(cleanAdventureProfile(e.profile(p.id)).equipment.weapon.enchantment,'keen');
});

test('dungeon modifier rolls are attached to portals and persist through world export/import',()=>{
  const{e,p}=fresh();p.account.accountXP=accountXPForLevel(50);const w=enterDungeon(e,p,'blood');assert(Array.isArray(w.modifiers));for(const id of w.modifiers)assert(e.snapshot(p.id).progression.dungeonModifiers[id]);
  const saved=e.exportWorlds(),profile=e.profile(p.id),id=p.worldId;const r=new AdventureEngine({seed:8128,savedWorld:JSON.parse(JSON.stringify(saved))});const q=r.addPlayer(p.id,p.name,p.classId,JSON.parse(JSON.stringify(profile)));assert.equal(q.worldId,id);assert.deepEqual(r.world(q).modifiers,w.modifiers);
});

test('level 20 dungeon victories award capped class ascension to the dungeon stat',()=>{
  const{e,p}=fresh('druid');p.account.accountXP=accountXPForLevel(50);p.level=20;const w=enterDungeon(e,p,'lab');const boss=w.enemies.find(x=>x.dungeonBoss);assert(boss);const stat=DUNGEONS.lab.stat,before=p.account.ascension.druid[stat];w.damageEnemy(boss,1e9,p.id);assert.equal(p.account.ascension.druid[stat],before+1);
  p.account.ascension.druid[stat]=5;assert(e.action(p.id,{type:'nexus'}));e.world(p).portals=e.world(p).portals.filter(q=>q.owner!==p.id);const w2=enterDungeon(e,p,'blood');const b2=w2.enemies.find(x=>x.dungeonBoss);w2.damageEnemy(b2,1e9,p.id);for(const v of Object.values(p.account.ascension.druid))assert(v<=5);
});

test('seasonal characters use mission pass, seasonal storage and one-time crucible modes',()=>{
  const{e,p}=fresh();p.account.accountXP=accountXPForLevel(SYSTEM_UNLOCKS.crucible);assert(e.action(p.id,{type:'characterCreate',name:'Season','classId':'druid',seasonal:true}));assert(p.seasonal);assert.equal(p.seasonId,SEASON.id);
  assert(e.action(p.id,{type:'crucibleActivate',mode:'glass'}));assert.equal(p.crucibleMode,'glass');assert(!e.action(p.id,{type:'crucibleActivate',mode:'petless'}));
  const m=SEASON_MISSIONS[0];p.account.totals[m.key]=m.goal;assert(e.action(p.id,{type:'claimSeasonMission',missionId:m.id}));assert(p.account.season.xp>=m.xp);assert(e.action(p.id,{type:'claimSeasonPass',level:1}));
  p.inventory=[makeItem('season-item',p.classId,'charm',2,1)];assert(e.action(p.id,{type:'seasonDeposit',itemId:'season-item'}));assert.equal(p.account.seasonalStash.length,1);assert(e.action(p.id,{type:'seasonWithdraw',itemId:'season-item'}));assert.equal(p.inventory[0].id,'season-item');
  const q=cleanAdventureProfile(e.profile(p.id));assert(q.seasonal);assert.equal(q.crucibleMode,'glass');assert(q.account.season.claims.includes(m.id));
});

test('forge recipes are atomic and preserve special item properties',()=>{
  const{e,p}=fresh();p.account.accountXP=accountXPForLevel(SYSTEM_UNLOCKS.forge);p.account.blueprints=Object.keys(FORGE_RECIPES);p.account.forgeMaterials={metal:20,essence:20};const it=makeItem('relic',p.classId,'weapon',5,3);it.enchantment='guarded';it.unique=true;p.inventory=[it];
  assert(e.action(p.id,{type:'forgeRecipe',recipe:'refine',itemId:it.id}));assert.equal(it.tier,6);assert.equal(it.enchantment,'guarded');assert(it.unique);
  assert(e.action(p.id,{type:'forgeRecipe',recipe:'reroll',itemId:it.id}));assert(Object.hasOwn(ENCHANTMENTS,it.enchantment));assert(e.action(p.id,{type:'forgeRecipe',recipe:'polish',itemId:it.id}));assert(it.shiny);
  it.tier=7;const materials={...p.account.forgeMaterials};assert(!e.action(p.id,{type:'forgeRecipe',recipe:'refine',itemId:it.id}));assert.deepEqual(p.account.forgeMaterials,materials);
});

test('potion vault, gift chest and cosmetics persist as account-wide safe progression',()=>{
  const{e,p}=fresh();p.inventory=[{id:'pot',name:'ATK-Trank',slot:'potion',statKey:'atk',stat:1,rarity:1,tier:0,classId:'all'}];assert(e.action(p.id,{type:'potionStore',itemId:'pot'}));assert.equal(p.account.potionVault.atk,1);assert(e.action(p.id,{type:'potionTake',statKey:'atk'}));assert.equal(p.account.potionVault.atk,0);
  const gift=makeItem('gift-safe',p.classId,'charm',3,2);p.account.giftChest=[gift];assert(e.action(p.id,{type:'giftClaim',itemId:gift.id}));assert(p.inventory.some(i=>i.id===gift.id));
  p.account.cosmetics.titles.push('Tiefenläufer');assert(e.action(p.id,{type:'cosmetic',kind:'title',value:'Tiefenläufer'}));const q=cleanAdventureProfile(e.profile(p.id));assert.equal(q.account.cosmetics.activeTitle,'Tiefenläufer');assert.equal(q.title,'Tiefenläufer');
});

test('Crucible austere mode reduces potion healing while glass changes combat profile',()=>{
  const{e,p}=fresh();p.account.accountXP=accountXPForLevel(SYSTEM_UNLOCKS.crucible);assert(e.action(p.id,{type:'characterCreate',name:'Trial',classId:'warden',seasonal:true}));assert(e.action(p.id,{type:'crucibleActivate',mode:'austere'}));assert.equal(CRUCIBLE_MODES.austere.healing,.6);p.hp=50;p.potions=1;const before=p.hp;assert(e.action(p.id,{type:'heal'}));assert(Math.abs((p.hp-before)-72)<.001);
});

test('all class ascension maps are complete and sanitized to supported stats',()=>{
  const p=cleanAdventureProfile({account:{ascension:{druid:{atk:99,hack:99}}}});assert.deepEqual(Object.keys(p.account.ascension.druid),ASCENSION_STATS);assert.equal(p.account.ascension.druid.atk,5);assert.equal(p.account.ascension.druid.hack,undefined);for(const id of Object.keys(CLASSES))assert.deepEqual(Object.keys(p.account.ascension[id]),ASCENSION_STATS);
});

test('all eight pet archetypes are exposed to the progression model',()=>{assert.equal(Object.keys(PETS).length,8);for(const id of ['moth','fox','drake','owl','beetle','sprite','raven','hare'])assert(PETS[id]);});
