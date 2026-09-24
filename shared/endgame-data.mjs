// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Original Nyrathen progression systems inspired by genre conventions; no proprietary assets or balance tables.
import { clamp } from './data.mjs';

export const ACCOUNT_LEVEL_CAP=50;
export const SYSTEM_UNLOCKS=Object.freeze({pets:5,enchanter:17,forge:23,crucible:27});
export function accountLevelFromXP(xp=0){
  const value=Number.isFinite(xp)?Math.max(0,Math.floor(xp)):0;
  return clamp(1+Math.floor(Math.sqrt(value/102)),1,ACCOUNT_LEVEL_CAP);
}
// Progression lock: original hard curve (85*n^2) + 20%. Do not rebalance without explicit product-owner approval.
export const ACCOUNT_XP_CURVE=102;
export function accountXPForLevel(level=1){const n=clamp(Math.floor(level)-1,0,ACCOUNT_LEVEL_CAP-1);return ACCOUNT_XP_CURVE*n*n;}
export function systemUnlocked(account,key){return accountLevelFromXP(account?.accountXP||0)>=(SYSTEM_UNLOCKS[key]||1);}

export const PET_RARITIES=Object.freeze([
  {id:'common',name:'Gewöhnlich',cap:20,color:'#aab6b3'},
  {id:'uncommon',name:'Ungewöhnlich',cap:35,color:'#77bdcc'},
  {id:'rare',name:'Selten',cap:50,color:'#a997da'},
  {id:'legendary',name:'Legendär',cap:70,color:'#e4b56a'},
  {id:'mythic',name:'Mythisch',cap:90,color:'#efcf8b'}
]);
export const PET_EGGS=Object.freeze({woodland:'Waldei',ember:'Glutei',arcane:'Runenei',frost:'Frostei'});
export const PET_FOOD=Object.freeze({crumb:25,fruit:80,feast:240});

export const ENCHANTMENTS=Object.freeze({
  keen:{name:'Scharf',description:'+8 % Angriff',kind:'damage',value:.08,cost:45},
  swift:{name:'Flink',description:'+7 % Bewegungstempo',kind:'speed',value:.07,cost:45},
  guarded:{name:'Bewahrt',description:'+4 Verteidigung',kind:'defense',value:4,cost:55},
  focused:{name:'Fokussiert',description:'-8 % Angriffspause',kind:'interval',value:.08,cost:65},
  vital:{name:'Lebendig',description:'+30 maximales Leben',kind:'hp',value:30,cost:70},
  lucid:{name:'Klar',description:'+25 maximales Mana',kind:'mp',value:25,cost:70}
});
export const DUST_COLORS=Object.freeze({green:'Grüner Staub',violet:'Violetter Staub',gold:'Goldstaub'});

export const DUNGEON_MODIFIERS=Object.freeze({
  hasty:{name:'Rastlose Feinde',description:'Gegner bewegen sich 18 % schneller.',difficulty:1,enemySpeed:1.18,reward:1.12},
  brutal:{name:'Brutale Salven',description:'Gegner verursachen 16 % mehr Schaden.',difficulty:1,enemyDamage:1.16,reward:1.14},
  fortified:{name:'Gehärtete Gegner',description:'Gegner besitzen 24 % mehr Leben.',difficulty:1,enemyHP:1.24,reward:1.15},
  rich:{name:'Reiche Tiefe',description:'Höhere Chance auf hochwertige Beute.',difficulty:0,loot:1.4,reward:1.08},
  blessed:{name:'Segensquelle',description:'Spieler regenerieren schneller.',difficulty:-1,regen:1.35,reward:.94},
  fragile:{name:'Spröde Wächter',description:'Gegner besitzen 18 % weniger Leben.',difficulty:-1,enemyHP:.82,reward:.9},
  elite:{name:'Eliteportal',description:'Bosse skalieren härter, Belohnungen steigen deutlich.',difficulty:2,bossHP:1.35,reward:1.35}
});
export function rollDungeonModifiers(seed=1,theme='tide'){
  let s=(Math.abs(Math.floor(seed))+theme.length*7919)>>>0;
  const next=()=>{s=(Math.imul(s^s>>>15,1|s)+0x6D2B79F5)>>>0;return s/4294967296;};
  const ids=Object.keys(DUNGEON_MODIFIERS),count=next()<.18?2:next()<.68?1:0,out=[];
  while(out.length<count){const id=ids[Math.floor(next()*ids.length)];if(!out.includes(id))out.push(id);}return out;
}
export function modifierSummary(ids=[]){return ids.filter(id=>DUNGEON_MODIFIERS[id]).map(id=>DUNGEON_MODIFIERS[id]);}

export const ASCENSION_STATS=Object.freeze(['atk','def','spd','dex','vit','wis','life','mana']);
export const ASCENSION_CAP=5;
export function ascensionTotal(map={}){return Object.values(map||{}).reduce((sum,v)=>sum+Object.values(v||{}).reduce((s,n)=>s+clamp(Number(n)||0,0,ASCENSION_CAP),0),0);}

export const SEASON=Object.freeze({id:'S1-ASHEN-TIDE',name:'Aschenflut',maxPass:30,startsAt:'2026-09-23T00:00:00Z',endsAt:'2026-12-16T23:59:59Z'});
export const SEASON_MISSIONS=Object.freeze([
  {id:'s-kills-25',name:'Erste Welle',key:'kills',goal:25,xp:120},
  {id:'s-kills-150',name:'Realmjäger',key:'kills',goal:150,xp:260},
  {id:'s-dungeon-3',name:'Tiefer hinab',key:'dungeons',goal:3,xp:180},
  {id:'s-dungeon-12',name:'Kartograph der Tiefe',key:'dungeons',goal:12,xp:420},
  {id:'s-boss-citadel',name:'Krone aus Asche',key:'boss:sovereign',goal:1,xp:360},
  {id:'s-boss-void',name:'Jenseits',key:'boss:voidheart',goal:1,xp:520},
  {id:'s-dungeon-25',name:'Kartograph des Schleiers',key:'dungeons',goal:25,xp:680},
  {id:'s-kills-500',name:'Sturm der Klingen',key:'kills',goal:500,xp:740},
  {id:'s-boss-mirror',name:'Gebrochenes Spiegelbild',key:'boss:mirrorwarden',goal:1,xp:620},
  {id:'s-boss-abyss',name:'Das letzte Licht',key:'boss:abyssstar',goal:1,xp:900}
]);
export function seasonPassLevel(xp=0){return clamp(Math.floor((Number(xp)||0)/250)+1,1,SEASON.maxPass);}

export const DAY_MS=24*60*60*1000;
export const WEEK_MS=7*DAY_MS;
export function dailyKey(now=Date.now()){return Math.floor(Number(now)/DAY_MS);}
export function weeklyKey(now=Date.now()){return Math.floor(Number(now)/WEEK_MS);}
export function seasonCadenceKey(now=Date.now(),season=SEASON){const t=Number(now),start=Date.parse(season.startsAt),end=Date.parse(season.endsAt);return t<start?`pre:${season.id}`:t>end?`post:${season.id}`:season.id;}

export const CRUCIBLE_MODES=Object.freeze({
  glass:{name:'Glasklinge',description:'+20 % Schaden, -25 % maximales Leben.',damage:1.2,hp:.75,loot:1.2},
  petless:{name:'Ohne Gefährten',description:'Gefährten deaktiviert; +12 % Beute.',noPet:true,loot:1.12},
  austere:{name:'Entbehrung',description:'Tränke und Heilung wirken nur zu 60 %; +18 % Beute.',healing:.6,loot:1.18},
  noheal:{name:'Blutpakt',description:'Keine aktive Heilung außerhalb sicherer Zonen; +35 % Beute.',healing:0,loot:1.35,incoming:1.08},
  rush:{name:'Sturmgang',description:'+15 % Tempo, aber +12 % eingehender Schaden; +25 % Beute.',speed:1.15,incoming:1.12,loot:1.25},
  iron:{name:'Eisenprüfung',description:'Gegner treffen härter, dafür bessere Belohnungen.',incoming:1.22,loot:1.32}
});

export const FORGE_RECIPES=Object.freeze({
  refine:{name:'Tier-Veredelung',materials:{metal:2,essence:1},description:'Erhöht einen Gegenstand um ein Tier.'},
  reroll:{name:'Relikt-Neuguss',materials:{metal:1,essence:2},description:'Würfelt die Verzauberung eines Gegenstands neu.'},
  polish:{name:'Glanzschliff',materials:{metal:3,essence:3},description:'Macht ein Relikt zu einem schimmernden Sammlerstück.'}
});
export const BLUEPRINTS=Object.freeze(['refine','reroll','polish']);

export const COSMETICS=Object.freeze({
  titles:['Reisender','Realmjäger','Tiefenläufer','Sternenbrecher','Unbeugsam'],
  emotes:['wave','cheer','skull','star','heart'],
  skins:['default','ashen','emerald','moonlit','royal']
});

export function itemQualityName(item={}){
  if(item.shiny)return 'Schimmernd';
  if(item.unique)return 'Einzigartig';
  if(item.setId)return 'Setstück';
  return 'Tier-Gegenstand';
}


export const JOURNEY_STEPS=Object.freeze([
  {id:'j-kills-5',name:'Erste Spuren',description:'Besiege 5 Kreaturen.',key:'kills',goal:5,reward:{coins:30}},
  {id:'j-level-10',name:'Werde stärker',description:'Erreiche Stufe 10.',key:'bestLevel',goal:10,reward:{coins:50}},
  {id:'j-dungeon-1',name:'Tiefer hinab',description:'Schließe deinen ersten Dungeon ab.',key:'dungeons',goal:1,reward:{fame:20}},
  {id:'j-level-20',name:'Vollendung',description:'Erreiche Stufe 20.',key:'bestLevel',goal:20,reward:{fame:60}},
  {id:'j-dungeon-10',name:'Schleierläufer',description:'Schließe 10 Dungeons ab.',key:'dungeons',goal:10,reward:{coins:180}},
  {id:'j-boss-sovereign',name:'Eine Krone fällt',description:'Besiege den Rissregenten.',key:'boss:sovereign',goal:1,reward:{fame:120}},
  {id:'j-ascension-8',name:'Über das Limit',description:'Erreiche insgesamt 8 Erhebungsränge.',key:'ascensionTotal',goal:8,reward:{coins:260}},
  {id:'j-abyss',name:'Am Rand des Nichts',description:'Besiege den Abgrundstern.',key:'boss:abyssstar',goal:1,reward:{fame:240}}
]);
export const LIVE_EVENT_THEMES=Object.freeze(['tide','sewer','grove','hive','crypt','forge','frost','temple','blood','lab','bastion','dusk','mirror','spore','storm','abyss']);
export function liveEventFor(now=Date.now()){
  const week=Math.floor(Number(now)/(7*24*60*60*1000));const theme=LIVE_EVENT_THEMES[Math.abs(week)%LIVE_EVENT_THEMES.length];
  return {id:'rotation-'+week,theme,name:'Schleierrotation',reward:1.35,echoReward:1.6,endsAt:(week+1)*7*24*60*60*1000};
}
export function enchantRank(item={}){return clamp(Math.floor(Number(item.enchantmentRank)||0),0,3);}


// v5.1 live-service/meta expansion. Original Nyrathen data; intentionally not copied from third-party games.
export const MATERIAL_TYPES=Object.freeze({iron:'Eisen',arcane:'Arkanstaub',primal:'Uressenz',celestial:'Sternensplitter'});
export function dismantleYield(item={}){const tier=Math.max(0,Math.floor(Number(item.tier)||0)),rarity=Math.max(0,Math.floor(Number(item.rarity)||0));return {iron:1+Math.floor(tier/2),arcane:rarity+(item.enchantment?1:0),primal:(item.unique||item.setId)?1:0,celestial:item.shiny?1:0};}
export const ENGRAVINGS=Object.freeze({hunter:{name:'Jägerzeichen',kind:'damage',value:.04},bulwark:{name:'Bollwerk',kind:'defense',value:2},wind:{name:'Windrune',kind:'speed',value:.035},well:{name:'Quellrune',kind:'mp',value:15}});
export const TINKERER_RECIPES=Object.freeze({
  ironCache:{name:'Eisenauftrag',cost:{iron:8},reward:{metal:3},daily:true},
  arcaneCache:{name:'Arkanauftrag',cost:{arcane:6},reward:{greenDust:90},daily:true},
  primalCache:{name:'Uressenzauftrag',cost:{primal:3},reward:{essence:4},daily:false},
  starCache:{name:'Sternenauftrag',cost:{celestial:2},reward:{violetDust:120},daily:false}
});
export const MISSION_TREE=Object.freeze([
 {id:'root',name:'Erwachen',key:'kills',goal:10,parents:[],xp:100,reward:{greenDust:20}},
 {id:'delve',name:'Hinab',key:'dungeons',goal:3,parents:['root'],xp:160,reward:{iron:3}},
 {id:'hunt',name:'Jagdpfad',key:'kills',goal:100,parents:['root'],xp:190,reward:{arcane:2}},
 {id:'master',name:'Zwei Wege',key:'dungeons',goal:12,parents:['delve','hunt'],xp:360,reward:{primal:1}},
 {id:'abyss',name:'Sternenfall',key:'boss:abyssstar',goal:1,parents:['master'],xp:700,reward:{celestial:1}}
]);
export const SEASON_REWARD_TRACK=Object.freeze(Array.from({length:30},(_,i)=>({level:i+1,free:{greenDust:10+(i+1)*2,crumb:1},milestone:(i+1)%5===0})));
export const DRUID_FORMS=Object.freeze({stag:{name:'Hirschgestalt',damage:1.16,speed:1.22,defense:1,interval:.94},bear:{name:'Bärengestalt',damage:1.3,speed:.94,defense:7,interval:1.04},owl:{name:'Eulengestalt',damage:1.2,speed:1.08,defense:2,interval:.84}});
export function druidFormFor(item={}){const e=item?.engraving;return e==='bulwark'?'bear':e==='wind'?'stag':'owl';}
export const LIVE_SERVICE_CONFIG=Object.freeze({revision:2,rotationHours:168,missionTree:'ashen-branches',rewardTrack:'ashen-30'});
