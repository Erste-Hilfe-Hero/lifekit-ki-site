// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { TILE, WORLD_W, WORLD_H, HOME, ALTAR, CLASSES, ENEMY_TYPES, RARITIES, ITEM_NAMES, MAX_INVENTORY, clamp, dist, rng, makeMap, walkable, xpNeeded } from './data.mjs';
import { projectileSpec } from './projectile.mjs';

const finite = (v, fallback = 0) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const copy = value => JSON.parse(JSON.stringify(value));
export function cleanName(value) {
  return (typeof value === 'string' ? value : '').normalize('NFKC').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 20) || 'Wanderer';
}
export function validItem(value) {
  return value && typeof value.id === 'string' && value.id.length <= 80 &&
    ['weapon', 'armor', 'charm'].includes(value.slot) && Number.isInteger(value.rarity) &&
    value.rarity >= 0 && value.rarity <= 3 && typeof value.name === 'string' && value.name.length <= 64 &&
    Number.isFinite(value.stat) && value.stat >= 0 && value.stat <= 250;
}
export function cleanProfile(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const cls = Object.hasOwn(CLASSES, raw.classId) ? raw.classId : 'warden';
  const items = Array.isArray(raw.inventory) ? raw.inventory.filter(validItem).slice(0, MAX_INVENTORY).map(copy) : [];
  const equipment = {};
  for (const slot of ['weapon', 'armor', 'charm']) if (validItem(raw.equipment?.[slot]) && raw.equipment[slot].slot === slot) equipment[slot] = copy(raw.equipment[slot]);
  const level = clamp(Math.floor(finite(raw.level, 1)), 1, 20);
  return {
    version: 1, classId: cls, name: cleanName(raw.name), level,
    x: clamp(finite(raw.x, HOME.x), 80, WORLD_W * TILE - 80),
    y: clamp(finite(raw.y, HOME.y), 80, WORLD_H * TILE - 80),
    hp: typeof raw.hp === 'number' && Number.isFinite(raw.hp) ? Math.max(0, raw.hp) : null,
    mp: typeof raw.mp === 'number' && Number.isFinite(raw.mp) ? Math.max(0, raw.mp) : null,
    xp: clamp(Math.floor(finite(raw.xp)), 0, xpNeeded(level) - 1),
    bank: clamp(Math.floor(finite(raw.bank)), 0, 100000000), deaths: clamp(Math.floor(finite(raw.deaths)), 0, 1000000),
    inventory: items, equipment, dead: raw.dead === true,
    runCoins: clamp(Math.floor(finite(raw.runCoins)), 0, 1000000),
    potions: clamp(Math.floor(finite(raw.potions, 3)), 0, 3),
    abilityCd: clamp(finite(raw.abilityCd), 0, 30), dashCd: clamp(finite(raw.dashCd), 0, 5), fireCd: clamp(finite(raw.fireCd), 0, 2)
  };
}
export function segmentDistance(ax, ay, bx, by, px, py) {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / len, 0, 1);
  return { distance: Math.hypot(px - ax - t * dx, py - ay - t * dy), t };
}

export class Engine {
  constructor({ seed = 48129 } = {}) {
    this.instanceId = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
    this.seed = seed; this.map = makeMap(seed); this.random = rng(seed + 17);
    this.players = new Map(); this.enemies = []; this.bullets = []; this.loot = [];
    this.events = []; this.eventSeq = 0; this.idSeq = 0; this.time = 0;
    this.wave = 1; this.kills = 0; this.bossState = 'sealed'; this.bossDefeats = 0;
    this.spawnWave();
  }
  id(prefix) { return `${prefix}-${this.instanceId}-${++this.idSeq}`; }
  event(type, data = {}) {
    this.events.push({ seq: ++this.eventSeq, time: this.time, type, ...data });
    if (this.events.length > 48) this.events.shift();
  }
  addPlayer(id, name = 'Wanderer', classId = 'warden', saved = {}) {
    if (this.players.has(id)) return this.players.get(id);
    const profile = cleanProfile({ ...saved, classId, name });
    const p = {
      id, ...profile, x: profile.x, y: profile.y,
      angle: 0, hp: 1, mp: 1, radius: 13, fireCd: profile.fireCd, abilityCd: profile.abilityCd, dashCd: profile.dashCd,
      dashTime: 0, dashX: 1, dashY: 0, shield: 0, invulnerable: 0,
      nexus: 0, lastInput: this.time, input: { dx: 0, dy: 0, angle: 0, fire: false, auto: false },
      hitFlash: 0, kills: 0, connected: true, lastPickupNotice: -10
    };
    if (!walkable(this.map, p.x, p.y, p.radius)) { p.x = HOME.x; p.y = HOME.y; }
    const stats = this.stats(p); p.hp = p.dead ? 0 : profile.hp === null ? stats.maxHP : clamp(profile.hp, 1, stats.maxHP); p.mp = profile.mp === null ? stats.maxMP : clamp(profile.mp, 0, stats.maxMP);
    this.players.set(id, p);
    return p;
  }
  removePlayer(id) { this.players.delete(id); }
  stats(p) {
    const c = CLASSES[p.classId];
    return {
      maxHP: c.hp + (p.level - 1) * 12 + (p.equipment.armor?.stat || 0) * 3,
      maxMP: c.mp + (p.level - 1) * 5 + (p.equipment.charm?.stat || 0),
      damage: c.damage + (p.level - 1) * 2 + (p.equipment.weapon?.stat || 0),
      defense: c.defense + Math.floor((p.equipment.armor?.stat || 0) / 2),
      speed: c.speed, interval: c.interval
    };
  }
  safe(p) { return dist(p, HOME) < HOME.radius; }
  profile(id) {
    const p = this.players.get(id);
    return p ? cleanProfile(p) : null;
  }
  setInput(id, raw = {}) {
    const p = this.players.get(id); if (!p || p.dead) return;
    let dx = clamp(finite(raw.dx), -1, 1), dy = clamp(finite(raw.dy), -1, 1);
    const mag = Math.hypot(dx, dy); if (mag > 1) { dx /= mag; dy /= mag; }
    p.input = { dx, dy, angle: clamp(finite(raw.angle, p.angle), -Math.PI * 2, Math.PI * 2), fire: raw.fire === true, auto: raw.auto === true };
    p.lastInput = this.time;
  }
  action(id, raw) {
    const p = this.players.get(id);
    if (!p || !raw || typeof raw.type !== 'string') return false;
    if (raw.type === 'rebirth' && p.dead) {
      p.dead = false; p.x = HOME.x; p.y = HOME.y; p.hp = this.stats(p).maxHP; p.mp = this.stats(p).maxMP; p.potions = 3;
      p.invulnerable = 2; p.fireCd = 0; p.abilityCd = 0; p.dashCd = 0; p.input = { dx: 0, dy: 0, angle: 0, fire: false, auto: false };
      this.event('rebirth', { playerId: id }); return true;
    }
    if (p.dead) return false;
    if (raw.type === 'heal' && p.potions > 0 && p.hp < this.stats(p).maxHP) {
      p.potions--; p.hp = Math.min(this.stats(p).maxHP, p.hp + this.stats(p).maxHP * .55);
      this.event('heal', { playerId: id, x: p.x, y: p.y }); return true;
    }
    if (raw.type === 'dash' && p.dashCd <= 0 && p.nexus <= 0) {
      const d = Math.hypot(p.input.dx, p.input.dy);
      p.dashX = d > .05 ? p.input.dx / d : Math.cos(p.angle);
      p.dashY = d > .05 ? p.input.dy / d : Math.sin(p.angle);
      p.dashTime = .17; p.invulnerable = .24; p.dashCd = 2.8;
      this.event('dash', { playerId: id, x: p.x, y: p.y }); return true;
    }
    if (raw.type === 'ability') return this.cast(p);
    if (raw.type === 'nexus' && p.nexus <= 0 && !this.safe(p)) {
      p.nexus = 2.5; p.input = { dx: 0, dy: 0, angle: p.angle, fire: false, auto: false };
      this.event('channel', { playerId: id, text: 'Rückkehr · Schaden unterbricht' }); return true;
    }
    if (raw.type === 'interact') return this.interact(p);
    if (raw.type === 'equip' && typeof raw.itemId === 'string' && p.nexus <= 0) {
      const i = p.inventory.findIndex(item => item.id === raw.itemId); if (i < 0) return false;
      const item = p.inventory.splice(i, 1)[0], old = p.equipment[item.slot];
      p.equipment[item.slot] = item; if (old) p.inventory.push(old);
      p.hp = Math.min(p.hp, this.stats(p).maxHP); p.mp = Math.min(p.mp, this.stats(p).maxMP);
      this.event('equip', { playerId: id, text: item.name }); return true;
    }
    if (raw.type === 'salvage' && this.safe(p)) {
      const i = p.inventory.findIndex(item => item.id === raw.itemId); if (i < 0) return false;
      const item = p.inventory.splice(i, 1)[0]; p.bank += 5 * (item.rarity + 1);
      this.event('bank', { playerId: id, amount: 5 * (item.rarity + 1) }); return true;
    }
    if (raw.type === 'refill' && this.safe(p) && p.potions < 3) {
      const cost = (3 - p.potions) * 8;
      if (p.bank < cost) { this.event('notice', { playerId: id, text: `${cost} Riftmarken benötigt.` }); return false; }
      p.bank -= cost; p.potions = 3; this.event('heal', { playerId: id, x: p.x, y: p.y }); return true;
    }
    if (raw.type === 'descend' && this.bossState === 'defeated' && dist(p, ALTAR) < 145) {
      this.wave++; this.kills = 0; this.bossState = 'sealed'; this.spawnWave();
      this.event('wave', { wave: this.wave }); return true;
    }
    return false;
  }
  move(entity, vx, vy, dt) {
    // Substeps prevent dashes and high-speed entities from tunnelling through walls.
    const count = Math.max(1, Math.ceil(Math.hypot(vx * dt, vy * dt) / 8));
    for (let i = 0; i < count; i++) {
      const nx = entity.x + vx * dt / count, ny = entity.y + vy * dt / count;
      if (walkable(this.map, nx, entity.y, entity.radius)) entity.x = nx;
      if (walkable(this.map, entity.x, ny, entity.radius)) entity.y = ny;
    }
  }
  cast(p) {
    const c = CLASSES[p.classId];
    if (p.abilityCd > 0 || p.mp < c.cost || this.safe(p) || p.nexus > 0) return false;
    p.mp -= c.cost; p.abilityCd = c.cooldown;
    const damage = this.stats(p).damage;
    if (p.classId === 'warden') {
      p.shield = 3;
      for (const enemy of this.enemies) if (enemy.hp > 0 && dist(enemy, p) < 170) this.damageEnemy(enemy, damage * 2.1, p.id);
    } else if (p.classId === 'ranger') {
      for (let i = -3; i <= 3; i++) this.projectile(p, p.angle + i * .13, 'player', damage * 1.25, 680, 1.0, true, true);
    } else {
      for (let i = 0; i < 12; i++) this.projectile(p, p.angle + i * Math.PI / 6, 'player', damage * 1.7, 470, 1.15, true, true);
    }
    this.event('ability', { playerId: p.id, classId: p.classId, x: p.x, y: p.y }); return true;
  }
  projectile(source, angle, team, damage, speed, lifetime, multiHit = false, piercing = false) {
    if (this.bullets.length >= 650) return;
    // Normalize through Nyrathen's own projectile contract before entering the simulation.
    const d = projectileSpec({ damage, speed, lifetime, multiHit, piercing });
    this.bullets.push({ id: this.id('b'), owner: source.id, x: source.x + Math.cos(angle) * (source.radius + 6), y: source.y + Math.sin(angle) * (source.radius + 6),
      vx: Math.cos(angle) * d.speed, vy: Math.sin(angle) * d.speed, angle, team, damage: d.damage,
      life: d.lifetime, multiHit: d.multiHit, piercing: d.piercing, hit: new Set(), radius: team === 'enemy' ? 6 : 4,
      color: team === 'enemy' ? '#ef916e' : (CLASSES[source.classId]?.color || '#9fdaca') });
  }
  spawnEnemy(kind, x, y) {
    const t = ENEMY_TYPES[kind];
    const e = { id: this.id('e'), kind, x, y, radius: t.radius, hp: Math.floor(t.hp * (1 + (this.wave - 1) * .45)),
      maxHP: Math.floor(t.hp * (1 + (this.wave - 1) * .45)), angle: 0, cooldown: 1 + this.random(), touchCd: 0,
      phase: 1, telegraph: 0, pendingAttack: false, spin: 0, hitFlash: 0 };
    this.enemies.push(e); return e;
  }
  spawnWave() {
    this.enemies = []; this.bullets = [];
    const positions = [[930,790], [1010,910], [850,570], [930,1120], [1240,680], [1260,1000], [1500,550], [1730,1070], [420,1120], [350,580], [670,380], [1140,330], [1630,350], [1760,1320], [1150,1300], [550,1350], [380,850], [1450,1160]];
    positions.forEach(([x, y], i) => {
      const kind = i % 5 === 4 ? 'brute' : i % 3 === 1 ? 'cultist' : 'hollow';
      if (walkable(this.map, x, y, ENEMY_TYPES[kind].radius)) this.spawnEnemy(kind, x, y);
    });
  }
  damagePlayer(p, damage) {
    if (p.dead || this.safe(p) || p.invulnerable > 0 || !p.connected) return;
    const value = Math.max(1, Math.round((damage - this.stats(p).defense) * (p.shield > 0 ? .22 : 1)));
    p.hp -= value; p.hitFlash = .18; p.invulnerable = .14;
    if (p.nexus > 0) { p.nexus = 0; this.event('notice', { playerId: p.id, text: 'Rückkehr unterbrochen!' }); }
    this.event('hurt', { playerId: p.id, x: p.x, y: p.y, value });
    if (p.hp <= 0) {
      p.hp = 0; p.dead = true; p.deaths++; p.runCoins = 0; p.inventory = []; p.equipment = {}; p.level = 1; p.xp = 0;
      p.nexus = 0; p.shield = 0; p.dashTime = 0;
      this.event('death', { playerId: p.id, x: p.x, y: p.y });
    }
  }
  damageEnemy(e, damage, owner, piercing = false) {
    if (e.hp <= 0) return;
    const defense = e.kind === 'boss' ? 10 : e.kind === 'brute' ? 8 : e.kind === 'hollow' ? 2 : 1;
    damage = piercing ? damage : Math.max(damage * .15, damage - defense);
    e.hp -= Math.round(damage); e.hitFlash = .09;
    this.event('hit', { x: e.x, y: e.y, value: Math.round(damage) });
    if (e.hp > 0) return;
    this.kills++;
    const p = this.players.get(owner); if (p) p.kills++;
    for (const ally of this.players.values()) {
      if (!ally.dead && ally.connected && dist(ally, e) < 780) this.giveXP(ally, Math.round(ENEMY_TYPES[e.kind].xp * (1 + this.wave * .1)));
    }
    this.loot.push({ id: this.id('l'), kind: 'coin', amount: e.kind === 'boss' ? 90 + this.wave * 20 : 4 + Math.floor(this.random() * 8), x: e.x, y: e.y, life: 180 });
    if (e.kind === 'boss' || this.random() < .4) {
      const rarity = e.kind === 'boss' ? (this.random() > .6 ? 3 : 2) : (this.random() > .92 ? 2 : this.random() > .6 ? 1 : 0);
      const slots = ['weapon', 'armor', 'charm'], slot = slots[Math.floor(this.random() * 3)];
      const item = { id: this.id('item'), slot, rarity, name: ITEM_NAMES[slot][Math.floor(this.random() * 3)], stat: Math.min(250, Math.round((3 + this.wave * 2) * RARITIES[rarity].mult)) };
      this.loot.push({ id: this.id('l'), kind: 'item', item, x: e.x + 20, y: e.y + 14, life: 240 });
    }
    this.event('kill', { x: e.x, y: e.y, kind: e.kind });
    if (e.kind === 'boss') {
      this.bossState = 'defeated'; this.bossDefeats++;
      this.event('victory', { x: e.x, y: e.y });
    } else if (this.kills >= 8 && this.bossState === 'sealed') {
      this.bossState = 'awake';
      const boss = this.spawnEnemy('boss', ALTAR.x, ALTAR.y);
      const allies = [...this.players.values()].filter(q => q.connected && !q.dead).length;
      boss.maxHP = Math.round(boss.maxHP * (1 + Math.max(0, allies - 1) * .65)); boss.hp = boss.maxHP;
      this.event('boss', { text: 'Der Aschenhüter ist erwacht.' });
    }
  }
  giveXP(p, amount) {
    if (p.level >= 20) return;
    p.xp += amount;
    while (p.level < 20 && p.xp >= xpNeeded(p.level)) {
      p.xp -= xpNeeded(p.level); p.level++; p.hp = this.stats(p).maxHP; p.mp = this.stats(p).maxMP;
      this.event('level', { playerId: p.id, level: p.level, x: p.x, y: p.y });
    }
    if (p.level === 20) p.xp = 0;
  }
  interact(p) {
    if (this.safe(p)) {
      if (p.runCoins > 0) { const amount = p.runCoins; p.bank += amount; p.runCoins = 0; this.event('bank', { playerId: p.id, amount }); return true; }
      this.event('notice', { playerId: p.id, text: 'Zuflucht · Splitter gesichert. Tränke im Gepäck auffüllen.' }); return true;
    }
    const near = this.loot.filter(l => l.kind === 'item' && dist(l, p) < 85).sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (near) {
      if (p.inventory.length >= MAX_INVENTORY) { this.event('notice', { playerId: p.id, text: 'Gepäck voll. In der Zuflucht zerlegen.' }); return false; }
      p.inventory.push(near.item); this.loot.splice(this.loot.indexOf(near), 1);
      this.event('loot', { playerId: p.id, rarity: near.item.rarity, text: near.item.name }); return true;
    }
    if (this.bossState === 'defeated' && dist(p, ALTAR) < 145) return this.action(p.id, { type: 'descend' });
    return false;
  }
  step(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, .05); this.time += dt;
    for (const p of this.players.values()) {
      if (p.dead) continue;
      for (const key of ['fireCd', 'abilityCd', 'dashCd', 'dashTime', 'shield', 'invulnerable', 'hitFlash']) p[key] = Math.max(0, p[key] - dt);
      if (!p.connected || this.time - p.lastInput > .7) p.input = { dx: 0, dy: 0, angle: p.angle, fire: false, auto: false };
      const s = this.stats(p), c = CLASSES[p.classId];
      if (this.safe(p)) { p.hp = Math.min(s.maxHP, p.hp + dt * 34); p.mp = Math.min(s.maxMP, p.mp + dt * 28); }
      else p.mp = Math.min(s.maxMP, p.mp + dt * (5 + (p.equipment.charm?.stat || 0) * .2));
      if (p.nexus > 0) {
        p.nexus = Math.max(0, p.nexus - dt);
        if (p.nexus === 0) {
          p.x = HOME.x; p.y = HOME.y; p.invulnerable = 1;
          const amount = p.runCoins; p.bank += amount; p.runCoins = 0;
          this.event('bank', { playerId: p.id, amount });
        }
        continue;
      }
      p.angle = p.input.angle;
      this.move(p, p.dashTime > 0 ? p.dashX * 780 : p.input.dx * s.speed, p.dashTime > 0 ? p.dashY * 780 : p.input.dy * s.speed, dt);
      let target = null;
      if (p.input.auto) {
        for (const e of this.enemies) if (e.hp > 0 && dist(e, p) < c.range && (!target || dist(e, p) < dist(target, p))) target = e;
        if (target) p.angle = Math.atan2(target.y - p.y, target.x - p.x);
      }
      if ((p.input.fire || target) && p.fireCd <= 0 && !this.safe(p)) {
        p.fireCd = s.interval;
        this.projectile(p, p.angle, 'player', s.damage, 610, c.range / 610);
        this.event('shoot', { playerId: p.id, x: p.x, y: p.y, classId: p.classId });
      }
    }
    const targets = [...this.players.values()].filter(p => !p.dead && p.connected && !this.safe(p));
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.cooldown -= dt; e.touchCd -= dt; e.hitFlash = Math.max(0, e.hitFlash - dt);
      const t = ENEMY_TYPES[e.kind];
      let p = null, nearest = e.kind === 'boss' ? 1000 : 660;
      for (const q of targets) { const d = dist(e, q); if (d < nearest) { nearest = d; p = q; } }
      if (!p) continue;
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      const minimum = e.kind === 'cultist' ? 270 : e.kind === 'boss' ? 270 : e.radius + 12;
      if (nearest > minimum && e.telegraph <= 0) this.move(e, Math.cos(e.angle) * t.speed, Math.sin(e.angle) * t.speed, dt);
      if (nearest < e.radius + p.radius + 8 && e.touchCd <= 0) { this.damagePlayer(p, t.damage); e.touchCd = .85; }
      if (e.kind === 'cultist' && e.cooldown <= 0 && nearest < 610) {
        this.projectile(e, e.angle, 'enemy', t.damage, 215, 3); e.cooldown = 1.7;
      }
      if (e.kind === 'brute' && e.cooldown <= 0 && nearest < 330) {
        for (let i = -1; i <= 1; i++) this.projectile(e, e.angle + i * .24, 'enemy', t.damage, 170, 2);
        e.cooldown = 2.8;
      }
      if (e.kind === 'boss') {
        e.phase = e.hp / e.maxHP > .68 ? 1 : e.hp / e.maxHP > .33 ? 2 : 3;
        if (e.cooldown <= 0 && !e.pendingAttack) { e.telegraph = .85; e.pendingAttack = true; }
        if (e.pendingAttack) {
          e.telegraph = Math.max(0, e.telegraph - dt);
          if (e.telegraph === 0) {
            const n = 10 + e.phase * 4;
            for (let i = 0; i < n; i++) this.projectile(e, e.spin + i * Math.PI * 2 / n, 'enemy', t.damage, 115 + e.phase * 20, 4.5);
            if (e.phase >= 2) for (let i = -2; i <= 2; i++) this.projectile(e, e.angle + i * .15, 'enemy', t.damage + 5, 240, 3);
            e.spin += .31; e.cooldown = 2.5 - e.phase * .3; e.pendingAttack = false;
            this.event('burst', { x: e.x, y: e.y });
          }
        }
      }
    }
    for (const b of this.bullets) {
      b.life -= dt; if (b.life <= 0) continue;
      const ox = b.x, oy = b.y, nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      const samples = Math.max(1, Math.ceil(Math.hypot(nx - ox, ny - oy) / 10));
      let wall = false;
      for (let i = 1; i <= samples; i++) if (!walkable(this.map, ox + (nx - ox) * i / samples, oy + (ny - oy) * i / samples, 2)) { wall = true; break; }
      if (wall) { b.life = 0; continue; }
      b.x = nx; b.y = ny;
      const entities = b.team === 'player' ? this.enemies.filter(e => e.hp > 0) : [...this.players.values()].filter(p => !p.dead && p.connected);
      const hits = [];
      for (const target of entities) {
        if (b.hit.has(target.id)) continue;
        const d = segmentDistance(ox, oy, nx, ny, target.x, target.y);
        if (d.distance < target.radius + b.radius) hits.push({ target, t: d.t });
      }
      hits.sort((a, b) => a.t - b.t);
      for (const { target } of hits) {
        b.hit.add(target.id);
        if (b.team === 'player') this.damageEnemy(target, b.damage, b.owner, b.piercing);
        else this.damagePlayer(target, b.damage);
        if (!b.multiHit) { b.life = 0; break; }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    for (const l of this.loot) {
      l.life -= dt;
      if (l.kind !== 'coin' || l.life <= 0) continue;
      let nearest = null;
      for (const p of this.players.values()) if (!p.dead && p.connected && dist(l, p) < 84 && (!nearest || dist(l, p) < dist(l, nearest))) nearest = p;
      if (nearest) { nearest.runCoins += l.amount; l.life = 0; this.event('coin', { playerId: nearest.id, amount: l.amount, x: l.x, y: l.y }); }
    }
    this.loot = this.loot.filter(l => l.life > 0).slice(-120);
  }
  snapshot(ownId) {
    return {
      version: 1, seed: this.seed, time: this.time, wave: this.wave, kills: this.kills, bossState: this.bossState, bossDefeats: this.bossDefeats,
      players: [...this.players.values()].map(p => ({
        id: p.id, name: p.name, classId: p.classId, x: p.x, y: p.y, angle: p.angle,
        hp: p.hp, mp: p.mp, ...this.stats(p), level: p.level, xp: p.xp, dead: p.dead,
        shield: p.shield, dashTime: p.dashTime, invulnerable: p.invulnerable, hitFlash: p.hitFlash, nexus: p.nexus,
        abilityCd: p.abilityCd, dashCd: p.dashCd, connected: p.connected,
        ...(p.id === ownId ? { inventory: copy(p.inventory), equipment: copy(p.equipment), potions: p.potions, bank: p.bank, runCoins: p.runCoins, deaths: p.deaths } : {})
      })),
      enemies: this.enemies.map(e => ({ ...e })),
      bullets: this.bullets.map(({ hit, vx, vy, damage, multiHit, piercing, life, ...b }) => b),
      loot: this.loot.map(l => ({ ...l })), events: this.events.map(e => ({ ...e }))
    };
  }
}
