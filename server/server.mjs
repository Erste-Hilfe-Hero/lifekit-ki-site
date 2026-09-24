// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Dependency-free Node runtime. Server authoritative 20 Hz, snapshots 10 Hz.
import http from 'node:http';
import { SnapshotEncoder, SNAPSHOT_CODEC } from '../shared/snapshot-wire.mjs';
import { clientAddress } from './addresses.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { acquireDataLock, createBackup } from './operations.mjs';
import { cleanName } from '../shared/engine.mjs';
import { AdventureEngine } from '../shared/adventure.mjs';
import { GuildService } from '../shared/social.mjs';
import { CLASSES, PROTOCOL, VERSION } from '../shared/data.mjs';
import { liveEventFor } from '../shared/endgame-data.mjs';
import { SafetyStore } from './safety.mjs';
import { ProfileStore } from './store.mjs';
import { SecurityGuard,EconomyLedger } from './production.mjs';
import { publicStoreCatalog, STORE_PRODUCTS, SHARD_OFFERS, SHOP_EVENT_NAMES, storeGrantRecord, vaultCapacity } from '../shared/monetization-data.mjs';
import { createStoreVerifier, grantVerifiedProduct, spendPremium } from './commerce.mjs';
import {StateAuthorityClient,DistributedSafetyCache} from './state-client.mjs';
const PROJECT_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');

export function createGameServer(options={}){
  const bounded=(value,fallback,min,max,name)=>{const n=value===undefined||value===''?fallback:Number(value);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`${name}: ganze Zahl ${min}–${max} erforderlich.`);return n;};
  const backupSeconds=bounded(options.backupSeconds??process.env.BACKUP_SECONDS,900,30,86400,'BACKUP_SECONDS');
  const backupRetain=bounded(options.backupRetain??process.env.BACKUP_RETAIN,8,1,100,'BACKUP_RETAIN');
  const stateAuthorityUrl=String(options.stateAuthorityUrl??process.env.STATE_AUTHORITY_URL??'').trim();
  const distributed=!!stateAuthorityUrl;
  const shopRotationIds=String(options.shopRotationIds??process.env.SHOP_ROTATION_IDS??'').split(',').map(v=>v.trim()).filter(Boolean);
  const shopVariant=['ledger','preview-first'].includes(String(options.shopVariant??process.env.SHOP_EXPERIMENT_VARIANT??''))?String(options.shopVariant??process.env.SHOP_EXPERIMENT_VARIANT):'ledger';
  const shopCatalog=()=>publicStoreCatalog(Date.now(),{rotationIds:shopRotationIds,variant:shopVariant});
  const nodeId=String(options.nodeId??process.env.GAME_NODE_ID??process.env.HOSTNAME??('game-'+randomUUID().slice(0,8)));
  const stateClient=distributed?new StateAuthorityClient({url:stateAuthorityUrl,secret:options.stateAuthoritySecret??process.env.STATE_AUTHORITY_SECRET,timeoutMs:bounded(options.stateAuthorityTimeoutMs??process.env.STATE_AUTHORITY_TIMEOUT_MS,8000,1000,30000,'STATE_AUTHORITY_TIMEOUT_MS'),nodeId}):null;
  const PERSIST_INTERVAL_TICKS=bounded(options.persistIntervalSeconds??process.env.PERSIST_INTERVAL_SECONDS,distributed?20:5,3,60,'PERSIST_INTERVAL_SECONDS')*20;
  // Distributed workers use an in-memory cache only. Durable state lives in the single-writer
  // State Authority and is never stored in per-worker SQLite files.
  const dataPath=distributed?':memory:':(options.dataPath||process.env.DATA_PATH||resolve(PROJECT_ROOT,'.data/nyrathen.sqlite'));
  const releaseLock=acquireDataLock(dataPath);let store;
  try{store=new ProfileStore(dataPath);}catch(error){releaseLock();throw error;}
  let safety,economy;try{safety=distributed?new DistributedSafetyCache(stateClient):new SafetyStore(store.db);economy=new EconomyLedger(store.db);}catch(error){store.close();releaseLock();throw error;}
  const security=new SecurityGuard({windowMs:10000,maxScore:12});
  const storeVerifier=createStoreVerifier(options.storeEnv||process.env),purchaseLocks=new Set();
  const sessions=new Map(),rooms=new Map(),limits=new Map(),roomPromises=new Map();
  let stateBackendHealthy=!distributed;
  let closing=false,draining=false,backupJob=null,lastBackup=null,backupError=false,lastBackupAttempt=Date.now();
  const backupDirectory=options.backupDirectory||process.env.BACKUP_DIRECTORY||dataPath+'.backups';
  async function checkpointBackup(){
    if(dataPath===':memory:'||backupJob)return backupJob;
    backupJob=createBackup(store.db,backupDirectory,{retain:backupRetain})
      .then(result=>{lastBackup=result;backupError=false;return result;})
      .catch(error=>{backupError=true;console.error('backup-fault:',error.message);return null;})
      .finally(()=>{backupJob=null;});
    return backupJob;
  }
  const transport={fullFrames:0,deltaFrames:0,wireBytes:0,referenceBytes:0,inputTimeouts:0,backpressureSkips:0,slowDisconnects:0};
  const SNAPSHOT_HZ=bounded(options.snapshotHz??process.env.SNAPSHOT_HZ,10,5,10,'SNAPSHOT_HZ');
  const SNAPSHOT_INTERVAL_TICKS=Math.max(2,Math.round(20/SNAPSHOT_HZ));
  // Keep the authoritative simulation at 20 Hz, but spread/render network snapshots more gently
  // when a worker is busy. Clients interpolate between snapshots; simulation fidelity is unchanged.
  const HIGH_LOAD_SNAPSHOT_INTERVAL_TICKS=Math.max(SNAPSHOT_INTERVAL_TICKS,4);
  const snapshotIntervalTicks=()=>{
    const delay=tickDelayP99();
    if(sessions.size>=72||delay>READY_TICK_P99_MS*.9)return Math.max(HIGH_LOAD_SNAPSHOT_INTERVAL_TICKS,6);
    if(sessions.size>=Math.max(48,Math.floor(MAX_SESSIONS*.5))||delay>READY_TICK_P99_MS*.65)return HIGH_LOAD_SNAPSHOT_INTERVAL_TICKS;
    return SNAPSHOT_INTERVAL_TICKS;
  };
  const MAX_SSE_BACKLOG_BYTES=bounded(options.maxSseBacklogBytes??process.env.MAX_SSE_BACKLOG_BYTES,262144,32768,2097152,'MAX_SSE_BACKLOG_BYTES');
  let sessionSerial=0;
  const observability={requests:0,responses4xx:0,responses5xx:0,sseConnections:0,sseDisconnects:0,actions:0,accountAuth:0,rejectedInputs:0,rejectedActions:0,rateLimited:0,clientDiagnostics:0};
  let leaderboardCacheAt=0,leaderboardCache=null,eventLeaderboardCache=null,speedLeaderboardCache=new Map(),leaderboardRefreshPromise=null,speedLeaderboardPromises=new Map();
  // Empty leaderboards are a valid cached result. Distributed workers fetch them from the central
  // State Authority in the background so snapshot fan-out never waits on storage/network I/O.
  const applyLeaderboards=(r,theme=null)=>{if(!r)return;leaderboardCache=r.leaderboard||[];eventLeaderboardCache=r.eventLeaderboard||[];if(theme&&r.speedLeaderboard)speedLeaderboardCache.set(theme,r.speedLeaderboard);leaderboardCacheAt=Date.now();};
  const refreshLeaderboards=()=>{const now=Date.now();if(leaderboardCache===null||now-leaderboardCacheAt>=15000){if(distributed){if(!leaderboardRefreshPromise)leaderboardRefreshPromise=stateClient.leaderboards().then(r=>applyLeaderboards(r)).catch(()=>{}).finally(()=>leaderboardRefreshPromise=null);}else{leaderboardCache=store.leaderboard(20);eventLeaderboardCache=store.eventLeaderboard(20);speedLeaderboardCache=new Map();leaderboardCacheAt=now;}}return now;};
  const leaderboard=()=>{refreshLeaderboards();return leaderboardCache||[];};
  const eventLeaderboard=()=>{refreshLeaderboards();return eventLeaderboardCache||[];};
  const speedLeaderboard=theme=>{refreshLeaderboards();if(!theme)return[];if(!speedLeaderboardCache.has(theme)){if(distributed){if(!speedLeaderboardPromises.has(theme))speedLeaderboardPromises.set(theme,stateClient.leaderboards(theme).then(r=>applyLeaderboards(r,theme)).catch(()=>{}).finally(()=>speedLeaderboardPromises.delete(theme)));}else speedLeaderboardCache.set(theme,store.speedLeaderboard(theme,20));}return speedLeaderboardCache.get(theme)||[];};
  function sendState(session){
    const stream=session.stream;if(!stream||stream.writableEnded||stream.destroyed)return false;
    // Never spend CPU building snapshots for a socket that cannot drain. Slow clients may skip
    // transient deltas; periodic full baselines and reconnect keep the authoritative state safe.
    if(session.backpressured||stream.writableLength>MAX_SSE_BACKLOG_BYTES){
      transport.backpressureSkips++;
      if(stream.writableLength>MAX_SSE_BACKLOG_BYTES*4){transport.slowDisconnects++;stream.destroy();}
      return false;
    }
    const state=snapshotFor(session);
    const packet=session.encoder?session.encoder.encode(state):null;
    const text=packet?packet.text:JSON.stringify({type:'snapshot',state});
    const payload='data: '+text+'\n\n',bytes=Buffer.byteLength(payload);
    transport.wireBytes+=bytes;transport.referenceBytes+=packet?(packet.fullText?Buffer.byteLength('data: '+packet.fullText+'\n\n'):(packet.referenceBytes||bytes)+8):bytes;
    if(packet?.message.type==='delta')transport.deltaFrames++;else transport.fullFrames++;
    const accepted=stream.write(payload);
    if(!accepted){session.backpressured=true;stream.once('drain',()=>{if(session.stream===stream)session.backpressured=false;});}
    return accepted;
  }
  const snapshotFor=s=>{const state=s.room.engine.snapshot(s.playerId);state.chat=safety.filterChat(s.playerId,state.chat);state.leaderboard=leaderboard();state.eventLeaderboard=eventLeaderboard();const event=state.progression?.liveEvent||liveEventFor();const speedTheme=state.world?.kind==='dungeon'?state.world.theme:event.theme;state.speedLeaderboard=speedLeaderboard(speedTheme);state.speedLeaderboardTheme=speedTheme;return {...state,safety:safety.summary(s.playerId),wireEpoch:s.wireEpoch,revision:++s.snapshotSequence};};
  const trustedProxies=new Set((options.trustedProxyIps||process.env.TRUSTED_PROXY_IPS||'').split(',').map(s=>s.trim()).filter(Boolean));
  const MAX_ROOMS=bounded(options.maxRooms??process.env.MAX_ROOMS,8,1,64,'MAX_ROOMS'),MAX_PLAYERS=bounded(options.maxPlayers??process.env.MAX_PLAYERS,64,1,512,'MAX_PLAYERS'),MAX_SESSIONS=bounded(options.maxSessions??process.env.MAX_SESSIONS,128,1,4096,'MAX_SESSIONS'),SESSION_RATE_LIMIT=bounded(options.sessionRateLimit??process.env.SESSION_RATE_LIMIT,80,1,10000,'SESSION_RATE_LIMIT');
  const READY_TICK_P99_MS=bounded(options.readyTickP99Ms??process.env.READY_TICK_P99_MS,180,50,5000,'READY_TICK_P99_MS');
  const READY_SESSION_PERCENT=bounded(options.readySessionPercent??process.env.READY_SESSION_PERCENT,80,50,95,'READY_SESSION_PERCENT');
  const tickDelaySamples=[];let lastTickWall=Date.now();
  const tickDelayP99=()=>{if(!tickDelaySamples.length)return 0;const a=[...tickDelaySamples].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*.99))];};
  const activeStreams=()=>[...sessions.values()].reduce((n,s)=>n+!!(s.stream&&!s.stream.writableEnded),0);
  const readiness=()=>{const delay=tickDelayP99(),warm=tickDelaySamples.length>=40,capacityLimit=Math.max(1,Math.floor(MAX_SESSIONS*READY_SESSION_PERCENT/100)),capacity=sessions.size<capacityLimit,memoryRssBytes=process.memoryUsage().rss;return{ready:!closing&&!draining&&storageHealthy&&stateBackendHealthy&&capacity&&(!warm||delay<=READY_TICK_P99_MS),storageHealthy,stateBackendHealthy,closing,draining,capacity,capacityLimit,readySessionPercent:READY_SESSION_PERCENT,tickDelayP99Ms:delay,thresholdMs:READY_TICK_P99_MS,snapshotIntervalTicks:snapshotIntervalTicks(),snapshotHzEffective:+(20/snapshotIntervalTicks()).toFixed(2),sessions:sessions.size,maxSessions:MAX_SESSIONS,memoryRssBytes};};
  const allowedOrigins=new Set((options.allowedOrigins||process.env.ALLOWED_ORIGINS||'https://app.nyrathen.local,nyrathen://app').split(',').filter(Boolean));
  const json=(res,status,value)=>{if(res.writableEnded)return;if(status>=500)observability.responses5xx++;else if(status>=400)observability.responses4xx++;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const legalConfig=()=>{
    const c={name:String(options.publisherName??process.env.NYRATHEN_PUBLISHER_NAME??'').trim(),email:String(options.publisherEmail??process.env.NYRATHEN_PUBLISHER_EMAIL??'').trim(),address:String(options.publisherPostalAddress??process.env.NYRATHEN_PUBLISHER_POSTAL_ADDRESS??'').trim(),privacy:String(options.privacyContact??process.env.NYRATHEN_PRIVACY_CONTACT??'').trim(),effective:String(options.legalEffectiveDate??process.env.NYRATHEN_LEGAL_EFFECTIVE_DATE??'').trim(),operator:String(options.serverOperator??process.env.NYRATHEN_SERVER_OPERATOR??'').trim()};
    const ok=!!(c.name&&c.address&&c.effective&&c.operator&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.privacy));return{ok,...c};
  };
  const legalHtml=(kind,c)=>{const h=htmlEscape,head=`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nyrathen · ${h(kind)}</title><style>body{max-width:820px;margin:40px auto;padding:0 20px;font:16px/1.55 system-ui;color:#171717}h1,h2{line-height:1.15}.en{margin-top:3rem;padding-top:2rem;border-top:2px solid #222}</style>`;
    if(kind==='privacy')return head+`<h1>Nyrathen – Datenschutzerklärung</h1><p>Stand: ${h(c.effective)}</p><p>Verantwortlich: ${h(c.name)}, ${h(c.address)}. Datenschutzkontakt: ${h(c.privacy)}. Serverbetrieb: ${h(c.operator)}.</p><h2>Verarbeitete Daten</h2><p>Onlinefunktionen können Konto-/Gastkennung, Spielstand und Inventar, soziale Verknüpfungen, Chat-/Meldedaten, technische Sicherheits-/Diagnosedaten sowie verifizierte Kauf- und Berechtigungsdaten einschließlich Produkt- und Transaktionskennung, Kaufbeleg, Wiederherstellung, Erstattung oder Widerruf verarbeiten. Nyrathen erhält keine Karten- oder Bankdaten.</p><h2>Zwecke</h2><p>Spielbetrieb, Accountverwaltung, Multiplayer, Kaufverifikation/Wiederherstellung, Sicherheit, Moderation und freiwilliger Support.</p><h2>Tracking</h2><p>Diese Releasefassung enthält keine Werbe- oder Drittanbieter-Analytics-SDKs und kein Cross-App-Tracking.</p><h2>Löschung</h2><p>Onlinekonten und Gastprofile können in der App gelöscht werden. Lokale Solo-Daten können separat in den Einstellungen gelöscht werden.</p><section class="en" lang="en"><h1>Nyrathen – Privacy Policy</h1><p>Effective: ${h(c.effective)}</p><p>Controller: ${h(c.name)}, ${h(c.address)}. Privacy contact: ${h(c.privacy)}. Server operator: ${h(c.operator)}.</p><p>Online features may process account/guest identifiers, game state and inventory, social relationships, chat/report data, technical security/diagnostic data, and verified purchase/entitlement records including product and transaction identifiers, store receipts, restores, refunds or revocations. Nyrathen does not receive card or bank details.</p><p>This release contains no advertising or third-party analytics SDK and no cross-app tracking.</p></section></html>`;
    if(kind==='terms')return head+`<h1>Nyrathen – Nutzungsbedingungen & Community-Regeln</h1><p>Stand: ${h(c.effective)}</p><p>Anbieter: ${h(c.name)}, ${h(c.address)}, ${h(c.email)}.</p><h2>Community</h2><p>Keine Belästigung, Hassrede, Drohungen, sexuelle Ausbeutung, Doxxing, Spam, Betrug, Identitätsvortäuschung, Cheating, Exploit-Missbrauch oder Handel mit Zugangsdaten.</p><h2>Digitale Käufe</h2><p>Optionale digitale Käufe werden über Apple App Store bzw. Google Play abgewickelt. Nyr-Splitter sind virtuelle Premiumwährung, kein gesetzliches Zahlungsmittel und nicht außerhalb des Spiels übertragbar oder auszahlbar. Berechtigungen werden erst nach Store-Verifikation gutgeschrieben; Erstattungen, Widerrufe und Chargebacks können serverseitig rückgängig gemacht werden.</p><section class="en" lang="en"><h1>Nyrathen – Terms & Community Rules</h1><p>Effective: ${h(c.effective)}</p><p>Provider: ${h(c.name)}, ${h(c.address)}, ${h(c.email)}.</p><p>No harassment, hate speech, threats, sexual exploitation, doxxing, spam, fraud, impersonation, cheating, exploit abuse or credential trading.</p><p>Optional digital purchases are processed through Apple App Store or Google Play. Nyr Shards are virtual premium currency, not legal tender, and cannot be transferred or cashed out outside the game. Entitlements are granted only after store verification; refunds, revocations and chargebacks may be reversed server-side.</p></section></html>`;
    if(kind==='support')return head+`<h1>Nyrathen Support</h1><p>Kontakt / Contact: <strong>${h(c.email)}</strong></p><p>Publisher: ${h(c.name)}, ${h(c.address)}</p><p>Bei technischen Fehlern kann in den App-Einstellungen ein Diagnosebericht gespeichert werden. Sende niemals Passwörter oder Wiederherstellungscodes.</p><section class="en" lang="en"><h2>English</h2><p>A diagnostic report can be saved from Settings. Never send passwords or recovery codes.</p></section></html>`;
    if(kind==='imprint')return head+`<h1>Impressum / Anbieterinformationen</h1><p><strong>${h(c.name)}</strong><br>${h(c.address)}</p><p>E-Mail: <strong>${h(c.email)}</strong><br>Datenschutz: <strong>${h(c.privacy)}</strong></p><p>Verantwortlich für den Serverbetrieb: ${h(c.operator)}.</p><p>Stand: ${h(c.effective)}</p><section class="en" lang="en"><h1>Provider information</h1><p><strong>${h(c.name)}</strong><br>${h(c.address)}</p><p>Email: <strong>${h(c.email)}</strong><br>Privacy contact: <strong>${h(c.privacy)}</strong></p><p>Server operator: ${h(c.operator)}.</p></section></html>`;
    return head+`<h1>Nyrathen-Konto löschen</h1><p>Öffne in Nyrathen <strong>Konto</strong> und wähle die dauerhafte Kontolöschung. Bestätige den destruktiven Schritt in der App. Gastprofile können ebenfalls dauerhaft gelöscht werden.</p><p>Wenn du keinen Zugriff mehr auf die App hast, kontaktiere ${h(c.email)}. Teile niemals Passwörter oder Wiederherstellungscodes.</p><section class="en" lang="en"><h1>Delete your Nyrathen account</h1><p>Open <strong>Account</strong> in Nyrathen and choose permanent account deletion. Confirm the destructive action in the app. Guest profiles can also be permanently deleted.</p><p>If you can no longer access the app, contact ${h(c.email)}. Never share passwords or recovery codes.</p></section></html>`;
  };
  const sendLegal=(res,kind)=>{const c=legalConfig();if(!c.ok)return json(res,503,{error:'Legal page not configured for production.'});const content=legalHtml(kind,c);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"});res.end(content);};
  function limit(key,maximum,windowMs){
    const now=Date.now();let v=limits.get(key);if(!v||now>=v.until){v={count:0,until:now+windowMs};limits.set(key,v);}return ++v.count<=maximum;
  }
  async function body(req){
    if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw Object.assign(new Error('JSON erforderlich.'),{status:415});
    let size=0;const chunks=[];
    for await(const chunk of req){size+=chunk.length;if(size>4096)throw Object.assign(new Error('Anfrage zu groß.'),{status:413});chunks.push(chunk);}
    try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||Array.isArray(value)||typeof value!=='object')throw 0;return value;}catch{throw Object.assign(new Error('Ungültiges JSON.'),{status:400});}
  }
  const bearer=req=>(req.headers.authorization||'').replace(/^Bearer /,'');
  function ownSession(req){const token=bearer(req);if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;return sessions.get(store.hash(token));}
  const social=new GuildService(store.loadSocial());let socialRevision=0;
  social.onlineIDs=()=>new Set([...rooms.values()].flatMap(r=>[...r.engine.players.keys()]));
  const worldKey=name=>distributed?`${String(options.worldNamespace??process.env.STATE_WORLD_NAMESPACE??nodeId)}:${name}`:name;
  let stateInitialized=!distributed,stateInitPromise=null;
  async function ensureStateReady(){if(stateInitialized)return true;if(!stateInitPromise)stateInitPromise=(async()=>{await stateClient.heartbeat(sessions.size);stateBackendHealthy=true;const loaded=await stateClient.loadSocial();social.replace(loaded?.state);socialRevision=Number(loaded?.revision||0);try{applyLeaderboards(await stateClient.leaderboards());}catch{}stateInitialized=true;return true;})().finally(()=>stateInitPromise=null);return stateInitPromise;}
  async function roomFor(name){
    if(rooms.has(name))return rooms.get(name);if(roomPromises.has(name))return roomPromises.get(name);
    if(rooms.size+roomPromises.size>=MAX_ROOMS)throw Object.assign(new Error('Alle Spielräume sind belegt.'),{status:503});
    const pending=(async()=>{const saved=distributed?await stateClient.loadWorld(worldKey(name)):store.loadWorld(name);const room={name,engine:new AdventureEngine({savedWorld:saved,social}),lastUsed:Date.now()};rooms.set(name,room);return room;})().finally(()=>roomPromises.delete(name));roomPromises.set(name,pending);return pending;
  }
  let storageHealthy=true;
  function persistenceFault(error){
    if(distributed&&([408,429,502,503,504].includes(Number(error?.status))||/State authority unavailable|aborted|timeout/i.test(String(error?.message||'')))){stateBackendHealthy=false;console.error('state-backend-transient-fault:',error.message);return Object.assign(new Error('Zentrale Speicherung vorübergehend nicht erreichbar. Bitte erneut versuchen.'),{status:503,retryable:true});}
    if(storageHealthy)console.error('persistence-fault: simulation paused; restart after fixing storage',error.message);
    storageHealthy=false;
    for(const session of sessions.values()){const stream=session.stream;session.stream=null;if(stream&&!stream.writableEnded){stream.write('data: '+JSON.stringify({type:'maintenance',message:'Speicherung nicht verfügbar. Der Server wurde zum Schutz der Spielstände angehalten.'})+'\n\n');stream.end();}}
    return Object.assign(new Error('Speicherung nicht verfügbar. Serverneustart erforderlich.'),{status:503});
  }
  async function persistPlayers(room,playerIds,commitExtra=null,{world=false,socialState=false,remoteReceipt=null,remoteEconomy=null}={}){
    if(!storageHealthy)throw Object.assign(new Error('Server-Speicherung angehalten.'),{status:503});
    try{
      const profiles=[];for(const id of new Set(playerIds||[])){const p=room.engine.players.get(id);if(p)profiles.push({id,profile:room.engine.profile(id)});}
      // Export potentially large world/social state once. Distributed workers do not need to also
      // serialize it into their throw-away in-memory SQLite cache before sending it to authority.
      const worldState=world?room.engine.exportWorlds():null,socialStateExport=socialState?social.export():null;
      store.transaction(()=>{for(const row of profiles)store.save(row.id,row.profile);if(!distributed&&worldState)store.saveWorld(room.name,worldState);if(!distributed&&socialStateExport)store.saveSocial(socialStateExport);commitExtra?.();});
      if(distributed){const result=await stateClient.persistBatch({profiles,world:worldState?{name:worldKey(room.name),state:worldState}:null,social:socialStateExport,socialExpectedRevision:socialState?socialRevision:null,receipt:remoteReceipt,economyTx:remoteEconomy});if(result?.social?.revision!==undefined)socialRevision=result.social.revision;}
      if(!distributed){leaderboardCacheAt=0;eventLeaderboardCache=[];speedLeaderboardCache.clear();}speedLeaderboardPromises.clear();
    }catch(error){throw persistenceFault(error);}
  }
  async function persistRegion(room,commitExtra=null,extra={}){return persistPlayers(room,[...room.engine.players.keys()],commitExtra,{world:true,socialState:!distributed,...extra});}
  async function saveSession(s){return persistPlayers(s.room,[s.playerId]);}
  const disconnectSaveBatches=new Map();
  function scheduleSessionSave(s){if(!s?.room||!s.playerId||closing)return;let batch=disconnectSaveBatches.get(s.room);if(!batch){batch={ids:new Set(),timer:null};disconnectSaveBatches.set(s.room,batch);}batch.ids.add(s.playerId);if(batch.timer)return;batch.timer=setTimeout(()=>{batch.timer=null;disconnectSaveBatches.delete(s.room);const ids=[...batch.ids];if(ids.length)void persistPlayers(s.room,ids).catch(()=>{});},100);batch.timer.unref();}
  async function retireAccount(id){for(const [hash,s]of sessions){if(s.playerId!==id)continue;await saveSession(s);s.retired=true;s.stream?.end();s.room.engine.removePlayer(id);sessions.delete(hash);if(distributed&&s.lease)await stateClient.releaseLease(id,s.lease.epoch).catch(()=>{});}}
  async function rotateAccountSession(id){
    // Reauthentication does not remove a living combat avatar or reset its cooldowns.
    const old=[...sessions.entries()].find(([,s])=>s.playerId===id);if(old)await saveSession(old[1]);
    const token=distributed?await stateClient.rotateToken(id):store.rotateToken(id);if(distributed){const record=await stateClient.find(token);if(record)store.importRecord({...record,token});}
    if(old){const [hash,s]=old;const previous=s.stream;s.stream=null;s.disconnectedAt=Date.now();sessions.delete(hash);sessions.set(store.hash(token),s);s.room.engine.setInput(id,{dx:0,dy:0,angle:0,fire:false,auto:false});if(previous&&!previous.writableEnded){previous.write('data: '+JSON.stringify({type:'replaced'})+'\n\n');previous.end();}}
    return token;
  }
  const server=http.createServer(async(req,res)=>{
    observability.requests++;
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    let path;
    try{
      path=new URL(req.url,'http://localhost').pathname;
      if(req.url.length>2048)return json(res,414,{error:'URL zu lang.'});
      const origin=req.headers.origin;
      const expectedHost=req.headers.host;
      const ownOrigin=origin===`http://${expectedHost}`||origin===`https://${expectedHost}`;
      if(origin&&!ownOrigin&&!allowedOrigins.has(origin))return json(res,403,{error:'Dieser Ursprung ist nicht freigegeben.'});
      if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');}
      if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
      const ip=clientAddress(req,trustedProxies);
      if(closing)return json(res,503,{error:'Server fährt herunter. Bitte gleich erneut verbinden.'});
      if(req.method==='GET'&&path.startsWith('/legal/')){const kind=path.slice('/legal/'.length);if(['privacy','terms','support','delete-account','imprint'].includes(kind))return sendLegal(res,kind);}
      if((path==='/health'||path==='/healthz')&&req.method==='GET')return json(res,storageHealthy?200:503,{ok:storageHealthy&&stateBackendHealthy,storageHealthy,stateBackendHealthy,stateBackend:distributed?'central-authority':'local-sqlite',version:VERSION,protocol:PROTOCOL,rooms:rooms.size,players:sessions.size,transport:{...transport,codec:SNAPSHOT_CODEC},uptimeSeconds:Math.floor(process.uptime()),backups:{enabled:dataPath!==':memory:',lastSuccess:lastBackup?.createdAt||null,error:backupError}});
      if(path==='/api/diagnostic'&&req.method==='POST'){if(!limit('diagnostic:'+ip,12,60000))return json(res,429,{error:'Zu viele Diagnosemeldungen.'});const b=await body(req),kind=['boot','crash','reconnect','store'].includes(String(b.kind))?String(b.kind):'crash',clean=v=>String(v??'').replace(/https?:\/\/\S+/gi,'[url]').replace(/[A-Za-z0-9_-]{32,}/g,'[redacted]').replace(/[\r\n\t]+/g,' ').slice(0,300),record={event:'client-diagnostic',kind,code:clean(b.code).slice(0,80),message:clean(b.message),build:clean(b.build).slice(0,80),platform:clean(b.platform).slice(0,40)};observability.clientDiagnostics++;console.warn(JSON.stringify(record));return json(res,202,{accepted:true});}
      if(path==='/readyz'&&req.method==='GET'){const state=readiness();return json(res,state.ready?200:503,{...state,version:VERSION});}
      if(path==='/metrics'&&req.method==='GET'){
        const configured=String(options.metricsToken??process.env.METRICS_TOKEN??'').trim();
        if(!configured)return json(res,404,{error:'Nicht verfügbar.'});
        const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(token!==configured)return json(res,401,{error:'Nicht autorisiert.'});
        const lines=[
          '# HELP nyrathen_uptime_seconds Server uptime in seconds','# TYPE nyrathen_uptime_seconds gauge',`nyrathen_uptime_seconds ${Math.floor(process.uptime())}`,
          '# HELP nyrathen_rooms Active loaded regions','# TYPE nyrathen_rooms gauge',`nyrathen_rooms ${rooms.size}`,
          '# HELP nyrathen_sessions Active authenticated sessions','# TYPE nyrathen_sessions gauge',`nyrathen_sessions ${sessions.size}`,
          '# HELP nyrathen_sse_active Active SSE streams','# TYPE nyrathen_sse_active gauge',`nyrathen_sse_active ${activeStreams()}`,
          '# HELP nyrathen_tick_delay_p99_ms Rolling server tick delay p99','# TYPE nyrathen_tick_delay_p99_ms gauge',`nyrathen_tick_delay_p99_ms ${tickDelayP99()}`,
          '# HELP nyrathen_snapshot_interval_ticks Network snapshot interval in 20Hz simulation ticks','# TYPE nyrathen_snapshot_interval_ticks gauge',`nyrathen_snapshot_interval_ticks ${snapshotIntervalTicks()}`,
          '# HELP nyrathen_memory_rss_bytes Resident memory bytes','# TYPE nyrathen_memory_rss_bytes gauge',`nyrathen_memory_rss_bytes ${process.memoryUsage().rss}`,
          '# HELP nyrathen_ready_capacity_limit Session count at which this worker leaves readiness','# TYPE nyrathen_ready_capacity_limit gauge',`nyrathen_ready_capacity_limit ${Math.max(1,Math.floor(MAX_SESSIONS*READY_SESSION_PERCENT/100))}`,
          '# HELP nyrathen_sse_backpressure_skips_total Snapshots skipped for backpressured streams','# TYPE nyrathen_sse_backpressure_skips_total counter',`nyrathen_sse_backpressure_skips_total ${transport.backpressureSkips}`,
          '# HELP nyrathen_slow_disconnects_total Slow SSE clients disconnected','# TYPE nyrathen_slow_disconnects_total counter',`nyrathen_slow_disconnects_total ${transport.slowDisconnects}`,
          '# HELP nyrathen_draining Server drain mode (1 draining)','# TYPE nyrathen_draining gauge',`nyrathen_draining ${draining?1:0}`, 
          '# HELP nyrathen_requests_total HTTP requests','# TYPE nyrathen_requests_total counter',`nyrathen_requests_total ${observability.requests}`,
          '# HELP nyrathen_http_4xx_total HTTP 4xx responses','# TYPE nyrathen_http_4xx_total counter',`nyrathen_http_4xx_total ${observability.responses4xx}`,
          '# HELP nyrathen_client_diagnostics_total Privacy-scrubbed client diagnostic reports','# TYPE nyrathen_client_diagnostics_total counter',`nyrathen_client_diagnostics_total ${observability.clientDiagnostics}`,
          '# HELP nyrathen_http_5xx_total HTTP 5xx responses','# TYPE nyrathen_http_5xx_total counter',`nyrathen_http_5xx_total ${observability.responses5xx}`,
          '# HELP nyrathen_sse_connections_total SSE streams opened','# TYPE nyrathen_sse_connections_total counter',`nyrathen_sse_connections_total ${observability.sseConnections}`,
          '# HELP nyrathen_sse_disconnects_total SSE streams closed','# TYPE nyrathen_sse_disconnects_total counter',`nyrathen_sse_disconnects_total ${observability.sseDisconnects}`,
          '# HELP nyrathen_actions_total Game actions requested','# TYPE nyrathen_actions_total counter',`nyrathen_actions_total ${observability.actions}`,
          '# HELP nyrathen_rejected_inputs_total Rejected or rate-limited input packets','# TYPE nyrathen_rejected_inputs_total counter',`nyrathen_rejected_inputs_total ${observability.rejectedInputs}`,
          '# HELP nyrathen_rejected_actions_total Rejected or blocked game actions','# TYPE nyrathen_rejected_actions_total counter',`nyrathen_rejected_actions_total ${observability.rejectedActions}`,
          '# HELP nyrathen_rate_limited_total Rate-limited requests','# TYPE nyrathen_rate_limited_total counter',`nyrathen_rate_limited_total ${observability.rateLimited}`,
          '# HELP nyrathen_transport_wire_bytes_total Snapshot wire bytes','# TYPE nyrathen_transport_wire_bytes_total counter',`nyrathen_transport_wire_bytes_total ${transport.wireBytes}`,
          '# HELP nyrathen_storage_healthy Storage health (1 healthy)','# TYPE nyrathen_storage_healthy gauge',`nyrathen_storage_healthy ${storageHealthy?1:0}`,
          '# HELP nyrathen_input_timeouts_total Authoritative input request timeouts','# TYPE nyrathen_input_timeouts_total counter',`nyrathen_input_timeouts_total ${transport.inputTimeouts}`,
          '# HELP nyrathen_backup_age_seconds Seconds since last successful backup (-1 when disabled or not yet completed)','# TYPE nyrathen_backup_age_seconds gauge',`nyrathen_backup_age_seconds ${dataPath===':memory:'||!lastBackup?-1:Math.max(0,Math.floor((Date.now()-Date.parse(lastBackup.createdAt))/1000))}`,
          '# HELP nyrathen_backup_error Backup fault state (1 fault)','# TYPE nyrathen_backup_error gauge',`nyrathen_backup_error ${backupError?1:0}`
        ];
        res.writeHead(200,{'Content-Type':'text/plain; version=0.0.4; charset=utf-8','Cache-Control':'no-store'});res.end(lines.join('\n')+'\n');return;
      }
      if(path.startsWith('/api/')&&distributed){try{await ensureStateReady();}catch{return json(res,503,{error:'Zentrale Spielstand-Speicherung ist nicht erreichbar. Bitte gleich erneut versuchen.'});}}
      if(path.startsWith('/api/')&&!storageHealthy)return json(res,503,{error:'Server wegen Speicherfehler angehalten. Bitte nach dem Neustart erneut verbinden.'});
      if(path==='/api/store/catalog'&&req.method==='GET')return json(res,200,{...shopCatalog(),nativeBillingRequired:true,verification:storeVerifier.configured});
      if(path==='/api/realms'&&req.method==='GET')return json(res,200,{protocol:PROTOCOL,regions:[...rooms.values()].map(r=>({name:r.name,players:r.engine.players.size,max:MAX_PLAYERS,realms:[...r.engine.worlds.values()].filter(w=>w.kind==='realm').map(w=>({id:w.worldId,players:w.players.size,closing:!!w.closingAt}))})),defaultRegion:'PUBLIC',publicHostingConfigured:!!process.env.PUBLIC_URL});
      if((path==='/api/account/login'||path==='/api/account/recover')&&req.method==='POST'){observability.accountAuth++;
        if(!limit('auth:'+ip,12,60000))return json(res,429,{error:'Zu viele Anmeldeversuche. Bitte eine Minute warten.'});
        const b=await body(req);const key=String(b.username||'').slice(0,32).toLowerCase();
        if(!limit('auth-user:'+key,8,60000))return json(res,429,{error:'Zu viele Anmeldeversuche für dieses Konto.'});
        const account=path.endsWith('/recover')?(distributed?await stateClient.recover(b.username,b.recoveryCode,b.password):await store.recover(b.username,b.recoveryCode,b.password)):(distributed?await stateClient.authenticate(b.username,b.password):await store.authenticate(b.username,b.password));
        if(!account)return json(res,401,{error:'Kontodaten ungültig.'});
        if(distributed)await safety.refresh(account.id);const ban=safety.banStatus(account.id);if(ban)return json(res,403,{error:'Dieses Konto ist vorübergehend gesperrt.',until:ban.until});
        const token=await rotateAccountSession(account.id);
        return json(res,200,{token,playerId:account.id,username:account.username,...(account.recoveryCode?{recoveryCode:account.recoveryCode}:{})});
      }
      if(path==='/api/session'&&req.method==='POST'){
        if(!limit('session:'+ip,SESSION_RATE_LIMIT,60000))return json(res,429,{error:'Zu viele Anmeldungen. Bitte später erneut versuchen.'});
        const b=await body(req);if(b.protocol!==PROTOCOL)return json(res,409,{error:'Unpassende Spielversion.'});
        const roomName=typeof b.room==='string'?b.room.trim().toUpperCase():'PUBLIC';
        if(!/^[A-Z0-9]{3,12}$/.test(roomName))return json(res,400,{error:'Raumcode: 3–12 Buchstaben oder Ziffern.'});
        if(!Object.hasOwn(CLASSES,b.classId))return json(res,400,{error:'Ungültige Klasse.'});
        let token=bearer(req),hash=token?store.hash(token):'',same=token?sessions.get(hash):null,record=null,lease=same?.lease||null;const freshGuest=!token&&!same;
        const room=await roomFor(roomName);
        if(!same&&room.engine.players.size>=MAX_PLAYERS)return json(res,409,{error:`Dieser Raum ist voll (${MAX_PLAYERS} Spieler).`});
        if(!same&&sessions.size>=MAX_SESSIONS)return json(res,503,{error:'Server ist ausgelastet.'});
        if(draining&&!token)return json(res,503,{error:'Dieser Spielknoten wird aktualisiert. Bitte einen anderen Knoten verwenden.'});
        if(same){record=store.find(token);if(!record)return json(res,401,{error:'Gastzugang ungültig. Gespeicherten Zugang in den Einstellungen löschen.'});}
        else if(distributed){const opened=await stateClient.openSession({token:token||null,name:cleanName(b.name),classId:b.classId});if(opened?.invalidToken)return json(res,401,{error:'Gastzugang ungültig. Gespeicherten Zugang in den Einstellungen löschen.'});if(opened?.busy)return json(res,409,{error:'Dieses Konto ist bereits auf einem anderen Spielknoten aktiv. Bitte kurz warten und erneut verbinden.',retryable:true});record=opened?.record;lease=opened?.lease;if(!record||!lease)return json(res,503,{error:'Zentrale Sitzung konnte nicht geöffnet werden.'});if(!token)token=record.token;store.importRecord({...record,token});safety.prime(record.id,opened.safety);hash=store.hash(token);}
        else {record=token?store.find(token):null;if(token&&!record)return json(res,401,{error:'Gastzugang ungültig. Gespeicherten Zugang in den Einstellungen löschen.'});if(!record){record=store.create(cleanName(b.name),b.classId);token=record.token;hash=store.hash(token);leaderboardCacheAt=0;}}
        const ban=safety.banStatus(record.id);if(ban){if(distributed&&lease&&!same)await stateClient.releaseLease(record.id,lease.epoch).catch(()=>{});return json(res,403,{error:'Dieses Konto ist vorübergehend gesperrt.',until:ban.until});}
        if(same&&same.room!==room){const prior=same.room.engine.players.get(same.playerId);if(prior&&!prior.dead&&!same.room.engine.safe(prior))return json(res,409,{error:'Raumwechsel nur in der Zuflucht oder nach dem Tod.'});await saveSession(same);same.stream?.end();same.room.engine.removePlayer(same.playerId);record.profile=(distributed?await stateClient.find(token):store.find(token)).profile;if(distributed)store.importRecord({...record,token});}
        let session=same?.room===room?same:{wireEpoch:randomUUID(),snapshotSequence:0,playerId:record.id,room,stream:null,lastSequence:0,lastInputAt:0,inputStopped:true,disconnectedAt:Date.now(),lastActivity:Date.now(),snapshotPhase:sessionSerial++,backpressured:false,lease,freshGuest,receiptCache:new Map()};
        if(distributed)session.lease=lease;
        const p=room.engine.addPlayer(record.id,record.profile.name,record.profile.classId,record.profile);p.connected=true;
        sessions.set(hash,session);session.lastActivity=Date.now();room.lastUsed=Date.now();
        if(distributed)stateClient.recordActivity(record.id).catch(()=>{});else store.recordActivity(record.id);
        return json(res,200,{token,playerId:p.id,room:roomName,nextSequence:session.lastSequence,protocol:PROTOCOL,snapshot:snapshotFor(session)});
      }
      if(path.startsWith('/api/')){
        const s=ownSession(req);if(!s)return json(res,401,{error:'Anmeldung erforderlich.'});
        s.lastActivity=Date.now();s.room.lastUsed=Date.now();
        if(path==='/api/stream'&&req.method==='GET'){observability.sseConnections++;
          if(s.stream&&!s.stream.writableEnded){s.stream.write('data: '+JSON.stringify({type:'replaced'})+'\n\n');s.stream.end();}
          res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
          s.stream=res;s.backpressured=false;s.encoder=new URL(req.url,'http://localhost').searchParams.get('codec')===SNAPSHOT_CODEC?new SnapshotEncoder({trustInput:true,measureReference:false}):null;s.disconnectedAt=0;const p=s.room.engine.players.get(s.playerId);if(p)p.connected=true;
          sendState(s);
          res.on('close',()=>{observability.sseDisconnects++;if(!s.retired&&s.stream===res){s.stream=null;s.backpressured=false;s.disconnectedAt=Date.now();s.room.engine.setInput(s.playerId,{dx:0,dy:0,angle:0,fire:false,auto:false});scheduleSessionSave(s)}});return;
        }
        if(path==='/api/safety'&&req.method==='GET')return json(res,200,safety.summary(s.playerId));
        if(path==='/api/safety/block'&&req.method==='POST'){
          if(!limit('safety:'+s.playerId,10,60000))return json(res,429,{error:'Zu viele Änderungen. Bitte kurz warten.'});
          const b=await body(req);if(typeof b.enabled!=='boolean')return json(res,400,{error:'Bestätigung erforderlich.'});
          await safety.setBlock(s.playerId,b.playerId,b.enabled);
          if(b.enabled){const trade=s.room.engine.tradeFor(s.playerId);if(trade?.players.includes(b.playerId))s.room.engine.action(s.playerId,{type:'tradeCancel'});}
          return json(res,200,safety.summary(s.playerId));
        }
        if(path==='/api/safety/report'&&req.method==='POST'){
          if(!limit('report:'+s.playerId,6,60000))return json(res,429,{error:'Zu viele Meldungen. Bitte eine Minute warten.'});
          const b=await body(req),visible=s.room.engine.snapshot(s.playerId);
          const messages=visible.chat.filter(m=>m.playerId===b.playerId);
          if(!visible.players.some(p=>p.id===b.playerId)&&!messages.length&&!safety.blocked(s.playerId).has(b.playerId))return json(res,400,{error:'Spieler nicht in deiner Welt oder deinem Chat.'});
          // Never accept arbitrary report text as evidence: quote only a server-known visible message.
          const quote=messages.filter(m=>b.messageId===undefined||m.id===b.messageId).slice(-1).map(m=>m.text).join('');
          return json(res,200,await safety.report(s.playerId,b.playerId,b.reason,quote));
        }
        if(path==='/api/store'&&req.method==='GET'){const p=s.room.engine.players.get(s.playerId),catalog=shopCatalog(),active=new Set(catalog.rotation?.rotating||[]),wishlistReturns=(p.account.commerce.wishlist||[]).filter(id=>SHARD_OFFERS[id]?.group==='rotation'&&active.has(id));return json(res,200,{...catalog,commerce:p.account.commerce,wishlistReturns,vaultCapacity:vaultCapacity(p.account),characterSlots:p.account.characterSlots,verification:storeVerifier.configured});}
        if(path==='/api/store/event'&&req.method==='POST'){const b=await body(req),event=String(b.event||'');if(!SHOP_EVENT_NAMES.includes(event))return json(res,400,{error:'Unbekanntes Shop-Ereignis.'});if(!limit('shop-event:'+s.playerId,80,60000))return json(res,429,{error:'Zu viele Shop-Ereignisse.'});if(distributed)await stateClient.commerceEvent(s.playerId,event,b.productId||null);else store.commerceEvent(s.playerId,event,b.productId||null);return json(res,200,{ok:true});}
        if(path==='/api/store/wishlist'&&req.method==='POST'){const b=await body(req),p=s.room.engine.players.get(s.playerId),id=String(b.productId||'');if(!Object.hasOwn(SHARD_OFFERS,id)&&!Object.hasOwn(STORE_PRODUCTS,id))return json(res,400,{error:'Unbekanntes Angebot.'});const list=p.account.commerce.wishlist,has=list.includes(id);if(b.enabled===false&&has)list.splice(list.indexOf(id),1);else if(b.enabled!==false&&!has&&list.length<100)list.push(id);await persistPlayers(s.room,[s.playerId]);return json(res,200,{wishlist:list});}
        if(path==='/api/store/spend'&&req.method==='POST'){const b=await body(req),p=s.room.engine.players.get(s.playerId);if(p.dead||s.room.engine.world(p).kind!=='nexus')return json(res,409,{error:'Premiumangebote werden nur in der Riftwacht eingelöst.'});const offer=spendPremium(p,String(b.offerId||''),Date.now(),shopRotationIds);await persistPlayers(s.room,[s.playerId],null,{remoteEconomy:distributed?{txId:`premium:${s.playerId}:${String(b.requestId||randomUUID())}`,playerId:s.playerId,kind:'premium-spend',payload:{offerId:offer.id,cost:offer.cost}}:null});if(distributed)await stateClient.commerceEvent(s.playerId,'shard_spend',offer.id);else store.commerceEvent(s.playerId,'shard_spend',offer.id);return json(res,200,{ok:true,commerce:p.account.commerce,vaultCapacity:vaultCapacity(p.account),characterSlots:p.account.characterSlots});}
        if(path==='/api/store/verify'&&req.method==='POST'){const b=await body(req),provider=String(b.provider||''),productId=String(b.productId||''),product=STORE_PRODUCTS[productId];if(!product)return json(res,400,{error:'Unbekanntes Store-Produkt.'});if(!['apple','google'].includes(provider))return json(res,400,{error:'Unbekannter Store.'});if(purchaseLocks.has(s.playerId))return json(res,409,{error:'Ein Kauf wird bereits verarbeitet.'});purchaseLocks.add(s.playerId);try{if(distributed)await safety.refreshIfStale(s.playerId,5000);const verified=await storeVerifier.verify({provider,receipt:b.receipt,productId,playerId:s.playerId});const old=distributed?await stateClient.commerceReceipt(provider,verified.transactionId):store.commerceReceipt(provider,verified.transactionId);const p=s.room.engine.players.get(s.playerId);if(old){if(old.playerId!==s.playerId||old.productId!==productId)return json(res,409,{error:'Diese Transaktion gehört zu einem anderen Konto.'});if(['REFUNDED','REVOKED'].includes(old.status))return json(res,409,{error:'Diese Store-Transaktion wurde zurückerstattet oder widerrufen.'});return json(res,200,{ok:true,duplicate:true,transactionId:verified.transactionId,productId,consumable:!!product.consumable,commerce:p.account.commerce});}const before=structuredClone(p.account);try{const granted=grantVerifiedProduct(p,productId),grant=granted.grant||storeGrantRecord(product);const profile=s.room.engine.profile(s.playerId);if(distributed){await stateClient.commerceRedeem({provider,transactionId:verified.transactionId,playerId:s.playerId,productId,profile,grant});store.save(s.playerId,profile);}else store.transaction(()=>{store.save(s.playerId,profile);store.saveCommerceReceipt({provider,transactionId:verified.transactionId,playerId:s.playerId,productId,grant});});if(distributed)await stateClient.commerceEvent(s.playerId,'purchase_complete',productId);else store.commerceEvent(s.playerId,'purchase_complete',productId);return json(res,200,{ok:true,transactionId:verified.transactionId,productId,consumable:!!product.consumable,commerce:p.account.commerce,vaultCapacity:vaultCapacity(p.account),characterSlots:p.account.characterSlots});}catch(error){p.account=before;throw error;}}finally{purchaseLocks.delete(s.playerId);}}
        if(path==='/api/account'&&req.method==='GET')return json(res,200,distributed?await stateClient.accountInfo(s.playerId):store.accountInfo(s.playerId));
        if(path==='/api/account/register'&&req.method==='POST'){
          if(!limit('register:'+ip,6,60000))return json(res,429,{error:'Zu viele Kontoanfragen.'});
          const b=await body(req);await saveSession(s);const account=distributed?await stateClient.register(s.playerId,b.username,b.password):await store.register(s.playerId,b.username,b.password);return json(res,200,account);
        }
        if(path==='/api/account/logout'&&req.method==='POST'){
          const p=s.room.engine.players.get(s.playerId);if(p&&!p.dead&&s.room.engine.world(p).kind!=='nexus')return json(res,409,{error:'Zum Abmelden zuerst in den Nexus zurückkehren.'});
          await retireAccount(s.playerId);if(distributed){const token=await stateClient.rotateToken(s.playerId);store.setToken(s.playerId,token);}else store.rotateToken(s.playerId);return json(res,200,{loggedOut:true});
        }
        if(path==='/api/input'&&req.method==='POST'){
          if(!limit('input:'+s.playerId,40,1000)){observability.rejectedInputs++;observability.rateLimited++;return json(res,429,{error:'Eingaberate überschritten.'});}
          const b=await body(req);
          if(!Number.isSafeInteger(b.sequence)||b.sequence<=s.lastSequence||b.sequence>s.lastSequence+10000){observability.rejectedInputs++;return json(res,409,{error:'Veraltete Eingabe.'});}
          if(!b.input||typeof b.input!=='object'||Array.isArray(b.input)){observability.rejectedInputs++;return json(res,400,{error:'Ungültige Eingabe.'});}
          const verdict=security.inspect(s.playerId,{kind:'input',seq:b.sequence,dx:b.input.dx,dy:b.input.dy});
          if(!verdict.allowed){observability.rejectedInputs++;return json(res,403,{error:'Eingabe wegen wiederholter Protokollanomalien abgelehnt.'});}
          s.lastSequence=b.sequence;s.lastInputAt=Date.now();s.inputStopped=false;s.room.engine.setInput(s.playerId,b.input);return json(res,200,{ok:true});
        }
        if(path==='/api/action'&&req.method==='POST'){observability.actions++;
          if(!limit('action:'+s.playerId,12,1000)){observability.rejectedActions++;observability.rateLimited++;return json(res,429,{error:'Zu viele Aktionen.'});}
          const b=await body(req);const requestId=b.requestId;
          if(requestId!==undefined&&(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(requestId))){observability.rejectedActions++;return json(res,400,{error:'Ungültige Aktionskennung.'});}
          const fingerprint=createHash('sha256').update(JSON.stringify(b)).digest('hex');
          const cachedReceipt=requestId?s.receiptCache?.get(requestId):null;
          const receipt=requestId?(cachedReceipt||((distributed&&s.freshGuest)?null:(distributed?await stateClient.receipt(s.playerId,requestId):store.receipt(s.playerId,requestId)))):null;
          if(receipt){if(receipt.hash!==fingerprint){observability.rejectedActions++;return json(res,409,{error:'Aktionskennung bereits für eine andere Aktion benutzt.'});}return json(res,200,{accepted:!!receipt.accepted,replayed:true,...(s.stream?{}:{snapshot:snapshotFor(s)})});}
          let socialLock=null,accepted=false;
          try{
            if(distributed){const actionType=String(b.type||''),needsSafety=actionType==='chat'||actionType.startsWith('trade')||actionType.startsWith('guild')||actionType.startsWith('friend');if(needsSafety){await safety.refreshIfStale(s.playerId,5000);if(typeof b.playerId==='string')await safety.refreshIfStale(b.playerId,5000);}if(actionType.startsWith('guild')||actionType.startsWith('friend')){socialLock=await stateClient.acquireLock('social');if(!socialLock)return json(res,503,{error:'Soziale Daten werden gerade auf einem anderen Knoten geändert. Bitte erneut versuchen.'});const latest=await stateClient.loadSocial();social.replace(latest?.state);socialRevision=Number(latest?.revision||0);}}
            let allowed=true;if(b.type==='chat'&&!safety.canChat(s.playerId))allowed=false;if(b.type==='chat'&&b.channel==='friend'&&!safety.canCommunicate(s.playerId,b.playerId))allowed=false;if(b.type==='tradeInvite'&&!safety.canTrade(s.playerId,b.playerId))allowed=false;
            const tradeParticipants=b.type==='tradeConfirm'?s.room.engine.tradeFor(s.playerId)?.players?.slice():null;
            accepted=allowed&&s.room.engine.action(s.playerId,b);if(!accepted)observability.rejectedActions++;
            if(accepted||requestId){const ids=accepted?(tradeParticipants?.length?tradeParticipants:[s.playerId]):[];const socialState=accepted&&(String(b.type).startsWith('guild')||String(b.type).startsWith('friend'));const world=accepted&&['openDungeon'].includes(b.type);const economyTypes=new Set(['tradeConfirm','dismantle','tinkererTurnIn','engrave','enchantReroll','enchant','forgeRecipe','salvage','upgrade','characterSlotPurchase','petAdopt','petHatch','petFeed','petFuse','guildDonate','giftClaim','potionStore','potionTake']);const economyTx=accepted&&requestId&&economyTypes.has(b.type)?{txId:`action:${s.playerId}:${requestId}`,playerId:s.playerId,kind:b.type,payload:b}:null;const commit=()=>{if(!distributed&&requestId)store.saveReceipt(s.playerId,requestId,fingerprint,accepted);if(!distributed&&economyTx)economy.run(economyTx,()=>null);};await persistPlayers(s.room,ids,commit,{world,socialState,remoteReceipt:distributed&&requestId?{playerId:s.playerId,requestId,hash:fingerprint,accepted}:null,remoteEconomy:distributed?economyTx:null});if(requestId){s.receiptCache??=new Map();s.receiptCache.set(requestId,{hash:fingerprint,accepted:accepted?1:0});while(s.receiptCache.size>256)s.receiptCache.delete(s.receiptCache.keys().next().value);}}
          } finally {if(distributed&&socialLock)await stateClient.releaseLock('social',socialLock.epoch).catch(()=>{});}
          // Connected clients already receive the authoritative state over SSE. Avoid serializing a
          // second full action snapshot under load; non-stream HTTP callers retain the old response.
          return json(res,200,{accepted,replayed:false,...(s.stream?{}:{snapshot:snapshotFor(s)})});
        }
        if(path==='/api/profile'&&req.method==='GET')return json(res,200,{profile:s.room.engine.profile(s.playerId)});
        if(path==='/api/profile'&&req.method==='DELETE'){
          const b=await body(req);if(b.confirm!=='DELETE')return json(res,400,{error:'Bestätigung fehlt.'});
          s.retired=true;s.stream?.end();s.room.engine.removePlayer(s.playerId);sessions.delete(store.hash(bearer(req)));const socialChanged=social.removeAccount(s.playerId);safety.clearCache();store.transaction(()=>{store.delete(s.playerId);if(socialChanged)store.saveSocial(social.export());});if(distributed){await stateClient.delete(s.playerId);if(socialChanged)await stateClient.saveSocial(social.export(),socialRevision).then(r=>socialRevision=r.revision);if(s.lease)await stateClient.releaseLease(s.playerId,s.lease.epoch).catch(()=>{});}return json(res,200,{deleted:true});
        }
        return json(res,404,{error:'Unbekannte Schnittstelle.'});
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Methode nicht erlaubt.'});
      if(path==='/')return json(res,200,{product:'Nyrathen',version:VERSION,service:'mobile-multiplayer-server',browserGame:false,health:'/healthz'});
      return json(res,404,{error:'Mobile-Server: keine Browser-Spieloberfläche verfügbar.'});
    }catch(error){if(!res.headersSent)json(res,error.status||500,{error:error.status?error.message:'Interner Serverfehler.'});else res.end();if(!error.status)console.error('request-error',error.message);}
  });
  server.maxHeadersCount=40;server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxConnections=Math.max(512,Math.min(MAX_SESSIONS+128,8192));
  const phaseHash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  const persistPhase=phaseHash(nodeId)%PERSIST_INTERVAL_TICKS;
  const heartbeatPhase=phaseHash(nodeId+':hb')%20;
  const safetyPhase=phaseHash(nodeId+':safe')%60;
  let tick=0,persistQueue=[],persistenceInFlight=null,lastStateHeartbeat=0,lastSafetyRefresh=0,stateLeaseFailures=0;
  const interval=setInterval(()=>{
    if(!storageHealthy)return;try{
    for(const room of rooms.values())if(room.engine.players.size)room.engine.step(.05);
    const now=Date.now(),tickDelay=Math.max(0,now-lastTickWall-50);lastTickWall=now;tickDelaySamples.push(tickDelay);if(tickDelaySamples.length>400)tickDelaySamples.shift();tick++;
    const snapshotEvery=snapshotIntervalTicks();
    for(const[hash,s]of sessions){
      const p=s.room.engine.players.get(s.playerId);if(!p)continue;
      // Stop stale movement/fire even when the receive-only SSE stream stays healthy.
      if(!s.inputStopped&&now-s.lastInputAt>1000){s.room.engine.setInput(s.playerId,{dx:0,dy:0,angle:p.angle||0,fire:false,auto:false});s.inputStopped=true;transport.inputTimeouts++;}
      // Lost connections leave a vulnerable, stationary body for 15 seconds.
      if(!s.stream&&s.disconnectedAt&&now-s.disconnectedAt>15000)p.connected=false;
      if(s.stream&&!s.stream.writableEnded&&tick%snapshotEvery===((s.snapshotPhase||0)%snapshotEvery)){sendState(s);}

      if(!s.stream&&now-s.lastActivity>60000){void saveSession(s).catch(()=>{});if(distributed&&s.lease)void stateClient.releaseLease(s.playerId,s.lease.epoch).catch(()=>{});s.room.engine.removePlayer(s.playerId);sessions.delete(hash);}
    }
    if(distributed&&tick%20===heartbeatPhase&&now-lastStateHeartbeat>=900){lastStateHeartbeat=now;const active=[...sessions.values()].filter(s=>s.lease&&!s.retired);void stateClient.heartbeatBatch(sessions.size,active.map(s=>({accountId:s.playerId,epoch:s.lease.epoch}))).then(result=>{stateLeaseFailures=0;stateBackendHealthy=true;const renewed=new Map((result?.renewed||[]).map(x=>[x.accountId,x])),lost=new Set(result?.lost||[]),bans=new Map((result?.bans||[]).map(x=>[x.accountId,x]));for(const s of active){const next=renewed.get(s.playerId);if(next)s.lease=next;if(lost.has(s.playerId)||bans.has(s.playerId)){s.retired=true;s.stream?.end();s.room.engine.setInput(s.playerId,{dx:0,dy:0,angle:0,fire:false,auto:false});}}}).catch(()=>{stateBackendHealthy=false;stateLeaseFailures++;if(stateLeaseFailures>=3)for(const s of active){s.retired=true;s.stream?.end();s.room.engine.setInput(s.playerId,{dx:0,dy:0,angle:0,fire:false,auto:false});}});}
    if(distributed&&tick%60===safetyPhase&&now-lastSafetyRefresh>=2500){lastSafetyRefresh=now;const ids=[...sessions.values()].filter(s=>!s.retired).map(s=>s.playerId);if(ids.length)void safety.refreshBatch(ids).catch(()=>{});}
    if(tick%PERSIST_INTERVAL_TICKS===persistPhase)persistQueue=[...rooms.values()].filter(r=>r.engine.players.size);
    if(persistQueue.length&&!persistenceInFlight){const target=persistQueue.shift();persistenceInFlight=persistRegion(target).catch(()=>{}).finally(()=>persistenceInFlight=null);}
    if(tick%100===0&&now-lastBackupAttempt>=backupSeconds*1000){lastBackupAttempt=now;checkpointBackup();}
    if(tick%200===0){safety.prune(now);for(const[name,r]of rooms)if(!r.engine.players.size&&now-r.lastUsed>60000){if(distributed)void stateClient.saveWorld(worldKey(name),r.engine.exportWorlds()).catch(()=>{stateBackendHealthy=false;});else store.saveWorld(name,r.engine.exportWorlds());rooms.delete(name);}for(const[k,v]of limits)if(now>v.until)limits.delete(k);}
    }catch(error){persistenceFault(error);}
  },50);
  interval.unref();
  function setDraining(value=true){draining=!!value;return draining;}
  async function close(){
    if(closing)return;draining=true;closing=true;clearInterval(interval);for(const batch of disconnectSaveBatches.values())if(batch.timer)clearTimeout(batch.timer);disconnectSaveBatches.clear();
    if(storageHealthy)try{if(persistenceInFlight)await persistenceInFlight;for(const r of rooms.values())await persistRegion(r);}catch{/* Keep committed checkpoint. */}
    for(const s of sessions.values()){s.retired=true;if(s.stream&&!s.stream.writableEnded){s.stream.write('data: '+JSON.stringify({type:'maintenance',message:'Server wird neu gestartet. Dein letzter gespeicherter Stand bleibt erhalten.'})+'\n\n');s.stream.end();}if(distributed&&s.lease)await stateClient.releaseLease(s.playerId,s.lease.epoch).catch(()=>{});}
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    await backupJob;if(storageHealthy&&!distributed)await checkpointBackup();
    if(distributed)await stateClient.nodeDown().catch(()=>{});store.close();releaseLock();
  }
  return{server,store,rooms,sessions,social,safety,security,economy,transport,observability,readiness,setDraining,close,checkpointBackup,stateClient,nodeId,distributed};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const app=createGameServer();const host=process.env.HOST||'127.0.0.1';const port=Number(process.env.PORT||3000);
  app.server.listen(port,host,()=>console.log(`Nyrathen ${VERSION} on http://${host}:${port} · 20 Hz authoritative server`));
  let closing=false;const stop=async()=>{if(closing)return;closing=true;await app.close();process.exit(0);};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
