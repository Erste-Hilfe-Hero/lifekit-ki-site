// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Hand-authored runtime pixel art. All sprites, tiles and scenery are original.
import { rng, CLASSES } from '../shared/data.mjs';
import { isBoss, weaponFamily, armorFamily } from '../shared/realm-data.mjs';
export function artSurface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').imageSmoothingEnabled=false;return c;}
export class PixelArt {
  constructor(){this.cache=new Map();}
  tile(biome,type,variant=0){
    const key=`tile-${biome}-${type}-${variant%8}`;if(this.cache.has(key))return this.cache.get(key);
    const c=artSurface(20,20),g=c.getContext('2d'),r=rng(variant*818+biome.charCodeAt(0)*19);
    const palettes={stone:['#7e8079','#979b8c','#666b65'],garden:['#528253','#639056','#416e49'],grass:['#739753','#7fa35c','#5e8549'],forest:['#47734e','#558459','#3e6448'],sand:['#d5bd80','#e3cd91','#c2aa70'],path:['#b1a17b','#c6b68b','#958a68'],highland:['#969393','#a8a7a4','#7d8086'],snow:['#c8dadb','#e2ebdf','#a7c3cb'],rift:['#72617f','#8b7398','#605674'],water:['#397d91','#4b98a6','#2f657a'],tide:['#9d936b','#b4a578','#807d5e'],grove:['#4f7651','#67855c','#3e5a43'],crypt:['#777888','#8a8c9d','#626779'],citadel:['#545262','#6b687b','#43414f'],sewer:['#4e6351','#677557','#374b40'],hive:['#aa753f','#c59754','#81562f'],forge:['#554a47','#756054','#3c3738'],frost:['#88b3c3','#b7d5df','#617f9d'],temple:['#839083','#a4b1a0','#596e66'],void:['#433952','#61506d','#2d293d']};
    const p=palettes[biome]||palettes.grass;g.fillStyle=p[0];g.fillRect(0,0,20,20);
    if(type===2){g.fillStyle='#434e52';g.fillRect(0,0,20,20);g.fillStyle=p[2];g.fillRect(1,3,18,13);g.fillStyle=p[1];g.fillRect(2,2,16,3);g.fillStyle='#263d3b';g.fillRect(0,17,20,3);}
    else if(['stone','crypt','citadel','tide','sewer','forge','frost','temple','void'].includes(biome)){g.fillStyle=p[2];g.fillRect(0,0,20,1);g.fillRect(0,10,20,1);g.fillRect(variant%2?5:14,0,1,10);g.fillRect(variant%2?14:5,10,1,10);g.fillStyle=p[1];g.fillRect(1,1,18,1);g.fillRect(1,11,18,1);if(variant%4===0){g.fillStyle=p[2];g.fillRect(4,6,3,1);g.fillRect(7,5,1,2);}}
    else for(let i=0;i<17;i++){g.fillStyle=p[i%2+1];const x=Math.floor(r()*19),y=Math.floor(r()*19);g.fillRect(x,y,1+Math.floor(r()*3),1);if(biome==='grass'||biome==='forest'){if(i<3)g.fillRect(x+1,y-2,1,3);}}
    if(biome==='hive'){g.fillStyle=p[2];for(let row=0;row<3;row++)for(let col=0;col<3;col++){const hx=col*8+(row%2)*4,hy=row*7;g.fillRect(hx,hy,5,1);g.fillRect(hx-1,hy+1,1,4);g.fillRect(hx+5,hy+1,1,4);}}
    if(biome==='forge'&&variant%7===0){g.fillStyle='#c56139';g.fillRect(2,14,8,1);g.fillRect(9,14,1,3);}if(biome==='void'&&variant%4===0){g.fillStyle='#9579b7';g.fillRect(9,7,1,5);g.fillRect(7,9,5,1);}
    if(biome==='water'){g.fillStyle='#71b4ba';for(let j=0;j<3;j++)g.fillRect((variant*3+j*9)%18,j*7+2,4,1);}
    this.cache.set(key,c);return c;
  }
  lootBag(rarity=0){
    const key='bag-'+rarity;if(this.cache.has(key))return this.cache.get(key);
    const c=artSurface(16,19),g=c.getContext('2d'),fill=['#aa7846','#619fc8','#9867c6','#f8f2d3'][rarity]||'#aa7846';
    const r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    r(4,0,8,3,'#25232c');r(3,2,10,3,fill);r(5,5,6,2,'#423341');r(3,7,10,2,'#25232c');r(1,9,14,8,'#25232c');r(3,17,10,2,'#25232c');r(3,8,10,8,fill);r(2,11,12,4,fill);r(4,9,2,5,'#ffffff65');r(5,6,6,1,'#e2ba68');r(11,11,2,5,'#00000030');r(6,11,4,4,'#eac96d');r(7,12,2,2,'#876642');this.cache.set(key,c);return c;
  }
  shot(family='staff',enemy=false,style='default'){
    const key='shot-'+family+'-'+enemy+'-'+style;if(this.cache.has(key))return this.cache.get(key);
    const c=artSurface(14,10),g=c.getContext('2d'),r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    if(enemy){r(3,0,7,10,'#442136');r(1,2,11,6,'#442136');r(3,2,8,6,'#ff663f');r(5,1,3,8,'#ff9a48');r(5,3,6,4,'#ffeb9b');r(8,4,3,2,'#ffffe4');}
    else if(family==='bow'){r(1,4,11,3,'#293340');r(2,5,10,1,'#d8b477');r(9,2,2,7,'#e1e9e0');r(11,3,2,5,'#ecf6fa');r(13,4,1,3,'#ecf6fa');r(0,2,3,2,'#81b8ae');r(0,7,3,2,'#81b8ae');}
    else if(['sword','katana','dagger'].includes(family)){r(2,3,11,4,'#293340');r(3,3,9,2,'#f4f3e1');r(3,5,9,1,'#8da3b1');r(1,2,2,6,'#dfbc72');r(0,4,2,2,'#86654b');}
    else{r(3,1,8,8,'#252337');r(1,3,12,4,'#252337');r(4,2,6,6,family==='wand'?'#ffda79':'#bba1ff');r(2,4,10,2,family==='wand'?'#fff3ce':'#cdbdff');r(5,3,4,4,'#f6f6ff');}
    if(!enemy&&style!=='default'){const tint={riftglass:'#84cbd0',blackedge:'#665e54',ashbone:'#d4c9ae'}[style]||'#d8bd82';g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.28;g.fillStyle=tint;g.fillRect(0,0,c.width,c.height);g.restore();g.fillStyle=tint;g.fillRect(12,4,2,2);}
    this.cache.set(key,c);return c;
  }
  sprite(kind,frame=0,style='default'){
    const key=`sprite-${kind}-${frame%2}-${style}`;if(this.cache.has(key))return this.cache.get(key);
    const cls=CLASSES[kind],boss=isBoss(kind),c=artSurface(boss?32:20,boss?36:24),g=c.getContext('2d');
    const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    const skin='#dab78a',dark='#253843',light='#f4e9c7',step=frame%2;
    if(cls){
      const color=cls.color,family=weaponFamily(kind),armor=armorFamily(kind);
      rect(6,19,3,4-step,dark);rect(12,19,3,3+step,dark);rect(5,22-step,4,2,'#927253');rect(12,22,4,2,'#927253');
      rect(5,10,11,11,dark);rect(6,11,9,8,color);rect(8,10,4,9,light);rect(5,18,11,2,'#695443');rect(9,18,3,2,'#e9c878');
      rect(5,3,11,8,dark);rect(6,4,9,6,skin);rect(7,7,2,1,dark);rect(12,7,2,1,dark);rect(9,9,3,1,'#ae805d');
      if(armor==='robe'){rect(5,2,11,3,color);rect(7,0,6,4,color);rect(3,5,14,2,color);rect(7,2,5,1,light);rect(4,17,13,4,color);rect(16,7,2,16,'#735b4b');rect(15,5,4,4,'#7fdde0');rect(16,4,2,2,'#e9ffff');}
      if(armor==='heavy'){rect(5,2,11,5,'#7f9298');rect(7,1,7,2,'#bdc6c3');rect(8,6,7,2,'#354b58');rect(5,8,3,3,'#9ba8a6');rect(12,8,4,3,'#9ba8a6');rect(7,11,7,6,'#93a5a4');rect(8,11,2,6,'#d4d8c3');rect(17,4,2,13,'#d9dcd2');rect(16,15,4,2,'#d5b96b');if(kind==='warden'){rect(0,11,6,9,dark);rect(1,12,4,6,color);rect(2,13,1,4,light);}else{rect(9,0,3,4,'#b87754');}}
      if(armor==='leather'){rect(4,2,12,4,color);rect(4,5,3,6,color);rect(14,5,3,6,color);rect(5,12,3,6,'#6d7660');if(family==='bow'){rect(17,9,2,11,'#aa8658');rect(15,7,2,2,'#cba872');rect(15,20,2,2,'#cba872');rect(16,10,1,9,'#ddd0ab');}else{rect(17,11,1,8,light);rect(16,18,3,1,'#b3a4d0');}}
      rect(2,12,3,5,color);rect(3,17,2,2,skin);
      // Per-class equipment silhouettes, not recolours of a single placeholder.
      if(['ninja','samurai','kensei'].includes(kind)){rect(4,3,13,2,'#c28569');rect(2,4,4,2,color);rect(17,7,1,13,'#e1e9dc');rect(16,17,4,2,'#c7ac69');rect(18,4,1,3,'#e1e9dc');}
      if(kind==='ninja'){rect(6,8,9,3,dark);rect(3,11,3,2,'#a6c6c9');}
      if(kind==='samurai'){rect(3,1,4,2,'#dec18a');rect(14,1,4,2,'#dec18a');rect(3,0,2,2,'#dec18a');rect(16,0,2,2,'#dec18a');}
      if(kind==='kensei'){rect(8,1,6,2,'#e9dcc3');rect(8,3,1,3,'#e9dcc3');rect(4,12,4,6,'#adbab3');}
      if(kind==='paladin'){rect(9,3,2,4,'#f5e0a5');rect(7,4,6,1,'#f5e0a5');rect(1,12,4,7,'#f5e0a5');rect(2,14,2,3,color);}
      if(kind==='assassin'){rect(6,7,9,4,'#344333');rect(7,7,2,1,'#d0ef88');rect(12,7,2,1,'#d0ef88');rect(1,17,3,4,'#89c258');}
      if(kind==='necromancer'){rect(6,3,8,4,'#d9dac5');rect(8,4,2,2,dark);rect(12,4,2,2,dark);rect(15,5,4,5,'#d9dac5');rect(16,7,1,1,dark);}
      if(kind==='huntress'){rect(2,7,2,7,'#be9964');rect(1,5,2,6,'#d4c6a2');rect(15,3,3,2,'#d4e19d');rect(4,18,4,2,'#9b7548');}
      if(kind==='mystic'){rect(15,3,5,5,'#b6a1ec');rect(16,2,3,1,'#ebe5ff');rect(9,6,2,1,'#c7b4f1');}
      if(kind==='trickster'){rect(5,1,4,4,color);rect(12,1,4,4,'#d6afc1');rect(3,0,4,2,'#e0c588');rect(15,0,3,2,'#e0c588');rect(7,8,2,2,light);rect(12,8,2,2,light);}
      if(kind==='sorcerer'){rect(14,3,2,2,'#f0e8a3');rect(17,5,2,3,'#f0e8a3');rect(15,8,2,2,'#f0e8a3');rect(7,3,5,1,'#f2de91');}
      if(kind==='bard'){rect(14,11,6,7,'#ba8c53');rect(16,7,2,12,'#ecce8e');rect(15,14,4,2,'#4a493d');rect(4,1,6,3,'#c5d3a0');rect(3,0,2,3,'#eac978');}
      if(kind==='summoner'){rect(15,5,4,4,'#87dcba');rect(16,6,1,2,light);rect(7,1,6,1,'#dcbe86');rect(7,0,1,2,'#dcbe86');rect(12,0,1,2,'#dcbe86');}
      if(kind==='druid'){rect(3,1,5,5,'#6f925f');rect(13,1,5,5,'#6f925f');rect(2,0,3,2,'#a9c47e');rect(16,0,3,2,'#a9c47e');rect(1,12,4,5,'#8db36c');rect(16,12,3,6,'#8db36c');}

    }else if(boss){
      const colors={captain:'#d6a85e',matriarch:'#80ad68',lich:'#b49bcf',sovereign:'#d3a45f',boss:'#bf8b67',plague:'#8caa67',queen:'#d6ae5b',smith:'#c28359',frostking:'#91c8de',oracle:'#89bbaa',voidheart:'#a287c6'},col=colors[kind]||'#ba9c83';
      rect(8,28,5,6,dark);rect(21,28,5,6,dark);rect(6,12,22,17,dark);rect(8,13,18,14,col);rect(11,16,12,7,'#637179');rect(14,15,5,12,'#e7c88c');rect(8,25,18,3,'#554452');
      rect(9,3,17,12,dark);rect(11,4,13,10,kind==='matriarch'?'#cad393':'#c6c4a4');rect(12,8,3,3,'#f0a36b');rect(20,8,3,3,'#f0a36b');rect(15,12,5,1,dark);
      rect(8,3,19,3,col);rect(10,0,3,5,'#ead798');rect(16,0,3,5,'#ead798');rect(23,0,3,5,'#ead798');
      rect(1,14,6,13,col);rect(27,14,5,13,col);rect(0,25,7,3,'#9a7352');rect(27,3,2,23,'#776555');rect(26,1,5,5,'#97dada');
      if(kind==='matriarch'){rect(2,6,6,7,'#5b8e53');rect(26,6,6,7,'#5b8e53');rect(5,29,24,3,'#6b854b');}
      if(kind==='lich'){rect(8,14,4,17,col);rect(23,14,5,17,col);rect(11,14,12,2,'#7c6896');}
      if(['plague','queen','smith','frostking','oracle','voidheart','bloodlord','starengine','shardking','duskmaw'].includes(kind)){
        g.clearRect(0,0,32,36);
        if(kind==='plague'){rect(7,15,22,15,dark);rect(6,13,20,14,col);rect(2,5,8,10,'#7c925f');rect(20,5,8,10,'#7c925f');rect(7,9,18,14,col);rect(9,14,3,3,'#f1d78a');rect(21,14,3,3,'#f1d78a');rect(13,21,12,5,'#b8ba88');rect(24,21,4,2,dark);rect(0,27,10,3,'#d0a084');rect(1,24,3,5,'#d0a084');rect(8,29,4,4,dark);rect(22,29,4,4,dark);}
        if(kind==='queen'){rect(1,9+step,12,13,'#bdccba');rect(20,9-step,12,13,'#bdccba');rect(6,6,8,7,'#e0e6c5');rect(20,5,8,8,'#e0e6c5');rect(12,8,10,23,col);rect(10,11,14,8,col);rect(12,21,10,4,dark);rect(14,29,6,5,dark);rect(11,3,3,9,dark);rect(22,2,3,10,dark);rect(12,10,3,3,'#f5ead1');rect(21,10,3,3,'#f5ead1');rect(7,23,6,3,col);rect(23,23,6,3,col);}
        if(kind==='smith'){rect(5,13,21,18,'#6b6463');rect(7,14,17,13,col);rect(8,4,16,12,'#797e80');rect(11,2,11,3,'#9daba5');rect(11,8,12,3,dark);rect(12,9,3,1,'#f3b473');rect(20,9,2,1,'#f3b473');rect(9,16,12,12,'#715f4c');rect(9,29,5,6,dark);rect(21,29,5,6,dark);rect(2,8,3,23,'#a48565');rect(0,5,10,8,'#a6aaa4');rect(1,5,9,2,'#d8daca');rect(24,15,7,10,'#ad825e');}
        if(kind==='frostking'){rect(5,15,24,18,'#567b9d');rect(8,14,18,16,col);rect(9,5,15,11,col);rect(5,3,5,6,'#c5e6e9');rect(23,1,4,8,'#c5e6e9');rect(14,0,4,9,'#e5f1e9');rect(11,10,3,2,'#e9f5f0');rect(20,10,3,2,'#e9f5f0');rect(15,14,5,8,'#d7e9e5');rect(9,27,4,7,'#8eacbf');rect(23,27,4,7,'#8eacbf');rect(1,13,4,19,'#c0e4ec');rect(0,10,7,4,'#e4f8eb');rect(12,23,10,4,'#456185');}
        if(kind==='oracle'){rect(7,28,20,6,'#59776d');rect(10,14,14,16,'#74988b');rect(8,7,18,12,col);rect(10,3,14,6,'#bad1b6');rect(14,7,7,6,'#e2edbe');rect(16,8,2,4,'#395d59');rect(6,17,5,9,col);rect(24,17,5,9,col);rect(14,19,6,8,'#d0dbaa');rect(12,0,2,3,'#e0c990');rect(22,0,2,3,'#e0c990');rect(1,8,4,4,'#c6a673');rect(29,8,3,4,'#c6a673');}
        if(kind==='voidheart'){rect(5,9,22,18,'#3c304d');rect(8,5,16,24,'#63467f');rect(5,13,22,10,col);rect(10,8,12,19,col);rect(12,12,9,12,'#d6bee9');rect(15,13,4,10,'#f5dff6');rect(1,3,5,6,col);rect(26,4,5,6,col);rect(2,28,5,4,col);rect(26,27,4,5,col);rect(14,0,4,3,'#d7bdea');}
      }

    }else{
      const colors={crab:'#d68761',raider:'#b68a61',hollow:'#91aa80',cultist:'#a082b6',brute:'#b4a179',wasp:'#dcc568',serpent:'#8fa95c',treant:'#749154',skeleton:'#d5ceae',ghost:'#a6cfd0',golem:'#969da9',wyrm:'#9acbd7',demon:'#a282b6',rat:'#99916b',scarab:'#c7a250',sentinel:'#809789',imp:'#c68569',frostling:'#aad0e0',shadebeast:'#827294'},col=colors[kind]||'#a5b398';
      if(kind==='rat'){rect(2,13,16,8,col);rect(11,9,8,9,col);rect(11,7,3,4,'#c5af8c');rect(16,12,2,2,'#ffe7b0');rect(0,17,4,2,'#c7a38a');rect(7,21,2,2,dark);rect(16,21,2,2,dark);}
      else if(kind==='crab'){rect(2,12,16,6,dark);rect(5,9,10,9,col);rect(2,8,4,6,col);rect(15,8,4,6,col);rect(1,7,2,4,'#edbb8a');rect(18,7,2,4,'#edbb8a');rect(6,8,2,2,light);rect(12,8,2,2,light);for(let i=0;i<3;i++){rect(2+i*6,18,2,2+step,col);}}
      else if(kind==='wasp'||kind==='scarab'){rect(0,6+step,7,6,'#d7e9d1');rect(13,6-step,7,6,'#d7e9d1');rect(6,6,8,13,col);rect(6,11,8,3,dark);rect(8,17,4,4,dark);rect(7,7,2,2,dark);rect(11,7,2,2,dark);}
      else if(kind==='serpent'||kind==='wyrm'){rect(3,17,12,4,col);rect(10,13,7,5,col);rect(8,7,8,8,col);rect(5,4,11,6,col);rect(6,6,2,2,light);rect(12,6,2,2,light);rect(7,9,8,2,'#53694e');rect(1,18,4,2,col);}
      else{rect(5,18,3,4-step,dark);rect(12,18,3,3+step,dark);rect(3,9,14,11,dark);rect(4,10,12,9,col);rect(2,11,3,7,col);rect(16,11,3,7,col);rect(5,2,11,10,dark);rect(6,3,9,8,col);rect(7,6,2,2,'#f4e6b6');rect(12,6,2,2,'#f4e6b6');rect(8,10,5,1,dark);
        if(['skeleton','ghost','golem','sentinel','frostling'].includes(kind)){rect(8,5,2,2,dark);rect(12,5,2,2,dark);rect(10,9,1,2,dark);rect(7,13,7,1,dark);rect(7,16,7,1,dark);}
        if(['cultist','demon','imp','shadebeast'].includes(kind)){rect(5,1,11,4,col);rect(4,10,3,13,col);rect(14,10,3,13,col);rect(8,5,6,4,dark);rect(8,6,2,1,'#f2b177');rect(12,6,2,1,'#f2b177');}
        if(kind==='treant'){rect(1,2,17,5,col);rect(3,0,13,7,col);rect(7,11,7,10,'#8d7950');rect(2,6,4,7,col);rect(16,6,3,8,col);}
      }
    }
    if(style!=='default'&&CLASSES[kind]){const tint={veilborn:'#786f96',bloodglass:'#8d4b45',blackiron:'#555a55',gravegold:'#a7884c',ashveil:'#72665d'}[style]||'#777';g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.30;g.fillStyle=tint;g.fillRect(0,0,c.width,c.height);g.restore();g.fillStyle=tint;g.fillRect(c.width-4,2,2,2);g.fillRect(2,c.height-5,2,2);}
    this.cache.set(key,c);return c;
  }
  prop(kind,variant=0){
    const key='prop-'+kind+'-'+Math.floor(variant*3);if(this.cache.has(key))return this.cache.get(key);
    const c=artSurface(72,88),g=c.getContext('2d'),r=rng(718+Math.floor(variant*400));
    const box=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
    if(['tree','pine','palm'].includes(kind)){
      box(32,51,9,29,'#6d6047');box(33,52,3,25,'#ac8b55');box(27,76,21,4,'#675b45');
      if(kind==='palm'){for(const [x,y,w,h]of [[6,30,28,7],[35,31,32,7],[12,23,24,8],[35,19,23,10],[29,14,12,34]])box(x,y,w,h,'#638e53');box(31,37,7,10,'#cfb372');}
      else{
        const col=kind==='pine'?'#427b75':'#477d55',bright=kind==='pine'?'#72a097':'#7ea36a';
        box(11,35,53,20,'#2b5d48');box(17,17,40,36,col);box(23,10,29,42,col);box(5,44,59,11,'#2b5d48');
        box(20,22,30,7,bright);box(13,39,19,5,bright);box(37,34,20,5,'#638f5d');box(28,12,15,5,bright);box(42,48,15,4,'#46714f');
        if(kind==='pine'){box(29,8,15,4,'#d3e1d5');box(15,38,15,4,'#d3e1d5');}
      }
    }else if(kind==='rock'||kind==='crystal'){
      const a=kind==='crystal'?'#b4a0df':'#9ea5a0',b=kind==='crystal'?'#725c99':'#727b79';box(17,55,41,19,'#43545b');box(21,45,31,26,b);box(25,38,22,19,a);box(26,41,7,16,kind==='crystal'?'#decffa':'#c3c5b4');box(14,69,48,6,'#43545b');
    }else if(kind==='fountain'){
      box(7,57,58,17,'#526a71');box(4,62,64,10,'#d5d1bb');box(9,48,54,15,'#aaa991');box(14,51,44,13,'#4f9aa4');box(18,53,37,3,'#a4d9d3');box(28,24,17,32,'#bdbda5');box(23,26,27,7,'#e0dcc3');box(30,17,14,11,'#71b3b7');box(33,10,8,10,'#e0e3c1');box(29,36,3,16,'#e1efd9');
    }else if(kind==='vault'){
      box(6,38,60,39,'#555b58');box(11,30,49,43,'#b6b6a1');box(16,38,40,33,'#8a8b7b');box(22,43,28,30,'#685b49');box(25,47,22,18,'#b89153');box(23,55,26,4,'#ddc88a');box(33,53,6,10,'#f4d587');box(7,73,61,6,'#d6d2b6');box(7,30,59,5,'#ddcfab');box(15,23,44,7,'#8e9d92');
    }else if(kind==='merchant'){
      box(10,46,51,32,'#604a40');box(13,47,3,33,'#b49159');box(56,47,3,33,'#b49159');box(5,33,62,15,'#618c84');box(11,23,51,12,'#729e90');for(let x=10;x<62;x+=14)box(x,26,7,20,'#d6c997');box(16,65,41,13,'#bc9868');box(21,60,5,7,'#dc7e72');box(34,59,5,8,'#719cd2');box(28,52,12,11,'#dab591');box(25,49,18,4,'#7a614b');
    }else if(kind==='arch'){
      box(7,24,13,56,'#89978d');box(52,24,13,56,'#89978d');box(16,16,42,14,'#aabb9f');box(24,8,25,13,'#bacbad');box(8,26,4,46,'#d1d7b7');box(53,26,4,46,'#d1d7b7');box(5,74,62,8,'#66796f');box(16,72,39,5,'#c9c6a9');box(30,13,13,8,'#d7c57f');
    }else if(kind==='beacon'){
      box(14,70,44,8,'#a1a497');box(23,60,26,12,'#d5ccb1');box(31,24,10,37,'#73b7cf');box(27,32,18,17,'#a6dfdf');box(32,18,8,10,'#d6f0df');box(28,62,18,4,'#e4dab7');
    }else if(kind==='guildhall'){
      box(7,32,58,45,'#525a56');box(13,36,46,38,'#8d9686');box(4,28,64,7,'#383f42');box(10,17,52,13,'#8b6756');box(18,10,36,8,'#b0865d');box(23,4,26,8,'#bf9b6b');box(25,46,23,30,'#41483e');box(28,49,17,27,'#667766');box(30,60,4,3,'#cbbb84');box(12,40,9,18,'#8795b8');box(51,40,9,18,'#8795b8');box(15,40,3,13,'#dcc886');box(54,40,3,13,'#dcc886');box(4,75,64,6,'#b4b3a0');
    }else if(kind==='forge'){
      box(7,28,55,49,'#535352');box(12,34,45,39,'#8b8170');box(5,22,60,9,'#b0a48b');box(39,1,15,22,'#77766c');box(42,3,3,16,'#aba389');box(19,44,31,29,'#302f33');box(23,52,22,20,'#a34d34');box(29,53,10,19,'#e78a48');box(31,59,5,11,'#f5ce82');box(10,75,52,5,'#aea895');box(48,65,20,5,'#b7beb5');box(53,70,9,9,'#747c7b');box(43,61,23,4,'#929e9a');
    }else if(kind==='questboard'){
      box(16,28,5,53,'#8a734e');box(53,28,5,53,'#8a734e');box(7,31,59,36,'#604e3c');box(11,34,51,28,'#a99061');box(5,26,64,7,'#c7b383');box(17,40,17,16,'#e4d7ae');box(39,37,14,22,'#d4c699');box(19,43,11,2,'#8d8163');box(19,47,8,2,'#8d8163');box(42,41,8,2,'#8d8163');box(42,45,8,2,'#8d8163');box(22,54,5,4,'#b77652');box(15,79,46,3,'#70624a');
    }else if(kind==='petgarden'){
      box(6,70,60,9,'#879765');box(11,52,5,26,'#b7ad87');box(58,52,5,26,'#b7ad87');box(7,56,61,4,'#c5bd97');box(7,65,61,3,'#c5bd97');box(20,35,35,30,'#6b5c47');box(25,31,25,33,'#b29165');box(17,29,41,7,'#738c64');box(23,23,29,7,'#95ae78');box(31,46,14,18,'#47453c');box(33,47,10,4,'#cfbc82');box(15,14,2,10,'#6f915d');box(10,12,12,6,'#dab385');
    }else if(kind==='torch'){
      box(33,53,5,27,'#706047');box(30,44,11,13,'#dcab56');box(32,38,7,15,'#f1d58c');box(34,39,3,10,'#fbefd0');
    }else if(kind==='mushroom'){
      box(31,69,7,11,'#dacdae');box(24,64,22,9,'#ce9381');box(28,60,14,7,'#e4ada0');box(30,63,3,3,'#eaddc2');
    }else{for(let i=0;i<5;i++){const x=20+r()*33,y=70+r()*10;box(x,y,2,4,'#4e7751');box(x-1,y,4,2,kind==='shell'?'#eee0b1':i%2?'#e1c572':'#c4b3da');}}
    this.cache.set(key,c);return c;
  }
  pet(kind,frame=0,style='default'){
    const key=`pet-${kind}-${frame%2}-${style}`;if(this.cache.has(key))return this.cache.get(key);
    const c=artSurface(20,20),g=c.getContext('2d'),r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
    if(kind==='moth'){r(1,5+frame%2,7,7,'#c4b9e9');r(12,5-frame%2,7,7,'#c4b9e9');r(7,6,6,9,'#769794');r(8,6,1,2,'#e9f0cf');r(12,6,1,2,'#e9f0cf');r(4,6,3,2,'#ede0ee');r(13,6,3,2,'#ede0ee');}
    else if(kind==='fox'){r(3,11,14,6,'#bd9564');r(10,5,8,10,'#d8ad70');r(10,3,3,4,'#d8ad70');r(16,3,3,4,'#d8ad70');r(12,9,2,2,'#30423b');r(16,9,2,2,'#30423b');r(12,12,6,3,'#eddfba');r(1,10,5,3,'#d8ad70');r(0,7,3,5,'#eddfba');r(5,17,2,2,'#5e5747');r(15,17,2,2,'#5e5747');}
    else if(kind==='owl'){r(4,6,12,11,'#aaa4bf');r(2,8,4,7,'#c7bed3');r(15,8,4,7,'#c7bed3');r(5,3,4,5,'#d8d0df');r(11,3,4,5,'#d8d0df');r(6,8,3,3,'#f0d58b');r(12,8,3,3,'#f0d58b');r(9,11,3,2,'#8d724d');r(7,17,2,2,'#80684d');r(12,17,2,2,'#80684d');}
    else if(kind==='beetle'){r(3,8,14,9,'#6b543a');r(5,5,10,12,'#c69a4f');r(9,4,2,13,'#f0c66c');r(3,7,3,2,'#d9b765');r(14,7,3,2,'#d9b765');r(1,9,4,1,'#70553a');r(15,9,4,1,'#70553a');r(2,14,4,1,'#70553a');r(14,14,4,1,'#70553a');}
    else if(kind==='sprite'){r(6,5,8,11,'#79c0b7');r(8,3,4,3,'#d1fff3');r(4,8,3,6,'#a2e4d2');r(13,8,3,6,'#a2e4d2');r(7,8,2,2,'#f3fff9');r(11,8,2,2,'#f3fff9');r(8,16,4,2,'#4f8f88');}
    else{r(6,10,10,7,'#bc8170');r(10,4,8,9,'#d1a67c');r(9,2,3,4,'#ebd49a');r(16,2,3,4,'#ebd49a');r(11,7,2,2,'#f6eab6');r(16,7,2,2,'#f6eab6');r(1,7,7,6,'#95688b');r(2,4+frame%2,3,5,'#ba86a8');r(2,15,6,3,'#bc8170');r(8,17,3,2,'#654754');}
    if(style!=='default'){const tint={veil:'#766c99',ember:'#b16b45',ivory:'#d9cfb3'}[style]||'#888';g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.30;g.fillStyle=tint;g.fillRect(0,0,c.width,c.height);g.restore();g.fillStyle=tint;g.fillRect(1,1,3,1);}
    this.cache.set(key,c);return c;
  }
  item(slot,tier=0,rarity=0,classId='all'){
    const key=`item-${slot}-${tier}-${rarity}-${classId}`;if(this.cache.has(key))return this.cache.get(key);
    const c=artSurface(24,24),g=c.getContext('2d'),metal=['#a9bdb4','#80b9db','#b69adc','#f0d396'][rarity]||'#abb69e';
    const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};g.fillStyle=metal;
    if(slot==='weapon'){
      if(['staff','wand'].includes(weaponFamily(classId))){r(10,6,3,17,'#9e8055');r(7,3,9,6,'#b7c8c1');r(9,1,5,7,classId==='weaver'?'#a891e8':'#91d7d4');r(10,2,2,2,'#f4f6dc');r(9,12,5,2,metal);}
      else if(weaponFamily(classId)==='bow'){r(7,2,4,3,'#d3b16e');r(11,5,4,4,'#ad8f60');r(15,9,3,6,'#ad8f60');r(11,15,4,4,'#ad8f60');r(7,19,4,3,'#d3b16e');r(7,4,1,16,'#e5d9b5');r(4,11,17,1,metal);r(18,9,3,5,metal);}
      else{g.save();g.translate(12,12);g.rotate(.6);g.fillStyle=metal;g.fillRect(-2,weaponFamily(classId)==='dagger'?-5:-11,4,weaponFamily(classId)==='dagger'?10:16);r(-1,weaponFamily(classId)==='dagger'?-5:-11,1,weaponFamily(classId)==='dagger'?10:16,'#ecedd6');r(-5,4,10,2,'#d9c189');r(-1,6,3,6,'#836c52');g.restore();}
    }else if(slot==='ability'){
      if(classId==='warden'){r(4,3,16,15,metal);r(7,18,10,3,metal);r(10,21,4,2,metal);r(7,6,10,11,'#d3b370');r(11,6,2,14,'#eee2b5');r(7,11,10,2,'#eee2b5');}
      else if(classId==='ranger'){r(7,8,12,14,'#906f50');r(9,2,2,14,'#ddce9e');r(14,1,2,13,'#ddce9e');r(7,1,4,3,metal);r(13,0,4,3,metal);r(5,10,15,3,'#b6a16d');}
      else if(classId==='shade'){r(8,2,9,5,metal);r(5,7,15,11,metal);r(2,18,20,4,metal);r(11,8,3,13,'#725e93');r(11,4,3,3,'#d5c18f');}
      else if(classId==='warrior'){r(3,10,4,4,'#bfad79');r(7,9,9,7,metal);r(15,6,5,13,'#d0b877');r(19,4,3,16,metal);r(9,11,7,2,'#f5e5b4');}
      else{r(4,3,17,19,metal);r(7,3,3,19,'#ddd2b4');r(12,7,6,10,'#6c7691');if(classId==='cleric'){r(14,8,2,8,'#efe6c8');r(12,10,6,2,'#efe6c8');}else{r(14,8,2,7,'#b6d8ec');r(12,10,6,3,'#b6d8ec');}}
    if(!['warden','ranger','shade','warrior','cleric','weaver'].includes(classId)){const cls=CLASSES[classId];r(12,7,6,10,cls?.color||metal);r(13,9,4,2,'#e7e7d4');if(['ninja','samurai','kensei'].includes(classId)){r(15,5,1,14,'#f5f2d1');r(11,12,9,1,'#f5f2d1');}if(['assassin','huntress','summoner'].includes(classId)){r(14,10,2,6,'#304b42');r(12,12,6,2,'#304b42');}}
    }else if(slot==='armor'){r(5,5,14,16,metal);r(2,5,5,7,metal);r(17,5,5,7,metal);g.clearRect(9,4,6,4);r(10,10,3,7,'#e0d8b7');if(armorFamily(classId)==='robe')r(4,19,16,3,metal);}
    else if(slot==='charm'){g.lineWidth=4;g.beginPath();g.arc(12,14,7,0,Math.PI*2);g.strokeStyle='#d1b474';g.stroke();r(9,4,7,7,metal);r(10,5,2,2,'#f8f2c8');}
    else if(slot==='potion'){r(9,2,6,7,'#abbbc1');r(6,9,13,12,'#a9c295');r(9,1,6,2,'#e3d8b7');r(8,10,2,7,'#def0da');}
    this.cache.set(key,c);return c;
  }
}
