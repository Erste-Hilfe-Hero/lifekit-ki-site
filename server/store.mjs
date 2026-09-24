// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { cleanAdventureProfile } from '../shared/adventure.mjs';
import { masteryStars } from '../shared/adventure-data.mjs';
export class ProfileStore {
  constructor(path){
    if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, profile TEXT NOT NULL, updated_at INTEGER NOT NULL)');
    this.db.exec('CREATE TABLE IF NOT EXISTS realms (name TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at INTEGER NOT NULL)');
    this.db.exec('CREATE TABLE IF NOT EXISTS credentials (player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE, username TEXT UNIQUE NOT NULL COLLATE NOCASE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL)');
    this.db.exec('CREATE TABLE IF NOT EXISTS social (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL)');
    this.db.exec('CREATE TABLE IF NOT EXISTS action_receipts (player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, request_id TEXT NOT NULL, request_hash TEXT NOT NULL, accepted INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(player_id,request_id))');
    this.db.exec("CREATE TABLE IF NOT EXISTS commerce_receipts (provider TEXT NOT NULL, transaction_id TEXT NOT NULL, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, product_id TEXT NOT NULL, status TEXT NOT NULL, grant_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(provider,transaction_id)); CREATE TABLE IF NOT EXISTS commerce_events (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT NOT NULL, event TEXT NOT NULL, product_id TEXT, created_at INTEGER NOT NULL);");
    this.db.exec('CREATE TABLE IF NOT EXISTS player_activity (player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, day INTEGER NOT NULL, sessions INTEGER NOT NULL DEFAULT 1, last_at INTEGER NOT NULL, PRIMARY KEY(player_id,day))');
    this._insertPlayer=this.db.prepare('INSERT INTO players VALUES (?, ?, ?, ?)');
    this.passwordJobs=0;
    if(path!==':memory:')try{chmodSync(path,0o600);}catch{}
  }
  hash(token){return createHash('sha256').update(token).digest('hex');}
  prepareCreate(name,classId){
    const token=randomBytes(32).toString('base64url'),id=randomUUID(),profile=cleanAdventureProfile({name,classId});
    return{id,token,profile,tokenHash:this.hash(token),profileJson:JSON.stringify(profile),updatedAt:Date.now()};
  }
  insertPrepared(prepared){
    this._insertPlayer.run(prepared.id,prepared.tokenHash,prepared.profileJson,prepared.updatedAt);
    return{id:prepared.id,token:prepared.token,profile:prepared.profile};
  }
  create(name,classId){return this.insertPrepared(this.prepareCreate(name,classId));}
  find(token){
    if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
    const row=this.db.prepare('SELECT id, profile FROM players WHERE token_hash = ?').get(this.hash(token));
    if(!row)return null;try{return{id:row.id,profile:cleanAdventureProfile(JSON.parse(row.profile))};}catch{return null;}
  }
  importRecord({id,token,profile}){
    if(typeof id!=='string'||!id||typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('Invalid imported account record');
    const clean=cleanAdventureProfile(profile);this.db.prepare('INSERT INTO players(id,token_hash,profile,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,profile=excluded.profile,updated_at=excluded.updated_at').run(id,this.hash(token),JSON.stringify(clean),Date.now());return{id,token,profile:clean};
  }
  setToken(id,token){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('Invalid token');const r=this.db.prepare('UPDATE players SET token_hash=?,updated_at=? WHERE id=?').run(this.hash(token),Date.now(),id);if(!r.changes)throw new Error('Account not found');return token;}
  save(id,profile){if(!profile)return;this.db.prepare('UPDATE players SET profile = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(cleanAdventureProfile(profile)),Date.now(),id);}
  profileById(id){const row=this.db.prepare('SELECT profile FROM players WHERE id=?').get(id);if(!row)return null;try{return cleanAdventureProfile(JSON.parse(row.profile));}catch{return null;}}
  delete(id){this.db.prepare('DELETE FROM players WHERE id = ?').run(id);}
  transaction(callback){let began=false;try{this.db.exec('BEGIN IMMEDIATE');began=true;const result=callback();this.db.exec('COMMIT');return result;}catch(e){if(began&&this.db.isTransaction)try{this.db.exec('ROLLBACK');}catch{}throw e;}}
  saveWorld(name,state){this.db.prepare('INSERT INTO realms VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at').run(name,JSON.stringify(state),Date.now());}
  loadWorld(name){const row=this.db.prepare('SELECT state FROM realms WHERE name=?').get(name);if(!row)return null;try{return JSON.parse(row.state);}catch{return null;}}
  saveSocial(value){this.db.prepare('INSERT INTO social VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET state=excluded.state').run(JSON.stringify(value));}
  loadSocial(){const row=this.db.prepare('SELECT state FROM social WHERE id=1').get();if(!row)return null;try{return JSON.parse(row.state);}catch{return null;}}
  leaderboard(limit=20){
    const take=Math.max(1,Math.min(50,Number.isInteger(limit)?limit:20)),entries=[];
    const rows=this.db.prepare('SELECT profile FROM players ORDER BY updated_at DESC LIMIT 5000').all();
    for(const row of rows){try{const p=cleanAdventureProfile(JSON.parse(row.profile)),t=p.account?.totals||{};entries.push({name:p.name,classId:p.classId,level:p.level,fame:p.fame||0,kills:t.kills||0,dungeons:t.dungeons||0,bestLevel:t.bestLevel||p.level,deaths:p.deaths||0,masteryStars:masteryStars(p.account?.mastery)});}catch{}}
    entries.sort((a,b)=>b.fame-a.fame||b.dungeons-a.dungeons||b.kills-a.kills||b.bestLevel-a.bestLevel||a.name.localeCompare(b.name));
    return entries.slice(0,take).map((entry,index)=>({rank:index+1,...entry}));
  }
  speedLeaderboard(theme,limit=20){
    const take=Math.max(1,Math.min(50,Number.isInteger(limit)?limit:20)),entries=[];
    const rows=this.db.prepare('SELECT profile FROM players ORDER BY updated_at DESC LIMIT 5000').all();
    for(const row of rows){try{const p=cleanAdventureProfile(JSON.parse(row.profile)),time=Number(p.account?.bestTimes?.[theme]);if(Number.isFinite(time)&&time>0)entries.push({name:p.name,classId:p.classId,time,echoCompletions:p.account?.eventStats?.echoCompletions||0});}catch{}}
    entries.sort((a,b)=>a.time-b.time||a.name.localeCompare(b.name));return entries.slice(0,take).map((entry,index)=>({rank:index+1,...entry}));
  }
  eventLeaderboard(limit=20){
    const take=Math.max(1,Math.min(50,Number.isInteger(limit)?limit:20)),entries=[];
    const rows=this.db.prepare('SELECT profile FROM players ORDER BY updated_at DESC LIMIT 5000').all();
    for(const row of rows){try{const p=cleanAdventureProfile(JSON.parse(row.profile)),e=p.account?.eventStats||{};if((e.score||0)>0)entries.push({name:p.name,classId:p.classId,score:e.score||0,completions:e.completions||0,echoCompletions:e.echoCompletions||0});}catch{}}
    entries.sort((a,b)=>b.score-a.score||b.echoCompletions-a.echoCompletions||b.completions-a.completions||a.name.localeCompare(b.name));return entries.slice(0,take).map((entry,index)=>({rank:index+1,...entry}));
  }
  accountInfo(id){const row=this.db.prepare('SELECT username FROM credentials WHERE player_id=?').get(id);return {registered:!!row,username:row?.username||null};}
  normalizeUsername(value){const name=typeof value==='string'?value.trim().toLowerCase():'';if(!/^[a-z0-9_.-]{3,32}$/.test(name))throw Object.assign(new Error('Kontoname: 3–32 Buchstaben, Ziffern, Punkt, Unterstrich oder Minus.'),{status:400});return name;}
  async passwordHash(password,salt){
    if(typeof password!=='string'||password.length<12||password.length>128)throw Object.assign(new Error('Passwort: 12 bis 128 Zeichen.'),{status:400});
    if(this.passwordJobs>=2)throw Object.assign(new Error('Anmeldedienst ausgelastet. Bitte gleich erneut versuchen.'),{status:503});
    this.passwordJobs++;
    try{return await new Promise((resolve,reject)=>scrypt(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key.toString('hex'))));}finally{this.passwordJobs--;}
  }
  async register(id,username,password){
    const name=this.normalizeUsername(username);if(this.accountInfo(id).registered)throw Object.assign(new Error('Dieser Gast ist bereits mit einem Konto verknüpft.'),{status:409});
    const salt=randomBytes(24).toString('hex'),hash=await this.passwordHash(password,salt),recovery=randomBytes(24).toString('base64url');
    try{this.db.prepare('INSERT INTO credentials VALUES (?, ?, ?, ?, ?)').run(id,name,salt,hash,this.hash(recovery));}catch(e){if(String(e.message).includes('UNIQUE'))throw Object.assign(new Error('Kontoname bereits vergeben oder Konto bereits registriert.'),{status:409});throw e;}
    return{username:name,recoveryCode:recovery};
  }
  async authenticate(username,password){
    let name;try{name=this.normalizeUsername(username);}catch{return null;}
    const row=this.db.prepare('SELECT * FROM credentials WHERE username=?').get(name);
    let hash;try{hash=await this.passwordHash(password,row?.salt||'39b8c1629712018a4a6b3d22a64e601129ea113bc8e96031');}catch(e){if(e.status===400)return null;throw e;}
    const expected=Buffer.from(row?.password_hash||'0'.repeat(64),'hex'),actual=Buffer.from(hash,'hex');
    if(!timingSafeEqual(actual,expected)||!row)return null;return{id:row.player_id,username:row.username};
  }
  rotateToken(id){const token=randomBytes(32).toString('base64url');const r=this.db.prepare('UPDATE players SET token_hash=?, updated_at=? WHERE id=?').run(this.hash(token),Date.now(),id);if(!r.changes)throw new Error('Account not found');return token;}
  async recover(username,code,password){
    let name;try{name=this.normalizeUsername(username);}catch{return null;}
    const row=this.db.prepare('SELECT * FROM credentials WHERE username=?').get(name);
    const valid=typeof code==='string'&&/^[A-Za-z0-9_-]{32}$/.test(code);const actual=this.hash(valid?code:'invalid');
    if(!timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(row?.recovery_hash||'0'.repeat(64),'hex'))||!row)return null;
    const salt=randomBytes(24).toString('hex'),hash=await this.passwordHash(password,salt),recoveryCode=randomBytes(24).toString('base64url');
    const updated=this.db.prepare('UPDATE credentials SET salt=?,password_hash=?,recovery_hash=? WHERE player_id=? AND recovery_hash=?').run(salt,hash,this.hash(recoveryCode),row.player_id,row.recovery_hash);
    return updated.changes?{id:row.player_id,username:row.username,recoveryCode}:null;
  }
  receipt(id,requestId){return this.db.prepare('SELECT request_hash AS hash, accepted FROM action_receipts WHERE player_id=? AND request_id=?').get(id,requestId);}
  recordActivity(playerId,at=Date.now()){const day=Math.floor(Number(at)/86400000),when=Number(at);const result=this.db.prepare('INSERT INTO player_activity(player_id,day,sessions,last_at) SELECT id,?,1,? FROM players WHERE id=? ON CONFLICT(player_id,day) DO UPDATE SET sessions=sessions+1,last_at=excluded.last_at').run(day,when,playerId);return{playerId,day,recorded:result.changes>0};}
  retentionReport(now=Date.now(),playerIds=null){const today=Math.floor(Number(now)/86400000),allow=playerIds instanceof Set?playerIds:null,rows=this.db.prepare('SELECT player_id AS playerId,day,sessions FROM player_activity ORDER BY player_id,day').all(),by=new Map();for(const r of rows){if(allow&&!allow.has(String(r.playerId)))continue;if(!by.has(r.playerId))by.set(r.playerId,new Set());by.get(r.playerId).add(Number(r.day));}const metric=h=>{let eligible=0,returned=0;for(const days of by.values()){const first=Math.min(...days);if(today-first<h)continue;eligible++;if(days.has(first+h))returned++;}return{eligible,returned,rate:eligible?returned/eligible:0};};const active=(window)=>[...by.values()].filter(days=>[...days].some(d=>today-d>=0&&today-d<window)).length;return{accounts:by.size,d1:metric(1),d7:metric(7),d30:metric(30),active1d:active(1),active7d:active(7),active30d:active(30)};}
  commerceReceipt(provider,transactionId){return this.db.prepare('SELECT provider,transaction_id AS transactionId,player_id AS playerId,product_id AS productId,status,grant_json AS grantJson,created_at AS createdAt,updated_at AS updatedAt FROM commerce_receipts WHERE provider=? AND transaction_id=?').get(provider,transactionId)||null;}
  saveCommerceReceipt({provider,transactionId,playerId,productId,status='GRANTED',grant={}}){const now=Date.now();this.db.prepare('INSERT INTO commerce_receipts(provider,transaction_id,player_id,product_id,status,grant_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(provider,transactionId,playerId,productId,status,JSON.stringify(grant),now,now);return this.commerceReceipt(provider,transactionId);}
  updateCommerceReceipt(provider,transactionId,status,grant=null){const now=Date.now(),row=this.commerceReceipt(provider,transactionId);if(!row)return null;const nextGrant=grant===null?row.grantJson:JSON.stringify(grant);this.db.prepare('UPDATE commerce_receipts SET status=?,grant_json=?,updated_at=? WHERE provider=? AND transaction_id=?').run(String(status),nextGrant,now,provider,transactionId);return this.commerceReceipt(provider,transactionId);}
  commerceHistory(playerId,limit=100){return this.db.prepare('SELECT provider,transaction_id AS transactionId,player_id AS playerId,product_id AS productId,status,grant_json AS grantJson,created_at AS createdAt,updated_at AS updatedAt FROM commerce_receipts WHERE player_id=? ORDER BY created_at DESC LIMIT ?').all(playerId,Math.max(1,Math.min(500,Number(limit)||100)));}
  commerceEvent(playerId,event,productId=null){const inserted=this.db.prepare('INSERT INTO commerce_events(player_id,event,product_id,created_at) VALUES(?,?,?,?)').run(playerId,event,productId,Date.now());const id=Number(inserted.lastInsertRowid||0);if(id>50000&&id%256===0)this.db.prepare('DELETE FROM commerce_events WHERE id < COALESCE((SELECT id FROM commerce_events ORDER BY id DESC LIMIT 1 OFFSET 49999),0)').run();return{ok:true};}
  commerceStats(){const rows=this.db.prepare('SELECT event,COUNT(*) AS count FROM commerce_events GROUP BY event').all();return Object.fromEntries(rows.map(r=>[r.event,r.count]));}
  commerceReport(){const counts=this.commerceStats(),unique=(event)=>Number(this.db.prepare('SELECT COUNT(DISTINCT player_id) AS n FROM commerce_events WHERE event=?').get(event)?.n||0),receipts=Number(this.db.prepare("SELECT COUNT(*) AS n FROM commerce_receipts WHERE status='GRANTED'").get()?.n||0),payerRows=this.db.prepare("SELECT DISTINCT player_id AS playerId FROM commerce_receipts WHERE status='GRANTED'").all(),payers=payerRows.length,payerIds=new Set(payerRows.map(r=>String(r.playerId))),refunded=Number(this.db.prepare("SELECT COUNT(*) AS n FROM commerce_receipts WHERE status IN ('REFUNDED','REVOKED')").get()?.n||0),views=counts.product_view||0,starts=counts.purchase_start||0,completed=counts.purchase_complete||0,openers=unique('shop_open');return{events:counts,uniqueShopOpeners:openers,uniquePayers:payers,payerConversion:openers?payers/openers:0,grantedReceipts:receipts,refundedReceipts:refunded,viewToPurchase:views?completed/views:0,startToPurchase:starts?completed/starts:0,retention:this.retentionReport(),payerRetention:this.retentionReport(Date.now(),payerIds)};}
  saveReceipt(id,requestId,hash,accepted){
    // Account deletion can race a final in-flight action persist during disconnect cleanup. Insert only
    // when the parent account still exists so a stale receipt can never turn that benign race into a 500.
    const result=this.db.prepare('INSERT INTO action_receipts(player_id,request_id,request_hash,accepted,created_at) SELECT id,?,?,?,? FROM players WHERE id=?').run(requestId,hash,accepted?1:0,Date.now(),id);
    if(!result.changes)return{saved:false,missing:true};
    // More than five minutes of the maximum action rate; the client retries for at most ten seconds.
    this.db.prepare('DELETE FROM action_receipts WHERE player_id=? AND request_id NOT IN (SELECT request_id FROM action_receipts WHERE player_id=? ORDER BY created_at DESC, rowid DESC LIMIT 4096)').run(id,id);
    return{saved:true,missing:false};
  }
  close(){this.db.close();}
}
