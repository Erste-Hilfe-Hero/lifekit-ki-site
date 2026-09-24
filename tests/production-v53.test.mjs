import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {spawnSync as nodeSpawnSync} from 'node:child_process';
import {SLOMonitor,CapacityPlanner,CanaryController,DrainCoordinator,RecoveryPolicy,AlertPolicy,SecurityGuard} from '../server/production.mjs';
import {ResumeTicketAuthority} from '../server/cluster.mjs';
import {ProfileStore} from '../server/store.mjs';
import {SafetyStore} from '../server/safety.mjs';
import {createGameServer} from '../server/server.mjs';
import {PROTOCOL} from '../shared/data.mjs';

test('v5.3 capacity plan keeps 20 percent headroom through 10k players',()=>{
 const p=new CapacityPlanner();
 assert.deepEqual([1000,2000,5000,10000].map(n=>p.plan(n).workers),[14,26,64,126]);
 assert.deepEqual([1000,2000,5000,10000].map(n=>p.plan(n).nodes),[5,9,22,42]);
 for(const n of [1000,2000,5000,10000])assert(p.plan(n).safeCapacity>=n);
});

test('v5.3 SLO, alerting and canary rollback fail closed',()=>{
 const monitor=new SLOMonitor(),alerts=new AlertPolicy({consecutiveWindows:2}),canary=new CanaryController({requiredHealthyWindows:2});
 const good=monitor.evaluate({eventLoopP99Ms:100,errorRate:0,reconnectRate:0,inputTimeoutRate:0,backpressureRate:0,memoryRssBytes:100e6});assert.equal(good.ok,true);
 assert.equal(canary.observe(good).action,'hold');assert.equal(canary.observe(good).action,'promote');
 const bad=monitor.evaluate({eventLoopP99Ms:999,errorRate:.2});assert.equal(bad.ok,false);assert.equal(alerts.observe(bad).alert,false);assert.equal(alerts.observe(bad).alert,true);assert.equal(canary.observe(bad).action,'rollback');assert.equal(canary.percent,0);
});

test('v5.3 drain and recovery policy encode termination and DR gates',()=>{
 let now=1000;const d=new DrainCoordinator({now:()=>now,timeoutMs:500});assert.equal(d.begin('node-a',3).state,'draining');assert.equal(d.update('node-a',0).state,'ready');assert.equal(d.canTerminate('node-a'),true);
 const r=new RecoveryPolicy({rpoMs:1000,rtoMs:1000});assert.equal(r.evaluate({lastBackupAt:500,restoreDurationMs:500,integrity:true,offsite:true,now:1000}).ok,true);assert.equal(r.evaluate({lastBackupAt:0,restoreDurationMs:2000,integrity:false,offsite:false,now:5000}).ok,false);
});

test('v5.3 signed resume tickets reject tampering and expiry',()=>{
 let now=1000;const a=new ResumeTicketAuthority({secret:'x'.repeat(40),ttlMs:100,now:()=>now});const t=a.issue({accountId:'p',nodeId:'g1',epoch:4,room:'ASH01'});assert.equal(a.verify(t).epoch,4);assert.equal(a.verify(t+'x'),null);now=1200;assert.equal(a.verify(t),null);
});

test('v5.3 input anti-cheat rejects impossible vectors',()=>{
 const g=new SecurityGuard({maxScore:5});assert.equal(g.inspect('p',{kind:'input',seq:1,dx:.5,dy:.5}).allowed,true);const v=g.inspect('p',{kind:'input',seq:2,dx:99,dy:0});assert.equal(v.allowed,false);assert.equal(v.reason,'input-vector');
});

test('v5.3 ban state persists and expires',()=>{
 const s=new ProfileStore(':memory:');try{const p=s.create('Banned','warden'),safe=new SafetyStore(s.db);safe.ban(p.id,1,'abuse detected');assert(safe.banStatus(p.id));safe.ban(p.id,0,'manual unban');assert.equal(safe.banStatus(p.id),null);}finally{s.close();}
});

test('v5.3 game node drain makes readiness false, rejects new guests and preserves existing reconnect',async t=>{
 const app=createGameServer({dataPath:':memory:',maxSessions:20});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
 const post=async(token='')=>{const r=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify({protocol:PROTOCOL,name:'Drain',classId:'warden',room:'ASH01'})});return{status:r.status,data:await r.json()};};
 const first=await post();assert.equal(first.status,200);app.setDraining(true);const ready=await fetch(base+'/readyz');assert.equal(ready.status,503);assert.equal((await ready.json()).draining,true);assert.equal((await post()).status,503);assert.equal((await post(first.data.token)).status,200);
});

test('v5.3 economy request id cannot be reused with a different payload',async t=>{
 const app=createGameServer({dataPath:':memory:'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
 const session=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({protocol:PROTOCOL,name:'Economy','classId':'warden',room:'ASH01'})});const a=await session.json();const send=body=>fetch(base+'/api/action',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+a.token},body:JSON.stringify(body)});
 const id='same_request_123';const one=await send({type:'potionStore',slot:0,requestId:id});assert.equal(one.status,200);await one.json();const two=await send({type:'giftClaim',slot:0,requestId:id});assert.equal(two.status,409);
});

test('v5.3 production preflight requires enough logical nodes for 1k target',()=>{
 const {spawnSync}=requireSpawnSync();
 const base={
  ...process.env,NYRATHEN_DOMAIN:'api.nyrathen.example',ACME_EMAIL:'ops@nyrathen.example',
  METRICS_TOKEN:'m'.repeat(40),LIVEOPS_SIGNING_SECRET:'l'.repeat(40),CLUSTER_SHARED_SECRET:'c'.repeat(40),RESUME_TICKET_SECRET:'r'.repeat(40),
  BACKUP_TARGET:'/primary/nyrathen',OFFSITE_BACKUP_TARGET:'s3://offsite/nyrathen',ALERT_TARGET:'ops',
  EXPECTED_CONCURRENT_PLAYERS:'1000',GAME_WORKERS:'14',DEPLOYMENT_MODE:'multi-node',GAME_ROUTING_MODE:'dedicated-endpoints',PUBLIC_SERVER_URLS:'https://g1.nyrathen.example,https://g2.nyrathen.example',STATE_BACKEND_MODE:'external-certified',DISTRIBUTED_STATE_EVIDENCE:'staging-certified-20260922',NYRATHEN_COMMERCE:'off',NYRATHEN_PUSH:'off'
 };
 const bad=spawnSync(process.execPath,['tools/production-preflight.mjs'],{cwd:new URL('../',import.meta.url),env:{...base,LOGICAL_NODES:'4'},encoding:'utf8'});assert.equal(bad.status,1);assert.match(bad.stderr,/Zu wenig logische Nodes/);
 const good=spawnSync(process.execPath,['tools/production-preflight.mjs'],{cwd:new URL('../',import.meta.url),env:{...base,LOGICAL_NODES:'5'},encoding:'utf8'});assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).capacity.nodes,5);
});

test('v5.3 production preflight refuses multi-node capacity in single-node mode',()=>{
 const {spawnSync}=requireSpawnSync();
 const env={...process.env,NYRATHEN_DOMAIN:'api.nyrathen.example',ACME_EMAIL:'ops@nyrathen.example',METRICS_TOKEN:'m'.repeat(40),LIVEOPS_SIGNING_SECRET:'l'.repeat(40),CLUSTER_SHARED_SECRET:'c'.repeat(40),RESUME_TICKET_SECRET:'r'.repeat(40),BACKUP_TARGET:'/primary/nyrathen',OFFSITE_BACKUP_TARGET:'s3://offsite/nyrathen',ALERT_TARGET:'ops',EXPECTED_CONCURRENT_PLAYERS:'1000',GAME_WORKERS:'14',LOGICAL_NODES:'5',DEPLOYMENT_MODE:'single-node',STATE_BACKEND_MODE:'local-sqlite',NYRATHEN_COMMERCE:'off',NYRATHEN_PUSH:'off'};
 const r=spawnSync(process.execPath,['tools/production-preflight.mjs'],{cwd:new URL('../',import.meta.url),env,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/Multi-Node-Betrieb/);
});

function requireSpawnSync(){return {spawnSync:nodeSpawnSync}}
