// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
const stable=v=>JSON.stringify(v,Object.keys(v||{}).sort());
export class SecurityGuard{
 constructor({windowMs=10000,maxScore=12}={}){this.windowMs=windowMs;this.maxScore=maxScore;this.players=new Map();}
 inspect(id,event,now=Date.now()){let s=this.players.get(id)||{score:0,at:now,lastSeq:-1,lastPos:null,flags:[]};if(now-s.at>this.windowMs)s={score:0,at:now,lastSeq:s.lastSeq,lastPos:s.lastPos,flags:[]};let add=0,reason=null;
  if(Number.isInteger(event.seq)&&event.seq<=s.lastSeq){add=3;reason='sequence-replay';} if(Number.isInteger(event.seq))s.lastSeq=Math.max(s.lastSeq,event.seq);
  if(event.kind==='move'&&s.lastPos&&Number.isFinite(event.x)&&Number.isFinite(event.y)){const dt=Math.max(.05,(now-s.lastPos.at)/1000),d=Math.hypot(event.x-s.lastPos.x,event.y-s.lastPos.y);if(d/dt>Number(event.maxSpeed||900)*1.35){add=Math.max(add,5);reason='movement-impossible';}} if(event.kind==='move'&&Number.isFinite(event.x)&&Number.isFinite(event.y))s.lastPos={x:event.x,y:event.y,at:now};
  if(event.kind==='input'){const dx=Number(event.dx),dy=Number(event.dy);if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>1.25||Math.abs(dy)>1.25||Math.hypot(dx,dy)>1.55){add=Math.max(add,5);reason='input-vector';}}
  if(event.kind==='fire'&&Number(event.intervalMs)>0&&Number(event.sinceLastMs)<Number(event.intervalMs)*.75){add=Math.max(add,4);reason='fire-rate';}
  if(event.kind==='damage'&&Number(event.amount)>Number(event.maxDamage)*1.05){add=Math.max(add,6);reason='damage-envelope';}
  if(reason)s.flags.push({reason,at:now});s.score+=add;s.at=now;this.players.set(id,s);return{allowed:s.score<this.maxScore,score:s.score,reason,action:s.score>=this.maxScore?'quarantine':s.score>=8?'challenge':s.score>=4?'observe':'allow'};}
}
export class EconomyLedger{
 constructor(db){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS economy_ledger (tx_id TEXT PRIMARY KEY, player_id TEXT NOT NULL, kind TEXT NOT NULL, payload_hash TEXT NOT NULL, created_at INTEGER NOT NULL)');}
 run({txId=randomUUID(),playerId,kind,payload},fn){const hash=createHash('sha256').update(stable(payload)).digest('hex'),old=this.db.prepare('SELECT payload_hash FROM economy_ledger WHERE tx_id=?').get(txId);if(old){if(old.payload_hash!==hash)throw Object.assign(new Error('Transaction id reused with different payload'),{status:409});return{duplicate:true,txId};}this.db.exec('SAVEPOINT economy');try{const result=fn();this.db.prepare('INSERT INTO economy_ledger VALUES (?,?,?,?,?)').run(txId,playerId,kind,hash,Date.now());this.db.exec('RELEASE economy');return{duplicate:false,txId,result};}catch(e){this.db.exec('ROLLBACK TO economy');this.db.exec('RELEASE economy');throw e;}}
}
export class AdminAudit{
 constructor(db){this.db=db;db.exec('CREATE TABLE IF NOT EXISTS admin_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT, reason TEXT NOT NULL, created_at INTEGER NOT NULL)');}
 record(actor,action,target,reason){if(!actor||!action||String(reason||'').trim().length<3)throw new Error('Audited admin action requires actor/action/reason');const row={id:randomUUID(),actor,action,target:target||null,reason:String(reason).trim(),createdAt:Date.now()};this.db.prepare('INSERT INTO admin_audit VALUES (?,?,?,?,?,?)').run(row.id,row.actor,row.action,row.target,row.reason,row.createdAt);return row;}
 list(limit=100){return this.db.prepare('SELECT id,actor,action,target,reason,created_at AS createdAt FROM admin_audit ORDER BY created_at DESC LIMIT ?').all(Math.max(1,Math.min(500,limit)));}
}
export class LiveOpsConfig{
 constructor({secret=''}={}){this.secret=secret;this.current={revision:0,seasons:[],events:[],crucible:[],missions:[],rewards:[]};}
 sign(config){return createHmac('sha256',this.secret).update(JSON.stringify(config)).digest('hex');}
 apply(config,signature){if(!this.secret||this.secret.length<32)throw new Error('LiveOps signing secret not configured');const expected=this.sign(config),a=Buffer.from(expected),b=Buffer.from(String(signature||''));if(a.length!==b.length||!timingSafeEqual(a,b))throw new Error('Invalid LiveOps signature');if(!Number.isInteger(config.revision)||config.revision<=this.current.revision)throw new Error('LiveOps revision must increase');this.current=structuredClone(config);return this.snapshot();}
 snapshot(){return structuredClone(this.current);}
}
export class ClusterDirector{
 constructor({maxPlayers=100}={}){this.maxPlayers=maxPlayers;this.nodes=new Map();}
 heartbeat(id,{players=0,healthy=true,draining=false,region='default'}={}){this.nodes.set(id,{id,players,healthy,draining,region,at:Date.now()});}
 drain(id,value=true){const n=this.nodes.get(id);if(!n)throw new Error('Unknown node');n.draining=!!value;return n;}
 place(region='default'){return [...this.nodes.values()].filter(n=>n.healthy&&!n.draining&&n.players<this.maxPlayers&&(n.region===region||region==='any')).sort((a,b)=>a.players-b.players||a.id.localeCompare(b.id))[0]||null;}
 stale(now=Date.now(),ttl=15000){return [...this.nodes.values()].filter(n=>now-n.at>ttl).map(n=>n.id);}
}
export class Telemetry{
 constructor(){this.counters=new Map();this.samples=new Map();}
 inc(name,n=1){this.counters.set(name,(this.counters.get(name)||0)+n);}
 observe(name,value){const a=this.samples.get(name)||[];a.push(Number(value));if(a.length>512)a.shift();this.samples.set(name,a);}
 snapshot(){const gauges={};for(const[k,a]of this.samples)if(a.length){const s=[...a].sort((x,y)=>x-y);gauges[k]={count:a.length,avg:a.reduce((x,y)=>x+y,0)/a.length,p50:s[Math.min(s.length-1,Math.floor(s.length*.50))],p95:s[Math.min(s.length-1,Math.floor(s.length*.95))],p99:s[Math.min(s.length-1,Math.floor(s.length*.99))],max:s[s.length-1]};}return{counters:Object.fromEntries(this.counters),gauges};}
}
export class PushOutbox{
 constructor(){this.queue=[];}
 enqueue(playerId,type,payload={}){const allowed=new Set(['maintenance','event','account']);if(!allowed.has(type))throw new Error('Unsupported push type');const m={id:randomUUID(),playerId,type,payload,createdAt:Date.now(),attempts:0};this.queue.push(m);return m;}
 take(limit=100){return this.queue.filter(x=>x.attempts<5).slice(0,limit).map(x=>(x.attempts++,x));}
 ack(id){this.queue=this.queue.filter(x=>x.id!==id);}
}
export class EntitlementService{
 constructor({verifyApple,verifyGoogle}={}){this.verifyApple=verifyApple;this.verifyGoogle=verifyGoogle;this.entitlements=new Map();}
 async verify({playerId,provider,receipt}){const fn=provider==='apple'?this.verifyApple:provider==='google'?this.verifyGoogle:null;if(!fn)throw new Error('Store verifier not configured');const result=await fn(receipt);if(!result?.valid||!result.productId)throw Object.assign(new Error('Invalid store transaction'),{status:400});const key=provider+':'+result.transactionId;if([...this.entitlements.values()].some(x=>x.key===key&&x.playerId!==playerId))throw Object.assign(new Error('Store transaction already owned'),{status:409});const e={key,playerId,provider,productId:result.productId,transactionId:result.transactionId,expiresAt:result.expiresAt||null};this.entitlements.set(key,e);return e;}
 forPlayer(id){return [...this.entitlements.values()].filter(x=>x.playerId===id);}
}

// v5.4 production policy primitives. They are deliberately dependency-free so the same rules can
// be exercised in CI, a container health controller, or an external orchestrator.
export class SLOMonitor{
 constructor({eventLoopP99Ms=180,errorRate=.005,reconnectRate=.03,inputTimeoutRate=.02,backpressureRate=.01,memoryRssBytes=768*1024*1024}={}){this.thresholds={eventLoopP99Ms,errorRate,reconnectRate,inputTimeoutRate,backpressureRate,memoryRssBytes};}
 evaluate(sample={}){const t=this.thresholds,checks={eventLoopP99Ms:Number(sample.eventLoopP99Ms||0)<=t.eventLoopP99Ms,errorRate:Number(sample.errorRate||0)<=t.errorRate,reconnectRate:Number(sample.reconnectRate||0)<=t.reconnectRate,inputTimeoutRate:Number(sample.inputTimeoutRate||0)<=t.inputTimeoutRate,backpressureRate:Number(sample.backpressureRate||0)<=t.backpressureRate,memoryRssBytes:Number(sample.memoryRssBytes||0)<=t.memoryRssBytes};const breaches=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);return{ok:breaches.length===0,checks,breaches,thresholds:{...t}};}
}
export class CapacityPlanner{
 constructor({playersPerWorker=100,workersPerNode=3,targetUtilization=.8,spareWorkers=1,maxWorkers=256}={}){if(!Number.isInteger(playersPerWorker)||playersPerWorker<10)throw new Error('playersPerWorker invalid');this.playersPerWorker=playersPerWorker;this.workersPerNode=workersPerNode;this.targetUtilization=targetUtilization;this.spareWorkers=spareWorkers;this.maxWorkers=maxWorkers;}
 plan(players){players=Math.max(0,Math.ceil(Number(players)||0));const safePerWorker=Math.max(1,Math.floor(this.playersPerWorker*this.targetUtilization));const active=Math.max(1,Math.ceil(players/safePerWorker)),workers=Math.min(this.maxWorkers,active+this.spareWorkers),nodes=Math.ceil(workers/this.workersPerNode);return{players,safePlayersPerWorker:safePerWorker,activeWorkers:active,workers,nodes,workersPerNode:this.workersPerNode,nominalCapacity:workers*this.playersPerWorker,safeCapacity:workers*safePerWorker,headroomPlayers:workers*safePerWorker-players};}
 decide({players=0,workers=1,eventLoopP99Ms=0,errorRate=0,backpressureRate=0}={}){const desired=this.plan(players).workers,pressure=eventLoopP99Ms>180||errorRate>.005||backpressureRate>.01;if(pressure||workers<desired)return{action:'scale-out',targetWorkers:Math.min(this.maxWorkers,Math.max(desired,workers+1))};if(workers>desired+1)return{action:'scale-in',targetWorkers:Math.max(1,desired)};return{action:'hold',targetWorkers:workers};}
}
export class CanaryController{
 constructor({stages=[1,5,25,50,100],requiredHealthyWindows=3}={}){this.stages=stages;this.requiredHealthyWindows=requiredHealthyWindows;this.index=0;this.healthy=0;this.rolledBack=false;}
 get percent(){return this.rolledBack?0:this.stages[this.index];}
 observe(slo){if(this.rolledBack)return{action:'rollback',percent:0};if(!slo?.ok){this.rolledBack=true;this.healthy=0;return{action:'rollback',percent:0,breaches:slo?.breaches||[]};}this.healthy++;if(this.healthy>=this.requiredHealthyWindows&&this.index<this.stages.length-1){this.healthy=0;this.index++;return{action:'promote',percent:this.percent};}return{action:this.index===this.stages.length-1?'complete':'hold',percent:this.percent};}
}
export class DrainCoordinator{
 constructor({now=()=>Date.now(),timeoutMs=45000}={}){this.now=now;this.timeoutMs=timeoutMs;this.nodes=new Map();}
 begin(nodeId,sessions){const row={nodeId,state:'draining',startedAt:this.now(),deadline:this.now()+this.timeoutMs,sessions:Math.max(0,Number(sessions)||0)};this.nodes.set(nodeId,row);return{...row};}
 update(nodeId,sessions){const row=this.nodes.get(nodeId);if(!row)throw new Error('Unknown drain');row.sessions=Math.max(0,Number(sessions)||0);if(row.sessions===0)row.state='ready';else if(this.now()>=row.deadline)row.state='deadline';return{...row};}
 canTerminate(nodeId){const row=this.nodes.get(nodeId);return !!row&&(row.state==='ready'||row.state==='deadline');}
}
export class RecoveryPolicy{
 constructor({rpoMs=15*60*1000,rtoMs=15*60*1000}={}){this.rpoMs=rpoMs;this.rtoMs=rtoMs;}
 evaluate({lastBackupAt=0,restoreDurationMs=Infinity,integrity=false,offsite=false,now=Date.now()}={}){const checks={integrity:integrity===true,offsite:offsite===true,rpo:now-lastBackupAt<=this.rpoMs,rto:restoreDurationMs<=this.rtoMs};const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);return{ok:failures.length===0,checks,failures,rpoMs:this.rpoMs,rtoMs:this.rtoMs};}
}
export class AlertPolicy{
 constructor({consecutiveWindows=2}={}){this.consecutiveWindows=Math.max(1,Math.floor(consecutiveWindows));this.bad=0;}
 observe(slo){if(slo?.ok){this.bad=0;return{alert:false,severity:'ok',breaches:[]};}this.bad++;return{alert:this.bad>=this.consecutiveWindows,severity:this.bad>=this.consecutiveWindows?'page':'warn',breaches:slo?.breaches||[],badWindows:this.bad};}
}

// v5.4 evidence-driven production certification. External systems are never treated as healthy
// merely because a local build passed; publishers must attach recent, machine-readable evidence.
export const RELEASE_EVIDENCE_SCHEMA_VERSION=1;
export function validateEnduranceSoakEvidence(value,{minHours=6,minTargets=14,minClients=84,maxP99Ms=180}={}){
 const report=value?.report||{};
 const startedAt=Date.parse(report.startedAt||''),finishedAt=Date.parse(report.finishedAt||'');
 const rows=Array.isArray(report.rows)?report.rows:[],targets=Array.isArray(report.targets)?report.targets:[];
 const clientsPerTarget=Number(report.clientsPerTarget||0),totalClients=Number(report.totalClients||0),connected=Number(report.connected||0);
 const seconds=Number(report.seconds||0),sloMs=Number(report.sloMs||0),maxObservedP99Ms=Number(report.maxP99Ms);
 const elapsedMs=Number.isFinite(startedAt)&&Number.isFinite(finishedAt)?finishedAt-startedAt:NaN,minElapsedMs=minHours*60*60*1000;
 const rowHealthy=row=>{
  const targetP99=Number(row?.p99Ms||0),client=row?.clientReport,active=row?.targetReadiness,post=row?.postCleanupReadiness;
  return row?.status==='passed'&&client?.status==='passed'&&Number(client?.connected||0)===clientsPerTarget&&active?.ok===true&&active?.body?.ready===true&&(targetP99===0||targetP99<=maxP99Ms)&&post?.ok===true&&post?.body?.ready===true&&post?.body?.storageHealthy===true&&post?.body?.stateBackendHealthy===true;
 };
 const checks={
  markedPassed:value?.passed===true&&report.status==='passed',
  declaredHours:Number(value?.hours||0)>=minHours,
  elapsed:Number.isFinite(elapsedMs)&&elapsedMs>=minElapsedMs,
  activeSeconds:Number.isFinite(seconds)&&seconds>=minHours*60*60,
  targetCount:targets.length>=minTargets&&rows.length===targets.length,
  clientCount:Number.isInteger(totalClients)&&totalClients>=minClients&&clientsPerTarget>=1&&clientsPerTarget*targets.length===totalClients,
  allClientsConnected:connected===totalClients,
  p99:Number.isFinite(maxObservedP99Ms)&&maxObservedP99Ms<=maxP99Ms&&sloMs>0&&sloMs<=maxP99Ms,
  everyTargetHealthy:rows.length>=minTargets&&rows.every(rowHealthy)
 };
 const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
 return{ok:failures.length===0,checks,failures,elapsedMs:Number.isFinite(elapsedMs)?elapsedMs:null,minElapsedMs,minTargets,minClients,maxP99Ms};
}
export class ReleaseEvidenceGate{
 constructor({now=()=>Date.now(),maxAgeMs=30*24*60*60*1000}={}){this.now=now;this.maxAgeMs=maxAgeMs;}
 evaluate(evidence={}){
  const recent=value=>{const at=Date.parse(value?.at||'');return value?.passed===true&&Number.isFinite(at)&&this.now()-at<=this.maxAgeMs&&at<=this.now()+5*60*1000;};
  const count=(value,min)=>recent(value)&&Number(value?.count||0)>=min;
  const checks={
   distributedStateBackend:recent(evidence.distributedStateBackend),
   multiNode1000:recent(evidence.multiNode1000)&&Number(evidence.multiNode1000?.players||0)>=1000&&(Number(evidence.multiNode1000?.nodes||0)>=5||Number(evidence.multiNode1000?.workers||0)>=14),
   chaosAt1000:recent(evidence.chaosAt1000)&&Number(evidence.chaosAt1000?.players||0)>=1000,
   soak6h:recent(evidence.soak)&&validateEnduranceSoakEvidence(evidence.soak).ok,
   productionInfrastructure:recent(evidence.productionInfrastructure),
   offsiteRestore:recent(evidence.offsiteRestore),
   ddosEdgeProtection:recent(evidence.ddosEdgeProtection),
   monitoringAlerts:recent(evidence.monitoringAlerts),
   adminOperations:recent(evidence.adminOperations),
   externalSecurityReview:recent(evidence.externalSecurityReview),
   iosDevices:count(evidence.iosDevices,3),
   androidDevices:count(evidence.androidDevices,5),
   signedAndroidAab:recent(evidence.signedAndroidAab),
   signedIosArchive:recent(evidence.signedIosArchive),
   storeAccounts:recent(evidence.storeAccounts),
   pushProduction:evidence.pushEnabled===false||recent(evidence.pushProduction),
   iapProduction:evidence.commerceEnabled===false||recent(evidence.iapProduction),
   iapSandbox:evidence.commerceEnabled===false||recent(evidence.iapSandbox),
   legalPages:recent(evidence.legalPages),
   privacyReview:recent(evidence.privacyReview),
   trademarkReview:recent(evidence.trademarkReview),
   ageRatings:recent(evidence.ageRatings),
   closedBeta:count(evidence.closedBeta,20),
   crashAnrReview:recent(evidence.crashAnrReview)&&Number(evidence.crashAnrReview?.crashFreeRate||0)>=.99,
   economyBalanceReview:recent(evidence.economyBalanceReview),
   liveOpsContent:recent(evidence.liveOpsContent),
   supportModeration:recent(evidence.supportModeration),
   canaryObserved:recent(evidence.canaryObserved),
   futureCapacityBenchmarks:recent(evidence.futureCapacityBenchmarks)&&[2000,5000,10000].every(n=>evidence.futureCapacityBenchmarks?.tiers?.includes(n)),
   rcFrozen:recent(evidence.rcFrozen)
  };
  const pending=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
  return{ok:pending.length===0,schemaVersion:RELEASE_EVIDENCE_SCHEMA_VERSION,checks,pending,maxEvidenceAgeDays:Math.floor(this.maxAgeMs/86400000)};
 }
}
export class EconomyHealthPolicy{
 constructor({maxSourceSinkRatio=1.25,maxDailyInflation=.08,maxDuplicateReceipts=0}={}){this.maxSourceSinkRatio=maxSourceSinkRatio;this.maxDailyInflation=maxDailyInflation;this.maxDuplicateReceipts=maxDuplicateReceipts;}
 evaluate({sources=0,sinks=0,supplyBefore=0,supplyAfter=0,duplicateReceipts=0}={}){const sourceSinkRatio=sinks>0?sources/sinks:(sources>0?Infinity:0),inflation=supplyBefore>0?(supplyAfter-supplyBefore)/supplyBefore:0;const checks={sourceSinkRatio:sourceSinkRatio<=this.maxSourceSinkRatio,dailyInflation:inflation<=this.maxDailyInflation,duplicateReceipts:Number(duplicateReceipts)<=this.maxDuplicateReceipts};const breaches=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);return{ok:breaches.length===0,checks,breaches,metrics:{sourceSinkRatio,inflation,duplicateReceipts:Number(duplicateReceipts)||0}};}
}
export class DeviceMatrixPolicy{
 constructor(){this.requiredIos=new Set(['wifi','cellular','wifi-to-cellular','suspend-resume','cold-relaunch']);this.requiredAndroid=new Set(['wifi','cellular','wifi-to-cellular','suspend-resume','cold-relaunch','low-memory']);}
 evaluate({ios=[],android=[]}={}){const scenarios=(rows,set)=>new Set(rows.flatMap(r=>r?.passed===true&&Array.isArray(r.scenarios)?r.scenarios:[])).size>=set.size&&[...set].every(x=>rows.some(r=>r?.passed===true&&r.scenarios?.includes(x)));const checks={iosDevices:ios.filter(x=>x?.passed===true).length>=3,androidDevices:android.filter(x=>x?.passed===true).length>=5,iosScenarios:scenarios(ios,this.requiredIos),androidScenarios:scenarios(android,this.requiredAndroid)};return{ok:Object.values(checks).every(Boolean),checks};}
}
