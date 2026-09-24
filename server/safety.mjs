// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Account-scoped communication controls. Blocking never hides combat or enemy projectiles.
import { randomUUID } from 'node:crypto';
export const REPORT_REASONS = Object.freeze(['harassment','spam','cheating','other']);
const safetyError=message=>Object.assign(new Error(message),{status:400});
export class SafetyStore {
  constructor(db){
    this.db=db;this.cache=new Map();this.summaryCache=new Map();
    db.exec(`CREATE TABLE IF NOT EXISTS player_blocks (
      owner TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      target TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL, PRIMARY KEY(owner,target), CHECK(owner<>target));
      CREATE TABLE IF NOT EXISTS player_reports (
      id TEXT PRIMARY KEY,reporter TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      target TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,quote TEXT NOT NULL,created_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'open',
      reviewed_at INTEGER,review_note TEXT NOT NULL DEFAULT '');
      CREATE TABLE IF NOT EXISTS chat_restrictions (
      player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,until INTEGER NOT NULL,reason TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS account_bans (
      player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,until INTEGER NOT NULL,reason TEXT NOT NULL);`);
    this.prune();
  }
  playerExists(id){return typeof id==='string'&&!!this.db.prepare('SELECT id FROM players WHERE id=?').get(id);}
  blocked(id){
    if(!this.cache.has(id))this.cache.set(id,new Set(this.db.prepare('SELECT target FROM player_blocks WHERE owner=?').all(id).map(row=>row.target)));
    return this.cache.get(id);
  }
  clearCache(){this.cache.clear();this.summaryCache.clear();}
  setBlock(owner,target,enabled){
    if(owner===target||!this.playerExists(target)||!this.playerExists(owner))throw safetyError('Spielerkonto nicht gefunden.');
    if(enabled){
      if(!this.blocked(owner).has(target)&&this.blocked(owner).size>=64)throw safetyError('Höchstens 64 blockierte Konten.');
      this.db.prepare('INSERT OR IGNORE INTO player_blocks VALUES (?, ?, ?)').run(owner,target,Date.now());
    }else this.db.prepare('DELETE FROM player_blocks WHERE owner=? AND target=?').run(owner,target);
    this.cache.delete(owner);this.summaryCache.delete(owner);return true;
  }
  summary(owner,now=Date.now()){
    // Snapshot fan-out can call this thousands of times per second. Safety state is account scoped
    // and changes only through this store, so a short cache removes hot-path SQLite reads without
    // delaying moderation changes (writers invalidate immediately).
    const cached=this.summaryCache.get(owner);if(cached&&cached.until>now)return cached.value;
    const rows=this.db.prepare('SELECT b.target,p.profile FROM player_blocks b JOIN players p ON p.id=b.target WHERE b.owner=? ORDER BY b.created_at DESC').all(owner);
    const blocked=rows.map(row=>{let name='Spieler';try{name=JSON.parse(row.profile).name||name;}catch{}return{id:row.target,name};});
    const restriction=this.db.prepare('SELECT until,reason FROM chat_restrictions WHERE player_id=? AND until>?').get(owner,now);
    const value={blocked,chatMutedUntil:restriction?.until||0,chatMuteReason:restriction?.reason||''};
    this.summaryCache.set(owner,{until:Math.min(now+1000,restriction?.until||now+1000),value});return value;
  }
  filterChat(owner,messages){const blocked=this.blocked(owner);return messages.filter(message=>message.system||!blocked.has(message.playerId));}
  canCommunicate(a,b){return typeof a==='string'&&typeof b==='string'&&a!==b&&!this.blocked(a).has(b)&&!this.blocked(b).has(a);}
  canTrade(a,b){return this.canCommunicate(a,b);}
  canChat(id){return !this.db.prepare('SELECT player_id FROM chat_restrictions WHERE player_id=? AND until>?').get(id,Date.now());}
  prune(now=Date.now()){
    this.db.prepare('DELETE FROM player_reports WHERE created_at<?').run(now-30*86400000);
    this.db.prepare('DELETE FROM chat_restrictions WHERE until<=?').run(now);
    this.db.prepare('DELETE FROM account_bans WHERE until<=?').run(now);
    this.db.prepare('DELETE FROM player_reports WHERE id NOT IN(SELECT id FROM player_reports ORDER BY created_at DESC,rowid DESC LIMIT 2000)').run();
    // Expired mutes can change the public summary even without a write on this account.
    for(const [id,cached] of this.summaryCache)if(cached.until<=now)this.summaryCache.delete(id);
  }
  report(reporter,target,reason,quote=''){
    if(reporter===target||!this.playerExists(target)||!REPORT_REASONS.includes(reason))throw safetyError('Ungültige Meldung.');
    const now=Date.now();this.prune(now);const previous=this.db.prepare('SELECT id FROM player_reports WHERE reporter=? AND target=? AND reason=? AND created_at>?').get(reporter,target,reason,now-86400000);
    if(previous)return {reference:previous.id,duplicate:true};
    // No unbounded permanent collection. Reports are private to the local operator.
    this.db.prepare('DELETE FROM player_reports WHERE created_at<?').run(now-30*86400000);
    const id=randomUUID();this.db.prepare('INSERT INTO player_reports(id,reporter,target,reason,quote,created_at) VALUES(?,?,?,?,?,?)').run(id,reporter,target,reason,String(quote).slice(0,600),now);
    this.db.prepare('DELETE FROM player_reports WHERE id NOT IN(SELECT id FROM player_reports ORDER BY created_at DESC,rowid DESC LIMIT 2000)').run();
    return {reference:id,duplicate:false};
  }
  review(id,status,note){
    if(!['actioned','dismissed'].includes(status)||typeof note!=='string'||note.length>240)throw safetyError('Ungültige Entscheidung.');
    return !!this.db.prepare('UPDATE player_reports SET status=?,reviewed_at=?,review_note=? WHERE id=?').run(status,Date.now(),note,id).changes;
  }
  banStatus(playerId,now=Date.now()){const row=this.db.prepare('SELECT until,reason FROM account_bans WHERE player_id=? AND until>?').get(playerId,now);return row?{until:row.until,reason:row.reason}:null;}
  ban(playerId,minutes,reason){
    if(!this.playerExists(playerId)||!Number.isInteger(minutes)||minutes<0||minutes>5256000)throw safetyError('Gültiges Konto und 0–5256000 Minuten erforderlich.');
    if(typeof reason!=='string'||reason.trim().length<3||reason.length>240)throw safetyError('Begründung: 3–240 Zeichen.');
    if(minutes===0)this.db.prepare('DELETE FROM account_bans WHERE player_id=?').run(playerId);
    else this.db.prepare('INSERT INTO account_bans VALUES(?,?,?) ON CONFLICT(player_id) DO UPDATE SET until=excluded.until,reason=excluded.reason').run(playerId,Date.now()+minutes*60000,reason.trim());
    return this.banStatus(playerId);
  }
  mute(playerId,minutes,reason){
    if(!this.playerExists(playerId)||!Number.isInteger(minutes)||minutes<0||minutes>10080)throw safetyError('Gültiges Konto und 0–10080 Minuten erforderlich.');
    if(typeof reason!=='string'||reason.trim().length<3||reason.length>240)throw safetyError('Begründung: 3–240 Zeichen.');
    if(minutes===0)this.db.prepare('DELETE FROM chat_restrictions WHERE player_id=?').run(playerId);
    else this.db.prepare('INSERT INTO chat_restrictions VALUES(?,?,?) ON CONFLICT(player_id) DO UPDATE SET until=excluded.until,reason=excluded.reason').run(playerId,Date.now()+minutes*60000,reason);
    this.summaryCache.delete(playerId);
  }
}
