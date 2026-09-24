// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Integrated account progression, character roster, trade, guilds and distinct skills.
import { RealmEngine, cleanRealmProfile, realmItem } from './realm.mjs';
import { CLASSES, ENEMY_TYPES, clamp, dist, walkable } from './data.mjs';
import { cleanName, segmentDistance } from './engine.mjs';
import { isBoss, DUNGEONS, makeItem, EQUIP_SLOTS } from './realm-data.mjs';
import { CHARACTER_SLOTS_BASE, CHARACTER_SLOTS_MAX, CHARACTER_SLOT_COST, PETS, CONTRACTS, DUNGEON_KEYS, masteryStars } from './adventure-data.mjs';
import { ACCOUNT_LEVEL_CAP, SYSTEM_UNLOCKS, accountLevelFromXP, systemUnlocked, PET_RARITIES, PET_EGGS, PET_FOOD, ENCHANTMENTS, DUNGEON_MODIFIERS, rollDungeonModifiers, ASCENSION_STATS, ASCENSION_CAP, ascensionTotal, SEASON, SEASON_MISSIONS, seasonPassLevel, CRUCIBLE_MODES, FORGE_RECIPES, BLUEPRINTS, COSMETICS, JOURNEY_STEPS, liveEventFor, enchantRank, MATERIAL_TYPES, dismantleYield, ENGRAVINGS, TINKERER_RECIPES, MISSION_TREE, SEASON_REWARD_TRACK, LIVE_SERVICE_CONFIG, DRUID_FORMS, druidFormFor, dailyKey, weeklyKey, seasonCadenceKey } from './endgame-data.mjs';
import { GuildService } from './social.mjs';
import { cleanCommerce, PREMIUM_SKINS, PREMIUM_WEAPON_STYLES, PREMIUM_PET_STYLES, PREMIUM_TITLES, PREMIUM_EMOTES, SHOP_SEASON_ID } from './monetization-data.mjs';
const advCopy=v=>structuredClone(v);
const advInt=(v,max=1e8)=>Number.isFinite(v)?clamp(Math.floor(v),0,max):0;
const advCharacter=raw=>{const p=cleanRealmProfile(raw);for(const k of ['bank','vault','fame','deaths'])delete p[k];return p;};
const advToken=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export function cleanAdventureProfile(raw={}) {
  const profile=cleanRealmProfile(raw);const input=raw&&typeof raw==='object'&&raw.account&&typeof raw.account==='object'?raw.account:{};
  const activeId=typeof input.activeId==='string'&&/^[\w-]{1,64}$/.test(input.activeId)?input.activeId:'character-1';
  const characterSlots=Number.isFinite(input.characterSlots)?clamp(Math.floor(input.characterSlots),CHARACTER_SLOTS_BASE,CHARACTER_SLOTS_MAX):CHARACTER_SLOTS_BASE;
  const slots=[],slotIds=new Set(),items=new Set([...Object.values(profile.equipment),...profile.inventory,...profile.vault].map(i=>i.id));
  for(const slot of (Array.isArray(input.characters)?input.characters:[]).slice(0,characterSlots)) {
    if(!slot||typeof slot.id!=='string'||!/^[-\w]{1,64}$/.test(slot.id)||slotIds.has(slot.id))continue;
    slotIds.add(slot.id);const character=slot.id===activeId?advCharacter(profile):advCharacter(slot.profile);
    if(slot.id!==activeId) {
      for(const key of Object.keys(character.equipment)) {const item=character.equipment[key];if(items.has(item.id))delete character.equipment[key];else items.add(item.id);}
      character.inventory=character.inventory.filter(item=>{if(items.has(item.id))return false;items.add(item.id);return true;});
    }
    slots.push({id:slot.id,profile:character});
  }
  if(!slots.some(s=>s.id===activeId)){if(slots.length===characterSlots)slots.pop();slots.unshift({id:activeId,profile:advCharacter(profile)});}
  const totals={};for(const key of ['kills','dungeons','bestLevel',...Object.keys(ENEMY_TYPES).map(k=>'enemy:'+k),...Object.keys(ENEMY_TYPES).map(k=>'boss:'+k)])totals[key]=advInt(input.totals?.[key]);
  totals.bestLevel=Math.max(totals.bestLevel,profile.level);
  const claims=(Array.isArray(input.claims)?input.claims:[]).filter(id=>CONTRACTS.some(c=>c.id===id));
  const petOwned=[...new Set((Array.isArray(input.petOwned)?input.petOwned:[]).filter(id=>Object.hasOwn(PETS,id)))];
  const petActive=petOwned.includes(input.petActive)?input.petActive:null;
  const petXP={};const petTier={};const petDuplicates={};for(const key of petOwned){petXP[key]=advInt(input.petXP?.[key],500000);petTier[key]=Math.min(PET_RARITIES.length-1,advInt(input.petTier?.[key],PET_RARITIES.length-1));petDuplicates[key]=advInt(input.petDuplicates?.[key],20);}
  const petEggs={};for(const key of Object.keys(PET_EGGS))petEggs[key]=advInt(input.petEggs?.[key],99);
  const petFood={};for(const key of Object.keys(PET_FOOD))petFood[key]=advInt(input.petFood?.[key],999);
  const history=(Array.isArray(input.history)?input.history:[]).slice(-40).map(h=>({name:cleanName(h.name),classId:Object.hasOwn(CLASSES,h.classId)?h.classId:'weaver',level:clamp(advInt(h.level,20),1,20),fame:advInt(h.fame),killer:cleanName(h.killer),at:advInt(h.at,1e15),seasonal:h.seasonal===true}));
  const mastery={};for(const classId of Object.keys(CLASSES))mastery[classId]=advInt(input.mastery?.[classId],100000000);
  const accountXP=advInt(input.accountXP,1e9);
  const dust={green:advInt(input.dust?.green,1e8),violet:advInt(input.dust?.violet,1e8),gold:advInt(input.dust?.gold,1e8)};
  const forgeMaterials={metal:advInt(input.forgeMaterials?.metal,99999),essence:advInt(input.forgeMaterials?.essence,99999)};
  const materialStorage={};for(const key of Object.keys(MATERIAL_TYPES))materialStorage[key]=advInt(input.materialStorage?.[key],99999);
  const tinkererClaims=[...new Set((Array.isArray(input.tinkererClaims)?input.tinkererClaims:[]).filter(id=>Object.hasOwn(TINKERER_RECIPES,id)))];
  const tinkererDay=advInt(input.tinkererDay,1000000000);
  const missionTreeClaims=[...new Set((Array.isArray(input.missionTreeClaims)?input.missionTreeClaims:[]).filter(id=>MISSION_TREE.some(m=>m.id===id)))];
  const blueprints=[...new Set((Array.isArray(input.blueprints)?input.blueprints:[]).filter(id=>BLUEPRINTS.includes(id)))];
  const ascension={};for(const classId of Object.keys(CLASSES)){ascension[classId]={};for(const stat of ASCENSION_STATS)ascension[classId][stat]=Math.min(ASCENSION_CAP,advInt(input.ascension?.[classId]?.[stat],ASCENSION_CAP));}
  const seasonIn=input.season&&typeof input.season==='object'?input.season:{},seasonClaims=seasonIn.id===SEASON.id&&Array.isArray(seasonIn.claims)?seasonIn.claims:[],passClaims=seasonIn.id===SEASON.id&&Array.isArray(seasonIn.passClaims)?seasonIn.passClaims:[],premiumClaims=seasonIn.id===SEASON.id&&Array.isArray(seasonIn.premiumClaims)?seasonIn.premiumClaims:[];const season={id:SEASON.id,xp:advInt(seasonIn.id===SEASON.id?seasonIn.xp:0,1e8),claims:[...new Set(seasonClaims.filter(id=>SEASON_MISSIONS.some(m=>m.id===id)))],passClaims:[...new Set(passClaims.map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=SEASON.maxPass))],premiumClaims:[...new Set(premiumClaims.map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=SEASON.maxPass))]};
  const cleanAccountItems=(list,limit)=>{const out=[];for(const value of (Array.isArray(list)?list:[])){if(out.length>=limit||!realmItem(value)||items.has(value.id))continue;items.add(value.id);out.push(advCopy(value));}return out;};
  const seasonalStash=cleanAccountItems(input.seasonalStash,24),giftChest=cleanAccountItems(input.giftChest,24);
  const potionVault={};for(const stat of ASCENSION_STATS)potionVault[stat]=advInt(input.potionVault?.[stat],99);
  const cIn=input.cosmetics&&typeof input.cosmetics==='object'?input.cosmetics:{};
  const allowedTitles=[...COSMETICS.titles,...PREMIUM_TITLES],allowedSkins=[...COSMETICS.skins,...PREMIUM_SKINS],allowedEmotes=[...COSMETICS.emotes,...PREMIUM_EMOTES],allowedWeaponStyles=[...PREMIUM_WEAPON_STYLES],allowedPetStyles=[...PREMIUM_PET_STYLES];
  const cosmetics={titles:[...new Set(['Reisender',...(Array.isArray(cIn.titles)?cIn.titles:[]).filter(v=>allowedTitles.includes(v))])],emotes:[...new Set((Array.isArray(cIn.emotes)?cIn.emotes:[]).filter(v=>allowedEmotes.includes(v)))],skins:[...new Set(['default',...(Array.isArray(cIn.skins)?cIn.skins:[]).filter(v=>allowedSkins.includes(v))])],weaponStyles:[...new Set(['default',...(Array.isArray(cIn.weaponStyles)?cIn.weaponStyles:[]).filter(v=>allowedWeaponStyles.includes(v))])],petStyles:[...new Set(['default',...(Array.isArray(cIn.petStyles)?cIn.petStyles:[]).filter(v=>allowedPetStyles.includes(v))])],activeTitle:allowedTitles.includes(cIn.activeTitle)?cIn.activeTitle:'Reisender',activeSkin:allowedSkins.includes(cIn.activeSkin)?cIn.activeSkin:'default',activeWeaponStyle:allowedWeaponStyles.includes(cIn.activeWeaponStyle)?cIn.activeWeaponStyle:'default',activePetStyle:allowedPetStyles.includes(cIn.activePetStyle)?cIn.activePetStyle:'default'};
  const commerce=cleanCommerce(input.commerce);
  const revoked=[['skins','activeSkin','revokedSkins','default'],['weaponStyles','activeWeaponStyle','revokedWeaponStyles','default'],['petStyles','activePetStyle','revokedPetStyles','default'],['titles','activeTitle','revokedTitles','Reisender'],['emotes',null,'revokedEmotes',null]];
  for(const [list,active,revokedKey,base] of revoked){const deny=new Set(commerce[revokedKey]||[]);cosmetics[list]=cosmetics[list].filter(v=>!deny.has(v));if(base&&!cosmetics[list].includes(base))cosmetics[list].unshift(base);if(active&&!cosmetics[list].includes(cosmetics[active]))cosmetics[active]=base;}
  const journeyClaims=[...new Set((Array.isArray(input.journeyClaims)?input.journeyClaims:[]).filter(id=>JOURNEY_STEPS.some(j=>j.id===id)))];
  const bestTimes={};for(const theme of Object.keys(DUNGEONS)){const value=Number(input.bestTimes?.[theme]);if(Number.isFinite(value)&&value>0)bestTimes[theme]=Math.min(86400,Math.round(value*100)/100);}
  const eventStats={completions:advInt(input.eventStats?.completions,1e7),echoCompletions:advInt(input.eventStats?.echoCompletions,1e7),score:advInt(input.eventStats?.score,1e9)};
  const cleanCadenceTotals=value=>({kills:advInt(value?.kills,1e8),dungeons:advInt(value?.dungeons,1e7),bosses:advInt(value?.bosses,1e7)});
  const cadenceIn=input.cadence&&typeof input.cadence==='object'?input.cadence:{};
  const cadence={dayKey:advInt(cadenceIn.dayKey,1e9),weekKey:advInt(cadenceIn.weekKey,1e9),seasonKey:typeof cadenceIn.seasonKey==='string'?cadenceIn.seasonKey.slice(0,80):'',daily:cleanCadenceTotals(cadenceIn.daily),weekly:cleanCadenceTotals(cadenceIn.weekly),dailyResets:advInt(cadenceIn.dailyResets,1e7),weeklyResets:advInt(cadenceIn.weeklyResets,1e7),seasonResets:advInt(cadenceIn.seasonResets,1e7)};
  profile.account={activeId,characterSlots,characters:slots,totals,claims:[...new Set(claims)],petOwned,petActive,petXP,petTier,petDuplicates,petEggs,petFood,history,mastery,accountXP,dust,forgeMaterials,materialStorage,tinkererClaims,tinkererDay,missionTreeClaims,blueprints,ascension,season,seasonalStash,giftChest,potionVault,cosmetics,commerce,journeyClaims,bestTimes,eventStats,cadence};profile.version=6;profile.title=cosmetics.activeTitle;profile.skin=cosmetics.activeSkin;return profile;
}
export class AdventureEngine extends RealmEngine {
  constructor(options={}) {
    super(options);this.effects=[];this.trades=new Map();this.tradeSequence=0;this.now=typeof options.now==='function'?options.now:Date.now;
    this.guildService=options.social||new GuildService(options.savedWorld?.social);this.sharedSocial=!!options.social;
  }
  syncCadence(p,season=SEASON) {
    const a=p?.account;if(!a)return null;const now=Number(this.now()),day=dailyKey(now),week=weeklyKey(now),seasonKey=seasonCadenceKey(now,season);a.cadence=a.cadence||{dayKey:day,weekKey:week,seasonKey,daily:{kills:0,dungeons:0,bosses:0},weekly:{kills:0,dungeons:0,bosses:0},dailyResets:0,weeklyResets:0,seasonResets:0};
    if(a.cadence.dayKey!==day){const initialized=!!a.cadence.dayKey;a.cadence.dayKey=day;a.cadence.daily={kills:0,dungeons:0,bosses:0};if(initialized)a.cadence.dailyResets=(a.cadence.dailyResets||0)+1;a.tinkererDay=day;a.tinkererClaims=[];}
    if(a.cadence.weekKey!==week){const initialized=!!a.cadence.weekKey;a.cadence.weekKey=week;a.cadence.weekly={kills:0,dungeons:0,bosses:0};if(initialized)a.cadence.weeklyResets=(a.cadence.weeklyResets||0)+1;a.eventStats={completions:0,echoCompletions:0,score:0};}
    if(a.cadence.seasonKey!==seasonKey){const previous=a.cadence.seasonKey;a.cadence.seasonKey=seasonKey;if(previous){a.cadence.seasonResets=(a.cadence.seasonResets||0)+1;a.season={id:season.id,xp:0,claims:[],passClaims:[],premiumClaims:[]};a.missionTreeClaims=[];while(a.seasonalStash.length&&a.giftChest.length<24)a.giftChest.push(a.seasonalStash.shift());}}
    return a.cadence;
  }
  seasonActive(season=SEASON){return seasonCadenceKey(Number(this.now()),season)===season.id;}
  addPlayer(id,name='Wanderer',classId='weaver',raw={}) {
    if(this.players.has(id))return this.players.get(id);
    const saved=cleanAdventureProfile({...raw,name,classId}),p=super.addPlayer(id,name,classId,saved);
    p.account=saved.account;p.petCd=0;p.empowered=0;p.haste=0;p.inspired=0;this.syncCadence(p);
    this.saveCharacter(p);return p;
  }
  saveCharacter(p) {const slot=p.account?.characters.find(c=>c.id===p.account.activeId);if(slot)slot.profile=advCharacter(p);}
  profile(id) {const p=this.players.get(id);if(!p)return null;this.syncCadence(p);this.saveCharacter(p);return cleanAdventureProfile({...super.profile(id),account:p.account});}
  exportWorlds(){const out=super.exportWorlds();if(this.guildService&&!this.sharedSocial)out.social=this.guildService.export();return out;}
  removePlayer(id){this.cancelTrade(id);this.effects=this.effects.filter(e=>e.owner!==id);super.removePlayer(id);}
  transfer(p,target){const result=super.transfer(p,target);if(result){this.cancelTrade(p.id);this.effects=this.effects.filter(e=>e.owner!==p.id);}return result;}
  onCharacterDeath(p) {
    this.cancelTrade(p.id);if(!p.account)return;
    p.account.history.push({name:p.name,classId:p.classId,seasonal:p.seasonal===true,...p.deathRecord});p.account.history=p.account.history.slice(-40);
    p.account.mastery[p.classId]=Math.max(p.account.mastery[p.classId]||0,p.deathRecord?.fame||0);
  }
  onEnemyKilled(w,e,p) {
    for(const q of w.players.values()) {
      if(q.dead||!q.account||!e.contributors[q.id])continue;
      this.syncCadence(q);const a=q.account,totals=a.totals,cadence=a.cadence;totals.kills++;cadence.daily.kills++;cadence.weekly.kills++;totals['enemy:'+e.kind]=(totals['enemy:'+e.kind]||0)+1;
      if(isBoss(e.kind)){totals['boss:'+e.kind]=(totals['boss:'+e.kind]||0)+1;cadence.daily.bosses++;cadence.weekly.bosses++;}
      if(e.dungeonBoss){totals.dungeons++;cadence.daily.dungeons++;cadence.weekly.dungeons++;const duration=Math.max(.1,w.time-w.startedAt);const prev=a.bestTimes[w.theme];if(!prev||duration<prev)a.bestTimes[w.theme]=Math.round(duration*100)/100;const event=liveEventFor();if(event.theme===w.theme){a.eventStats.completions++;if(w.echo)a.eventStats.echoCompletions++;a.eventStats.score=Math.min(1e9,a.eventStats.score+Math.max(1,Math.round((w.echo?240:100)/Math.max(1,duration/60))));}}
      // Progression lock: keep normal rewards hard, but make dungeon bosses meaningfully rewarding without creating a shortcut.
      const accountXPReward=e.dungeonBoss?105:(isBoss(e.kind)?55:4);
      a.accountXP=Math.min(1e9,(a.accountXP||0)+accountXPReward);
      if(q.seasonal&&q.seasonId===SEASON.id)a.season.xp=Math.min(1e8,a.season.xp+(isBoss(e.kind)?35:2));
      const pet=a.petActive;if(pet&&q.crucibleMode!=='petless')a.petXP[pet]=Math.min(500000,(a.petXP[pet]||0)+(isBoss(e.kind)?50:3));
      if(e.dungeonBoss&&q.level>=20){const stat=DUNGEONS[w.theme]?.stat;if(stat&&Object.hasOwn(a.ascension[q.classId],stat))a.ascension[q.classId][stat]=Math.min(ASCENSION_CAP,(a.ascension[q.classId][stat]||0)+1);}
      if(isBoss(e.kind)){
        a.dust.green=Math.min(1e8,a.dust.green+8+Math.floor(w.random()*9));if(e.dungeonBoss)a.forgeMaterials.essence=Math.min(99999,a.forgeMaterials.essence+1);
        if(w.random()<.16){const egg=Object.keys(PET_EGGS)[Math.floor(w.random()*Object.keys(PET_EGGS).length)];a.petEggs[egg]=Math.min(99,(a.petEggs[egg]||0)+1);}
        if(w.random()<.1)a.petFood.fruit=Math.min(999,(a.petFood.fruit||0)+1);
        if(e.dungeonBoss&&w.random()<.12){const bp=BLUEPRINTS[Math.floor(w.random()*BLUEPRINTS.length)];if(!a.blueprints.includes(bp))a.blueprints.push(bp);}
      }
    }
    if(e.dungeonBoss&&w.theme==='citadel')w.portals.push({id:w.id('void-gate'),x:e.x+90,y:e.y,name:DUNGEONS.void.name,kind:'dungeon',theme:'void',target:null,life:180,modifiers:rollDungeonModifiers(w.seed+77,'void')});
  }
  switchCharacter(p,id) {
    if(!p.dead&&this.world(p).kind!=='nexus')return this.notice(p,'Figurenwechsel ist nur im Nexus oder nach dem Tod möglich.');
    if(this.tradeFor(p.id))return this.notice(p,'Beende zunächst den Handel.');
    if(id===p.account.activeId)return false;
    const target=p.account.characters.find(c=>c.id===id);if(!target)return false;
    this.saveCharacter(p);const account=p.account,shared={bank:p.bank,vault:p.vault,fame:p.fame,deaths:p.deaths},party=p.partyId;
    this.world(p).removePlayer(p.id);Object.assign(p,cleanRealmProfile({...target.profile,...shared}));
    p.account=account;p.account.activeId=id;p.partyId=party;p.worldId='nexus';const home=this.worlds.get('nexus');home.players.set(p.id,p);p.x=home.map.spawn.x;p.y=home.map.spawn.y;
    p.input={dx:0,dy:0,angle:0,fire:false,auto:false};p.lastInput=home.time;p.connected=true;p.shield=0;p.invisible=0;p.berserk=0;p.empowered=0;p.haste=0;p.inspired=0;p.invulnerable=2;
    if(!p.started)this.starter(p);p.hp=p.dead?0:p.hp===null?this.stats(p).maxHP:Math.min(p.hp,this.stats(p).maxHP);p.mp=p.mp===null?this.stats(p).maxMP:Math.min(p.mp,this.stats(p).maxMP);
    this.saveCharacter(p);return true;
  }
  friendChat(p,a) {
    if(typeof a.playerId!=='string'||a.playerId===p.id||!this.guildService.friends.get(p.id)?.has(a.playerId))return false;
    const target=this.players.get(a.playerId);if(!target||!target.connected)return this.notice(p,'Dieser Freund ist in deiner Region nicht online.');
    if(this.time-(p.lastChat??-10)<.8)return false;
    const text=(typeof a.text==='string'?a.text:'').normalize('NFKC').replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,180);if(!text)return false;
    p.lastChat=this.time;this.messages.push({id:++this.idSeq,playerId:p.id,name:p.name,text,time:Date.now(),worldId:null,partyId:null,directTo:target.id,system:false});this.messages=this.messages.slice(-100);return true;
  }
  action(id,a) {
    const p=this.players.get(id);if(!p||!a||typeof a!=='object'||typeof a.type!=='string')return false;this.syncCadence(p);
    if(a.type.startsWith('trade'))return this.tradeAction(p,a);
    if(a.type.startsWith('friend'))return this.guildService.friendAction(p,a,this);
    if(a.type.startsWith('guild'))return this.guildService.action(p,a,this);
    if(a.type==='chat'&&a.channel==='friend')return this.friendChat(p,a);
    if(a.type==='chat'&&a.channel==='guild')return this.guildService.chat(p,a,this);
    // Negotiated inventories cannot be mutated or switched while an offer is pending.
    if(this.tradeFor(id)&&['equip','consume','deposit','withdraw','dropItem','salvage','forge','forgeRecipe','enchant','characterSlotPurchase','characterCreate','characterSwitch','characterDelete','rebirth','openDungeon','giftClaim','potionStore','potionTake','petFeed','petFuse'].includes(a.type))return this.notice(p,'Beende den Handel, bevor du Figur oder Gegenstände änderst.');
    if(a.type==='characterSwitch')return this.switchCharacter(p,a.characterId);
    if(a.type==='characterSlotPurchase') {
      if(p.dead||this.world(p).kind!=='nexus'||p.account.characterSlots>=CHARACTER_SLOTS_MAX)return false;
      const cost=CHARACTER_SLOT_COST(p.account.characterSlots);if(p.bank<cost)return this.notice(p,'Nicht genügend Riftmarken für einen weiteren Charakterplatz.');
      p.bank-=cost;p.account.characterSlots++;return true;
    }
    if(a.type==='characterCreate') {
      if((!p.dead&&this.world(p).kind!=='nexus')||!Object.hasOwn(CLASSES,a.classId))return false;
      if(p.account.characters.length>=p.account.characterSlots)return this.notice(p,'Alle freigeschalteten Charakterplätze sind belegt.');
      const id='c-'+advToken(),seasonal=a.seasonal===true;if(seasonal&&!this.seasonActive())return this.notice(p,'Die aktuelle Saison ist nicht aktiv.');p.account.characters.push({id,profile:advCharacter({name:cleanName(a.name||p.name),classId:a.classId,worldId:'nexus',x:880,y:820,seasonal,seasonId:seasonal?SEASON.id:null})});return this.switchCharacter(p,id);
    }
    if(a.type==='characterDelete') {
      if(a.confirm!=='DELETE'||a.characterId===p.account.activeId||(!p.dead&&this.world(p).kind!=='nexus'))return false;
      const length=p.account.characters.length;p.account.characters=p.account.characters.filter(c=>c.id!==a.characterId);return length!==p.account.characters.length;
    }
    if(a.type==='claimContract') {
      const q=CONTRACTS.find(c=>c.id===a.contractId);if(!q||p.account.claims.includes(q.id)||p.dead||this.world(p).kind!=='nexus')return false;
      if((p.account.totals[q.key]||0)<q.goal)return this.notice(p,'Dieser Auftrag ist noch nicht erfüllt.');
      p.account.claims.push(q.id);p.bank+=q.coins;p.fame+=q.fame;this.notice(p,'Auftrag abgeschlossen: '+q.name);return true;
    }
    if(a.type==='claimJourney') {
      const step=JOURNEY_STEPS.find(j=>j.id===a.stepId);if(!step||p.account.journeyClaims.includes(step.id)||p.dead||this.world(p).kind!=='nexus')return false;
      const value=step.key==='ascensionTotal'?ascensionTotal(p.account.ascension):(p.account.totals[step.key]||0);if(value<step.goal)return this.notice(p,'Diese Reiseetappe ist noch nicht erfüllt.');
      p.account.journeyClaims.push(step.id);p.bank+=step.reward?.coins||0;p.fame+=step.reward?.fame||0;this.notice(p,'Reiseetappe abgeschlossen: '+step.name);return true;
    }
    if(a.type==='petAdopt') {
      if(!systemUnlocked(p.account,'pets'))return this.notice(p,'Gefährten werden ab Kontostufe '+SYSTEM_UNLOCKS.pets+' freigeschaltet.');
      const pet=PETS[a.petId];if(!pet||p.dead||this.world(p).kind!=='nexus'||p.account.petOwned.includes(a.petId))return false;
      if(p.bank<pet.cost)return this.notice(p,'Nicht genügend Riftmarken.');
      p.bank-=pet.cost;p.account.petOwned.push(a.petId);p.account.petXP[a.petId]=0;p.account.petTier[a.petId]=0;p.account.petDuplicates[a.petId]=0;p.account.petActive=a.petId;return true;
    }
    if(a.type==='petSelect') {if(this.world(p).kind!=='nexus'||p.dead)return false;if(a.petId!==null&&!p.account.petOwned.includes(a.petId))return false;p.account.petActive=a.petId;return true;}
    if(a.type==='petHatch') {
      if(!systemUnlocked(p.account,'pets')||p.dead||this.world(p).kind!=='nexus'||!Object.hasOwn(PET_EGGS,a.eggId)||!Object.hasOwn(PETS,a.petId)||(p.account.petEggs[a.eggId]||0)<1)return false;
      p.account.petEggs[a.eggId]--;if(p.account.petOwned.includes(a.petId)){p.account.petDuplicates[a.petId]=(p.account.petDuplicates[a.petId]||0)+1;p.account.petXP[a.petId]=Math.min(500000,(p.account.petXP[a.petId]||0)+120);}else{p.account.petOwned.push(a.petId);p.account.petXP[a.petId]=0;p.account.petTier[a.petId]=0;p.account.petDuplicates[a.petId]=0;p.account.petActive=a.petId;}return true;
    }
    if(a.type==='petFeed') {
      if(p.dead||this.world(p).kind!=='nexus'||!p.account.petOwned.includes(a.petId)||!Object.hasOwn(PET_FOOD,a.food)||(p.account.petFood[a.food]||0)<1)return false;
      p.account.petFood[a.food]--;p.account.petXP[a.petId]=Math.min(500000,(p.account.petXP[a.petId]||0)+PET_FOOD[a.food]);return true;
    }
    if(a.type==='petFuse') {
      if(p.dead||this.world(p).kind!=='nexus'||!p.account.petOwned.includes(a.petId))return false;const tier=p.account.petTier[a.petId]||0;if(tier>=PET_RARITIES.length-1||(p.account.petDuplicates[a.petId]||0)<1)return false;
      const need=250*(tier+1)*(tier+1);if((p.account.petXP[a.petId]||0)<need)return this.notice(p,'Dieser Gefährte braucht mehr Erfahrung.');p.account.petDuplicates[a.petId]--;p.account.petTier[a.petId]=tier+1;return true;
    }
    if(a.type==='dismantle') {
      if(!systemUnlocked(p.account,'forge')||p.dead||this.world(p).kind!=='nexus')return false;const i=p.inventory.findIndex(v=>v.id===a.itemId),item=p.inventory[i];if(!item||!EQUIP_SLOTS.includes(item.slot))return false;const gain=dismantleYield(item);for(const[k,n]of Object.entries(gain))p.account.materialStorage[k]=Math.min(99999,(p.account.materialStorage[k]||0)+n);p.inventory.splice(i,1);return true;
    }
    if(a.type==='tinkererTurnIn') {
      if(p.dead||this.world(p).kind!=='nexus'||!Object.hasOwn(TINKERER_RECIPES,a.recipe))return false;const r=TINKERER_RECIPES[a.recipe],today=p.account.cadence.dayKey;p.account.tinkererDay=today;if(r.daily&&p.account.tinkererClaims.includes(a.recipe))return false;if(Object.entries(r.cost).some(([k,n])=>(p.account.materialStorage[k]||0)<n))return false;for(const[k,n]of Object.entries(r.cost))p.account.materialStorage[k]-=n;if(r.reward.metal)p.account.forgeMaterials.metal+=r.reward.metal;if(r.reward.essence)p.account.forgeMaterials.essence+=r.reward.essence;if(r.reward.greenDust)p.account.dust.green+=r.reward.greenDust;if(r.reward.violetDust)p.account.dust.violet+=r.reward.violetDust;if(r.daily)p.account.tinkererClaims.push(a.recipe);return true;
    }
    if(a.type==='claimMissionTree') {
      const m=MISSION_TREE.find(x=>x.id===a.missionId);if(!m||p.account.missionTreeClaims.includes(m.id)||m.parents.some(id=>!p.account.missionTreeClaims.includes(id))||(p.account.totals[m.key]||0)<m.goal)return false;p.account.missionTreeClaims.push(m.id);p.account.season.xp+=m.xp;if(m.reward.greenDust)p.account.dust.green+=m.reward.greenDust;for(const k of Object.keys(MATERIAL_TYPES))if(m.reward[k])p.account.materialStorage[k]+=m.reward[k];return true;
    }
    if(a.type==='engrave') {
      if(!systemUnlocked(p.account,'enchanter')||p.dead||this.world(p).kind!=='nexus'||!Object.hasOwn(ENGRAVINGS,a.engraving))return false;const item=p.inventory.find(i=>i.id===a.itemId);if(!item||!EQUIP_SLOTS.includes(item.slot)||(item.enchantSlots||0)<1)return false;const cost=80+20*(item.tier||0);if(p.account.dust.violet<cost)return false;p.account.dust.violet-=cost;item.engraving=a.engraving;return true;
    }
    if(a.type==='enchantReroll') {
      if(!systemUnlocked(p.account,'enchanter')||p.dead||this.world(p).kind!=='nexus')return false;const item=p.inventory.find(i=>i.id===a.itemId);if(!item||!EQUIP_SLOTS.includes(item.slot))return false;const ids=Object.keys(ENCHANTMENTS),cost=55+15*(item.tier||0);if(p.account.dust.green<cost)return false;p.account.dust.green-=cost;const cur=Math.max(0,ids.indexOf(item.enchantment));item.enchantment=ids[(cur+1+(item.rarity||0))%ids.length];item.enchantmentRank=Math.max(1,item.enchantmentRank||1);return true;
    }
    if(a.type==='enchant') {
      if(!systemUnlocked(p.account,'enchanter'))return this.notice(p,'Der Verzauberer wird ab Kontostufe '+SYSTEM_UNLOCKS.enchanter+' freigeschaltet.');if(p.dead||this.world(p).kind!=='nexus'||!Object.hasOwn(ENCHANTMENTS,a.enchantment))return false;
      const item=p.inventory.find(i=>i.id===a.itemId);if(!item||!EQUIP_SLOTS.includes(item.slot))return false;const ench=ENCHANTMENTS[a.enchantment],same=item.enchantment===a.enchantment,rank=same?Math.min(3,Math.max(1,enchantRank(item))+1):1;if(same&&enchantRank(item)>=3)return this.notice(p,'Diese Verzauberung hat bereits Rang III.');const cost=Math.ceil(ench.cost*(1+(item.tier||0)*.15)*(1+.65*(rank-1)));if(p.account.dust.green<cost)return this.notice(p,'Nicht genügend grüner Staub.');p.account.dust.green-=cost;item.enchantment=a.enchantment;item.enchantmentRank=rank;return true;
    }
    if(a.type==='forgeRecipe') {
      if(!systemUnlocked(p.account,'forge'))return this.notice(p,'Die volle Schmiede wird ab Kontostufe '+SYSTEM_UNLOCKS.forge+' freigeschaltet.');if(p.dead||this.world(p).kind!=='nexus'||!Object.hasOwn(FORGE_RECIPES,a.recipe)||!p.account.blueprints.includes(a.recipe))return false;
      const item=p.inventory.find(i=>i.id===a.itemId);if(!item||!EQUIP_SLOTS.includes(item.slot))return false;const recipe=FORGE_RECIPES[a.recipe],m=p.account.forgeMaterials;if(a.recipe==='refine'&&(item.tier||0)>=7)return false;if(Object.entries(recipe.materials).some(([k,n])=>(m[k]||0)<n))return this.notice(p,'Nicht genügend Schmiedematerial.');for(const[k,n]of Object.entries(recipe.materials))m[k]-=n;
      if(a.recipe==='refine'){Object.assign(item,{...makeItem(item.id,item.classId==='all'?p.classId:item.classId,item.slot,(item.tier||0)+1,item.rarity),enchantment:item.enchantment,enchantmentRank:item.enchantmentRank,unique:item.unique,setId:item.setId,shiny:item.shiny});}
      if(a.recipe==='reroll'){const ids=Object.keys(ENCHANTMENTS),cur=Math.max(0,ids.indexOf(item.enchantment));item.enchantment=ids[(cur+1+(item.tier||0))%ids.length];item.enchantmentRank=1;}
      if(a.recipe==='polish')item.shiny=true;return true;
    }
    if(a.type==='claimSeasonMission') {
      const m=SEASON_MISSIONS.find(x=>x.id===a.missionId);if(!m||!this.seasonActive()||p.account.season.claims.includes(m.id)||!p.seasonal||p.seasonId!==SEASON.id)return false;if((p.account.totals[m.key]||0)<m.goal)return false;p.account.season.claims.push(m.id);p.account.season.xp+=m.xp;return true;
    }
    if(a.type==='claimSeasonPass') {
      const level=Math.floor(Number(a.level));if(!this.seasonActive()||!p.seasonal||p.seasonId!==SEASON.id||level<1||level>seasonPassLevel(p.account.season.xp)||p.account.season.passClaims.includes(level))return false;p.account.season.passClaims.push(level);p.account.dust.green+=15+level*2;p.account.forgeMaterials.metal+=level%3===0?1:0;p.account.petFood.crumb+=1;if(level%4===0&&p.account.giftChest.length<24){const reward=makeItem('gift-'+advToken(),p.classId,'charm',Math.min(7,2+Math.floor(level/4)),Math.min(3,Math.floor(level/5)));reward.unique=true;p.account.giftChest.push(reward);}if(level===5&&!p.account.cosmetics.titles.includes('Realmjäger'))p.account.cosmetics.titles.push('Realmjäger');if(level===10&&!p.account.cosmetics.skins.includes('ashen'))p.account.cosmetics.skins.push('ashen');return true;
    }
    if(a.type==='claimSeasonPremium') {
      const level=Math.floor(Number(a.level)),c=p.account.commerce;if(!this.seasonActive()||!p.seasonal||p.seasonId!==SEASON.id||!c.seasonPremium.includes(SHOP_SEASON_ID)||level<1||level>seasonPassLevel(p.account.season.xp)||p.account.season.premiumClaims.includes(level))return false;p.account.season.premiumClaims.push(level);c.shards=Math.min(10000000,c.shards+(level%5===0?35:10));if(level===5&&!p.account.cosmetics.titles.includes('Nachtwächter'))p.account.cosmetics.titles.push('Nachtwächter');if(level===10&&!p.account.cosmetics.skins.includes('veilborn'))p.account.cosmetics.skins.push('veilborn');if(level===20&&!p.account.cosmetics.skins.includes('bloodglass'))p.account.cosmetics.skins.push('bloodglass');if(level===25&&!p.account.cosmetics.emotes.includes('veilmark'))p.account.cosmetics.emotes.push('veilmark');if(level===30&&!p.account.cosmetics.titles.includes('Risskartograf'))p.account.cosmetics.titles.push('Risskartograf');return true;
    }
    if(a.type==='crucibleActivate') {
      if(!systemUnlocked(p.account,'crucible'))return this.notice(p,'Herausforderungen werden ab Kontostufe '+SYSTEM_UNLOCKS.crucible+' freigeschaltet.');if(!this.seasonActive()||!p.seasonal||p.crucibleMode||p.dead||this.world(p).kind!=='nexus'||!Object.hasOwn(CRUCIBLE_MODES,a.mode))return false;p.crucibleMode=a.mode;this.saveCharacter(p);return true;
    }
    if(a.type==='cosmetic') {
      if(p.dead||this.world(p).kind!=='nexus')return false;
      if(a.kind==='title'&&p.account.cosmetics.titles.includes(a.value)){p.account.cosmetics.activeTitle=a.value;p.title=a.value;return true;}
      if(a.kind==='skin'&&p.account.cosmetics.skins.includes(a.value)){p.account.cosmetics.activeSkin=a.value;p.skin=a.value;return true;}
      if(a.kind==='weaponStyle'&&p.account.cosmetics.weaponStyles.includes(a.value)){p.account.cosmetics.activeWeaponStyle=a.value;return true;}
      if(a.kind==='petStyle'&&p.account.cosmetics.petStyles.includes(a.value)){p.account.cosmetics.activePetStyle=a.value;return true;}
      return false;
    }
    if(a.type==='giftClaim') {
      if(p.dead||this.world(p).kind!=='nexus'||p.inventory.length>=8)return false;const i=p.account.giftChest.findIndex(v=>v.id===a.itemId);if(i<0)return false;p.inventory.push(p.account.giftChest.splice(i,1)[0]);return true;
    }
    if(a.type==='potionStore') {
      if(p.dead||this.world(p).kind!=='nexus')return false;const i=p.inventory.findIndex(v=>v.id===a.itemId),item=p.inventory[i];if(!item||item.slot!=='potion'||!Object.hasOwn(p.account.potionVault,item.statKey))return false;p.account.potionVault[item.statKey]++;p.inventory.splice(i,1);return true;
    }
    if(a.type==='potionTake') {
      if(p.dead||this.world(p).kind!=='nexus'||p.inventory.length>=8||!Object.hasOwn(p.account.potionVault,a.statKey)||(p.account.potionVault[a.statKey]||0)<1)return false;p.account.potionVault[a.statKey]--;p.inventory.push({id:'pv-'+advToken(),name:(a.statKey==='life'?'Leben':a.statKey==='mana'?'Mana':a.statKey.toUpperCase())+'-Trank',slot:'potion',statKey:a.statKey,stat:1,rarity:1,tier:0,classId:'all'});return true;
    }
    if(a.type==='seasonDeposit') {
      if(!this.seasonActive()||!p.seasonal||p.seasonId!==SEASON.id||p.dead||this.world(p).kind!=='nexus'||p.account.seasonalStash.length>=24)return false;const i=p.inventory.findIndex(v=>v.id===a.itemId);if(i<0)return false;p.account.seasonalStash.push(p.inventory.splice(i,1)[0]);return true;
    }
    if(a.type==='seasonWithdraw') {
      if(!p.seasonal||p.seasonId!==SEASON.id||p.dead||this.world(p).kind!=='nexus'||p.inventory.length>=8)return false;const i=p.account.seasonalStash.findIndex(v=>v.id===a.itemId);if(i<0)return false;p.inventory.push(p.account.seasonalStash.splice(i,1)[0]);return true;
    }
    if(a.type==='forge') {
      if(!systemUnlocked(p.account,'forge'))return this.notice(p,'Die volle Schmiede wird ab Kontostufe '+SYSTEM_UNLOCKS.forge+' freigeschaltet.');
      if(p.dead||this.world(p).kind!=='nexus')return false;
      const item=p.inventory.find(i=>i.id===a.itemId);if(!item||!EQUIP_SLOTS.includes(item.slot)||(item.tier||0)>=7)return false;
      const cost=35*((item.tier||0)+1)*(item.rarity+1);if(p.bank<cost)return this.notice(p,'Nicht genügend Splitter für diese Verbesserung.');
      const special={enchantment:item.enchantment,enchantmentRank:item.enchantmentRank,unique:item.unique,setId:item.setId,shiny:item.shiny,enchantSlots:item.enchantSlots};const replacement=makeItem(item.id,item.classId==='all'?p.classId:item.classId,item.slot,(item.tier||0)+1,item.rarity);Object.assign(item,replacement,special);p.bank-=cost;return true;
    }
    if(a.type==='openDungeon') {
      if(p.dead||this.world(p).kind!=='nexus'||!Object.hasOwn(DUNGEON_KEYS,a.theme))return false;
      if(this.world(p).portals.some(q=>q.owner===p.id&&q.kind==='dungeon'))return this.notice(p,'Dein geöffnetes Portal ist noch aktiv.');
      const echo=a.echo===true,base=DUNGEON_KEYS[a.theme],cost=Math.ceil(base*(echo?1.5:1));if(p.bank<cost)return this.notice(p,'Nicht genügend Splitter für diesen Dungeonschlüssel.');
      if(a.theme==='void'&&!(p.account.totals['boss:sovereign']>0))return this.notice(p,'Besiege zuerst den Rissregenten.');
      if([...this.worlds.values()].filter(w=>w.kind==='dungeon').length>=24)return false;
      p.bank-=cost;const event=liveEventFor(),mods=rollDungeonModifiers(Math.floor(this.time*1000)+p.account.totals.dungeons+a.theme.length,a.theme);if(echo)for(const id of ['elite','brutal','hasty'])if(!mods.includes(id))mods.push(id);const liveEvent=event.theme===a.theme;this.world(p).portals.push({id:'key-'+advToken(),owner:p.id,x:p.x,y:p.y-65,name:(echo?'Echopfad · ':'')+DUNGEONS[a.theme].name,kind:'dungeon',theme:a.theme,target:null,life:90,modifiers:mods.slice(0,3),echo,liveEvent});return true;
    }
    const salvageItem=a.type==='salvage'?p.inventory.find(i=>i.id===a.itemId):null;const result=super.action(id,a);if(result&&a.type==='salvage'&&salvageItem){p.account.forgeMaterials.metal+=1+Math.floor((salvageItem.tier||0)/3);p.account.dust.green+=3*(salvageItem.rarity+1);}if(result&&a.type==='rebirth'){p.empowered=0;p.haste=0;p.inspired=0;p.formMeter=0;p.formTimer=0;this.saveCharacter(p);}return result;
  }
  tradeFor(id){return [...this.trades.values()].find(t=>t.players.includes(id));}
  cancelTrade(id) {const t=this.tradeFor(id);if(t)this.trades.delete(t.id);return !!t;}
  tradeAction(p,a) {
    let t=this.tradeFor(p.id);
    if(a.type==='tradeCancel')return this.cancelTrade(p.id);
    if(a.type==='tradeInvite') {
      const q=this.players.get(a.playerId);if(t||!q||q.id===p.id||this.tradeFor(q.id)||p.dead||q.dead||!q.connected||p.worldId!=='nexus'||q.worldId!=='nexus'||dist(p,q)>280)return false;
      t={id:'trade-'+(++this.tradeSequence),players:[p.id,q.id],offers:{[p.id]:[],[q.id]:[]},confirmed:[],revision:0,state:'invited',expires:this.time+90};this.trades.set(t.id,t);return true;
    }
    if(!t||a.tradeId!==t.id)return false;
    const q=this.players.get(t.players.find(id=>id!==p.id));if(!q||p.dead||q.dead||p.worldId!=='nexus'||q.worldId!=='nexus'||!q.connected||dist(p,q)>350){this.cancelTrade(p.id);return false;}
    if(a.type==='tradeAccept') {if(t.state!=='invited'||t.players[1]!==p.id)return false;t.state='negotiating';t.expires=this.time+120;return true;}
    if(t.state!=='negotiating')return false;
    if(a.type==='tradeOffer') {
      if(!Array.isArray(a.itemIds)||a.itemIds.length>8||a.itemIds.some(id=>typeof id!=='string')||new Set(a.itemIds).size!==a.itemIds.length||a.itemIds.some(id=>!p.inventory.some(i=>i.id===id)))return false;
      t.offers[p.id]=[...a.itemIds];t.confirmed=[];t.revision++;t.expires=this.time+120;return true;
    }
    if(a.type==='tradeConfirm') {
      if(!Number.isSafeInteger(a.revision)||a.revision!==t.revision||t.confirmed.includes(p.id))return false;
      const [one,two]=t.players.map(id=>this.players.get(id));const o1=t.offers[one.id],o2=t.offers[two.id];
      if(!o1.length&&!o2.length)return this.notice(p,'Ein Handel benötigt mindestens einen Gegenstand.');
      const items1=o1.map(id=>one.inventory.find(i=>i.id===id)),items2=o2.map(id=>two.inventory.find(i=>i.id===id));
      if([...items1,...items2].some(i=>!i)||new Set([...items1,...items2].map(i=>i.id)).size!==items1.length+items2.length){this.cancelTrade(p.id);return false;}
      if(one.inventory.length-items1.length+items2.length>8||two.inventory.length-items2.length+items1.length>8)return this.notice(p,'Nicht genügend Gepäckplätze für den Tausch.');
      t.confirmed.push(p.id);if(t.confirmed.length<2)return true;
      // Synchronous two-sided commit; the HTTP handler persists BOTH profiles in one SQLite transaction.
      one.inventory=[...one.inventory.filter(i=>!o1.includes(i.id)),...items2];two.inventory=[...two.inventory.filter(i=>!o2.includes(i.id)),...items1];
      this.trades.delete(t.id);this.notice(one,'Handel abgeschlossen.');this.notice(two,'Handel abgeschlossen.');return true;
    }
    return false;
  }
  targetPoint(w,p,distance=230) {
    let target={x:p.x,y:p.y};for(let d=10;d<=distance;d+=10){const next={x:p.x+Math.cos(p.angle)*d,y:p.y+Math.sin(p.angle)*d};if(!walkable(w.map,next.x,next.y,p.radius))break;target=next;}return target;
  }
  addEffect(w,p,kind,options={}) {const effect={id:'fx-'+advToken(),worldId:w.worldId,owner:p.id,kind,x:p.x,y:p.y,radius:100,life:5,tick:0,color:CLASSES[p.classId].color,...options};this.effects.push(effect);this.effects=this.effects.slice(-200);return effect;}
  castExtra(w,p,damage) {
    const nearby=()=>[...w.players.values()].filter(q=>!q.dead&&dist(p,q)<360),point=this.targetPoint(w,p);
    switch(p.classId) {
      case 'paladin':for(const q of nearby()){q.hp=Math.min(w.stats(q).maxHP,q.hp+70);q.empowered=6;}this.addEffect(w,p,'aura',{radius:150,life:.6});break;
      case 'assassin':this.addEffect(w,p,'poison',{...point,radius:125,life:5,damage:damage*.8});break;
      case 'necromancer':{let hits=0;for(const e of w.enemies)if(e.hp>0&&dist(p,e)<300){w.damageEnemy(e,damage*2.4,p.id,true);hits++;}for(const q of nearby())q.hp=Math.min(w.stats(q).maxHP,q.hp+Math.min(180,45*hits));this.addEffect(w,p,'aura',{radius:300,life:.5});break;}
      case 'huntress':this.addEffect(w,p,'trap',{...point,radius:100,life:10,damage:damage*3.5});break;
      case 'mystic':for(const e of w.enemies)if(e.hp>0&&dist(point,e)<210){if(isBoss(e.kind))e.slow=2;else e.stun=3;}this.addEffect(w,p,'stasis',{...point,radius:210,life:.9});break;
      case 'trickster':this.addEffect(w,p,'decoy',{life:4});p.x=point.x;p.y=point.y;p.invulnerable=.5;break;
      case 'sorcerer':{let source=p;const hit=new Set();for(let i=0;i<6;i++){const e=w.enemies.filter(e=>e.hp>0&&!hit.has(e.id)&&dist(source,e)<(i?240:550)).sort((a,b)=>dist(a,source)-dist(b,source))[0];if(!e)break;hit.add(e.id);this.addEffect(w,p,'lightning',{x:source.x,y:source.y,toX:e.x,toY:e.y,life:.45});w.damageEnemy(e,damage*(2.6-i*.23),p.id,true);source=e;}break;}
      case 'ninja':w.projectile(p,p.angle,'player',damage*4,820,.85,true,true);p.haste=3;break;
      case 'samurai':for(const e of w.enemies)if(e.hp>0&&dist(p,e)<250){e.exposed=5;w.damageEnemy(e,damage*2.3,p.id,true);}this.addEffect(w,p,'slash',{radius:250,life:.5});break;
      case 'bard':for(const q of nearby())q.inspired=7;this.addEffect(w,p,'aura',{radius:180,life:.7});break;
      case 'summoner':for(const side of [-1,1])this.addEffect(w,p,'summon',{x:p.x+side*40,y:p.y+25,life:8,side,damage:damage*.7});break;
      case 'druid':p.formMeter=Math.min(100,(p.formMeter||0)+42);if(p.formMeter>=100){p.formMeter=0;p.formTimer=8;p.druidForm=druidFormFor(p.equipment?.ability);this.notice(p,'Wildgestalt entfesselt: '+DRUID_FORMS[p.druidForm].name);}else{for(const e of w.enemies)if(e.hp>0&&dist(p,e)<220)w.damageEnemy(e,damage*1.8,p.id,true);}break;
      case 'kensei':{const point=this.targetPoint(w,p,250);for(const e of w.enemies)if(e.hp>0&&segmentDistance(p.x,p.y,point.x,point.y,e.x,e.y).distance<e.radius+35)w.damageEnemy(e,damage*3,p.id,true);this.addEffect(w,p,'lightning',{toX:point.x,toY:point.y,life:.4});p.x=point.x;p.y=point.y;p.invulnerable=.7;break;}
    }
  }
  bossPattern(w,e,target,type) {
    const scaledDamage=type.damage*(w.kind==='dungeon'?w.modProduct('enemyDamage'):1);
    const ring=(n,speed=165,offset=0)=>{for(let i=0;i<n;i++)w.projectile(e,e.spin+i*Math.PI*2/n+offset,'enemy',scaledDamage,speed,4.2);};
    const aimed=(n=5,speed=235)=>{for(let i=0;i<n;i++)w.projectile(e,e.angle+(i-(n-1)/2)*.15,'enemy',scaledDamage,speed,3);};
    switch(e.kind) {
      case 'captain':aimed(3+e.phase,210);if(e.phase>=2)ring(8+e.phase*2,145);if(e.phase===3)this.effects.push({id:'haz-'+advToken(),worldId:w.worldId,owner:e.id,kind:'danger',x:target.x,y:target.y,radius:70,life:2.4,warn:.9,tick:0,damage:22*(w.kind==='dungeon'?w.modProduct('enemyDamage'):1),color:'#7fc1d7'});return true;
      case 'matriarch':ring(6+e.phase*4,145);if(e.phase>=2&&e.pattern===1&&w.enemies.length<150)for(let i=0;i<2+e.phase;i++){const a=i*Math.PI*2/(2+e.phase),x=e.x+Math.cos(a)*80,y=e.y+Math.sin(a)*80;if(walkable(w.map,x,y,13))w.spawnEnemy('wasp',x,y);}return true;
      case 'lich':ring(10+e.phase*3,130,.1);if(e.phase>=2)aimed(3+e.phase,260);if(e.phase===3&&e.pattern===2&&w.enemies.length<150)for(let i=0;i<3;i++)w.spawnEnemy('ghost',e.x+(i-1)*65,e.y+80);return true;
      case 'sovereign':ring(12+e.phase*5,160);aimed(3+e.phase*2,300);if(e.phase>=2)this.effects.push({id:'haz-'+advToken(),worldId:w.worldId,owner:e.id,kind:'danger',x:target.x,y:target.y,radius:82+e.phase*8,life:2.6,warn:1,tick:0,damage:36*(w.kind==='dungeon'?w.modProduct('enemyDamage'):1),color:'#e3af72'});return true;
      case 'plague':aimed(3+e.phase*2,165);if(e.phase>=2)this.effects.push({id:'haz-'+advToken(),worldId:w.worldId,owner:e.id,kind:'danger',x:target.x,y:target.y,radius:80,life:3,warn:1.1,tick:0,damage:18*(w.kind==='dungeon'?w.modProduct('enemyDamage'):1),color:'#b2c371'});return true;
      case 'queen':ring(6+e.phase*3,150);if(e.phase>=2&&e.pattern===2&&w.enemies.length<150)for(let i=0;i<2;i++){const x=e.x+(i?60:-60),y=e.y+60;if(walkable(w.map,x,y,13))w.spawnEnemy('wasp',x,y);}return true;
      case 'smith':for(const x of [-150,0,150])this.effects.push({id:'haz-'+advToken(),worldId:w.worldId,owner:e.id,kind:'danger',x:target.x+x,y:target.y,radius:60,life:2.5,warn:1,tick:0,damage:30*(w.kind==='dungeon'?w.modProduct('enemyDamage'):1),color:'#e4a069'});if(e.phase>1)aimed(3,280);return true;
      case 'frostking':ring(12+e.phase*4,100);if(e.phase>1)ring(8,245,Math.PI/8);return true;
      case 'oracle':for(let side=0;side<4;side++)for(let j=-e.phase;j<=e.phase;j++)w.projectile(e,e.spin+side*Math.PI/2+j*.08,'enemy',scaledDamage,220,4);return true;
      case 'voidheart':ring(12+e.phase*6,125);aimed(3+e.phase*2,300);if(e.phase===3)for(let i=0;i<3;i++)this.effects.push({id:'haz-'+advToken(),worldId:w.worldId,owner:e.id,kind:'danger',x:target.x+Math.cos(i*Math.PI*2/3)*100,y:target.y+Math.sin(i*Math.PI*2/3)*100,radius:55,life:2.3,warn:1.2,tick:0,damage:34*(w.kind==='dungeon'?w.modProduct('enemyDamage'):1),color:'#bda0ed'});return true;
      case 'bloodlord':ring(10+e.phase*4,145);if(e.phase>1)aimed(5,265);return true;
      case 'starengine':for(let side=0;side<6;side++)w.projectile(e,e.spin+side*Math.PI/3,'enemy',scaledDamage,210+e.phase*18,4);if(e.phase===3)ring(18,115,.1);return true;
      case 'shardking':ring(8+e.phase*6,185);if(e.pattern===2)for(let i=-2;i<=2;i++)w.projectile(e,e.angle+i*.11,'enemy',scaledDamage+5,330,2.8);return true;
      case 'duskmaw':ring(16+e.phase*6,135);aimed(3+e.phase*2,320);if(e.phase>1)this.effects.push({id:'haz-'+advToken(),worldId:w.worldId,owner:e.id,kind:'danger',x:target.x,y:target.y,radius:95,life:2.5,warn:1.1,tick:0,damage:42*(w.kind==='dungeon'?w.modProduct('enemyDamage'):1),color:'#8d78bd'});return true;
      case 'mirrorwarden':ring(10+e.phase*5,180,e.spin*.4);if(e.phase>=2)for(let i=-2;i<=2;i++)w.projectile(e,e.angle+i*.13,'enemy',scaledDamage,300,3);if(e.phase===3)ring(22,105,.2);return true;
      case 'sporefather':ring(8+e.phase*4,120);if(e.phase>=2)this.effects.push({id:'haz-'+advToken(),worldId:w.worldId,owner:e.id,kind:'danger',x:target.x,y:target.y,radius:85,life:3.2,warn:1.2,tick:0,damage:38*(w.kind==='dungeon'?w.modProduct('enemyDamage'):1),color:'#8fbd73'});if(e.phase===3&&e.pattern===1&&w.enemies.length<150)for(let i=0;i<4;i++)w.spawnEnemy('sporeling',e.x+(i-1.5)*55,e.y+90);return true;
      case 'stormseer':for(let side=0;side<6+e.phase*2;side++)w.projectile(e,e.spin+side*Math.PI*2/(6+e.phase*2),'enemy',scaledDamage,245+e.phase*20,3.4);if(e.phase>=2)aimed(5,360);return true;
      case 'abyssstar':ring(18+e.phase*7,145);aimed(5+e.phase*2,340);if(e.phase>=2)for(let i=0;i<e.phase;i++){const a=e.spin+i*Math.PI*2/e.phase;this.effects.push({id:'haz-'+advToken(),worldId:w.worldId,owner:e.id,kind:'danger',x:target.x+Math.cos(a)*120,y:target.y+Math.sin(a)*120,radius:62,life:2.8,warn:1,tick:0,damage:46*(w.kind==='dungeon'?w.modProduct('enemyDamage'):1),color:'#655d94'});}return true;
      default:return false;
    }
  }
  step(dt) {
    if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);
    for(const effect of this.effects) {
      effect.life-=dt;effect.tick-=dt;const w=this.worlds.get(effect.worldId);if(!w){effect.life=0;continue;}
      const p=this.players.get(effect.owner);
      if(effect.kind==='danger') {
        effect.warn=Math.max(0,(effect.warn||0)-dt);if(effect.warn===0&&effect.tick<=0){effect.tick=.5;for(const q of w.players.values())if(!q.dead&&dist(q,effect)<effect.radius)w.damagePlayer(q,effect.damage,'Gefahrenfeld');}continue;
      }
      if(!p||p.dead||p.worldId!==effect.worldId){effect.life=0;continue;}
      if(effect.kind==='poison'&&effect.tick<=0){effect.tick=.5;for(const e of w.enemies)if(e.hp>0&&dist(e,effect)<effect.radius)w.damageEnemy(e,effect.damage,p.id,true);}
      if(effect.kind==='trap'&&w.enemies.some(e=>e.hp>0&&dist(e,effect)<70)){for(const e of w.enemies)if(e.hp>0&&dist(e,effect)<effect.radius){e.slow=4;w.damageEnemy(e,effect.damage,p.id);}effect.kind='aura';effect.life=.5;}
      if(effect.kind==='summon') {effect.x=p.x+effect.side*45;effect.y=p.y+28;const target=w.enemies.filter(e=>e.hp>0&&dist(e,p)<650).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(target&&effect.tick<=0&&!w.safe(p)){effect.tick=.45;w.projectile({...p,x:effect.x,y:effect.y},Math.atan2(target.y-effect.y,target.x-effect.x),'player',effect.damage,600,1.2);}}
      if(effect.kind==='decoy'){for(const e of w.enemies)if(e.hp>0&&dist(e,effect)<300&&dist(e,effect)<dist(e,p)){e.angle=Math.atan2(effect.y-e.y,effect.x-e.x);if(e.cooldown<.05){w.projectile(e,e.angle,'enemy',ENEMY_TYPES[e.kind].damage,170,3);e.cooldown=1.5;}if(!isBoss(e.kind))w.move(e,Math.cos(e.angle)*ENEMY_TYPES[e.kind].speed,Math.sin(e.angle)*ENEMY_TYPES[e.kind].speed,dt);}}
    }
    this.effects=this.effects.filter(e=>e.life>0).slice(-250);
    for(const p of this.players.values()) {
      if(!p.account)continue;p.account.totals.bestLevel=Math.max(p.account.totals.bestLevel,p.level);
      if(p.dead||!p.connected)continue;const pet=p.account.petActive;if(!pet||p.crucibleMode==='petless')continue;const tier=p.account.petTier[pet]||0,cap=PET_RARITIES[tier]?.cap||20,level=1+Math.min(cap-1,Math.floor(Math.sqrt((p.account.petXP[pet]||0)/30)));
      const w=this.world(p),stats=w.stats(p);if(pet==='fox')p.hp=Math.min(stats.maxHP,p.hp+dt*(.5+level*.15));if(pet==='moth')p.mp=Math.min(stats.maxMP,p.mp+dt*(.8+level*.2));if(pet==='sprite'){p.hp=Math.min(stats.maxHP,p.hp+dt*(.35+level*.07));p.mp=Math.min(stats.maxMP,p.mp+dt*(.45+level*.08));}
      if(pet==='drake'){p.petCd=Math.max(0,(p.petCd||0)-dt);const e=w.enemies.filter(e=>e.hp>0&&dist(p,e)<420).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(e&&p.petCd===0&&!w.safe(p)){p.petCd=1.1;w.projectile(p,Math.atan2(e.y-p.y,e.x-p.x),'player',6+level,450,1);}}
      if(pet==='raven'){p.petCd=Math.max(0,(p.petCd||0)-dt);const e=w.enemies.filter(e=>e.hp>0&&dist(p,e)<480).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(e&&p.petCd===0&&!w.safe(p)){p.petCd=1.6;e.exposed=Math.max(e.exposed||0,1.8);w.projectile(p,Math.atan2(e.y-p.y,e.x-p.x),'player',4+level*.7,520,1,true);}}
    }
    super.step(dt);
    for(const trade of this.trades.values()){const [p,q]=trade.players.map(id=>this.players.get(id));if(!p||!q||p.dead||q.dead||!p.connected||!q.connected||p.worldId!=='nexus'||q.worldId!=='nexus'||dist(p,q)>350||this.time>trade.expires)this.trades.delete(trade.id);}
  }
  snapshot(id) {
    const state=super.snapshot(id),p=this.players.get(id);if(!state||!p?.account)return state;this.syncCadence(p);
    for(const publicPlayer of state.players){const source=this.players.get(publicPlayer.id);publicPlayer.guildTag=this.guildService.get(publicPlayer.id)?.name||'';publicPlayer.empowered=source.empowered||0;publicPlayer.inspired=source.inspired||0;publicPlayer.haste=source.haste||0;publicPlayer.skin=source.account?.cosmetics?.activeSkin||'default';publicPlayer.weaponStyle=source.account?.cosmetics?.activeWeaponStyle||'default';}
    const own=state.players.find(q=>q.id===id),account=p.account;
    own.account={activeId:account.activeId,characters:account.characters.map(c=>{const v=c.id===account.activeId?p:c.profile;return{id:c.id,name:v.name,classId:v.classId,level:v.level,dead:v.dead,active:c.id===account.activeId,seasonal:v.seasonal===true,crucibleMode:v.crucibleMode||null};}),totals:{...account.totals},claims:[...account.claims],petOwned:[...account.petOwned],petActive:account.petActive,petXP:{...account.petXP},petTier:{...account.petTier},petDuplicates:{...account.petDuplicates},petEggs:{...account.petEggs},petFood:{...account.petFood},history:advCopy(account.history),mastery:{...account.mastery},masteryStars:masteryStars(account.mastery),accountXP:account.accountXP,accountLevel:accountLevelFromXP(account.accountXP),unlocks:Object.fromEntries(Object.entries(SYSTEM_UNLOCKS).map(([k,l])=>[k,accountLevelFromXP(account.accountXP)>=l])),dust:{...account.dust},forgeMaterials:{...account.forgeMaterials},blueprints:[...account.blueprints],ascension:advCopy(account.ascension),ascensionTotal:ascensionTotal(account.ascension),season:{...advCopy(account.season),name:SEASON.name,passLevel:seasonPassLevel(account.season.xp)},seasonalStash:advCopy(account.seasonalStash),giftChest:advCopy(account.giftChest),potionVault:{...account.potionVault},cosmetics:advCopy(account.cosmetics),journeyClaims:[...account.journeyClaims],materialStorage:{...account.materialStorage},tinkererClaims:[...account.tinkererClaims],missionTreeClaims:[...account.missionTreeClaims],bestTimes:{...account.bestTimes},eventStats:{...account.eventStats},cadence:advCopy(account.cadence),commerce:advCopy(account.commerce)};
    own.seasonal=p.seasonal===true;own.seasonId=p.seasonId||null;own.crucibleMode=p.crucibleMode||null;own.formMeter=p.formMeter||0;own.formTimer=p.formTimer||0;own.title=p.title||account.cosmetics.activeTitle;own.skin=p.skin||account.cosmetics.activeSkin;
    own.kills=p.kills||0;
    const onlineFriends=new Map([...this.players.values()].filter(q=>q.connected).map(q=>[q.id,q.name]));
    state.friends=this.guildService.friendView(id,onlineFriends);
    state.guild=this.guildService.view(id,new Set(onlineFriends.keys()));
    const guildId=this.guildService.get(id)?.id;if(guildId)state.chat=[...state.chat,...this.guildService.messages.filter(m=>m.guildId===guildId)].sort((a,b)=>a.time-b.time).slice(-30);
    const trade=this.tradeFor(id);state.trade=trade?{id:trade.id,state:trade.state,revision:trade.revision,confirmed:[...trade.confirmed],inviter:trade.players[0],expiresIn:Math.max(0,trade.expires-this.time),players:trade.players.map(pid=>{const q=this.players.get(pid);return{id:pid,name:q.name,items:trade.offers[pid].map(i=>q.inventory.find(item=>item.id===i)).filter(Boolean).map(advCopy)};})}:null;
    state.effects=this.effects.filter(e=>e.worldId===p.worldId&&dist(e,p)<1200).map(({damage,tick,owner,...e})=>({...e}));
    state.pets=[...this.world(p).players.values()].filter(q=>!q.dead&&q.account?.petActive&&q.crucibleMode!=='petless').map(q=>{const kind=q.account.petActive,tier=q.account.petTier[kind]||0,cap=PET_RARITIES[tier]?.cap||20;return{id:'pet-'+q.id,owner:q.id,kind,x:q.x-34,y:q.y+20,tier,style:q.account?.cosmetics?.activePetStyle||'default',level:1+Math.min(cap-1,Math.floor(Math.sqrt((q.account.petXP[kind]||0)/30)))};});
    state.leaderboard=[{rank:1,name:p.name,classId:p.classId,level:p.level,fame:p.fame||0,kills:account.totals.kills||0,dungeons:account.totals.dungeons||0,bestLevel:account.totals.bestLevel||p.level,deaths:p.deaths||0,masteryStars:masteryStars(account.mastery)}];
    const liveEvent=liveEventFor();state.progression={accountLevel:accountLevelFromXP(account.accountXP),systemUnlocks:{...SYSTEM_UNLOCKS},season:SEASON,dungeonModifiers:advCopy(DUNGEON_MODIFIERS),journey:JOURNEY_STEPS,missionTree:MISSION_TREE,rewardTrack:SEASON_REWARD_TRACK,liveService:LIVE_SERVICE_CONFIG,liveEvent};state.contentVersion=7;return state;
  }
}
