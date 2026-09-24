// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Original Nyrathen content. No third-party game assets, names, maps or balance tables.
export const VERSION = '5.7.0';
export const PROTOCOL = 2;
export const TILE = 40;
export const WORLD_W = 52;
export const WORLD_H = 40;
export const HOME = Object.freeze({ x: 620, y: 820, radius: 112 });
export const ALTAR = Object.freeze({ x: 1560, y: 800 });
export const CLASSES = Object.freeze({
  warden: { name: 'Ritter', title: 'Standhalten. Zurückschlagen.', hp: 220, mp: 90, speed: 190, defense: 6, damage: 32, interval: .34, range: 340, color: '#efa958', ability: 'Glutschild', abilityHint: '3 Sekunden Schutz und eine Druckwelle.', cost: 28, cooldown: 9, icon: 'shield' },
  ranger: { name: 'Bogenschütze', title: 'Ein Schritt vor dem Tod.', hp: 145, mp: 100, speed: 224, defense: 2, damage: 21, interval: .19, range: 660, color: '#8ac8b7', ability: 'Schattenfächer', abilityHint: 'Sieben durchschlagende Projektile.', cost: 30, cooldown: 7, icon: 'bow' },
  weaver: { name: 'Magier', title: 'Die Dunkelheit antwortet.', hp: 130, mp: 150, speed: 198, defense: 1, damage: 39, interval: .40, range: 710, color: '#b4a3e2', ability: 'Sternenbruch', abilityHint: 'Zwölf Runengeschosse am anvisierten Punkt.', cost: 38, cooldown: 8, icon: 'rune' },
  cleric: {name:'Priester', title:'Heile deine Gefährten.',hp:150,mp:165,speed:195,defense:1,damage:26,interval:.31,range:690,color:'#e9dbba',ability:'Lichtgebet',abilityHint:'Heilt dich und Verbündete in der Nähe.',cost:45,cooldown:5,icon:'potion'},
  shade: {name:'Schurke',title:'Durchquere den Schatten.',hp:155,mp:100,speed:233,defense:2,damage:25,interval:.23,range:440,color:'#c39cde',ability:'Schleier',abilityHint:'4 Sekunden unsichtbar für Gegner. Treffer bleiben gefährlich.',cost:32,cooldown:8,icon:'dash'},
  warrior: {name:'Krieger',title:'Gemeinsam entfesselt.',hp:235,mp:90,speed:200,defense:4,damage:35,interval:.32,range:350,color:'#e3a368',ability:'Kriegshorn',abilityHint:'6 Sekunden höheres Angriffstempo für nahe Verbündete.',cost:35,cooldown:10,icon:'weapon'},
  paladin:{name:'Paladin',title:'Ein Eid für alle.',hp:205,mp:125,speed:202,defense:5,damage:31,interval:.33,range:360,color:'#d8c77b',ability:'Sonnensiegel',abilityHint:'Heilt und stärkt den Schaden naher Verbündeter für 6 Sekunden.',cost:40,cooldown:9,icon:'seal'},
  assassin:{name:'Assassine',title:'Gift ist geduldig.',hp:150,mp:130,speed:230,defense:2,damage:24,interval:.24,range:465,color:'#93b76b',ability:'Giftphiole',abilityHint:'Ein Giftfeld am Ziel verursacht 5 Sekunden lang Schaden.',cost:38,cooldown:8,icon:'poison'},
  necromancer:{name:'Nekromant',title:'Was fällt, nährt dich.',hp:160,mp:150,speed:195,defense:1,damage:36,interval:.38,range:700,color:'#b2accc',ability:'Seelenernte',abilityHint:'Entzieht nahen Gegnern Leben und heilt deine Gruppe.',cost:42,cooldown:7,icon:'skull'},
  huntress:{name:'Jägerin',title:'Lass sie zu dir kommen.',hp:155,mp:115,speed:220,defense:2,damage:23,interval:.22,range:660,color:'#8cac64',ability:'Dornenschlinge',abilityHint:'Legt am Ziel eine Falle, die Gegner schädigt und verlangsamt.',cost:30,cooldown:6,icon:'trap'},
  mystic:{name:'Mystiker',title:'Ein Augenblick Ewigkeit.',hp:140,mp:160,speed:210,defense:1,damage:33,interval:.35,range:710,color:'#b399d5',ability:'Zeitkugel',abilityHint:'Hält normale Gegner fest. Bosse werden kurz verlangsamt.',cost:45,cooldown:9,icon:'orb'},
  trickster:{name:'Trickser',title:'Du warst nie dort.',hp:150,mp:125,speed:235,defense:2,damage:26,interval:.24,range:460,color:'#cf8fb1',ability:'Spiegelprisma',abilityHint:'Teleportiert eine kurze Strecke und lässt ein Ablenkbild zurück.',cost:32,cooldown:6,icon:'prism'},
  sorcerer:{name:'Hexer',title:'Ein Funke reicht.',hp:145,mp:155,speed:205,defense:1,damage:28,interval:.30,range:700,color:'#91b6df',ability:'Kettenblitz',abilityHint:'Ein Blitz springt über bis zu sechs nahe Gegner.',cost:36,cooldown:5,icon:'scepter'},
  ninja:{name:'Ninja',title:'Schärfer als der Wind.',hp:175,mp:105,speed:240,defense:3,damage:34,interval:.29,range:480,color:'#df9996',ability:'Windstern',abilityHint:'Wirft einen durchschlagenden Stern und erhöht kurz dein Tempo.',cost:28,cooldown:5,icon:'star'},
  samurai:{name:'Samurai',title:'Durch jede Rüstung.',hp:200,mp:105,speed:205,defense:4,damage:36,interval:.32,range:480,color:'#b77b6d',ability:'Klingenkreis',abilityHint:'Ein Nahkampfschnitt schwächt die Rüstung getroffener Gegner.',cost:35,cooldown:7,icon:'blade'},
  bard:{name:'Barde',title:'Dein Lied trägt weiter.',hp:145,mp:140,speed:213,defense:1,damage:23,interval:.23,range:670,color:'#e5b76d',ability:'Wanderlied',abilityHint:'Erhöht für 7 Sekunden Reichweite und Verteidigung der Gruppe.',cost:38,cooldown:10,icon:'lute'},
  summoner:{name:'Beschwörer',title:'Du reist nie allein.',hp:135,mp:160,speed:196,defense:1,damage:27,interval:.32,range:700,color:'#89c3b7',ability:'Seelenwächter',abilityHint:'Ruft zwei Wächter, die 8 Sekunden auf nahe Gegner feuern.',cost:44,cooldown:9,icon:'mace'},
  kensei:{name:'Kensei',title:'Zwischen zwei Herzschlägen.',hp:190,mp:115,speed:218,defense:3,damage:34,interval:.31,range:480,color:'#9eacd9',ability:'Durchbruch',abilityHint:'Durchquert Gegner mit einem kurzen, geschützten Klingenvorstoß.',cost:36,cooldown:7,icon:'sheath'},
  druid:{name:'Druide',title:'Die Wildnis nimmt Gestalt an.',hp:165,mp:145,speed:210,defense:2,damage:30,interval:.29,range:610,color:'#8fc77a',ability:'Wildsiegel',abilityHint:'Baut Gestaltenergie auf und verwandelt dich kurz in eine stärkere Tierform.',cost:34,cooldown:6,icon:'sigil'}

});
export const ENEMY_TYPES = Object.freeze({
  hollow: { name: 'Aschenläufer', hp: 76, speed: 78, damage: 14, xp: 24, radius: 16, color: '#91a597' },
  cultist: { name: 'Rissrufer', hp: 95, speed: 50, damage: 18, xp: 38, radius: 17, color: '#aa80ac' },
  brute: { name: 'Schlackenträger', hp: 220, speed: 48, damage: 26, xp: 68, radius: 25, color: '#c29465' },
  boss: { name: 'DER ASCHENHÜTER', hp: 2400, speed: 32, damage: 24, xp: 400, radius: 46, color: '#e19366' },
  crab:{name:'Strandkrabbe',hp:58,speed:62,damage:10,xp:28,radius:14,color:'#dd8b69'},
  raider:{name:'Küstenräuber',hp:100,speed:85,damage:16,xp:42,radius:15,color:'#dbb477'},
  wasp:{name:'Dornenwespe',hp:85,speed:106,damage:13,xp:40,radius:13,color:'#f2d46e'},
  serpent:{name:'Sumpfnatter',hp:145,speed:98,damage:22,xp:72,radius:16,color:'#99cb70'},
  treant:{name:'Wurzelwächter',hp:420,speed:24,damage:26,xp:170,radius:28,color:'#88a95e'},
  skeleton:{name:'Knochenschütze',hp:210,speed:67,damage:28,xp:115,radius:16,color:'#d9d8bf'},
  ghost:{name:'Nebelgeist',hp:180,speed:88,damage:24,xp:100,radius:16,color:'#b8d7d4'},
  golem:{name:'Granitgolem',hp:650,speed:45,damage:37,xp:230,radius:27,color:'#b1b6ca'},
  wyrm:{name:'Frostwyrm',hp:520,speed:60,damage:35,xp:210,radius:23,color:'#a7daed'},
  demon:{name:'Rissdämon',hp:550,speed:81,damage:33,xp:245,radius:22,color:'#b999df'},
  captain:{name:'DER GEZEITENKÖNIG',hp:1400,speed:42,damage:20,xp:600,radius:32,color:'#dba867'},
  matriarch:{name:'DIE DORNENMUTTER',hp:3000,speed:32,damage:28,xp:1000,radius:40,color:'#b2d878'},
  lich:{name:'DER GRABESFÜRST',hp:4100,speed:40,damage:34,xp:1400,radius:35,color:'#d4b5f1'},
  sovereign:{name:'DER RISSREGENT',hp:9500,speed:30,damage:44,xp:3000,radius:48,color:'#f0c476'},
  rat:{name:'Pestratte',hp:115,speed:118,damage:17,xp:55,radius:13,color:'#b9a77f'},
  scarab:{name:'Bernsteinkäfer',hp:275,speed:75,damage:26,xp:135,radius:18,color:'#dfb560'},
  sentinel:{name:'Tempelwache',hp:850,speed:47,damage:40,xp:310,radius:23,color:'#bdb88c'},
  imp:{name:'Funkenwicht',hp:340,speed:96,damage:32,xp:155,radius:15,color:'#db9574'},
  frostling:{name:'Eisgeist',hp:390,speed:94,damage:31,xp:180,radius:16,color:'#a5d4e5'},
  shadebeast:{name:'Leerenbestie',hp:760,speed:90,damage:42,xp:340,radius:21,color:'#b098d0'},
  plague:{name:'DER PESTTRÄGER',hp:2000,speed:45,damage:23,xp:800,radius:32,color:'#b7c279'},
  queen:{name:'DIE BERNSTEINKÖNIGIN',hp:3500,speed:35,damage:30,xp:1300,radius:38,color:'#e5bd73'},
  smith:{name:'DER SCHLACKENSCHMIED',hp:5500,speed:32,damage:38,xp:1900,radius:42,color:'#edac78'},
  frostking:{name:'DER WINTERFÜRST',hp:6200,speed:40,damage:40,xp:2200,radius:40,color:'#aad7e7'},
  oracle:{name:'DAS STEINORAKEL',hp:7800,speed:25,damage:42,xp:2600,radius:42,color:'#d5d1a1'},
  voidheart:{name:'DAS HERZ DER LEERE',hp:14000,speed:30,damage:49,xp:4500,radius:46,color:'#c5a9ea'},
  bloodlord:{name:'DER BLUTFÜRST',hp:7200,speed:46,damage:41,xp:2500,radius:40,color:'#d27676'},
  starengine:{name:'DIE STERNENMASCHINE',hp:8600,speed:26,damage:43,xp:2900,radius:44,color:'#7ec9df'},
  shardking:{name:'DER SCHERBENKÖNIG',hp:11500,speed:34,damage:47,xp:3900,radius:47,color:'#d0b6eb'},
  duskmaw:{name:'DER DÄMMERSCHLUND',hp:16500,speed:38,damage:52,xp:5200,radius:49,color:'#8d78bd'},
  acolyte:{name:'Blutakolyth',hp:510,speed:84,damage:34,xp:190,radius:17,color:'#c77a7a'},
  construct:{name:'Sternenkonstrukt',hp:720,speed:55,damage:38,xp:260,radius:22,color:'#79b9c7'},
  shardling:{name:'Scherbenläufer',hp:880,speed:74,damage:41,xp:320,radius:20,color:'#b7a1d5'},
  duskspawn:{name:'Dämmerbrut',hp:980,speed:92,damage:44,xp:360,radius:21,color:'#8973ad'},
  mirrorkin:{name:'Spiegelscherbe',hp:920,speed:88,damage:42,xp:350,radius:19,color:'#9fb9cf'},
  sporeling:{name:'Sporenträger',hp:1040,speed:64,damage:45,xp:380,radius:22,color:'#94bf75'},
  stormling:{name:'Sturmfunke',hp:900,speed:112,damage:43,xp:365,radius:18,color:'#77b8da'},
  abyssling:{name:'Sternenschatten',hp:1180,speed:86,damage:48,xp:420,radius:21,color:'#665f90'},
  mirrorwarden:{name:'DER SPIEGELHÜTER',hp:18200,speed:36,damage:53,xp:5900,radius:48,color:'#a9c1d8'},
  sporefather:{name:'DER SPORENPATRIARCH',hp:19400,speed:30,damage:55,xp:6200,radius:50,color:'#9bc87d'},
  stormseer:{name:'DER STURMSEHER',hp:20800,speed:44,damage:56,xp:6600,radius:47,color:'#80c0e3'},
  abyssstar:{name:'DER ABGRUNDSTERN',hp:23800,speed:38,damage:60,xp:7400,radius:52,color:'#7067a4'}

});
export const RARITIES = [
  { name: 'Gewöhnlich', color: '#a2b0ae', mult: 1 },
  { name: 'Selten', color: '#6db9cd', mult: 1.5 },
  { name: 'Episch', color: '#b798d8', mult: 2.1 },
  { name: 'Relikt', color: '#e6b56b', mult: 3 }
];
export const ITEM_NAMES = {
  weapon: ['Aschenklinge', 'Nachtsehne', 'Runenstab'],
  armor: ['Glutpanzer', 'Dämmerschutz', 'Sternengewand'],
  charm: ['Splitteramulett', 'Mondzeichen', 'Hüterfragment']
};
export const MAX_INVENTORY = 8;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function rng(seed = 48129) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ s >>> 15, 1 | s); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function makeMap(seed = 48129) {
  const random = rng(seed), tiles = [], decorations = [];
  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2;
      const sanctuary = Math.hypot(px - HOME.x, py - HOME.y) < 190;
      const altar = Math.hypot(px - ALTAR.x, py - ALTAR.y) < 170;
      const path = Math.abs(py - 820 + Math.sin(px / 180) * 30) < 72;
      const border = x < 2 || y < 2 || x > WORLD_W - 3 || y > WORLD_H - 3;
      const ruins = !sanctuary && !altar && !path && x > 18 && ((x % 13 === 0 && y % 11 > 2 && y % 11 < 8) || (y % 13 === 2 && x % 13 > 2 && x % 13 < 7));
      const type = border ? 3 : ruins ? 2 : sanctuary || altar || path ? 1 : 0;
      tiles.push({ x, y, type, variant: Math.floor(random() * 8) });
      if (type === 0 && random() < .13) decorations.push({ x: px + random() * 20 - 10, y: py, kind: Math.floor(random() * 5), variant: random() });
    }
  }
  return { seed, tiles, decorations };
}
export function walkable(map, x, y, radius = 13) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  for (const ox of [-radius, radius]) for (const oy of [-radius, radius]) {
    const tx = Math.floor((x + ox) / TILE), ty = Math.floor((y + oy) / TILE);
    if (tx < 0 || tx >= (map.width || WORLD_W) || ty < 0 || ty >= (map.height || WORLD_H)) return false;
    if (map.tiles[ty * (map.width || WORLD_W) + tx].type >= 2) return false;
  }
  return true;
}
export function xpNeeded(level) { return Math.floor(70 * Math.pow(level, 1.44)); }
