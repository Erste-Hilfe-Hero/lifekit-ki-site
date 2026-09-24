#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Crash/restart chaos drill at safe worker capacity. It validates WAL recovery, stale-lock recovery,
// bearer continuity and idempotent action receipts after SIGKILL.
import {spawn} from 'node:child_process';
import net from 'node:net';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {PROTOCOL} from '../shared/data.mjs';
const clients=Number(process.env.CHAOS_CLIENTS||80);if(!Number.isInteger(clients)||clients<10||clients>120)throw new Error('CHAOS_CLIENTS 10–120');
const dir=mkdtempSync(join(tmpdir(),'nyrathen-chaos-')),db=join(dir,'state.sqlite');
const freePort=()=>new Promise((resolvePort,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolvePort(p));});});
const port=await freePort(),base=`http://127.0.0.1:${port}`;let child=null;const controllers=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function start(){const c=spawn(process.execPath,['server/server.mjs'],{cwd:resolve('.'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_PATH:db,MAX_SESSIONS:'100',READY_SESSION_PERCENT:'80',SESSION_RATE_LIMIT:'10000',SNAPSHOT_HZ:'5',BACKUP_SECONDS:'900'},stdio:['ignore','pipe','pipe']});let err='';c.stderr.on('data',d=>err+=d);c._err=()=>err;return c;}
async function waitHealthy(){for(let i=0;i<120;i++){try{const r=await fetch(base+'/healthz',{signal:AbortSignal.timeout(300)});if(r.ok)return;}catch{}await sleep(50);}throw new Error('Server did not become healthy: '+(child?._err?.()||''));}
async function json(path,{method='GET',token='',value}={}){const r=await fetch(base+path,{method,headers:{...(token?{authorization:'Bearer '+token}:{}),...(value!==undefined?{'content-type':'application/json'}:{})},body:value===undefined?undefined:JSON.stringify(value),signal:AbortSignal.timeout(5000)});const text=await r.text();let data={};try{data=JSON.parse(text);}catch{}return{status:r.status,data};}
const roster=[];let recovered=0,replayed=0;
try{
 child=start();await waitHealthy();
 for(let i=0;i<clients;i+=20)await Promise.all(Array.from({length:Math.min(20,clients-i)},async(_,j)=>{const n=i+j,r=await json('/api/session',{method:'POST',value:{protocol:PROTOCOL,name:'Chaos'+n,classId:n%2?'ranger':'warden',room:'CHAOS'+(n%2)}});if(r.status!==200)throw new Error('session '+n+' '+r.status);roster[n]={token:r.data.token,id:r.data.playerId,room:'CHAOS'+(n%2),requestId:'chaos_'+String(n).padStart(8,'0')};}));
 // Open live streams and commit one receipt-backed state transition per account before the crash.
 await Promise.all(roster.map(async r=>{const controller=new AbortController();controllers.push(controller);const res=await fetch(base+'/api/stream?codec=delta-v1',{headers:{authorization:'Bearer '+r.token},signal:controller.signal});if(res.status!==200)throw new Error('stream open '+res.status);r.stream=res.body;}));
 await Promise.all(roster.map(async(r,i)=>{const a=await json('/api/action',{method:'POST',token:r.token,value:{type:'realm',target:i%2?'realm-2':'realm-1',requestId:r.requestId}});if(a.status!==200||!a.data.accepted)throw new Error('pre-crash action '+i);const inp=await json('/api/input',{method:'POST',token:r.token,value:{sequence:1,input:{dx:.5,dy:.2,angle:.4,fire:true,auto:false}}});if(inp.status!==200)throw new Error('pre-crash input '+i);}));
 await sleep(300);child.kill('SIGKILL');await new Promise(resolveExit=>child.once('exit',resolveExit));child=null;for(const c of controllers)c.abort();
 if(!existsSync(db+'.lock'))throw new Error('Chaos drill expected a stale lock after SIGKILL');
 child=start();await waitHealthy();
 for(let i=0;i<roster.length;i+=20)await Promise.all(roster.slice(i,i+20).map(async(r,offset)=>{const n=i+offset,s=await json('/api/session',{method:'POST',token:r.token,value:{protocol:PROTOCOL,name:'Ignored',classId:'warden',room:r.room}});if(s.status!==200||s.data.playerId!==r.id)throw new Error('identity recovery '+n);recovered++;const a=await json('/api/action',{method:'POST',token:r.token,value:{type:'realm',target:n%2?'realm-2':'realm-1',requestId:r.requestId}});if(a.status!==200||a.data.replayed!==true||a.data.accepted!==true)throw new Error('receipt recovery '+n);replayed++;}));
 const health=await json('/healthz');console.log(JSON.stringify({ok:true,clients,recovered,replayed,staleLockRecovered:!existsSync(db+'.lock')||health.status===200,health:health.status},null,2));
}finally{for(const c of controllers)c.abort();if(child){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(5000)]);if(child.exitCode===null)child.kill('SIGKILL');}rmSync(dir,{recursive:true,force:true});}
