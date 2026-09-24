import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('stress evidence snapshots failure arrays before cleanup closes streams',()=>{
 const s=readFileSync(new URL('../tools/stress-client-only.mjs',import.meta.url),'utf8');
 assert.match(s,/failures:\[\.\.\.failures\]/);
 assert.doesNotMatch(s,/minFrames:[^}]*,failures,totalSeconds/);
});

test('v5.6 native identifiers are synchronized',()=>{
 const android=readFileSync(new URL('../native/android/app/build.gradle',import.meta.url),'utf8');
 const ios=readFileSync(new URL('../native/ios/Nyrathen.xcodeproj/project.pbxproj',import.meta.url),'utf8');
 assert.match(android,/versionCode 57/);assert.match(android,/versionName '5\.7\.0'/);
 assert.match(ios,/CURRENT_PROJECT_VERSION = 57/);assert.match(ios,/MARKETING_VERSION = 5\.7\.0/);
});

test('Railway load runner exposes health before long certification finishes',()=>{
 const s=readFileSync(new URL('../tools/railway-load-runner.mjs',import.meta.url),'utf8');
 const listen=s.indexOf("server.listen(port,'0.0.0.0')");
 const run=s.indexOf("run().catch");
 assert(listen>=0&&run>listen);
 assert.match(s,/path==='\/healthz'.*writeHead\(200/s);
});

test('state authority records sanitized internal failures for operations evidence',()=>{
 const s=readFileSync(new URL('../server/state-authority.mjs',import.meta.url),'utf8');
 assert.match(s,/internalErrors/);assert.match(s,/lastInternalError/);assert.match(s,/state-authority-internal-error/);
 assert.doesNotMatch(s,/console\.error\([^\n]*token/);
});

test('stress runs isolate persistent worlds and drain in-flight batches before cleanup',()=>{
 const s=readFileSync(new URL('../tools/stress-client-only.mjs',import.meta.url),'utf8');
 assert.match(s,/const runTag=randomUUID\(\)/);assert.match(s,/roomName=i=>`L\$\{runTag\}/);
 assert.match(s,/Promise\.allSettled/);assert.doesNotMatch(s,/room:'LOAD'/);
});

test('v5.6 Railway game services can supervise multiple isolated worker event loops per node',()=>{
  const src=readFileSync('tools/railway-entry.mjs','utf8');
  assert.match(src,/GAME_WORKERS_PER_NODE/);
  assert.match(src,/MAX_SESSIONS_PER_WORKER/);
  assert.match(src,/STATE_WORLD_NAMESPACE:`\$\{baseNamespace\}-w\$\{index\}`/);
  assert.match(src,/PORT:String\(port\+index\)/);
  assert.match(src,/nyrathen\.game-supervisor/);
});

test('v5.6 active-player certification separates login ramp from steady-state concurrency',()=>{
  const src=readFileSync('tools/stress-client-only.mjs','utf8');
  assert.match(src,/STRESS_SESSION_BATCH/);
  assert.match(src,/STRESS_RAMP_MS/);
  assert.match(src,/rampedBatch\(roster,sessionBatch,sessionRampMs/);
  assert.match(src,/inputTimer=setInterval/);
});

test('v5.6 Railway active-load harness staggers worker login waves but synchronizes steady-state activity',()=>{
  const runner=readFileSync('tools/railway-load-runner.mjs','utf8');
  const client=readFileSync('tools/stress-client-only.mjs','utf8');
  assert.match(runner,/STRESS_TARGET_RAMP_MS/);
  assert.match(runner,/STRESS_ACTIVE_AT_MS/);
  assert.match(runner,/startDelayMs=targets\.length>1/);
  assert.match(client,/STRESS_START_DELAY_MS/);
  assert.match(client,/activeAtMs>setupFinishedAt/);
  assert.match(client,/activeLateByMs/);
});

test('v5.6 central guest batching keeps profile preparation outside the SQLite transaction',()=>{
  const store=readFileSync('server/store.mjs','utf8');
  const authority=readFileSync('server/state-authority.mjs','utf8');
  assert.match(store,/prepareCreate\(name,classId\)/);
  assert.match(store,/this\._insertPlayer/);
  assert.match(authority,/const prepared=batch\.map/);
  assert.ok(authority.indexOf('const prepared=batch.map') < authority.indexOf('store.transaction(()=>prepared.map'));
});

test('v5.6 GameServer coalesces guest-login RPC fanout before the central authority',()=>{
  const client=readFileSync('server/state-client.mjs','utf8');
  const authority=readFileSync('server/state-authority.mjs','utf8');
  assert.match(client,/session\.openBatch/);
  assert.match(client,/guestOpenQueue/);
  assert.match(client,/guestOpenBatchMax/);
  assert.match(authority,/'session\.openBatch'/);
});
