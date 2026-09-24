// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Original persistent progression. Values are not copied from commercial tables.
export const CHARACTER_SLOTS_BASE = 4;
export const CHARACTER_SLOTS_MAX = 8;
export const CHARACTER_SLOTS = CHARACTER_SLOTS_MAX;
export const CHARACTER_SLOT_COST = slots => 500 + Math.max(0, slots - CHARACTER_SLOTS_BASE) * 250;
export const MASTERY_FAME_THRESHOLDS = Object.freeze([20,100,300,700,1500]);
export function masteryRank(fame=0){const value=Number.isFinite(fame)?Math.max(0,Math.floor(fame)):0;return MASTERY_FAME_THRESHOLDS.reduce((rank,threshold)=>rank+(value>=threshold?1:0),0);}
export function masteryStars(mastery={}){return Object.values(mastery||{}).reduce((sum,fame)=>sum+masteryRank(fame),0);}
export const PETS = Object.freeze({
  moth: {name:'Runenmotte',description:'Regeneriert langsam Mana. Bleibt auch nach einem Charaktertod.',cost:75,color:'#bda6e4',stat:'mana'},
  fox: {name:'Waldluchs',description:'Regeneriert langsam Leben. Kein Schutz gegen tödliche Treffer.',cost:150,color:'#d6b177',stat:'life'},
  drake: {name:'Glutdrache',description:'Feuert kleine Geschosse auf nahe Gegner.',cost:400,color:'#dc9577',stat:'attack'},
  owl: {name:'Mondkauz',description:'Verringert leicht die Fähigkeitsabklingzeit.',cost:520,color:'#c9c0dd',stat:'focus'},
  beetle: {name:'Bernsteinkäfer',description:'Erhöht leicht die Verteidigung.',cost:620,color:'#d7b16b',stat:'guard'},
  sprite: {name:'Quellgeist',description:'Verbessert Lebens- und Manaregeneration geringfügig.',cost:760,color:'#8fc8c4',stat:'regen'},
  raven: {name:'Schattenrabe',description:'Markiert nahe Gegner und verstärkt gelegentlich den nächsten Treffer.',cost:920,color:'#7f82ad',stat:'mark'},
  hare: {name:'Sturmhase',description:'Erhöht leicht das Bewegungstempo außerhalb sicherer Zonen.',cost:980,color:'#9fd2d5',stat:'speed'}
});
export const CONTRACTS = Object.freeze([
  {id:'first10',name:'Die ersten Spuren',description:'Besiege 10 Kreaturen mit einer beliebigen Figur.',key:'kills',goal:10,coins:55,fame:10},
  {id:'coast',name:'Herr der Gezeiten',description:'Beteilige dich am Sieg über den Gezeitenkönig.',key:'boss:captain',goal:1,coins:90,fame:25},
  {id:'sewer',name:'Unter den Straßen',description:'Besiege den Pestträger.',key:'boss:plague',goal:1,coins:110,fame:35},
  {id:'forest',name:'Dornen brechen',description:'Besiege die Dornenmutter.',key:'boss:matriarch',goal:1,coins:150,fame:45},
  {id:'hive',name:'Bernsteinherz',description:'Besiege die Bernsteinkönigin.',key:'boss:queen',goal:1,coins:170,fame:50},
  {id:'crypt',name:'Ruhe für die Toten',description:'Besiege den Grabesfürsten.',key:'boss:lich',goal:1,coins:180,fame:60},
  {id:'forge',name:'Durch die Glut',description:'Besiege den Schlackenschmied.',key:'boss:smith',goal:1,coins:220,fame:70},
  {id:'winter',name:'Der letzte Winter',description:'Besiege den Winterfürsten.',key:'boss:frostking',goal:1,coins:240,fame:80},
  {id:'temple',name:'Die Antwort aus Stein',description:'Besiege das Steinorakel.',key:'boss:oracle',goal:1,coins:280,fame:90},
  {id:'citadel',name:'Eine Krone zerbricht',description:'Besiege den Rissregenten.',key:'boss:sovereign',goal:1,coins:350,fame:120},
  {id:'void',name:'Jenseits des Risses',description:'Besiege das Herz der Leere.',key:'boss:voidheart',goal:1,coins:550,fame:180},
  {id:'veteran',name:'Spuren im Realm',description:'Besiege insgesamt 250 Kreaturen.',key:'kills',goal:250,coins:350,fame:100},
  {id:'delver',name:'Zwischen den Welten',description:'Schließe fünf Dungeons ab.',key:'dungeons',goal:5,coins:250,fame:100},
  {id:'master',name:'Ein Leben bis Zwanzig',description:'Erreiche Stufe 20 mit einer Figur.',key:'bestLevel',goal:20,coins:200,fame:100},
  {id:'blood',name:'Blut unter Stein',description:'Besiege den Blutfürsten.',key:'boss:bloodlord',goal:1,coins:420,fame:135},
  {id:'lab',name:'Sterne im Getriebe',description:'Besiege die Sternenmaschine.',key:'boss:starengine',goal:1,coins:470,fame:145},
  {id:'bastion',name:'Scherbenfall',description:'Besiege den Scherbenkönig.',key:'boss:shardking',goal:1,coins:520,fame:165},
  {id:'dusk',name:'Am Ende der Dämmerung',description:'Besiege den Dämmerschlund.',key:'boss:duskmaw',goal:1,coins:650,fame:220},
  {id:'mirror',name:'Kein Bild bleibt ganz',description:'Besiege den Spiegelhüter.',key:'boss:mirrorwarden',goal:1,coins:700,fame:240},
  {id:'spore',name:'Unter dem Pilzhimmel',description:'Besiege den Sporenpatriarchen.',key:'boss:sporefather',goal:1,coins:740,fame:255},
  {id:'storm',name:'Auge des Sturms',description:'Besiege den Sturmseher.',key:'boss:stormseer',goal:1,coins:790,fame:270},
  {id:'abyss',name:'Schwarzer Stern',description:'Besiege den Abgrundstern.',key:'boss:abyssstar',goal:1,coins:900,fame:320}
]);
export const DUNGEON_KEYS = Object.freeze({tide:60,sewer:80,grove:100,hive:120,crypt:150,forge:190,frost:200,temple:230,citadel:320,void:480,blood:260,lab:290,bastion:380,dusk:560,mirror:620,spore:660,storm:700,abyss:820});
export const CLASS_GEAR_NAMES = Object.freeze({warden:'Schild',ranger:'Köcher',weaver:'Zauber',cleric:'Gebetsbuch',shade:'Umhang',warrior:'Kriegshorn',paladin:'Siegel',assassin:'Giftphiole',necromancer:'Schädel',huntress:'Falle',mystic:'Kugel',trickster:'Prisma',sorcerer:'Zepter',ninja:'Wurfstern',samurai:'Wakizashi',bard:'Laute',summoner:'Rufstab',kensei:'Scheide',druid:'Wildsiegel'});
