#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Isolated GameServer worker used by production-like load tests. No simulated clients run here.
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {createGameServer} from '../server/server.mjs';
const clients=Number(process.env.WORKER_CAPACITY||256),tmp=mkdtempSync(join(tmpdir(),'nyrathen-game-worker-'));
const app=createGameServer({dataPath:join(tmp,'cache.sqlite'),backupSeconds:900,maxRooms:64,maxPlayers:512,maxSessions:Math.max(512,clients+64),sessionRateLimit:10000,stateAuthorityUrl:process.env.STATE_AUTHORITY_URL,stateAuthoritySecret:process.env.STATE_AUTHORITY_SECRET,nodeId:process.env.GAME_NODE_ID,worldNamespace:process.env.STATE_WORLD_NAMESPACE});
const loop=monitorEventLoopDelay({resolution:10});loop.enable();
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
console.log('NYR_SERVER_READY '+JSON.stringify({port:app.server.address().port,nodeId:app.nodeId}));
let stopping=false;
async function stop(){if(stopping)return;stopping=true;const ready=app.readiness(),report={nodeId:app.nodeId,eventLoopMs:{p50:+(loop.percentile(50)/1e6).toFixed(2),p95:+(loop.percentile(95)/1e6).toFixed(2),p99:+(loop.percentile(99)/1e6).toFixed(2),max:+(loop.max/1e6).toFixed(2)},rss:process.memoryUsage().rss,transport:{...app.transport},observability:{...app.observability},readiness:ready};await app.close();loop.disable();rmSync(tmp,{recursive:true,force:true});console.log('NYR_SERVER_REPORT '+JSON.stringify(report));process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
