#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Minimal Railway entrypoint used by staging/production-like certification nodes.
import {once} from 'node:events';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createGameServer} from '../server/server.mjs';
import {createStateAuthority} from '../server/state-authority.mjs';

const role=String(process.env.NYRATHEN_ROLE||'').trim().toLowerCase();
const host='0.0.0.0';
const port=Number(process.env.PORT||process.env.NYRATHEN_PORT||0);
const workersPerNode=Math.max(1,Math.min(8,Number(process.env.GAME_WORKERS_PER_NODE||1)||1));
if(role==='game'&&workersPerNode>1){
  if(!Number.isInteger(port)||port<1||port+workersPerNode-1>65535)throw new Error('PORT/GAME_WORKERS_PER_NODE invalid');
  const entry=fileURLToPath(import.meta.url);
  const baseNodeId=String(process.env.GAME_NODE_ID||`railway-${process.env.RAILWAY_SERVICE_ID||'game'}-${process.env.RAILWAY_REPLICA_ID||process.env.HOSTNAME||'single'}`);
  const baseNamespace=String(process.env.STATE_WORLD_NAMESPACE||baseNodeId);
  const children=[];let supervisorClosing=false;
  function launch(index){
    const child=spawn(process.execPath,[entry],{env:{...process.env,NYRATHEN_ROLE:'game',GAME_WORKERS_PER_NODE:'1',PORT:String(port+index),GAME_NODE_ID:`${baseNodeId}-w${index}`,STATE_WORLD_NAMESPACE:`${baseNamespace}-w${index}`,MAX_SESSIONS:String(process.env.MAX_SESSIONS_PER_WORKER||process.env.MAX_SESSIONS||128),MAX_PLAYERS:String(process.env.MAX_PLAYERS_PER_WORKER||process.env.MAX_PLAYERS||192),MAX_ROOMS:String(process.env.MAX_ROOMS_PER_WORKER||process.env.MAX_ROOMS||32)},stdio:'inherit'});
    children.push(child);
    child.once('exit',(code,signal)=>{if(supervisorClosing)return;supervisorClosing=true;console.error(JSON.stringify({event:'nyrathen.worker-exit',index,code,signal}));for(const peer of children)if(peer!==child&&!peer.killed)peer.kill('SIGTERM');setTimeout(()=>process.exit(code||1),100).unref();});
  }
  for(let i=0;i<workersPerNode;i++)launch(i);
  console.log(JSON.stringify({event:'nyrathen.game-supervisor',workers:workersPerNode,basePort:port,baseNodeId,serviceId:process.env.RAILWAY_SERVICE_ID||null}));
  const stop=signal=>{if(supervisorClosing)return;supervisorClosing=true;console.log(JSON.stringify({event:'nyrathen.supervisor-shutdown',signal,workers:workersPerNode}));for(const child of children)if(!child.killed)child.kill('SIGTERM');setTimeout(()=>process.exit(0),1500).unref();};
  process.on('SIGTERM',()=>stop('SIGTERM'));process.on('SIGINT',()=>stop('SIGINT'));
  await new Promise(()=>{});
}
if(role==='load'){
  await import('./railway-load-runner.mjs');
  await new Promise(()=>{});
}
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT required');
let app;
if(role==='state'){
  app=createStateAuthority({
    dataPath:process.env.STATE_AUTHORITY_DATA_PATH||'/tmp/nyrathen-state.sqlite',
    secret:process.env.STATE_AUTHORITY_SECRET,
    nodeDeadMs:Number(process.env.STATE_NODE_DEAD_MS||2500),
    leaseTtlMs:Number(process.env.STATE_LEASE_TTL_MS||10000),
    backupDirectory:process.env.STATE_AUTHORITY_BACKUP_DIRECTORY||undefined,
    backupRetain:Number(process.env.STATE_AUTHORITY_BACKUP_RETAIN||2)
  });
}else if(role==='game'){
  const nodeId=String(process.env.GAME_NODE_ID||`railway-${process.env.RAILWAY_SERVICE_ID||'game'}-${process.env.RAILWAY_REPLICA_ID||process.env.HOSTNAME||'single'}`);
  app=createGameServer({
    dataPath:process.env.GAME_CACHE_PATH||`/tmp/${nodeId.replace(/[^A-Za-z0-9_-]/g,'_')}.sqlite`,
    maxRooms:Number(process.env.MAX_ROOMS||64),
    maxPlayers:Number(process.env.MAX_PLAYERS||512),
    maxSessions:Number(process.env.MAX_SESSIONS||320),
    sessionRateLimit:Number(process.env.SESSION_RATE_LIMIT||10000),
    backupSeconds:Number(process.env.BACKUP_SECONDS||900),
    stateAuthorityUrl:process.env.STATE_AUTHORITY_URL,
    stateAuthoritySecret:process.env.STATE_AUTHORITY_SECRET,
    nodeId,
    worldNamespace:process.env.STATE_WORLD_NAMESPACE||nodeId
  });
}else throw new Error('NYRATHEN_ROLE must be state, game or load');

app.server.listen(port,host);
await once(app.server,'listening');
console.log(JSON.stringify({event:'nyrathen.ready',role,port,nodeId:app.nodeId||null,serviceId:process.env.RAILWAY_SERVICE_ID||null}));
let closing=false;
async function stop(signal){if(closing)return;closing=true;console.log(JSON.stringify({event:'nyrathen.shutdown',role,signal}));try{await app.close();}finally{process.exit(0);}}
process.on('SIGTERM',()=>void stop('SIGTERM'));
process.on('SIGINT',()=>void stop('SIGINT'));
