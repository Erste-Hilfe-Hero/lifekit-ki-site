// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Central single-writer state authority for multi-node Nyrathen clusters.
// GameServer workers never share or mount a SQLite file; all durable account/world/social writes
// are serialized here behind authenticated RPC. A provider can later replace this service with a
// certified distributed SQL backend without changing the GameServer contract.
import http from 'node:http';
import {createHmac,createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ProfileStore} from './store.mjs';
import {SafetyStore} from './safety.mjs';
import {EconomyLedger,AdminAudit} from './production.mjs';
import {AccountLeaseRegistry} from './cluster.mjs';
import {createBackup,acquireDataLock,pruneBackups} from './operations.mjs';
import {VERSION,PROTOCOL} from '../shared/data.mjs';
import {reverseStoreGrant} from '../shared/monetization-data.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const JSON_LIMIT=2*1024*1024;
const stableBody=value=>JSON.stringify(value??{});
const safeEq=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y);};
export function stateRequestSignature(secret,timestamp,nonce,bodyText){return createHmac('sha256',secret).update(`${timestamp}.${nonce}.${bodyText}`).digest('hex');}
class RevisionStore{
  constructor(store){this.store=store;store.db.exec("CREATE TABLE IF NOT EXISTS state_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL)");}
  number(key){const row=this.store.db.prepare('SELECT value FROM state_meta WHERE key=?').get(key);return Number(row?.value||0)||0;}
  setNumber(key,value){this.store.db.prepare('INSERT INTO state_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,String(value));}
  social(){return{state:this.store.loadSocial(),revision:this.number('social_revision')};}
  saveSocial(state,expectedRevision){return this.store.transaction(()=>{const revision=this.number('social_revision');if(Number.isInteger(expectedRevision)&&expectedRevision!==revision)throw Object.assign(new Error('social revision conflict'),{status:409,revision});this.store.saveSocial(state);const next=revision+1;this.setNumber('social_revision',next);return{revision:next};});}
}
export function createStateAuthority(options={}){
  const secret=String(options.secret??process.env.STATE_AUTHORITY_SECRET??'');if(secret.length<32)throw new Error('STATE_AUTHORITY_SECRET must be at least 32 characters');
  const dataPath=options.dataPath||process.env.STATE_AUTHORITY_DATA_PATH||resolve(ROOT,'.data/state-authority.sqlite');
  const backupDir=options.backupDirectory||process.env.STATE_AUTHORITY_BACKUP_DIRECTORY||dataPath+'.backups';
  const backupRetain=Math.max(1,Math.min(8,Number(options.backupRetain??process.env.STATE_AUTHORITY_BACKUP_RETAIN??2)||2));
  const backupPrune=dataPath===':memory:'?{kept:0,removed:0,partialsRemoved:0}:pruneBackups(backupDir,{retain:backupRetain});
  const releaseLock=acquireDataLock(dataPath);let store;
  try{store=new ProfileStore(dataPath);}catch(e){releaseLock();throw e;}
  let safety,economy,audit,meta;try{safety=new SafetyStore(store.db);economy=new EconomyLedger(store.db);audit=new AdminAudit(store.db);meta=new RevisionStore(store);}catch(e){store.close();releaseLock();throw e;}
  const accountLeases=new AccountLeaseRegistry({ttlMs:Number(options.leaseTtlMs||process.env.STATE_LEASE_TTL_MS||15000)});
  const genericLeases=new AccountLeaseRegistry({ttlMs:Number(options.lockTtlMs||process.env.STATE_LOCK_TTL_MS||7000)});
  const nonces=new Map(),nodes=new Map(),opCounts=new Map();const nodeDeadMs=Number(options.nodeDeadMs||process.env.STATE_NODE_DEAD_MS||2500);let closing=false,requests=0,rejected=0,internalErrors=0,lastInternalError=null,lastBackup=null,backupJob=null;
  const guestOpenBatchMax=Math.max(8,Math.min(512,Number(options.guestOpenBatchMax||process.env.STATE_GUEST_OPEN_BATCH_MAX||256)));
  const guestOpenBatchMs=Math.max(0,Math.min(25,Number(options.guestOpenBatchMs||process.env.STATE_GUEST_OPEN_BATCH_MS||3)));
  const guestOpenQueue=[];let guestOpenTimer=null,guestOpenBatches=0,guestOpenMaxBatch=0;
  const pruneNonces=now=>{for(const[n,at]of nonces)if(now-at>120000)nonces.delete(n);};
  const auth=(req,bodyText)=>{const now=Date.now(),ts=Number(req.headers['x-nyrathen-state-ts']),nonce=String(req.headers['x-nyrathen-state-nonce']||''),sig=String(req.headers['x-nyrathen-state-signature']||'');if(!Number.isFinite(ts)||Math.abs(now-ts)>30000||!/^[A-Za-z0-9_-]{16,80}$/.test(nonce))return false;pruneNonces(now);if(nonces.has(nonce))return false;const expected=stateRequestSignature(secret,ts,nonce,bodyText);if(!safeEq(sig,expected))return false;nonces.set(nonce,now);return true;};
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  const acquireAccountLease=(accountId,nodeId)=>{const account=String(accountId),node=String(nodeId);nodes.set(node,{...(nodes.get(node)||{}),nodeId:node,players:Number(nodes.get(node)?.players||0),at:Date.now()});const owner=accountLeases.owner(account);if(owner&&owner.nodeId!==node){const holder=nodes.get(owner.nodeId);if(!holder||Date.now()-holder.at>nodeDeadMs)accountLeases.release(account,owner.nodeId,owner.epoch);}return accountLeases.acquire(account,node);};
  const safetyValue=id=>({...safety.summary(id),ban:safety.banStatus(id)});
  const emptySafety=()=>({blocked:[],chatMutedUntil:0,chatMuteReason:'',ban:null});
  const flushGuestOpenQueue=()=>{
    guestOpenTimer=null;if(!guestOpenQueue.length)return;
    const batch=guestOpenQueue.splice(0,guestOpenBatchMax);guestOpenBatches++;guestOpenMaxBatch=Math.max(guestOpenMaxBatch,batch.length);
    const prepared=batch.map(row=>({row,account:store.prepareCreate(row.name,row.classId)}));
    try{
      const results=store.transaction(()=>prepared.map(({row,account})=>{const record=store.insertPrepared(account),lease=acquireAccountLease(record.id,row.nodeId);if(!lease){store.delete(record.id);return{busy:true};}return{record,lease,safety:emptySafety()};}));
      batch.forEach((row,index)=>row.resolve(results[index]));
    }catch(error){batch.forEach(row=>row.reject(error));}
    if(guestOpenQueue.length)guestOpenTimer=setTimeout(flushGuestOpenQueue,0);
  };
  const queueGuestOpen=({name,classId,nodeId})=>new Promise((resolve,reject)=>{if(closing)return reject(Object.assign(new Error('state authority closing'),{status:503}));guestOpenQueue.push({name,classId,nodeId,resolve,reject});if(guestOpenQueue.length>=guestOpenBatchMax){if(guestOpenTimer)clearTimeout(guestOpenTimer);guestOpenTimer=setTimeout(flushGuestOpenQueue,0);}else if(!guestOpenTimer)guestOpenTimer=setTimeout(flushGuestOpenQueue,guestOpenBatchMs);});
  const readBody=async req=>{let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>JSON_LIMIT)throw Object.assign(new Error('request too large'),{status:413});chunks.push(c);}const text=Buffer.concat(chunks).toString('utf8');let value;try{value=JSON.parse(text||'{}');}catch{throw Object.assign(new Error('invalid json'),{status:400});}if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(new Error('object required'),{status:400});return{text,value};};
  const handlers={
    'node.heartbeatBatch':({nodeId,players=0,leases=[]})=>{
      const id=String(nodeId),now=Date.now();nodes.set(id,{nodeId:id,players:Number(players)||0,at:now});const renewed=[],lost=[],bans=[];
      for(const row of Array.isArray(leases)?leases.slice(0,5000):[]){if(!row||typeof row.accountId!=='string')continue;const next=accountLeases.renew(row.accountId,id,Number(row.epoch));if(next)renewed.push(next);else lost.push(row.accountId);const ban=safety.banStatus(row.accountId,now);if(ban)bans.push({accountId:row.accountId,...ban});}
      return{at:now,renewed,lost,bans};
    },
    'profile.find':({token})=>store.find(token),
    'profile.create':({name,classId})=>store.create(name,classId),
    'session.open':({token=null,name=null,classId=null,nodeId})=>{if(!token)return queueGuestOpen({name,classId,nodeId});const record=store.find(token);if(!record)return{invalidToken:true};const lease=acquireAccountLease(record.id,nodeId);if(!lease)return{busy:true};return{record,lease,safety:safetyValue(record.id)};},
    'session.openBatch':({sessions=[],nodeId})=>Promise.all((Array.isArray(sessions)?sessions:[]).slice(0,128).map(row=>queueGuestOpen({name:row?.name,classId:row?.classId,nodeId}))),
    'profile.save':({id,profile})=>{store.save(id,profile);return{ok:true};},
    'profile.delete':({id})=>store.transaction(()=>{store.delete(id);return{ok:true};}),
    'profile.persistBatch':({profiles=[],world=null,social=null,socialExpectedRevision=null,receipt=null,economyTx=null})=>store.transaction(()=>{
      for(const row of profiles){if(row?.id&&row?.profile)store.save(row.id,row.profile);}
      if(world?.name)store.saveWorld(world.name,world.state);
      let socialResult=null;if(social!==null&&social!==undefined){const revision=meta.number('social_revision');if(Number.isInteger(socialExpectedRevision)&&socialExpectedRevision!==revision)throw Object.assign(new Error('social revision conflict'),{status:409,revision});store.saveSocial(social);meta.setNumber('social_revision',revision+1);socialResult={revision:revision+1};}
      if(receipt){const old=store.receipt(receipt.playerId,receipt.requestId);if(old){if(old.hash!==receipt.hash)throw Object.assign(new Error('receipt conflict'),{status:409});}else store.saveReceipt(receipt.playerId,receipt.requestId,receipt.hash,!!receipt.accepted);}
      if(economyTx)economy.run(economyTx,()=>null);
      return{ok:true,social:socialResult};
    }),
    'world.load':({name})=>store.loadWorld(name),
    'world.save':({name,state})=>{store.saveWorld(name,state);return{ok:true};},
    'social.load':()=>meta.social(),
    'social.save':({state,expectedRevision})=>meta.saveSocial(state,expectedRevision),
    'account.info':({id})=>store.accountInfo(id),
    'account.register':({id,username,password})=>store.register(id,username,password),
    'account.authenticate':({username,password})=>store.authenticate(username,password),
    'account.recover':({username,recoveryCode,password})=>store.recover(username,recoveryCode,password),
    'account.rotateToken':({id})=>({token:store.rotateToken(id)}),
    'commerce.get':({provider,transactionId})=>store.commerceReceipt(provider,transactionId),
    'commerce.history':({playerId,limit=100})=>store.commerceHistory(String(playerId),limit),
    'commerce.report':()=>store.commerceReport(),
    'commerce.redeem':({provider,transactionId,playerId,productId,profile,grant={productId}})=>store.transaction(()=>{const old=store.commerceReceipt(provider,transactionId);if(old){if(old.playerId!==playerId||old.productId!==productId)throw Object.assign(new Error('store transaction already owned'),{status:409});return{duplicate:true,receipt:old};}store.save(playerId,profile);const receipt=store.saveCommerceReceipt({provider,transactionId,playerId,productId,grant});return{duplicate:false,receipt};}),
    'commerce.revoke':({provider,transactionId,actor='store-webhook',reason='store refund'})=>store.transaction(()=>{const receipt=store.commerceReceipt(provider,transactionId);if(!receipt)return{missing:true};if(['REFUNDED','REVOKED'].includes(receipt.status))return{duplicate:true,receipt};const profile=store.profileById(receipt.playerId);if(!profile)throw Object.assign(new Error('commerce player missing'),{status:404});let grant={};try{grant=JSON.parse(receipt.grantJson||'{}');}catch{}reverseStoreGrant(profile,grant);store.save(receipt.playerId,profile);const next=store.updateCommerceReceipt(provider,transactionId,'REVOKED',grant);store.commerceEvent(receipt.playerId,'purchase_refund',receipt.productId);audit.record(String(actor||'store-webhook'),'commerce:revoke',receipt.playerId,String(reason||'store refund'));return{revoked:true,receipt:next,profile};}),
    'commerce.event':({playerId,event,productId=null})=>store.commerceEvent(playerId,event,productId),
    'analytics.session':({playerId,at=Date.now()})=>store.recordActivity(String(playerId),at),
    'analytics.report':()=>store.retentionReport(),
    'receipt.get':({playerId,requestId})=>store.receipt(playerId,requestId)||null,
    'leaderboards':({theme=null})=>({leaderboard:store.leaderboard(20),eventLeaderboard:store.eventLeaderboard(20),speedLeaderboard:theme?store.speedLeaderboard(theme,20):[]}),
    'safety.summary':({id})=>safetyValue(id),
    'safety.batchSummary':({ids=[]})=>{const out={};for(const id of ids.slice(0,512))out[String(id)]=safetyValue(String(id));return out;},
    'safety.block':({owner,target,enabled})=>{safety.setBlock(owner,target,!!enabled);return safety.summary(owner);},
    'safety.report':({reporter,target,reason,quote})=>safety.report(reporter,target,reason,quote),
    'safety.canCommunicate':({a,b})=>({allowed:safety.canCommunicate(a,b)}),
    'safety.canChat':({id})=>({allowed:safety.canChat(id)}),
    'safety.banStatus':({id})=>safety.banStatus(id),
    'node.heartbeat':({nodeId,players=0})=>{const id=String(nodeId);nodes.set(id,{nodeId:id,players:Number(players)||0,at:Date.now()});return{ok:true,at:Date.now()};},
    'node.down':({nodeId})=>{nodes.delete(String(nodeId));return{ok:true};},
    'lease.acquire':({accountId,nodeId})=>acquireAccountLease(accountId,nodeId),
    'lease.renew':({accountId,nodeId,epoch})=>accountLeases.renew(String(accountId),String(nodeId),Number(epoch)),
    'lease.renewBatch':({leases=[],nodeId})=>{const out=[];for(const row of leases.slice(0,2048)){const accountId=String(row.accountId||''),epoch=Number(row.epoch);out.push({accountId,lease:accountLeases.renew(accountId,String(nodeId),epoch)});}return out;},
    'lease.release':({accountId,nodeId,epoch})=>({released:accountLeases.release(String(accountId),String(nodeId),Number(epoch))}),
    'lease.owner':({accountId})=>accountLeases.owner(String(accountId)),
    'lock.acquire':({key,nodeId})=>genericLeases.acquire('lock:'+String(key),String(nodeId)),
    'lock.renew':({key,nodeId,epoch})=>genericLeases.renew('lock:'+String(key),String(nodeId),Number(epoch)),
    'lock.release':({key,nodeId,epoch})=>({released:genericLeases.release('lock:'+String(key),String(nodeId),Number(epoch))}),
    'admin.audit':({actor,action,target,reason})=>audit.record(actor,action,target,reason),
  };
  async function checkpoint(){if(dataPath===':memory:'||backupJob)return backupJob;backupJob=createBackup(store.db,backupDir,{retain:backupRetain}).then(r=>(lastBackup=r,r)).finally(()=>backupJob=null);return backupJob;}
  const server=http.createServer(async(req,res)=>{requests++;res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');let activeOp=null;try{
    const path=new URL(req.url,'http://state.local').pathname;
    if(path==='/healthz'&&req.method==='GET')return json(res,closing?503:200,{ok:!closing,service:'nyrathen-state-authority',version:VERSION,protocol:PROTOCOL,requests,rejected,accounts:store.db.prepare('SELECT COUNT(*) n FROM players').get().n,nodes:[...nodes.values()].filter(n=>Date.now()-n.at<=nodeDeadMs*2).length,opCounts:Object.fromEntries(opCounts),lastBackup:lastBackup?.createdAt||null,internalErrors,lastInternalError,guestOpenQueueDepth:guestOpenQueue.length,guestOpenBatches,guestOpenMaxBatch,backupRetain,backupPrune});
    if(path!=='/rpc'||req.method!=='POST')return json(res,404,{error:'not found'});
    const{text,value}=await readBody(req);if(!auth(req,text)){rejected++;return json(res,401,{error:'state authority authentication failed'});}activeOp=String(value.op||'');const handler=handlers[activeOp];opCounts.set(activeOp,(opCounts.get(activeOp)||0)+1);if(!handler)return json(res,404,{error:'unknown state operation'});let result=await handler(value.args||{});return json(res,200,{ok:true,result});
  }catch(e){const status=Number(e.status)||500;if(status>=400)rejected++;if(status===500){internalErrors++;lastInternalError={at:new Date().toISOString(),op:activeOp,name:String(e?.name||'Error').slice(0,80),message:String(e?.message||'unknown').slice(0,240),code:e?.code?String(e.code).slice(0,80):null};console.error('state-authority-internal-error',JSON.stringify(lastInternalError));}return json(res,status,{error:status===500?'state authority internal error':e.message,...(e.revision!==undefined?{revision:e.revision}:{})});}});
  server.maxConnections=8192;server.requestTimeout=10000;server.headersTimeout=5000;server.keepAliveTimeout=3000;
  async function close(){if(closing)return;closing=true;if(guestOpenTimer){clearTimeout(guestOpenTimer);guestOpenTimer=null;}const pending=guestOpenQueue.splice(0);for(const row of pending)row.reject(Object.assign(new Error('state authority closing'),{status:503}));server.closeAllConnections();await new Promise(r=>server.close(r));await backupJob;try{await checkpoint();}catch{}store.close();releaseLock();}
  return{server,store,safety,economy,audit,accountLeases,genericLeases,checkpoint,close};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const app=createStateAuthority(),host=process.env.STATE_AUTHORITY_HOST||'127.0.0.1',port=Number(process.env.STATE_AUTHORITY_PORT||process.env.PORT||3400);app.server.listen(port,host,()=>console.log(`Nyrathen State Authority ${VERSION} on http://${host}:${app.server.address().port}`));let done=false;const stop=async()=>{if(done)return;done=true;await app.close();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
