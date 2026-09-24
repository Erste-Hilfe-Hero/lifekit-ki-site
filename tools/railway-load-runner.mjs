#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Persistent Railway certification runner: executes real client-only SSE load generators
// against one or more GameServers, verifies each target's readiness/SLO, then serves evidence.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const port=Number(process.env.PORT||3500);
const rawTargets=String(process.env.STRESS_TARGETS||process.env.STRESS_BASE_URL||'').trim();
const targets=rawTargets.split(',').map(x=>x.trim()).filter(Boolean);
const clientsPerTarget=Number(process.env.STRESS_CLIENTS_PER_TARGET||process.env.STRESS_CLIENTS||100);
const seconds=Number(process.env.STRESS_SECONDS||5);
const sloMs=Number(process.env.STRESS_P99_SLO_MS||180);
const targetRampMs=Math.max(0,Math.min(120000,Number(process.env.STRESS_TARGET_RAMP_MS||0))),sessionRampMs=Math.max(0,Math.min(120000,Number(process.env.STRESS_RAMP_MS||0))),setupGraceMs=Math.max(5000,Math.min(120000,Number(process.env.STRESS_SETUP_GRACE_MS||15000)));
const activeAtMs=Date.now()+targetRampMs+sessionRampMs+setupGraceMs;
if(!targets.length||targets.some(x=>!/^https?:\/\//.test(x)))throw new Error('STRESS_TARGETS/STRESS_BASE_URL must contain http(s) URL(s)');
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT invalid');
if(!Number.isInteger(clientsPerTarget)||clientsPerTarget<2||clientsPerTarget>1000)throw new Error('STRESS_CLIENTS_PER_TARGET invalid');
if(!Number.isFinite(sloMs)||sloMs<20||sloMs>5000)throw new Error('STRESS_P99_SLO_MS invalid');

const delay=ms=>new Promise(r=>setTimeout(r,ms));
const startedAt=new Date().toISOString();
let evidence={status:'running',startedAt,targets,clientsPerTarget,totalClients:clientsPerTarget*targets.length,seconds,sloMs,targetRampMs,sessionRampMs,setupGraceMs,activeAtMs};
const parseLastJson=text=>{for(const line of String(text||'').trim().split(/\r?\n/).reverse()){try{return JSON.parse(line);}catch{}}return null;};
async function readyz(baseUrl){try{const r=await fetch(new URL('/readyz',baseUrl),{signal:AbortSignal.timeout(5000)});let body={};try{body=await r.json();}catch{}return{status:r.status,ok:r.ok,body};}catch(error){return{status:0,ok:false,error:error.message};}}
async function runTarget(baseUrl,index){
 let out='',err='';
 const startDelayMs=targets.length>1?Math.round(targetRampMs*index/(targets.length-1)):0;
 const child=spawn(process.execPath,['tools/stress-client-only.mjs'],{env:{...process.env,STRESS_BASE_URL:baseUrl,STRESS_CLIENTS:String(clientsPerTarget),STRESS_SECONDS:String(seconds),STRESS_START_DELAY_MS:String(startDelayMs),STRESS_ACTIVE_AT_MS:String(activeAtMs)},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
 const activeSampleAt=Math.max(Date.now(),activeAtMs+Math.max(1000,seconds*1000-1000));
 const activeReadinessPromise=(async()=>{const wait=Math.max(0,activeSampleAt-Date.now());if(wait)await delay(wait);return readyz(baseUrl);})();
 const timer=setTimeout(()=>child.kill('SIGKILL'),Math.max(180000,activeAtMs-Date.now()+(seconds+120)*1000));
 const [code,signal]=await once(child,'exit');clearTimeout(timer);
 const clientReport=parseLastJson(out),target=await activeReadinessPromise,postCleanupReadiness=await readyz(baseUrl);
 const p99=Number(target?.body?.tickDelayP99Ms ?? target?.body?.eventLoopP99Ms ?? target?.body?.tickP99Ms ?? 0);
 const clientPass=code===0&&clientReport?.status==='passed'&&Number(clientReport.connected)===clientsPerTarget;
 const targetPass=target.ok&&target?.body?.ready===true&&(p99===0||p99<=sloMs);
 return{index,baseUrl,startDelayMs,status:clientPass&&targetPass?'passed':'failed',child:{code,signal},clientReport,targetReadiness:target,postCleanupReadiness,p99Ms:p99,stderr:err.slice(-4000)};
}
async function run(){
 const rows=await Promise.all(targets.map(runTarget));
 evidence={status:rows.every(r=>r.status==='passed')?'passed':'failed',startedAt,finishedAt:new Date().toISOString(),targets,clientsPerTarget,totalClients:clientsPerTarget*targets.length,seconds,sloMs,targetRampMs,sessionRampMs,setupGraceMs,activeAtMs,connected:rows.reduce((n,r)=>n+Number(r.clientReport?.connected||0),0),frames:rows.reduce((n,r)=>n+Number(r.clientReport?.frames||0),0),maxP99Ms:Math.max(...rows.map(r=>Number(r.p99Ms||0))),rows};
 console.log('NYR_LOAD_REPORT '+JSON.stringify(evidence));
}
const server=http.createServer((req,res)=>{const path=new URL(req.url,'http://load.local').pathname;if(path==='/healthz'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify({service:'nyrathen-load-runner',running:evidence.status==='running',status:evidence.status,startedAt:evidence.startedAt,totalClients:evidence.totalClients}));}if(path==='/'||path==='/report'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify(evidence));}res.writeHead(404);res.end();});
server.listen(port,'0.0.0.0');await once(server,'listening');console.log(JSON.stringify({event:'nyrathen.load-runner-ready',port,status:evidence.status,totalClients:evidence.totalClients}));
run().catch(error=>{evidence={...evidence,status:'failed',finishedAt:new Date().toISOString(),error:error?.stack||error?.message||String(error)};console.error('NYR_LOAD_ERROR '+String(error?.stack||error));});
let closing=false;async function stop(){if(closing)return;closing=true;await new Promise(r=>server.close(r));process.exit(0);}process.on('SIGTERM',()=>void stop());process.on('SIGINT',()=>void stop());
