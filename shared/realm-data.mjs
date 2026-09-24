// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Original maps, names, content and balance. No proprietary game resources.
import { TILE, rng, dist, clamp, CLASSES } from './data.mjs';
export const REALM_LIMIT = 40;
export const REGION_LIMIT = 64;
export const EQUIP_SLOTS = ['weapon','ability','armor','charm'];
export const SLOT_LABELS = {weapon:'Waffe',ability:'Fähigkeit',armor:'Rüstung',charm:'Ring',potion:'Stat-Trank'};
export const STAT_LABELS = {atk:'Angriff',def:'Verteidigung',spd:'Tempo',dex:'Geschick',vit:'Vitalität',wis:'Weisheit',life:'Leben',mana:'Mana'};
export const STAT_CAPS = {atk:20,def:20,spd:20,dex:20,vit:20,wis:20,life:20,mana:20};
export const DUNGEONS = {
  tide:{name:'Gezeitenhöhle',subtitle:'Küste · Stufe 1–8',theme:'tide',boss:'captain',level:1,stat:'spd',color:'#78bfd2'},
  grove:{name:'Dornenhain',subtitle:'Wald · Stufe 8–16',theme:'grove',boss:'matriarch',level:8,stat:'dex',color:'#a9ce77'},
  crypt:{name:'Vergessene Krypta',subtitle:'Hochland · Stufe 15–20',theme:'crypt',boss:'lich',level:15,stat:'wis',color:'#baa5de'},
  citadel:{name:'Aschenzitadelle',subtitle:'Realm-Finale · Stufe 20',theme:'citadel',boss:'sovereign',level:20,stat:'life',color:'#dfae6e'},
  sewer:{name:'Versunkene Kanäle',subtitle:'Küste · Stufe 5–12',theme:'sewer',boss:'plague',level:5,stat:'vit',color:'#b3bc78'},
  hive:{name:'Bernsteinnest',subtitle:'Wald · Stufe 10–20',theme:'hive',boss:'queen',level:10,stat:'atk',color:'#dabc76'},
  forge:{name:'Schlackenschmiede',subtitle:'Rissland · Stufe 20',theme:'forge',boss:'smith',level:20,stat:'def',color:'#e4a170'},
  frost:{name:'Winterpalast',subtitle:'Schnee · Stufe 20',theme:'frost',boss:'frostking',level:20,stat:'mana',color:'#a4d6ea'},
  temple:{name:'Tempel der Echos',subtitle:'Hochland · Stufe 20',theme:'temple',boss:'oracle',level:20,stat:'wis',color:'#d9cf91'},
  void:{name:'Herz der Leere',subtitle:'Endgame · Stufe 20',theme:'void',boss:'voidheart',level:20,stat:'life',color:'#c1a1ea'},
  blood:{name:'Blutkatakomben',subtitle:'Endgame · Stufe 20',theme:'blood',boss:'bloodlord',level:20,stat:'atk',color:'#c87575'},
  lab:{name:'Sternenlabor',subtitle:'Endgame · Stufe 20',theme:'lab',boss:'starengine',level:20,stat:'dex',color:'#77bfd1'},
  bastion:{name:'Zerbrochene Bastion',subtitle:'Endgame+ · Stufe 20',theme:'bastion',boss:'shardking',level:20,stat:'def',color:'#b9a1d8'},
  dusk:{name:'Dämmergrund',subtitle:'Spätes Endgame · Stufe 20',theme:'dusk',boss:'duskmaw',level:20,stat:'mana',color:'#8b76b7'},
  mirror:{name:'Spiegelarchiv',subtitle:'Endgame · Stufe 20',theme:'mirror',boss:'mirrorwarden',level:20,stat:'wis',color:'#9bb5ca'},
  spore:{name:'Sporekathedrale',subtitle:'Endgame · Stufe 20',theme:'spore',boss:'sporefather',level:20,stat:'vit',color:'#9bc47a'},
  storm:{name:'Sturmobservatorium',subtitle:'Endgame+ · Stufe 20',theme:'storm',boss:'stormseer',level:20,stat:'spd',color:'#7fb9dc'},
  abyss:{name:'Schwarze Sternenschlucht',subtitle:'Spätes Endgame · Stufe 20',theme:'abyss',boss:'abyssstar',level:20,stat:'mana',color:'#635d90'}
};
export function isBoss(kind){return ['captain','matriarch','lich','sovereign','boss','plague','queen','smith','frostking','oracle','voidheart','bloodlord','starengine','shardking','duskmaw','mirrorwarden','sporefather','stormseer','abyssstar'].includes(kind);}
export function makeRealmMap(kind='nexus',seed=48129,theme='tide'){
  const r=rng(seed),nexus=kind==='nexus',realm=kind==='realm';
  const width=nexus?44:realm?128:66,height=nexus?36:realm?104:48;
  const spawn=nexus?{x:880,y:820}:realm?{x:2540,y:3620}:{x:340,y:1620};
  const tiles=[],decorations=[],landmarks=[],rooms=[];
  if(!nexus&&!realm){
    // A connected six-room route with corridors; the boss room is at the end.
    const layouts={
      sewer:[[3,33,12,43],[5,17,17,28],[23,28,36,43],[29,11,42,23],[47,23,61,35],[51,4,62,17]],
      hive:[[3,33,12,43],[17,28,30,41],[30,30,43,43],[25,13,40,25],[44,14,59,27],[51,4,62,17]],
      forge:[[3,33,12,43],[17,33,29,44],[33,28,46,42],[36,13,48,24],[17,7,31,21],[51,4,62,17]],
      frost:[[3,33,12,43],[3,13,16,26],[22,3,36,16],[23,24,37,40],[45,24,61,40],[51,4,62,17]],
      temple:[[3,33,12,43],[20,32,32,43],[3,9,16,23],[22,13,40,29],[44,26,60,40],[51,4,62,17]],
      void:[[3,33,12,43],[19,26,32,42],[36,32,50,43],[30,14,46,27],[8,5,24,19],[51,4,62,17]],
      blood:[[3,33,12,43],[16,30,29,43],[31,24,44,38],[17,10,31,23],[39,9,53,22],[51,4,62,17]],
      lab:[[3,33,12,43],[15,28,29,42],[33,30,47,43],[23,13,38,26],[42,14,59,28],[51,4,62,17]],
      bastion:[[3,33,12,43],[18,34,31,44],[34,25,49,39],[8,14,23,28],[30,8,45,21],[51,4,62,17]],
      dusk:[[3,33,12,43],[17,25,31,41],[35,31,50,43],[28,13,44,27],[7,5,22,19],[51,4,62,17]],
      mirror:[[3,33,12,43],[15,31,28,43],[31,26,44,39],[19,12,33,25],[39,10,54,23],[51,4,62,17]],
      spore:[[3,33,12,43],[16,28,30,42],[33,31,46,44],[24,13,39,27],[42,15,58,29],[51,4,62,17]],
      storm:[[3,33,12,43],[18,34,31,44],[35,28,49,41],[10,13,24,26],[31,8,46,21],[51,4,62,17]],
      abyss:[[3,33,12,43],[18,26,31,42],[35,32,49,43],[28,13,44,27],[8,5,23,19],[51,4,62,17]]
    };rooms.push(...(layouts[theme]||[[3,33,12,43],[18,31,30,44],[18,16,31,27],[35,15,48,29],[37,3,49,12],[51,4,62,17]]));
  }
  const advanced=['sewer','hive','forge','frost','temple','void','blood','lab','bastion','dusk','mirror','spore','storm','abyss'].includes(theme);
  const centers=rooms.map(([a,b,c,d])=>({x:Math.floor((a+c)/2),y:Math.floor((b+d)/2)}));
  const joined=(x,y)=>centers.some((c,i)=>{if(!i)return false;const a=centers[i-1];return (Math.abs(y-a.y)<=2&&x>=Math.min(a.x,c.x)&&x<=Math.max(a.x,c.x))||(Math.abs(x-c.x)<=2&&y>=Math.min(a.y,c.y)&&y<=Math.max(a.y,c.y));});
  const corridor=(x,y)=>advanced?joined(x,y):(y>=36&&y<=39&&x>=10&&x<=26)||(x>=23&&x<=26&&y>=20&&y<=37)||(y>=20&&y<=23&&x>=25&&x<=43)||(x>=41&&x<=44&&y>=8&&y<=24)||(y>=8&&y<=11&&x>=43&&x<=57);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    let type=0,biome='grass';const border=x<2||y<2||x>=width-2||y>=height-2;
    if(nexus){
      const lawn=(x<9||x>34||y<6||y>29);biome=lawn?'garden':'stone';type=border?3:0;
      if(!border&&((x>=10&&x<=14&&y>=9&&y<=13)||(x>=29&&x<=33&&y>=9&&y<=13))) {biome='water';type=3;}
      if((x>=18&&x<=25&&y>=7&&y<=25)||(y>=19&&y<=22&&x>=4&&x<=39)){type=1;biome='stone';}
    }else if(realm){
      const shore=height-9-Math.sin(x/8)*2;
      biome=y>shore?'water':y>height-22?'sand':y>height-45?'grass':y>height-69?'forest':x<43?'snow':x>85?'rift':'highland';
      type=biome==='water'||border?3:0;
      const path=Math.abs(x-63-Math.sin(y/13)*7)<2||Math.abs(y-61)<2||Math.abs(y-38)<2;
      if(path&&type!==3){type=1;biome='path';}
      if(!border&&type===0&&y<height-25&&r()<.025&&!path){type=2;}
      if(Math.hypot(x-63.5,y-90.5)<6){type=0;biome=y>88?'sand':'grass';}
    }else{
      biome=theme;type=rooms.some(([a,b,c,d])=>x>=a&&x<=c&&y>=b&&y<=d)||corridor(x,y)?1:2;
      if(border)type=3;
    }
    const tile={x,y,type,biome,variant:Math.floor(r()*16)};tiles.push(tile);
    if(type===0&&dist({x:x*TILE+20,y:y*TILE+20},spawn)>110){
      let chance=nexus?(biome==='garden'?.055:0):biome==='forest'?.17:.085;
      if(r()<chance)decorations.push({x:x*TILE+20,y:y*TILE+20,kind:nexus?'tree':biome==='sand'?(r()<.5?'palm':'shell'):biome==='snow'?'pine':biome==='rift'?'crystal':biome==='highland'?'rock':r()<.62?'tree':'flowers',variant:r()});
    }
    if(!nexus&&!realm&&type===1&&x%8===0&&y%8===0)decorations.push({x:x*TILE+20,y:y*TILE+20,kind:theme==='grove'?'mushroom':'torch',variant:r()});
  }
  if(nexus){
    for(const [x,y]of [[340,570],[1420,570],[340,1030],[1420,1030],[610,1090],[1150,1090],[430,410],[1330,410]])decorations.push({x,y,kind:'tree',variant:.3});
    for(const [x,y]of [[660,675],[1100,675],[660,900],[1100,900]])decorations.push({x,y,kind:'flowers',variant:.2});
    decorations.push({x:880,y:675,kind:'fountain',variant:0},{x:500,y:790,kind:'vault',variant:0},{x:1260,y:790,kind:'merchant',variant:0},{x:640,y:430,kind:'arch',variant:0},{x:1120,y:430,kind:'arch',variant:1});
    decorations.push({x:650,y:1160,kind:'guildhall',variant:0},{x:1100,y:1160,kind:'forge',variant:0},{x:420,y:1140,kind:'questboard',variant:0},{x:1330,y:1140,kind:'petgarden',variant:0});
    landmarks.push({x:650,y:1160,label:'GILDENHALLE'},{x:1100,y:1160,label:'SCHMIEDE'},{x:420,y:1140,label:'AUFTRÄGE'},{x:1330,y:1140,label:'GEFÄHRTEN'},{x:880,y:675,label:'RIFTWACHT'},{x:500,y:790,label:'TRESOR'},{x:1260,y:790,label:'VERSORGUNG'});
  }
  if(realm){
    for(const b of [{x:2540,y:3620,label:'Küstenlicht'},{x:2540,y:2460,label:'Waldlicht'},{x:2540,y:1540,label:'Hochlandlicht'}]){landmarks.push({...b,beacon:true});decorations.push({...b,kind:'beacon',variant:0});
      for(let ty=Math.floor(b.y/TILE)-3;ty<=Math.floor(b.y/TILE)+3;ty++)for(let tx=Math.floor(b.x/TILE)-3;tx<=Math.floor(b.x/TILE)+3;tx++){const t=tiles[ty*width+tx];if(t){t.type=1;t.biome='path';}}
    }
  }
  return {kind,theme,seed,width,height,spawn,tiles,decorations,landmarks,rooms,boss:{x:2260,y:420}};
}
export function weaponFamily(id){return ['ranger','huntress','bard'].includes(id)?'bow':['shade','assassin','trickster'].includes(id)?'dagger':['ninja','samurai','kensei'].includes(id)?'katana':['warden','warrior','paladin'].includes(id)?'sword':['cleric','sorcerer','summoner'].includes(id)?'wand':['druid'].includes(id)?'staff':'staff';}
export function armorFamily(id){return ['warden','warrior','paladin','samurai','kensei'].includes(id)?'heavy':['ranger','huntress','shade','assassin','trickster','ninja','druid'].includes(id)?'leather':'robe';}
export function classWeapon(id){return {bow:'Bogen',dagger:'Dolch',katana:'Katana',sword:'Klinge',wand:'Lichtstab',staff:'Runenstab'}[weaponFamily(id)];}
export function canEquip(item,classId){if(item.classId==='all'||!item.classId)return true;if(item.slot==='weapon')return weaponFamily(item.classId)===weaponFamily(classId);if(item.slot==='armor')return armorFamily(item.classId)===armorFamily(classId);return item.classId===classId;}

export function makeItem(id,classId,slot='weapon',tier=0,rarity=0){
  const names={weapon:classWeapon(classId),ability:{warden:'Schild',warrior:'Kriegshorn',ranger:'Köcher',weaver:'Zauber',cleric:'Gebetsbuch',shade:'Umhang',paladin:'Siegel',assassin:'Giftphiole',necromancer:'Totenschädel',huntress:'Falle',mystic:'Zeitkugel',trickster:'Prisma',sorcerer:'Zepter',ninja:'Wurfstern',samurai:'Wakizashi',bard:'Laute',summoner:'Rufstab',kensei:'Scheide',druid:'Wildsiegel'}[classId],armor:armorFamily(classId)==='heavy'?'Plattenrüstung':armorFamily(classId)==='leather'?'Lederrüstung':'Robe',charm:'Siegelring'};
  const adjectives=['Schlichte','Verstärkte','Bewährte','Verzauberte','Erhabene','Uralte','Sternen','Regenten'];
  return {id,slot,tier:clamp(Math.floor(tier),0,7),rarity:clamp(rarity,0,3),classId:slot==='charm'?'all':classId,name:`${adjectives[Math.min(7,tier)]} ${names[slot]||'Relikt'}`,stat:Math.min(100,slot==='weapon'?tier*4+2:slot==='armor'?tier*2+1:tier+1)};
}
