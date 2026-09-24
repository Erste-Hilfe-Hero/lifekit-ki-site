// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// World simulation and account state are authoritative, never accepted from clients.
import { Engine, cleanProfile, cleanName, segmentDistance } from './engine.mjs';
import { CLASSES, ENEMY_TYPES, HOME, TILE, clamp, dist, walkable, rng, xpNeeded } from './data.mjs';
import { makeRealmMap, makeItem, DUNGEONS, EQUIP_SLOTS, STAT_LABELS, STAT_CAPS, REALM_LIMIT, REGION_LIMIT, isBoss, canEquip } from './realm-data.mjs';
import { DUNGEON_MODIFIERS, ENCHANTMENTS, CRUCIBLE_MODES, rollDungeonModifiers, enchantRank, liveEventFor, ENGRAVINGS, DRUID_FORMS, druidFormFor } from './endgame-data.mjs';
import { vaultCapacity } from './monetization-data.mjs';
const rCopy=v=>structuredClone(v);
const rNum=(v,d=0)=>typeof v==='number'&&Number.isFinite(v)?v:d;
export function realmItem(v){return v&&typeof v.id==='string'&&v.id.length<100&&[...EQUIP_SLOTS,'potion'].includes(v.slot)&&typeof v.name==='string'&&v.name.length<80&&Number.isInteger(v.rarity)&&v.rarity>=0&&v.rarity<=3&&Number.isFinite(v.stat)&&v.stat>=0&&v.stat<=250&&(v.slot!=='potion'||Object.hasOwn(STAT_CAPS,v.statKey))&&(!v.classId||v.classId==='all'||Object.hasOwn(CLASSES,v.classId));}
export function cleanRealmProfile(raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  const p=cleanProfile(raw),seen=new Set();
  const item=v=>{if(!realmItem(v)||seen.has(v.id))return null;seen.add(v.id);return rCopy(v);};
  p.equipment={};for(const s of EQUIP_SLOTS){const v=raw.equipment?.[s];if(v?.slot===s){const q=item(v);if(q)p.equipment[s]=q;}}
  p.inventory=(Array.isArray(raw.inventory)?raw.inventory:[]).map(item).filter(Boolean).slice(0,8);
  p.vault=(Array.isArray(raw.vault)?raw.vault:[]).map(item).filter(Boolean).slice(0,64);
  p.version=2;p.fame=clamp(Math.floor(rNum(raw.fame)),0,1e8);p.characterFame=clamp(Math.floor(rNum(raw.characterFame)),0,1e8);
  p.bonuses={};for(const key of Object.keys(STAT_CAPS))p.bonuses[key]=clamp(Math.floor(rNum(raw.bonuses?.[key])),0,STAT_CAPS[key]);
  p.manaPotions=clamp(Math.floor(rNum(raw.manaPotions,3)),0,6);p.potions=clamp(Math.floor(rNum(raw.potions,3)),0,6);
  p.teleportCd=clamp(rNum(raw.teleportCd),0,10);p.kills=clamp(Math.floor(rNum(raw.kills)),0,1e7);
  p.worldId=typeof raw.worldId==='string'&&raw.worldId.length<100?raw.worldId:'nexus';
  p.x=clamp(rNum(raw.x,880),80,20000);p.y=clamp(rNum(raw.y,820),80,20000);
  p.started=raw.started===true;p.seasonal=raw.seasonal===true;p.seasonId=typeof raw.seasonId==='string'?raw.seasonId.slice(0,40):null;p.crucibleMode=typeof raw.crucibleMode==='string'&&Object.hasOwn(CRUCIBLE_MODES,raw.crucibleMode)?raw.crucibleMode:null;p.skin=typeof raw.skin==='string'?raw.skin.slice(0,32):'default';p.title=typeof raw.title==='string'?raw.title.slice(0,40):'Reisender';p.formMeter=clamp(rNum(raw.formMeter),0,100);p.formTimer=clamp(rNum(raw.formTimer),0,12);p.deathRecord=raw.deathRecord&&typeof raw.deathRecord==='object'?{level:clamp(rNum(raw.deathRecord.level,1),1,20),fame:clamp(rNum(raw.deathRecord.fame),0,1e8),killer:cleanName(raw.deathRecord.killer),at:rNum(raw.deathRecord.at)}:null;
  if(p.dead){p.hp=0;p.equipment={};p.inventory=[];p.bonuses=Object.fromEntries(Object.keys(STAT_CAPS).map(k=>[k,0]));}
  return p;
}
export class RealmWorld extends Engine {
  spawnWave(){} // The base simulator has no authority over realm content.
  constructor(manager,id,kind='realm',seed=48129,theme='tide',meta={}){
    super({seed});this.manager=manager;this.worldId=id;this.kind=kind;this.theme=theme;this.modifiers=Array.isArray(meta.modifiers)?meta.modifiers.filter(id=>Object.hasOwn(DUNGEON_MODIFIERS,id)).slice(0,3):[];
    this.echo=meta.echo===true;this.liveEvent=meta.liveEvent===true;this.startedAt=Number.isFinite(meta.startedAt)?meta.startedAt:manager.time;this.completedAt=0;this.completionTime=0;
    this.map=makeRealmMap(kind,seed,theme);this.portals=[];this.graves=[];this.respawns=[];this.score=0;this.scoreTarget=120;this.closingAt=0;this.completed=false;this.time=manager.time;
    this.bossState=kind==='nexus'?'safe':'awake';this.wave=DUNGEONS[theme]?.level||1;this.ageEmpty=0;
    this.populate();
  }
  safe(p){return this.kind==='nexus'||(this.kind==='realm'&&this.map.landmarks.some(b=>b.beacon&&dist(p,b)<92));}
  modProduct(key){let v=1;for(const id of this.modifiers){const n=DUNGEON_MODIFIERS[id]?.[key];if(Number.isFinite(n))v*=n;}return v;}
  stats(p){
    const s=super.stats(p),b=p.bonuses||{},c=CLASSES[p.classId],asc=p.account?.ascension?.[p.classId]||{};
    s.maxHP+=rNum(b.life)*5+rNum(asc.life)*5;s.maxMP+=rNum(b.mana)*5+rNum(asc.mana)*5;s.damage+=rNum(b.atk)*1.5+rNum(asc.atk)*1.2;
    s.defense+=rNum(b.def)+rNum(asc.def);s.speed+=rNum(b.spd)*2+rNum(asc.spd)*1.5;s.interval=Math.max(.09,c.interval/(1+rNum(b.dex)*.022+rNum(asc.dex)*.012+(p.berserk>0?.45:0)));
    s.vitality=1.5+rNum(b.vit)*.3+rNum(asc.vit)*.15;s.wisdom=5+rNum(b.wis)*.3+rNum(asc.wis)*.15;
    for(const item of Object.values(p.equipment||{})){const ench=ENCHANTMENTS[item?.enchantment];if(!ench)continue;const rank=Math.max(1,enchantRank(item));const value=ench.value*(1+(.55*(rank-1)));if(ench.kind==='damage')s.damage*=1+value;if(ench.kind==='speed')s.speed*=1+value;if(ench.kind==='defense')s.defense+=value;if(ench.kind==='interval')s.interval*=Math.max(.55,1-value);if(ench.kind==='hp')s.maxHP+=value;if(ench.kind==='mp')s.maxMP+=value;}
    const crucible=CRUCIBLE_MODES[p.crucibleMode];if(crucible){if(crucible.damage)s.damage*=crucible.damage;if(crucible.hp)s.maxHP*=crucible.hp;if(crucible.speed)s.speed*=crucible.speed;}
    if(p.formTimer>0&&p.classId==='druid'){const f=DRUID_FORMS[p.druidForm||druidFormFor(p.equipment?.ability)]||DRUID_FORMS.owl;s.damage*=f.damage;s.speed*=f.speed;s.defense+=f.defense;s.interval*=f.interval;} for(const item of Object.values(p.equipment||{})){const g=ENGRAVINGS[item?.engraving];if(!g)continue;if(g.kind==='damage')s.damage*=1+g.value;if(g.kind==='speed')s.speed*=1+g.value;if(g.kind==='defense')s.defense+=g.value;if(g.kind==='mp')s.maxMP+=g.value;}
    if(p.empowered>0)s.damage*=1.22;if(p.haste>0)s.speed*=1.35;if(p.inspired>0)s.defense+=8;
    if(p.account?.petActive==='beetle'&&p.crucibleMode!=='petless')s.defense+=3;if(p.account?.petActive==='hare'&&p.crucibleMode!=='petless'&&!this.safe(p))s.speed*=1.06;
    return s;
  }
  populate(){
    if(this.kind==='nexus'){
      this.portals=[{id:'portal-elm',x:640,y:455,name:'Smaragd-01',target:'realm-1',kind:'realm',color:'#8fcf8b',life:Infinity},{id:'portal-ash',x:1120,y:455,name:'Smaragd-02',target:'realm-2',kind:'realm',color:'#85bbdc',life:Infinity}];return;
    }
    if(this.kind==='realm'){
      const rand=rng(this.seed+901);
      for(let i=0;i<128;i++){
        const y=400+rand()*3210,x=230+rand()*4660;
        const biome=y>3240?['crab','raider']:y>2490?['hollow','wasp','serpent']:y>1580?['skeleton','cultist','treant']:['golem','wyrm','demon'];
        const kind=biome[i%biome.length];if(walkable(this.map,x,y,ENEMY_TYPES[kind].radius)&&!this.safe({x,y}))this.spawnEnemy(kind,x,y);
      }
      // Guaranteed encounters are reachable from the starting shore; their portals are real shared instances.
      for(const [kind,x,y,dungeon]of [['captain',2860,3520,'tide'],['matriarch',3030,2410,'grove'],['lich',2230,1380,'crypt'],['plague',1790,3010,'sewer'],['queen',3360,2170,'hive'],['smith',4030,1050,'forge'],['frostking',910,990,'frost'],['oracle',2850,740,'temple']]){
        const e=this.spawnEnemy(kind,x,y);e.eventBoss=true;e.dungeon=dungeon;e.hp=e.maxHP=Math.round(ENEMY_TYPES[kind].hp*.65);
      }
      for(const [x,y]of [[2350,3450],[2710,3350],[2270,3550],[2770,3600]])this.spawnEnemy('crab',x,y);
    }else{
      const kinds=this.theme==='tide'?['crab','raider']:this.theme==='grove'?['serpent','wasp','treant']:this.theme==='crypt'?['skeleton','ghost','cultist']:this.theme==='sewer'?['rat','serpent','ghost']:this.theme==='hive'?['scarab','wasp','treant']:this.theme==='forge'?['imp','golem','demon']:this.theme==='frost'?['frostling','wyrm','ghost']:this.theme==='temple'?['sentinel','cultist','golem']:this.theme==='void'?['shadebeast','demon','sentinel']:this.theme==='blood'?['acolyte','demon','ghost']:this.theme==='lab'?['construct','sentinel','imp']:this.theme==='bastion'?['shardling','golem','demon']:this.theme==='dusk'?['duskspawn','shadebeast','sentinel']:this.theme==='mirror'?['mirrorkin','ghost','construct']:this.theme==='spore'?['sporeling','treant','scarab']:this.theme==='storm'?['stormling','wyrm','imp']:this.theme==='abyss'?['abyssling','shadebeast','demon']:['golem','demon','wyrm'];
      this.map.rooms.slice(1,-1).forEach(([x1,y1,x2,y2],i)=>{for(let j=0;j<5;j++){const x=(x1+2+this.random()*(x2-x1-4))*TILE,y=(y1+2+this.random()*(y2-y1-4))*TILE;this.spawnEnemy(kinds[(i+j)%kinds.length],x,y);}});
      const b=this.spawnEnemy(DUNGEONS[this.theme].boss,this.map.boss.x,this.map.boss.y);b.dungeonBoss=true;
      this.portals.push({id:this.id('exit'),x:this.map.spawn.x,y:this.map.spawn.y+64,name:'Zum Nexus',target:'nexus',kind:'nexus',life:Infinity});
    }
  }
  spawnEnemy(kind,x,y){
    const old=this.wave;this.wave=1;const e=super.spawnEnemy(kind,x,y);this.wave=old;
    if(this.kind==='dungeon'&&this.modifiers.length){const hp=this.modProduct('enemyHP')*(isBoss(kind)?this.modProduct('bossHP'):1);e.maxHP=Math.round(e.maxHP*hp);e.hp=e.maxHP;}
    e.homeX=x;e.homeY=y;e.contributors={};e.slow=0;e.stun=0;e.cooldown=.8+this.random()*1.2;e.pattern=0;e.scalePlayers=1;
    return e;
  }
  scaleBosses(){const n=Math.max(1,this.players.size);for(const b of this.enemies.filter(e=>isBoss(e.kind))){if(n>b.scalePlayers){const scale=(1+(n-1)*.35)/(1+(b.scalePlayers-1)*.35);b.maxHP=Math.round(b.maxHP*scale);b.hp=Math.round(b.hp*scale);b.scalePlayers=n;}}}
  cast(p){
    const c=CLASSES[p.classId];if(p.dead||p.abilityCd>0||p.mp<c.cost||this.safe(p))return false;
    p.mp-=c.cost;p.abilityCd=Math.max(.8,(c.cooldown-(p.equipment.ability?.stat||0)*.14)*(p.account?.petActive==='owl'&&p.crucibleMode!=='petless'?.92:1));
    const damage=this.stats(p).damage*(1+(p.equipment.ability?.stat||0)*.05);
    if(p.classId==='warden'){p.shield=2.5;for(const e of this.enemies)if(dist(p,e)<180){this.damageEnemy(e,damage*2,p.id);e.stun=isBoss(e.kind)?.25:2;}}
    if(p.classId==='ranger')for(let i=-3;i<=3;i++)this.projectile(p,p.angle+i*.10,'player',damage*1.4,700,1,true,true);
    if(p.classId==='weaver'){
      // A spell burst at the aim point rather than a universal radial attack.
      const source={...p,x:p.x+Math.cos(p.angle)*230,y:p.y+Math.sin(p.angle)*230};
      for(let i=0;i<16;i++)this.projectile(source,i*Math.PI/8,'player',damage*1.35,380,.65,true);
    }
    if(p.classId==='cleric')for(const q of this.players.values())if(!q.dead&&dist(p,q)<360){const heal=CRUCIBLE_MODES[q.crucibleMode]?.healing??1;if(heal>0){q.hp=Math.min(this.stats(q).maxHP,q.hp+(110+damage*1.4)*heal);this.event('heal',{playerId:q.id,x:q.x,y:q.y});}}
    if(p.classId==='shade')p.invisible=4;
    if(p.classId==='warrior')for(const q of this.players.values())if(!q.dead&&dist(p,q)<360)q.berserk=6;
    if(p.classId==='druid'){p.formMeter=Math.min(100,(p.formMeter||0)+42);if(p.formMeter>=100){p.formMeter=0;p.formTimer=8;p.druidForm=druidFormFor(p.equipment?.ability);this.event('notice',{playerId:p.id,text:'Wildgestalt entfesselt: '+(DRUID_FORMS[p.druidForm]?.name||'Wildgestalt')+'!'});}else{for(const e of this.enemies)if(e.hp>0&&dist(p,e)<220)this.damageEnemy(e,damage*1.8,p.id,true);}}
    this.manager.castExtra?.(this,p,damage);
    this.event('ability',{playerId:p.id,classId:p.classId,x:p.x,y:p.y});return true;
  }
  damagePlayer(p,damage,killer='Kreatur'){
    if(p.dead||this.safe(p)||p.invulnerable>0||!p.connected)return;
    const level=p.level,fame=p.characterFame||0;
    const incoming=CRUCIBLE_MODES[p.crucibleMode]?.incoming||1;super.damagePlayer(p,damage*incoming);p.lastHit=this.time;
    if(p.dead){p.mp=0;p.fame=(p.fame||0)+fame;p.characterFame=0;p.bonuses=Object.fromEntries(Object.keys(STAT_CAPS).map(k=>[k,0]));p.kills=0;p.invisible=0;p.berserk=0;
      p.deathRecord={level,fame,killer:cleanName(killer),at:Date.now()};
      this.manager.onCharacterDeath?.(p);
      this.graves.push({id:this.id('grave'),x:p.x,y:p.y,name:p.name,level,life:600});this.graves=this.graves.slice(-50);
    }
  }
  lootPoint(x,y){let px=x,py=y;for(const portal of this.portals){const d=Math.hypot(px-portal.x,py-portal.y);if(d<95){const a=d>1?Math.atan2(py-portal.y,px-portal.x):0;px=portal.x+Math.cos(a)*105;py=portal.y+Math.sin(a)*105;}}return{x:px,y:py};}
  giveXP(p,amount){p.characterFame=(p.characterFame||0)+Math.max(1,Math.floor(amount/20));super.giveXP(p,amount);}
  damageEnemy(e,damage,owner,piercing=false){
    if(e.hp<=0)return;const p=this.players.get(owner);if(!p||p.dead)return;
    const def=e.exposed>0?0:isBoss(e.kind)?8:e.kind==='golem'?12:2;
    const value=Math.round(piercing?damage:Math.max(damage*.15,damage-def));
    e.hp-=value;e.hitFlash=.1;e.contributors[p.id]=(e.contributors[p.id]||0)+value;
    this.event('hit',{x:e.x,y:e.y,value});if(e.hp>0)return;
    this.manager.onEnemyKilled?.(this,e,p);
    p.kills++;this.kills++;this.score+=e.eventBoss?25:1;
    for(const q of this.players.values())if(!q.dead&&q.connected&&dist(q,e)<760)this.giveXP(q,ENEMY_TYPES[e.kind].xp);
    for(const q of this.players.values()){
      if(q.dead||!q.connected||!e.contributors[q.id])continue;
      const rotation=liveEventFor();const liveBonus=this.kind==='dungeon'&&rotation.theme===this.theme?(this.echo?rotation.echoReward:rotation.reward):1;const rewardMult=this.modProduct('reward')*this.modProduct('loot')*(CRUCIBLE_MODES[q.crucibleMode]?.loot||1)*liveBonus*(this.echo?1.2:1);const amount=Math.max(1,Math.round((isBoss(e.kind)?35:2+Math.floor(this.random()*5))*rewardMult));
      const coinPos=this.lootPoint(e.x,e.y);this.loot.push({id:this.id('coin'),owner:q.id,kind:'coin',amount,x:coinPos.x,y:coinPos.y,life:180});
      if(isBoss(e.kind)||this.random()<Math.min(.8,.36*this.modProduct('loot')*(CRUCIBLE_MODES[q.crucibleMode]?.loot||1))){
        const tier=isBoss(e.kind)?e.kind==='sovereign'?5+Math.floor(this.random()*3):e.kind==='lich'?4:e.kind==='matriarch'?3:2:Math.min(4,Math.floor((3600-e.homeY)/800)+Math.floor(this.random()*2));
        const rare=this.random();const rarity=isBoss(e.kind)?rare<.08?3:rare<.4?2:1:tier>2?1:0;
        const slot=EQUIP_SLOTS[Math.floor(this.random()*4)],item=makeItem(this.id('item'),q.classId,slot,Math.max(0,tier),rarity);if(isBoss(e.kind)&&rarity>=2&&this.random()<.32)item.unique=true;if(isBoss(e.kind)&&this.random()<.08)item.setId='set-'+e.kind;if((item.tier||0)>=4)item.enchantSlots=1;if(isBoss(e.kind)&&this.random()<.025)item.shiny=true;
        const itemPos=this.lootPoint(e.x+20,e.y+16);this.loot.push({id:this.id('loot'),owner:q.id,kind:'item',item,x:itemPos.x,y:itemPos.y,life:180});if(item.shiny)this.event('shiny',{playerId:q.id,x:itemPos.x,y:itemPos.y,text:item.name});
        if(isBoss(e.kind)){
          const keys=Object.keys(STAT_CAPS),key=e.dungeonBoss?DUNGEONS[this.theme].stat:keys[Math.floor(this.random()*6)];
          const statPos=this.lootPoint(e.x-20,e.y+16);this.loot.push({id:this.id('loot'),owner:q.id,kind:'item',item:{id:this.id('stat'),name:STAT_LABELS[key]+'-Trank',slot:'potion',statKey:key,stat:1,rarity:1,tier:0,classId:'all'},x:statPos.x,y:statPos.y,life:180});
        }
      }
    }
    if(this.kind==='realm'){
      this.respawns.push({kind:e.kind,x:e.homeX,y:e.homeY,at:this.time+(e.eventBoss?180:55),eventBoss:e.eventBoss||false,dungeon:e.dungeon||null});
      const dungeon=e.dungeon||(this.random()<.045?(e.homeY>3000?'tide':e.homeY>1800?'grove':'crypt'):null);
      if(dungeon)this.portals.push({id:this.id('portal'),x:e.x,y:e.y-44,name:DUNGEONS[dungeon].name,kind:'dungeon',theme:dungeon,target:null,life:110,modifiers:rollDungeonModifiers(this.seed+this.kills+dungeon.length,dungeon)});
      if(this.score>=this.scoreTarget&&!this.closingAt){this.closingAt=this.time+20;this.manager.announce('Das Realm schließt! In 20 Sekunden beginnt die Aschenzitadelle.',this.worldId);}
    }
    if(e.dungeonBoss){this.completed=true;this.completedAt=this.time;this.completionTime=Math.max(.1,this.time-this.startedAt);this.bossState='defeated';this.portals.push({id:this.id('exit'),x:e.x,y:e.y-65,name:'Beute sichern · Nexus',kind:'nexus',target:'nexus',life:Infinity});this.event('victory',{x:e.x,y:e.y,time:this.completionTime,echo:this.echo});}
    this.event('kill',{x:e.x,y:e.y,kind:e.kind});
  }
  step(dt){
    if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);this.time+=dt;
    for(const p of this.players.values()){
      if(p.dead)continue;
      for(const key of ['fireCd','abilityCd','dashCd','shield','invulnerable','hitFlash','invisible','berserk','teleportCd','empowered','haste','inspired','formTimer'])p[key]=Math.max(0,rNum(p[key])-dt);
      if(!p.connected||this.time-p.lastInput>.7)p.input={dx:0,dy:0,angle:p.angle,fire:false,auto:false};
      const s=this.stats(p),c=CLASSES[p.classId];
      const regen=this.kind==='dungeon'?this.modProduct('regen'):1,healMod=CRUCIBLE_MODES[p.crucibleMode]?.healing??1;p.hp=Math.min(s.maxHP,p.hp+dt*(this.safe(p)?55:this.time-(p.lastHit||0)>3?s.vitality*regen*healMod:0));
      p.mp=Math.min(s.maxMP,p.mp+dt*(this.safe(p)?40:s.wisdom*regen));
      p.angle=p.input.angle;this.move(p,p.input.dx*s.speed,p.input.dy*s.speed,dt);
      let target=null;if(p.input.auto)for(const e of this.enemies)if(e.hp>0&&dist(e,p)<c.range*(p.inspired>0?1.25:1)&&(!target||dist(e,p)<dist(target,p)))target=e;
      if(target)p.angle=Math.atan2(target.y-p.y,target.x-p.x);
      if((p.input.fire||target)&&p.fireCd<=0&&!this.safe(p)){
        p.fireCd=s.interval;p.invulnerable=0;if(p.classId==='druid')p.formMeter=Math.min(100,(p.formMeter||0)+2.5);this.projectile(p,p.angle,'player',s.damage,650,c.range*(p.inspired>0?1.25:1)/650,p.classId==='ranger');
        if(p.classId==='ranger'&&(p.equipment.weapon?.tier||0)>=3)this.projectile(p,p.angle+.10,'player',s.damage*.7,650,c.range*(p.inspired>0?1.25:1)/650,true);
        this.event('shoot',{playerId:p.id,x:p.x,y:p.y,classId:p.classId});
      }
    }
    const targets=[...this.players.values()].filter(p=>p.connected&&!p.dead&&!this.safe(p)&&p.invisible<=0);
    for(const e of this.enemies){
      if(e.hp<=0)continue;e.cooldown-=dt;e.touchCd-=dt;e.hitFlash=Math.max(0,e.hitFlash-dt);e.stun=Math.max(0,e.stun-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.exposed=Math.max(0,(e.exposed||0)-dt);
      if(e.stun>0)continue;
      let p=null,nearest=isBoss(e.kind)?860:580;for(const q of targets){const d=dist(e,q);if(d<nearest){nearest=d;p=q;}}
      const t=ENEMY_TYPES[e.kind];if(!p){if(dist(e,{x:e.homeX,y:e.homeY})>12)this.move(e,(e.homeX-e.x)/Math.max(1,dist(e,{x:e.homeX,y:e.homeY}))*t.speed,(e.homeY-e.y)/Math.max(1,dist(e,{x:e.homeX,y:e.homeY}))*t.speed,dt);continue;}
      e.angle=Math.atan2(p.y-e.y,p.x-e.x);
      const min=isBoss(e.kind)?250:['cultist','skeleton','ghost','wyrm','demon'].includes(e.kind)?270:80;
      if(nearest>min&&e.telegraph<=0&&!this.safe({x:e.x+Math.cos(e.angle)*50,y:e.y+Math.sin(e.angle)*50}))this.move(e,Math.cos(e.angle)*t.speed*(this.kind==='dungeon'?this.modProduct('enemySpeed'):1)*(e.slow>0?.45:1),Math.sin(e.angle)*t.speed*(this.kind==='dungeon'?this.modProduct('enemySpeed'):1)*(e.slow>0?.45:1),dt);
      const modDamage=this.kind==='dungeon'?this.modProduct('enemyDamage'):1;if(nearest<e.radius+p.radius+5&&e.touchCd<=0){this.damagePlayer(p,t.damage*modDamage,t.name);e.touchCd=.8;}
      if(isBoss(e.kind)){
        e.phase=e.hp/e.maxHP>.67?1:e.hp/e.maxHP>.33?2:3;
        if(e.cooldown<=0&&!e.pendingAttack){e.pendingAttack=true;e.telegraph=.65;e.pattern=(e.pattern+1)%3;}
        if(e.pendingAttack){e.telegraph=Math.max(0,e.telegraph-dt);if(e.telegraph===0){
          const n=e.kind==='captain'?8+e.phase*2:e.kind==='sovereign'?16+e.phase*4:10+e.phase*4;
          const custom=this.manager.bossPattern?.(this,e,p,t)===true;
          if(!custom&&e.pattern!==1)for(let i=0;i<n;i++)this.projectile(e,e.spin+i*Math.PI*2/n,'enemy',t.damage*modDamage,105+e.phase*24,4.8);
          if(!custom&&e.pattern!==0)for(let i=-e.phase;i<=e.phase;i++)this.projectile(e,e.angle+i*.14,'enemy',(t.damage+4)*modDamage,215+e.phase*12,3.2);
          if(e.phase===3&&e.kind==='sovereign')for(let i=0;i<4;i++)this.projectile(e,e.spin+i*Math.PI/2,'enemy',t.damage*modDamage,315,2.6);
          e.spin+=.29;e.pendingAttack=false;e.cooldown=2.6-e.phase*.32;this.event('burst',{x:e.x,y:e.y});
        }}
      }else if(e.cooldown<=0){
        const count=['golem','treant','brute','demon'].includes(e.kind)?3:['serpent','wyrm'].includes(e.kind)?2:1;
        for(let i=0;i<count;i++)this.projectile(e,e.angle+(i-(count-1)/2)*.2,'enemy',t.damage*modDamage,150+(['ghost','skeleton','wasp'].includes(e.kind)?55:0),3.2);
        e.cooldown=e.kind==='wasp'?1.1:e.kind==='golem'?2.8:1.6+this.random()*.65;
      }
    }
    // Swept collisions reused from the tested v0.1 simulator, with realm-sized maps.
    for(const b of this.bullets){
      b.life-=dt;if(b.life<=0)continue;const ox=b.x,oy=b.y,nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;
      const samples=Math.max(1,Math.ceil(Math.hypot(nx-ox,ny-oy)/10));let wall=false;
      for(let i=1;i<=samples;i++)if(!walkable(this.map,ox+(nx-ox)*i/samples,oy+(ny-oy)*i/samples,2)){wall=true;break;}
      if(wall){b.life=0;continue;}b.x=nx;b.y=ny;
      const entities=b.team==='player'?this.enemies:[...this.players.values()];const hits=[];
      for(const t of entities){if(t.hp<=0||t.dead||t.connected===false||b.hit.has(t.id))continue;const d=segmentDistance(ox,oy,nx,ny,t.x,t.y);if(d.distance<t.radius+b.radius)hits.push({t,at:d.t});}
      hits.sort((a,b)=>a.at-b.at);for(const {t}of hits){b.hit.add(t.id);if(b.team==='player')this.damageEnemy(t,b.damage,b.owner,b.piercing);else this.damagePlayer(t,b.damage,ENEMY_TYPES[this.enemies.find(e=>e.id===b.owner)?.kind]?.name||'Projektil');if(!b.multiHit){b.life=0;break;}}
    }
    this.bullets=this.bullets.filter(b=>b.life>0);this.enemies=this.enemies.filter(e=>e.hp>0);
    for(const l of this.loot){l.life-=dt;if(l.kind==='coin'){const p=this.players.get(l.owner);if(p&&!p.dead&&dist(p,l)<90){p.runCoins+=l.amount;l.life=0;this.event('coin',{playerId:p.id,amount:l.amount,x:l.x,y:l.y});}}}
    this.loot=this.loot.filter(l=>l.life>0).slice(-1200);
    for(const g of this.graves)g.life-=dt;this.graves=this.graves.filter(g=>g.life>0);
    for(const q of this.portals)q.life-=dt;this.portals=this.portals.filter(q=>q.life>0);
    if(this.kind==='realm'&&!this.closingAt){for(const s of this.respawns)if(s.at<=this.time){const e=this.spawnEnemy(s.kind,s.x,s.y);e.eventBoss=s.eventBoss;e.dungeon=s.dungeon;}this.respawns=this.respawns.filter(s=>s.at>this.time);}
  }
}
export class RealmEngine {
  constructor({seed=48129,savedWorld=null}={}){
    this.seed=seed;this.time=0;this.players=new Map();this.worlds=new Map();this.eventSeq=0;this.events=[];this.messages=[];this.groups=new Map();this.instanceSeq=0;this.idSeq=0;this.partySeq=0;this.snapshotPublicCacheTime=-1;this.snapshotPublicCache=new Map();
    this.worlds.set('nexus',new RealmWorld(this,'nexus','nexus',seed));
    this.worlds.set('realm-1',new RealmWorld(this,'realm-1','realm',seed+1));
    this.worlds.set('realm-2',new RealmWorld(this,'realm-2','realm',seed+2));
    if(savedWorld)this.restoreWorlds(savedWorld);
  }
  world(p){return this.worlds.get(typeof p==='string'?p:this.players.get(p?.id)?.worldId||p?.worldId)||this.worlds.get('nexus');}
  safe(p){return this.world(p).safe(p);}
  stats(p){return this.world(p).stats(p);}
  announce(text,worldId=null){this.messages.push({id:++this.idSeq,name:'Realm',text,system:true,worldId,time:Date.now()});this.messages=this.messages.slice(-100);}
  addPlayer(id,name='Wanderer',classId='weaver',raw={}){
    if(this.players.has(id))return this.players.get(id);
    const saved=cleanRealmProfile({...raw,name,classId});let w=this.worlds.get(saved.worldId)||this.worlds.get('nexus');
    if(w.kind==='realm'&&(w.closingAt||w.players.size>=REALM_LIMIT))w=this.worlds.get('nexus');
    const p=w.addPlayer(id,saved.name,saved.classId,saved);Object.assign(p,saved,{id,connected:true,worldId:w.worldId,input:{dx:0,dy:0,angle:0,fire:false,auto:false},lastInput:w.time,invisible:0,berserk:0,invulnerable:2,partyId:null});
    this.players.set(id,p);if(!saved.started){this.starter(p);p.x=w.map.spawn.x;p.y=w.map.spawn.y;}
    if(!walkable(w.map,p.x,p.y,p.radius)||w.worldId!==saved.worldId){p.x=w.map.spawn.x;p.y=w.map.spawn.y;}
    p.hp=p.dead?0:saved.hp===null?this.stats(p).maxHP:clamp(saved.hp,1,this.stats(p).maxHP);p.mp=saved.mp===null?this.stats(p).maxMP:clamp(saved.mp,0,this.stats(p).maxMP);
    w.scaleBosses();return p;
  }
  starter(p){p.started=true;p.equipment={};for(const slot of EQUIP_SLOTS)p.equipment[slot]=makeItem(`starter-${p.id}-${++this.idSeq}`,p.classId,slot,0);p.inventory=[];p.potions=3;p.manaPotions=3;}
  removePlayer(id){const p=this.players.get(id);if(!p)return;this.leaveParty(p);this.world(p).removePlayer(id);this.players.delete(id);}
  profile(id){const p=this.players.get(id);return p?cleanRealmProfile(p):null;}
  setInput(id,raw){const p=this.players.get(id);if(p)this.world(p).setInput(id,raw);}
  transfer(p,target){
    const to=this.worlds.get(target);if(!to||p.dead)return false;
    if(target===p.worldId)return false;
    if(to.kind==='realm'&&(to.closingAt||to.players.size>=REALM_LIMIT)){this.notice(p,'Dieses Realm ist voll oder schließt gerade.');return false;}
    if(to.kind==='dungeon'&&to.players.size>=REALM_LIMIT)return false;
    const from=this.world(p);from.removePlayer(p.id);to.players.set(p.id,p);p.worldId=target;p.x=to.map.spawn.x;p.y=to.map.spawn.y;p.lastInput=to.time;p.invulnerable=2;p.input={dx:0,dy:0,angle:0,fire:false,auto:false};p.nexus=0;
    to.scaleBosses();if(target==='nexus'){const amount=p.runCoins;p.bank+=amount;p.runCoins=0;to.event('bank',{playerId:p.id,amount});}
    to.event('travel',{playerId:p.id,text:to.kind==='nexus'?'Nexus':to.kind==='realm'?'Smaragd-Realm':DUNGEONS[to.theme].name});return true;
  }
  notice(p,text){this.world(p).event('notice',{playerId:p.id,text});return false;}
  enter(p,portalId){
    const w=this.world(p),q=w.portals.find(v=>v.id===portalId);if(!q||dist(p,q)>115||q.life<=0)return false;
    if(!q.target){
      if([...this.worlds.values()].filter(x=>x.kind==='dungeon').length>=24)return this.notice(p,'Alle Dungeon-Instanzen sind belegt.');
      const id='dungeon-'+(++this.instanceSeq);this.worlds.set(id,new RealmWorld(this,id,'dungeon',this.seed+1000+this.instanceSeq,q.theme,{modifiers:q.modifiers,echo:q.echo===true,liveEvent:q.liveEvent===true,startedAt:this.time}));q.target=id;
    }
    if(!this.worlds.has(q.target))return this.notice(p,'Dieses Portal ist erloschen.');
    return this.transfer(p,q.target);
  }
  action(id,a){
    const p=this.players.get(id);if(!p||!a||typeof a.type!=='string')return false;const w=this.world(p);
    if(a.type==='rebirth'&&p.dead){
      p.dead=false;p.level=1;p.xp=0;p.bonuses=Object.fromEntries(Object.keys(STAT_CAPS).map(k=>[k,0]));p.classId=Object.hasOwn(CLASSES,a.classId)?a.classId:p.classId;this.starter(p);p.abilityCd=0;p.teleportCd=0;
      if(p.worldId!=='nexus')this.transfer(p,'nexus');else{p.x=w.map.spawn.x;p.y=w.map.spawn.y;}
      p.hp=this.stats(p).maxHP;p.mp=this.stats(p).maxMP;this.world(p).event('rebirth',{playerId:p.id});return true;
    }
    if(a.type==='chat')return this.chat(p,a);
    if(a.type.startsWith('party'))return this.partyAction(p,a);
    if(p.dead)return false;
    if(a.type==='nexus')return this.transfer(p,'nexus');
    if(a.type==='realm'&&w.kind==='nexus'&&['realm-1','realm-2'].includes(a.target))return this.transfer(p,a.target);
    if(a.type==='portal')return this.enter(p,a.portalId);
    if(a.type==='teleport'){
      const q=this.players.get(a.playerId);if(!q||q.dead||!q.connected||q.id===id||q.worldId!==p.worldId||w.kind!=='realm'||p.teleportCd>0)return false;
      p.x=q.x;p.y=q.y;p.teleportCd=10;p.invulnerable=1;p.input={dx:0,dy:0,angle:0,fire:false,auto:false};w.event('teleport',{playerId:id,x:p.x,y:p.y});return true;
    }
    if(a.type==='beacon'){
      const b=w.map.landmarks.find(b=>b.beacon&&b.label===a.label);if(!b||p.teleportCd>0||w.kind!=='realm')return false;p.x=b.x;p.y=b.y;p.teleportCd=10;return true;
    }
    if(a.type==='ability')return w.cast(p);
    if(a.type==='heal'&&p.potions>0&&p.hp<this.stats(p).maxHP){const mult=CRUCIBLE_MODES[p.crucibleMode]?.healing??1;if(mult<=0)return this.notice(p,'Blutpakt verhindert aktive Heilung.');p.potions--;p.hp=Math.min(this.stats(p).maxHP,p.hp+120*mult);w.event('heal',{playerId:id,x:p.x,y:p.y});return true;}
    if(a.type==='mana'&&p.manaPotions>0&&p.mp<this.stats(p).maxMP){p.manaPotions--;p.mp=Math.min(this.stats(p).maxMP,p.mp+100);return true;}
    if(a.type==='interact'){
      const l=w.loot.filter(l=>l.kind==='item'&&l.owner===id&&dist(l,p)<90).sort((a,b)=>dist(a,p)-dist(b,p))[0];
      if(l){if(p.inventory.length>=8)return this.notice(p,'Gepäck voll. Sichere Gegenstände im Nexus.');p.inventory.push(rCopy(l.item));w.loot.splice(w.loot.indexOf(l),1);w.event('loot',{playerId:id,text:l.item.name,rarity:l.item.rarity});return true;}
      const q=w.portals.filter(q=>dist(q,p)<115).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(q)return this.enter(p,q.id);
      return false;
    }
    if(a.type==='equip'){
      const i=p.inventory.findIndex(v=>v.id===a.itemId);if(i<0)return false;const item=p.inventory[i];if(!EQUIP_SLOTS.includes(item.slot))return false;
      if(!canEquip(item,p.classId))return this.notice(p,'Dieser Gegenstand gehört zu einer anderen Klasse.');
      p.inventory.splice(i,1);const old=p.equipment[item.slot];p.equipment[item.slot]=item;if(old)p.inventory.push(old);p.hp=Math.min(p.hp,this.stats(p).maxHP);p.mp=Math.min(p.mp,this.stats(p).maxMP);w.event('equip',{playerId:id,text:item.name});return true;
    }
    if(a.type==='consume'){
      const i=p.inventory.findIndex(v=>v.id===a.itemId);const item=p.inventory[i];if(!item||item.slot!=='potion')return false;
      if(p.bonuses[item.statKey]>=STAT_CAPS[item.statKey])return this.notice(p,'Dieser Wert ist bereits maximiert.');p.bonuses[item.statKey]++;p.inventory.splice(i,1);w.event('notice',{playerId:id,text:STAT_LABELS[item.statKey]+' dauerhaft erhöht.'});return true;
    }
    if(a.type==='dropItem'){
      const i=p.inventory.findIndex(v=>v.id===a.itemId);if(i<0)return false;
      const item=p.inventory.splice(i,1)[0],pos=w.lootPoint(p.x+Math.cos(p.angle||0)*34,p.y+Math.sin(p.angle||0)*34);
      w.loot.push({id:w.id('drop'),owner:id,kind:'item',item:rCopy(item),x:pos.x,y:pos.y,life:180,dropped:true});
      w.event('drop',{playerId:id,text:item.name,rarity:item.rarity});return true;
    }
    if(a.type==='deposit'||a.type==='withdraw'){
      if(w.kind!=='nexus'||dist(p,{x:500,y:790})>145)return this.notice(p,'Gehe zum Tresor im Nexus.');
      const from=a.type==='deposit'?p.inventory:p.vault,to=a.type==='deposit'?p.vault:p.inventory,limit=a.type==='deposit'?vaultCapacity(p.account):8;
      if(to.length>=limit)return this.notice(p,'Kein freier Platz.');const i=from.findIndex(v=>v.id===a.itemId);if(i<0)return false;to.push(from.splice(i,1)[0]);return true;
    }
    if(a.type==='salvage'){
      if(w.kind!=='nexus')return false;const i=p.inventory.findIndex(v=>v.id===a.itemId);if(i<0)return false;p.bank+=5*(p.inventory[i].rarity+1);p.inventory.splice(i,1);return true;
    }
    if(a.type==='refill'){
      if(w.kind!=='nexus')return false;const missing=Math.max(0,3-p.potions)+Math.max(0,3-p.manaPotions);if(!missing)return false;
      // Basic consumables are free in the safe hub; no pay-to-progress stall.
      p.potions=Math.max(3,p.potions);p.manaPotions=Math.max(3,p.manaPotions);w.event('notice',{playerId:id,text:'Heil- und Manatränke aufgefüllt.'});return true;
    }
    return false;
  }
  chat(p,a){
    if(this.time-rNum(p.lastChat,-100)<.8)return false;
    const text=(typeof a.text==='string'?a.text:'').normalize('NFKC').replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,180);if(!text)return false;
    if(a.channel==='party'&&!p.partyId)return false;
    p.lastChat=this.time;this.messages.push({id:++this.idSeq,playerId:p.id,name:p.name,text,time:Date.now(),worldId:p.worldId,partyId:a.channel==='party'?p.partyId:null,system:false});this.messages=this.messages.slice(-100);return true;
  }
  leaveParty(p){const g=this.groups.get(p.partyId);if(g){g.members=g.members.filter(id=>id!==p.id);if(!g.members.length)this.groups.delete(g.id);else if(g.leader===p.id)g.leader=g.members[0];}p.partyId=null;}
  partyAction(p,a){
    if(a.type==='partyLeave'){if(!p.partyId)return false;this.leaveParty(p);return true;}
    if(a.type==='partyCreate'){
      if(p.partyId)return false;const id='P'+(++this.partySeq).toString(36).toUpperCase().padStart(4,'0');const g={id,leader:p.id,members:[p.id]};this.groups.set(id,g);p.partyId=id;return true;
    }
    if(a.type==='partyJoin'){
      if(p.partyId||typeof a.code!=='string')return false;const g=this.groups.get(a.code.trim().toUpperCase());if(!g||g.members.length>=8)return false;g.members.push(p.id);p.partyId=g.id;return true;
    }
    return false;
  }
  step(dt){
    if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);this.time+=dt;
    for(const w of [...this.worlds.values()]){
      w.step(dt);w.ageEmpty=w.players.size?0:w.ageEmpty+dt;
      if(w.kind==='realm'&&w.closingAt&&w.time>=w.closingAt){
        const id='dungeon-'+(++this.instanceSeq);this.worlds.set(id,new RealmWorld(this,id,'dungeon',this.seed+1000+this.instanceSeq,'citadel',{modifiers:rollDungeonModifiers(this.seed+this.instanceSeq,'citadel')}));
        for(const p of [...w.players.values()]){if(!p.dead)this.transfer(p,id);else{w.removePlayer(p.id);const home=this.worlds.get('nexus');home.players.set(p.id,p);p.worldId='nexus';p.x=home.map.spawn.x;p.y=home.map.spawn.y;}}
        if(!w.players.size)this.worlds.set(w.worldId,new RealmWorld(this,w.worldId,'realm',w.seed+11));else w.closingAt=Infinity;
      }
      if(w.kind==='dungeon'&&w.ageEmpty>180){this.worlds.delete(w.worldId);for(const s of this.worlds.values())s.portals=s.portals.filter(q=>q.target!==w.worldId);}
      // Map-local events are promoted to one monotonic stream; transfers cannot replay an old zone's events.
      for(const e of w.events){if(e.seq>(w.lastForward||0))this.events.push({...e,seq:++this.eventSeq,worldId:w.worldId});}w.lastForward=w.eventSeq;
    }
    this.events=this.events.slice(-200);
  }
  snapshot(ownId){
    const p=this.players.get(ownId);if(!p)return null;const w=this.world(p),g=this.groups.get(p.partyId);
    // Public player state is identical for every viewer in a world. Build it once per simulation
    // tick/world instead of recalculating stats O(viewers × players) during SSE fan-out. Only the
    // viewing player's private inventory/equipment/vault payload is cloned into that snapshot.
    if(this.snapshotPublicCacheTime!==this.time){this.snapshotPublicCacheTime=this.time;this.snapshotPublicCache.clear();}
    let cachedPublic=this.snapshotPublicCache.get(w.worldId),publicPlayers=cachedPublic?.size===w.players.size?cachedPublic.players:null;
    if(!publicPlayers){publicPlayers=[...w.players.values()].map(q=>({id:q.id,name:q.name,classId:q.classId,x:q.x,y:q.y,angle:q.angle,hp:q.hp,mp:q.mp,...this.stats(q),level:q.level,xp:q.xp,dead:q.dead,shield:q.shield,invisible:q.invisible,berserk:q.berserk,invulnerable:q.invulnerable,hitFlash:q.hitFlash,abilityCd:q.abilityCd,teleportCd:q.teleportCd,empowered:q.empowered||0,haste:q.haste||0,inspired:q.inspired||0,formTimer:q.formTimer||0,connected:q.connected,moving:!q.dead&&q.connected&&((q.input?.dx||0)**2+(q.input?.dy||0)**2)>.0025,worldId:q.worldId,partyId:q.partyId,dashTime:0,nexus:0,safe:this.safe(q)}));this.snapshotPublicCache.set(w.worldId,{size:w.players.size,players:publicPlayers});}
    const players=publicPlayers.map(q=>q.id===ownId?{...q,inventory:rCopy(p.inventory),equipment:rCopy(p.equipment),vault:rCopy(p.vault),bonuses:{...p.bonuses},potions:p.potions,manaPotions:p.manaPotions,bank:p.bank,runCoins:p.runCoins,deaths:p.deaths,fame:p.fame,characterFame:p.characterFame,deathRecord:rCopy(p.deathRecord)}:q);
    return {version:2,seed:w.seed,time:this.time,world:{id:w.worldId,kind:w.kind,theme:w.theme,name:w.kind==='nexus'?'Riftwacht':w.kind==='realm'?'Smaragd-'+(w.worldId==='realm-1'?'01':'02'):DUNGEONS[w.theme].name,width:w.map.width,height:w.map.height,spawn:w.map.spawn,score:w.score,scoreTarget:w.scoreTarget,closingIn:w.closingAt?Math.max(0,w.closingAt-w.time):0,completed:w.completed,completionTime:w.completionTime||0,elapsed:w.kind==='dungeon'?Math.max(0,(w.completedAt||w.time)-w.startedAt):0,echo:w.echo===true,liveEvent:w.liveEvent===true,modifiers:[...w.modifiers]},
      players,enemies:w.enemies.filter(e=>{const dx=e.x-p.x,dy=e.y-p.y;return dx*dx+dy*dy<1960000||isBoss(e.kind);}).map(({contributors,...e})=>({...e})),
      bullets:w.bullets.filter(b=>{const dx=b.x-p.x,dy=b.y-p.y;return dx*dx+dy*dy<1440000;}).map(({hit,damage,multiHit,piercing,life,...b})=>({...b})),
      loot:w.loot.filter(l=>l.owner===ownId).map(rCopy),portals:w.portals.map(q=>({...q,life:Number.isFinite(q.life)?q.life:-1,players:q.target?this.worlds.get(q.target)?.players.size||0:0})),
      graves:w.graves.map(rCopy),events:this.events.filter(e=>(!e.playerId&&e.worldId===w.worldId)||e.playerId===ownId).slice(-80).map(rCopy),
      chat:this.messages.filter(m=>m.directTo?(m.playerId===ownId||m.directTo===ownId):m.partyId?m.partyId===p.partyId:!m.worldId||m.worldId===w.worldId).slice(-30).map(rCopy),
      party:g?{id:g.id,leader:g.leader,members:g.members.map(id=>this.players.get(id)).filter(Boolean).map(q=>({id:q.id,name:q.name,classId:q.classId,hp:q.hp,maxHP:this.stats(q).maxHP,worldId:q.worldId,dead:q.dead}))}:null,
      realms:[...this.worlds.values()].filter(s=>s.kind==='realm').map(s=>({id:s.worldId,players:s.players.size,max:REALM_LIMIT,closing:!!s.closingAt})),population:this.players.size,maxPlayers:REGION_LIMIT,
      wave:w.wave,kills:w.kills,bossState:w.bossState,bossDefeats:w.completed?1:0};
  }
  exportWorlds(){return {version:2,seed:this.seed,time:this.time,instanceSeq:this.instanceSeq,idSeq:this.idSeq,worlds:[...this.worlds.values()].map(w=>({id:w.worldId,kind:w.kind,theme:w.theme,seed:w.seed,modifiers:[...w.modifiers],echo:w.echo===true,liveEvent:w.liveEvent===true,startedAt:w.startedAt,completedAt:w.completedAt,completionTime:w.completionTime,time:w.time,score:w.score,closingAt:Number.isFinite(w.closingAt)?w.closingAt:0,completed:w.completed,kills:w.kills,bossState:w.bossState,enemies:rCopy(w.enemies),portals:w.portals.map(q=>({...q,life:Number.isFinite(q.life)?q.life:-1})),loot:rCopy(w.loot),graves:rCopy(w.graves),respawns:rCopy(w.respawns)}))};}
  restoreWorlds(raw){
    if(raw?.version!==2||!Array.isArray(raw.worlds)||raw.worlds.length>30)return;
    this.time=rNum(raw.time);this.instanceSeq=rNum(raw.instanceSeq);this.idSeq=rNum(raw.idSeq);
    for(const s of raw.worlds){if(!s||typeof s.id!=='string'||!['nexus','realm','dungeon'].includes(s.kind)||!Object.hasOwn(DUNGEONS,s.theme))continue;
      const w=new RealmWorld(this,s.id,s.kind,rNum(s.seed,this.seed),s.theme,{modifiers:s.modifiers,echo:s.echo===true,liveEvent:s.liveEvent===true,startedAt:rNum(s.startedAt,this.time)});
      w.time=rNum(s.time,this.time);w.score=rNum(s.score);w.closingAt=rNum(s.closingAt);w.completed=s.completed===true;w.completedAt=rNum(s.completedAt);w.completionTime=rNum(s.completionTime);w.kills=rNum(s.kills);w.bossState=s.bossState||'awake';
      w.enemies=(Array.isArray(s.enemies)?s.enemies:[]).filter(e=>Object.hasOwn(ENEMY_TYPES,e.kind)&&Number.isFinite(e.x)&&Number.isFinite(e.hp)).slice(0,400).map(rCopy);
      w.portals=(Array.isArray(s.portals)?s.portals:[]).slice(0,100).map(q=>({...q,life:q.life===-1?Infinity:rNum(q.life,1)}));
      w.loot=(Array.isArray(s.loot)?s.loot:[]).filter(l=>l.kind==='coin'||realmItem(l.item)).slice(0,1200).map(rCopy);w.graves=(s.graves||[]).slice(0,50).map(rCopy);w.respawns=(s.respawns||[]).slice(0,400).map(rCopy);this.worlds.set(s.id,w);
    }
  }
}
