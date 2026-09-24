// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {ReleaseEvidenceGate,EconomyHealthPolicy,DeviceMatrixPolicy} from '../server/production.mjs';
import {nativeEnvironment,missingFor} from '../tools/native-environment.mjs';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const certifiedSoak=finishedAt=>{
 const finished=Date.parse(finishedAt),startedAt=new Date(finished-6*60*60*1000).toISOString(),targets=Array.from({length:14},(_,i)=>`http://worker-${i+1}.internal:3000`),clientsPerTarget=6;
 const readiness={ok:true,body:{ready:true,storageHealthy:true,stateBackendHealthy:true}};
 const rows=targets.map((baseUrl,index)=>({index,baseUrl,status:'passed',p99Ms:120,clientReport:{status:'passed',connected:clientsPerTarget},targetReadiness:readiness,postCleanupReadiness:readiness}));
 return{passed:true,at:finishedAt,hours:6,report:{status:'passed',startedAt,finishedAt,targets,clientsPerTarget,totalClients:84,connected:84,seconds:21600,sloMs:180,maxP99Ms:120,rows}};
};

test('v5.6 release identifiers are synchronized',()=>{
 assert.equal(JSON.parse(text('package.json')).version,'5.7.0');
 assert.match(text('native/android/app/build.gradle'),/compileSdk 36/);assert.match(text('native/android/app/build.gradle'),/targetSdk 36/);assert.match(text('native/android/app/build.gradle'),/versionCode 57/);assert.match(text('native/android/app/build.gradle'),/versionName '5\.7\.0'/);
 assert.match(text('native/ios/Nyrathen.xcodeproj/project.pbxproj'),/CURRENT_PROJECT_VERSION = 57/);assert.match(text('native/ios/Nyrathen.xcodeproj/project.pbxproj'),/MARKETING_VERSION = 5\.7\.0/);
});

test('v5.5 release evidence is fail-closed and rejects stale evidence',()=>{
 let now=Date.parse('2026-09-22T20:00:00Z');const gate=new ReleaseEvidenceGate({now:()=>now,maxAgeMs:86400000});assert.equal(gate.evaluate({}).ok,false);
 const recent={passed:true,at:'2026-09-22T19:00:00Z'},e={commerceEnabled:false,distributedStateBackend:recent,multiNode1000:{...recent,players:1000,nodes:5},chaosAt1000:{...recent,players:1000},soak:certifiedSoak(recent.at),productionInfrastructure:recent,offsiteRestore:recent,ddosEdgeProtection:recent,monitoringAlerts:recent,adminOperations:recent,externalSecurityReview:recent,iosDevices:{...recent,count:3},androidDevices:{...recent,count:5},signedAndroidAab:recent,signedIosArchive:recent,storeAccounts:recent,pushProduction:recent,legalPages:recent,privacyReview:recent,trademarkReview:recent,ageRatings:recent,closedBeta:{...recent,count:20},crashAnrReview:{...recent,crashFreeRate:.995},economyBalanceReview:recent,liveOpsContent:recent,supportModeration:recent,canaryObserved:recent,futureCapacityBenchmarks:{...recent,tiers:[2000,5000,10000]},rcFrozen:recent};
 assert.equal(gate.evaluate(e).ok,true);e.signedAndroidAab={passed:true,at:'2026-09-19T00:00:00Z'};assert.equal(gate.evaluate(e).checks.signedAndroidAab,false);
});

test('v5.7 release evidence does not require push-provider proof when push is disabled',()=>{
 const recent={passed:true,at:new Date().toISOString()},gate=new ReleaseEvidenceGate(),base={commerceEnabled:false,pushEnabled:false,distributedStateBackend:recent,multiNode1000:{...recent,players:1000,workers:14},chaosAt1000:{...recent,players:1000},soak:certifiedSoak(recent.at),productionInfrastructure:recent,offsiteRestore:recent,ddosEdgeProtection:recent,monitoringAlerts:recent,adminOperations:recent,externalSecurityReview:recent,iosDevices:{...recent,count:3},androidDevices:{...recent,count:5},signedAndroidAab:recent,signedIosArchive:recent,storeAccounts:recent,pushProduction:{passed:false,at:null},legalPages:recent,privacyReview:recent,trademarkReview:recent,ageRatings:recent,closedBeta:{...recent,count:20},crashAnrReview:{...recent,crashFreeRate:.995},economyBalanceReview:recent,liveOpsContent:recent,supportModeration:recent,canaryObserved:recent,futureCapacityBenchmarks:{...recent,tiers:[2000,5000,10000]},rcFrozen:recent};
 assert.equal(gate.evaluate(base).checks.pushProduction,true);
 assert.equal(gate.evaluate({...base,pushEnabled:true}).checks.pushProduction,false);
});

test('v5.5 economy health policy detects inflation and duplicate receipts',()=>{
 const p=new EconomyHealthPolicy();assert.equal(p.evaluate({sources:100,sinks:90,supplyBefore:1000,supplyAfter:1050,duplicateReceipts:0}).ok,true);const bad=p.evaluate({sources:200,sinks:10,supplyBefore:1000,supplyAfter:1500,duplicateReceipts:1});assert.equal(bad.ok,false);assert.deepEqual(new Set(bad.breaches),new Set(['sourceSinkRatio','dailyInflation','duplicateReceipts']));
});

test('v5.5 physical device matrix requires enough devices and network lifecycle scenarios',()=>{
 const p=new DeviceMatrixPolicy(),iosSc=['wifi','cellular','wifi-to-cellular','suspend-resume','cold-relaunch'],andSc=[...iosSc,'low-memory'];
 assert.equal(p.evaluate({ios:[1,2,3].map(i=>({passed:true,scenarios:iosSc,model:'i'+i})),android:[1,2,3,4,5].map(i=>({passed:true,scenarios:andSc,model:'a'+i}))}).ok,true);
 assert.equal(p.evaluate({ios:[{passed:true,scenarios:['wifi']}],android:[]}).ok,false);
});

test('v5.5 iOS archive requires Xcode 26 or newer',()=>{
 const base={env:{NYRATHEN_DEVELOPMENT_TEAM:'TEAM'},platform:'darwin',root:'/workspace',exists:()=>false,read:()=>'',probe:()=>true};const old=nativeEnvironment({...base,versionProbe:()=>25});assert(missingFor('ios-archive',old).includes('Xcode 26+ / iOS 26 SDK'));const current=nativeEnvironment({...base,versionProbe:()=>26});assert.equal(missingFor('ios-archive',current).length,0);
});

test('v5.5 store policy preflight is machine checked',()=>{
 const r=spawnSync(process.execPath,['tools/store-policy-preflight.mjs'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);assert.equal(out.ok,true);assert.equal(out.checks.androidTarget36,true);assert.equal(out.checks.xcode26Gate,true);
});

test('v5.5 Kubernetes reference encodes 1k tier, rollout safety and autoscaling ceiling',()=>{
 assert.equal(existsSync(new URL('../deploy/kubernetes/game-deployment.yaml',import.meta.url)),true);const d=text('deploy/kubernetes/game-deployment.yaml'),s=text('deploy/kubernetes/service-hpa-pdb.yaml');assert.match(d,/replicas: 14/);assert.match(d,/topologySpreadConstraints/);assert.match(d,/readinessProbe/);assert.match(d,/terminationGracePeriodSeconds: 60/);assert.match(s,/kind: PodDisruptionBudget/);assert.match(s,/minReplicas: 14/);assert.match(s,/maxReplicas: 126/);
});

test('v5.5 liveops launch seed remains original Nyrathen content',()=>{
 const live=JSON.parse(text('liveops/season-01.json'));assert.equal(live.id,'emberwatch-01');assert.equal(live.rewardTrackLevels,30);assert(!/Realm of the Mad God|RotMG|DECA|Oryx/i.test(JSON.stringify(live)));
});

test('v5.5 external evidence strict mode blocks a release without real-world evidence',()=>{
 const r=spawnSync(process.execPath,['tools/release-evidence.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,REQUIRE_EXTERNAL_EVIDENCE:'true'},encoding:'utf8'});assert.equal(r.status,1);const out=JSON.parse(r.stdout);assert.equal(out.ok,false);assert.equal(out.checks.multiNode1000,true);assert(out.pending.includes('iosDevices'));assert(out.pending.includes('soak6h'));
});



test('v5.5 multi-node production preflight rejects per-worker SQLite state',()=>{
 const env={...process.env,NYRATHEN_DOMAIN:'api.nyrathen.example',ACME_EMAIL:'ops@nyrathen.example',METRICS_TOKEN:'m'.repeat(40),LIVEOPS_SIGNING_SECRET:'l'.repeat(40),CLUSTER_SHARED_SECRET:'c'.repeat(40),RESUME_TICKET_SECRET:'r'.repeat(40),BACKUP_TARGET:'/primary/nyrathen',OFFSITE_BACKUP_TARGET:'s3://offsite/nyrathen',ALERT_TARGET:'ops',EXPECTED_CONCURRENT_PLAYERS:'1000',GAME_WORKERS:'14',LOGICAL_NODES:'5',DEPLOYMENT_MODE:'multi-node',GAME_ROUTING_MODE:'dedicated-endpoints',PUBLIC_SERVER_URLS:'https://g1.nyrathen.example,https://g2.nyrathen.example',STATE_BACKEND_MODE:'local-sqlite',DISTRIBUTED_STATE_EVIDENCE:'not-applicable',NYRATHEN_COMMERCE:'off',NYRATHEN_PUSH:'off'};
 const r=spawnSync(process.execPath,['tools/production-preflight.mjs'],{cwd:new URL('../',import.meta.url),env,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/extern zertifizierten gemeinsamen Account-\/State-Backend/);
});



test('v5.5 empty leaderboard results stay cached instead of rescanning SQLite per snapshot',()=>{
 const src=text('server/server.mjs');assert.match(src,/leaderboardCache=null/);assert.match(src,/leaderboardCache===null/);assert.doesNotMatch(src,/if\(now-leaderboardCacheAt>=15000\|\|!leaderboardCache\.length\)/);
});

test('v5.5 long-soak tooling supports 24h and hard SLO resource gates',()=>{
 const stress=text('tools/stress-node.mjs'),soak=text('tools/soak-certify.mjs'),pkg=JSON.parse(text('package.json'));assert.match(stress,/seconds>86400/);assert.match(stress,/STRESS_P99_SLO_MS/);assert.match(stress,/STRESS_MAX_RSS_MB/);assert.match(soak,/SOAK_HOURS 1–24/);assert.equal(pkg.scripts['test:soak-long'],'node tools/soak-certify.mjs');
});

test('v5.5 release package contains operational, beta and support runbooks',()=>{
 for(const f of ['docs/RELEASE-GATES-v5.4.md','docs/BETA-DEVICE-MATRIX-v5.4.md','docs/PRODUCTION-RUNBOOK-v5.4.md','docs/SUPPORT-MODERATION-RUNBOOK-v5.4.md','docs/STORE-2026-REQUIREMENTS.md','release/external-evidence.example.json'])assert.equal(existsSync(new URL('../'+f,import.meta.url)),true,f);
});

test('v5.5 mobile build embeds explicit failover endpoint list',()=>{
 const build=text('tools/build.mjs'),html=text('client/index.html'),main=text('client/main.mjs');
 assert.match(build,/PUBLIC_SERVER_URLS/);assert.match(html,/nyrathen-public-servers/);assert.match(main,/advertisedServers/);assert.match(main,/bases:advertisedServers/);
});

test('v5.5 Railway entry derives unique node id from replica identity when needed',()=>{
 const src=text('tools/railway-entry.mjs');assert.match(src,/RAILWAY_REPLICA_ID/);assert.match(src,/HOSTNAME/);
});

test('v5.5 production preflight rejects random replica pool routing without session affinity',()=>{
 const env={...process.env,NYRATHEN_DOMAIN:'api.nyrathen.example',ACME_EMAIL:'ops@nyrathen.example',METRICS_TOKEN:'m'.repeat(40),LIVEOPS_SIGNING_SECRET:'l'.repeat(40),CLUSTER_SHARED_SECRET:'c'.repeat(40),RESUME_TICKET_SECRET:'r'.repeat(40),BACKUP_TARGET:'/primary/nyrathen',OFFSITE_BACKUP_TARGET:'s3://offsite/nyrathen',ALERT_TARGET:'ops',EXPECTED_CONCURRENT_PLAYERS:'1000',GAME_WORKERS:'14',LOGICAL_NODES:'5',DEPLOYMENT_MODE:'multi-node',GAME_ROUTING_MODE:'random-replicas',STATE_BACKEND_MODE:'external-certified',DISTRIBUTED_STATE_EVIDENCE:'staging-certified',NYRATHEN_COMMERCE:'off',NYRATHEN_PUSH:'off'};
 const r=spawnSync(process.execPath,['tools/production-preflight.mjs'],{cwd:new URL('../',import.meta.url),env,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/GAME_ROUTING_MODE/);
});


test('v5.5 capacity evidence tool accepts fresh Railway staging evidence',()=>{
 const r=spawnSync(process.execPath,['tools/capacity-evidence.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,CAPACITY_EVIDENCE_REQUIRE_EXTERNAL:'true'},encoding:'utf8'});assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);assert.equal(out.ok,true);assert.equal(out.source,'external-staging');assert(out.players>=300);assert(out.p99Ms<=180);
});
