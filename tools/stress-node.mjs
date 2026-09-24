#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// High-concurrency local HTTP/SSE stress harness. Uses separate socket pools so long-lived
// streams do not starve action/input requests in the load generator itself.
import http from 'node:http';
import { once } from 'node:events';
import { mkdtempSync,rmSync,mkdirSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { monitorEventLoopDelay,performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { createGameServer } from '../server/server.mjs';
import { PROTOCOL } from '../shared/data.mjs';

const clients=Number(process.env.STRESS_CLIENTS||250),seconds=Number(process.env.STRESS_SECONDS||15),roomCount=Number(process.env.STRESS_ROOMS||Math.max(1,Math.ceil(clients/76)));
if(!Number.isInteger(clients)||clients<2||clients>1000)throw new Error('STRESS_CLIENTS 2–1000');
if(!Number.isInteger(seconds)||seconds<5||seconds>86400)throw new Error('STRESS_SECONDS 5–86400');
const stressP99Slo=Number(process.env.STRESS_P99_SLO_MS||0),stressMaxRss=Number(process.env.STRESS_MAX_RSS_MB||0)*1024*1024,stressMaxBackpressure=Number(process.env.STRESS_MAX_BACKPRESSURE_RATE||0),stressMaxInputTimeout=Number(process.env.STRESS_MAX_INPUT_TIMEOUT_RATE||0);
const tmp=mkdtempSync(join(tmpdir(),'nyrathen-stress-'));
const streamAgent=new http.Agent({keepAlive:true,maxSockets:clients+32,maxFreeSockets:4,timeout:60000});
const requestAgent=new http.Agent({keepAlive:true,maxSockets:Math.max(256,Math.min(2048,clients*2)),maxFreeSockets:128,timeout:15000});
const app=createGameServer({dataPath:join(tmp,'stress.sqlite'),backupSeconds:900,maxRooms:32,maxPlayers:512,maxSessions:Math.max(1024,clients+64),sessionRateLimit:10000});
const eventLoop=monitorEventLoopDelay({resolution:10});eventLoop.enable();
const roster=[];let inputTimer=null,basePort=0,failures=[],actions=0,reconnects=0,inputs=0;const pendingInputs=new Set();
const started=performance.now(),memoryStart=process.memoryUsage().rss;
function delay(ms){return new Promise(r=>setTimeout(r,ms));}
function requestJson(path,{method='GET',token='',value=null,timeout=15000}={}){
 return new Promise((resolveRequest,reject)=>{
  const body=value===null?null:JSON.stringify(value);
  const req=http.request({host:'127.0.0.1',port:basePort,path,method,agent:requestAgent,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{})}},res=>{
   const chunks=[];let size=0;res.on('data',c=>{size+=c.length;if(size<8*1024*1024)chunks.push(c);});res.on('end',()=>{try{resolveRequest({status:res.statusCode,data:chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}});}catch(e){reject(e);}});
  });
  req.setTimeout(timeout,()=>req.destroy(new Error('request timeout')));req.on('error',reject);if(body)req.end(body);else req.end();
 });
}
function closeStream(c){c.intentionalClose=true;c.streamReq?.destroy();c.streamRes?.destroy();c.streamReq=null;c.streamRes=null;}
function openStream(c){
 return new Promise((resolveOpen,reject)=>{
  c.intentionalClose=false;let opened=false,buffer='';
  const req=http.request({host:'127.0.0.1',port:basePort,path:'/api/stream?codec=delta-v1',method:'GET',agent:streamAgent,headers:{Authorization:'Bearer '+c.token,Accept:'text/event-stream'}},res=>{
   c.streamRes=res;c.connected=true;
   res.on('data',chunk=>{
    buffer+=chunk.toString('utf8');
    for(;;){const at=buffer.indexOf('\n\n');if(at<0)break;const event=buffer.slice(0,at);buffer=buffer.slice(at+2);const line=event.split('\n').find(x=>x.startsWith('data: '));if(!line)continue;try{const m=JSON.parse(line.slice(6));if(m.type==='snapshot'||m.type==='delta'){c.frames++;c[m.type==='delta'?'deltas':'fulls']++;c.lastFrameAt=Date.now();if(!opened){opened=true;resolveOpen();}}else if(m.type==='maintenance'||m.type==='replaced'){c.control.push(m.type);}}catch(e){c.parseErrors++;}
    }
   });
   res.on('close',()=>{c.connected=false;if(!c.intentionalClose&&performance.now()-started<seconds*1000+120000)failures.push(`unexpected stream close ${c.index}`);});
  });
  req.setTimeout(30000,()=>req.destroy(new Error('stream open timeout')));req.on('error',e=>{c.connected=false;if(!opened)reject(e);else if(!c.intentionalClose)failures.push(`stream ${c.index}: ${e.message}`);});req.end();c.streamReq=req;
 });
}
async function batch(items,size,fn){for(let i=0;i<items.length;i+=size)await Promise.all(items.slice(i,i+size).map(fn));}
let report;
try{
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');basePort=app.server.address().port;
 for(let i=0;i<clients;i++)roster.push({index:i,token:'',id:'',sequence:0,frames:0,deltas:0,fulls:0,parseErrors:0,control:[],connected:false,lastFrameAt:0,streamReq:null,streamRes:null,intentionalClose:false,inputBusy:false,inputSkipped:0});
 await batch(roster,32,async c=>{const r=await requestJson('/api/session',{method:'POST',value:{protocol:PROTOCOL,name:'Stress'+c.index,classId:c.index%2?'ranger':'weaver',room:'LOAD'+(c.index%roomCount)}});if(r.status!==200)throw new Error(`session ${c.index}: ${r.status} ${r.data.error||''}`);c.token=r.data.token;c.id=r.data.playerId;c.sequence=r.data.nextSequence||0;});
 await batch(roster,32,c=>openStream(c));
 await batch(roster,40,async c=>{const r=await requestJson('/api/action',{method:'POST',token:c.token,value:{type:'realm',target:Math.floor(c.index/roomCount)%2?'realm-2':'realm-1',requestId:randomUUID()}});actions++;if(r.status!==200||!r.data.accepted)throw new Error(`realm ${c.index}: ${r.status}`);});
 const began=performance.now();let phase=0;
 inputTimer=setInterval(()=>{
  phase+=.17;
  for(const c of roster){if(!c.connected)continue;if(c.inputBusy){c.inputSkipped++;continue;}c.inputBusy=true;const input={dx:Math.sin(phase+c.index)*.6,dy:Math.cos(phase*.7+c.index)*.6,angle:phase+c.index*.03,fire:true,auto:false};const seq=++c.sequence;inputs++;const work=requestJson('/api/input',{method:'POST',token:c.token,value:{sequence:seq,input},timeout:5000}).then(r=>{if(r.status!==200&&r.status!==429)failures.push(`input ${c.index}: ${r.status}`);}).catch(e=>failures.push(`input ${c.index}: ${e.message}`)).finally(()=>{c.inputBusy=false;pendingInputs.delete(work);});pendingInputs.add(work);}
 },250);
 const reconnectAt=began+Math.min(5000,seconds*400),slowAt=began+Math.min(7000,seconds*500);let didReconnect=false,didSlow=false;
 while(performance.now()-began<seconds*1000){
  const now=performance.now();
  if(!didReconnect&&now>=reconnectAt){didReconnect=true;const selected=roster.filter((_,i)=>i%Math.max(1,Math.floor(clients/10))===0).slice(0,10);for(const c of selected)closeStream(c);await delay(80);for(const c of selected){await openStream(c);reconnects++;}}
  if(!didSlow&&now>=slowAt&&roster[0]?.streamRes){didSlow=true;roster[0].streamRes.pause();await delay(1500);roster[0].streamRes.resume();}
  await delay(100);
 }
 clearInterval(inputTimer);inputTimer=null;
 await Promise.allSettled([...pendingInputs]);
 await delay(500);
 const connected=roster.filter(c=>c.connected).length,minimumFrames=Math.max(8,Math.floor(seconds*2));
 const starved=roster.filter(c=>c.frames<minimumFrames).map(c=>({i:c.index,frames:c.frames}));
 if(connected!==clients)failures.push(`connected ${connected}/${clients}`);if(starved.length)failures.push(`starved streams ${starved.length}`);if(roster.some(c=>c.parseErrors))failures.push('SSE parse errors');
 const identities=new Set(roster.map(c=>c.id));if(identities.size!==clients)failures.push('duplicate player identities');
 const eventLoopMs={p50:+(eventLoop.percentile(50)/1e6).toFixed(2),p95:+(eventLoop.percentile(95)/1e6).toFixed(2),p99:+(eventLoop.percentile(99)/1e6).toFixed(2),max:+(eventLoop.max/1e6).toFixed(2)},endRSS=process.memoryUsage().rss;
 const delivered=app.transport.fullFrames+app.transport.deltaFrames,backpressureRate=app.transport.backpressureSkips/Math.max(1,delivered+app.transport.backpressureSkips),inputTimeoutRate=app.transport.inputTimeouts/Math.max(1,inputs);
 if(stressP99Slo>0&&eventLoopMs.p99>stressP99Slo)failures.push(`event-loop p99 ${eventLoopMs.p99}ms > ${stressP99Slo}ms`);
 if(stressMaxRss>0&&endRSS>stressMaxRss)failures.push(`RSS ${endRSS} > ${stressMaxRss}`);
 if(stressMaxBackpressure>0&&backpressureRate>stressMaxBackpressure)failures.push(`backpressure rate ${backpressureRate} > ${stressMaxBackpressure}`);
 if(stressMaxInputTimeout>0&&inputTimeoutRate>stressMaxInputTimeout)failures.push(`input-timeout rate ${inputTimeoutRate} > ${stressMaxInputTimeout}`);
 report={status:failures.length?'failed':'passed',clients,seconds,rooms:roomCount,actions,inputs,inputSkipped:roster.reduce((n,c)=>n+c.inputSkipped,0),reconnects,connected,frames:{total:roster.reduce((n,c)=>n+c.frames,0),delta:roster.reduce((n,c)=>n+c.deltas,0),full:roster.reduce((n,c)=>n+c.fulls,0),min:Math.min(...roster.map(c=>c.frames)),max:Math.max(...roster.map(c=>c.frames))},transport:{...app.transport},observability:{...app.observability},memory:{startRSS:memoryStart,endRSS},eventLoopMs,rates:{backpressure:backpressureRate,inputTimeout:inputTimeoutRate},slo:{p99Ms:stressP99Slo||null,maxRssBytes:stressMaxRss||null,maxBackpressureRate:stressMaxBackpressure||null,maxInputTimeoutRate:stressMaxInputTimeout||null},failures,starved:starved.slice(0,20),totalSeconds:+((performance.now()-started)/1000).toFixed(2)};
 if(failures.length)process.exitCode=1;
}catch(e){failures.push(e.stack||e.message);report={status:'failed',clients,seconds,failures,totalSeconds:+((performance.now()-started)/1000).toFixed(2)};process.exitCode=1;}
finally{
 clearInterval(inputTimer);for(const c of roster)closeStream(c);streamAgent.destroy();requestAgent.destroy();await app.close();eventLoop.disable();rmSync(tmp,{recursive:true,force:true});
 const folder=process.env.NYRATHEN_TEST_REPORT_DIR;if(folder){mkdirSync(resolve(folder),{recursive:true});writeFileSync(resolve(folder,`stress-${clients}.json`),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report,null,2));
 // Undici is not used here, but an explicit exit keeps CI deterministic if platform stdio handles linger.
 process.exit(process.exitCode||0);
}
