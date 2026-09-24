#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Local real HTTP/SSE clients, real simulation, no public server and no credentials in output.
import { once } from 'node:events';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { createGameServer } from '../server/server.mjs';
import { GameNetwork } from '../client/network.mjs';
const duration=Number(process.env.SOAK_SECONDS||120),count=Number(process.env.SOAK_CLIENTS||24);
if(!Number.isInteger(duration)||duration<5||duration>3600||!Number.isInteger(count)||count<2||count>500)throw new Error('SOAK_SECONDS 5–3600, SOAK_CLIENTS 2–500.');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=12000){const end=Date.now()+timeout;while(!fn()){if(Date.now()>end)throw new Error('Clients did not become ready');await delay(25);}}
const tmp=mkdtempSync(join(tmpdir(),'nyrathen-soak-'));const errors=[],clients=[],states=[],connected=[],samples=[];
const app=createGameServer({dataPath:join(tmp,'game.sqlite'),backupSeconds:30,backupDirectory:join(tmp,'backup'),maxRooms:16,maxPlayers:512,maxSessions:1024,sessionRateLimit:2000});
const eventLoop=monitorEventLoopDelay({resolution:20});eventLoop.enable();
let actions=0,reconnections=0,inputTimer,maintenanceTimer,status='running',failure=null,report;
const memoryStart=process.memoryUsage().rss,start=performance.now();
try{
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 for(let i=0;i<count;i++){
  const client=new GameNetwork(s=>{states[i]=s;},(state,message)=>{connected[i]=state==='connected';if(state==='disconnected')errors.push({client:i,message});},{retryDelays:[50,100,200,400,800],sessionTimeout:60000,streamTimeout:30000});
  clients.push(client);
 }
 for(let start=0;start<count;start+=50)await Promise.all(clients.slice(start,start+50).map((client,j)=>{const i=start+j;return client.connect({base,name:'Soak'+i,classId:i%2?'ranger':'weaver',room:'LOAD'+(i%10)});}));
 await until(()=>clients.every(c=>c.connected),30000);
 for(let start=0;start<count;start+=100){const batch=clients.slice(start,start+100);await Promise.all(batch.map((client,j)=>client.action({type:'realm',target:(start+j)%2?'realm-2':'realm-1'})));actions+=batch.length;}
 await until(()=>states.every(s=>s?.world.kind==='realm'));
 let frame=0,lastReconnect=-1;const began=performance.now();
 inputTimer=setInterval(()=>{
  frame++;
  clients.forEach((client,i)=>{
   const own=states[i]?.players.find(p=>p.id===client.id);
   if(!own||own.dead)return;
   // Walk out of the coastal safe zone, then a bounded zig-zag while firing.
   const phase=(performance.now()-began)/1000;
   client.sendInput({dx:phase<4?0:Math.sin(phase*.7+i)*.65,dy:phase<4?-1:Math.cos(phase*.4+i)*.65,angle:phase*.65+i,fire:true,auto:false});
  });
 },90);
 while(performance.now()-began<duration*1000){
  const elapsed=(performance.now()-began)/1000;
  if(Math.floor(elapsed/20)>lastReconnect){
   lastReconnect=Math.floor(elapsed/20);
   if(lastReconnect>0){const client=clients[lastReconnect%clients.length];client.abort?.abort();reconnections++;}
  }
  if(Math.floor(elapsed)%10===0&&!samples.some(s=>s.at===Math.floor(elapsed))){
   samples.push({at:Math.floor(elapsed),rss:process.memoryUsage().rss,active:clients.filter(c=>c.connected).length,wireBytes:app.transport.wireBytes,deltaFrames:app.transport.deltaFrames});
  }
  for(let i=0;i<count;i++){
   const own=states[i]?.players.find(p=>p.id===clients[i].id);
   if(own?.dead&&clients[i].connected){await clients[i].action({type:'rebirth',classId:i%2?'ranger':'weaver'});await clients[i].action({type:'realm',target:i%2?'realm-2':'realm-1'});actions+=2;}
  }
  await delay(250);
 }
 clearInterval(inputTimer);for(const c of clients)await c.releaseInput();await until(()=>clients.every(c=>c.connected));
 const privacy=states.every((s,i)=>s.players.every(p=>p.id===clients[i].id||(!Object.hasOwn(p,'inventory')&&!Object.hasOwn(p,'account'))));
 const isolation=states.every(s=>s.players.every(p=>p.worldId===s.world.id));
 const allReceived=clients.every(c=>c.metrics.deltaFrames>30&&c.metrics.snapshots>30);
 const identical=clients.every((c,i)=>app.rooms.get('LOAD'+(i%10))?.engine.players.has(c.id)&&states[i]?.players.some(p=>p.id===c.id));
 if(!privacy||!isolation||!allReceived||!identical||errors.length)throw new Error('Privacy/isolation/identity/transport check failed');
 status='passed';
 report={status,requestedDurationSeconds:duration,actualSimulationSeconds:Math.round((performance.now()-began)/1000),clients:count,realms:2,actions,forcedStreamDisconnects:reconnections,recoveredStreams:clients.reduce((n,c)=>n+c.metrics.reconnects,0),checks:{privateInventoriesHidden:privacy,worldsIsolated:isolation,allClientsReceivedDeltas:allReceived,identitiesPreserved:identical},transport:{...app.transport,savedPercent:+((1-app.transport.wireBytes/app.transport.referenceBytes)*100).toFixed(2),bytesPerClientPerSecond:Math.round(app.transport.wireBytes/count/duration)},memory:{startRSS:memoryStart,endRSS:process.memoryUsage().rss,peakSampleRSS:Math.max(...samples.map(s=>s.rss))},eventLoopMs:{p50:+(eventLoop.percentile(50)/1e6).toFixed(2),p99:+(eventLoop.percentile(99)/1e6).toFixed(2),max:+(eventLoop.max/1e6).toFixed(2)},samples,errors};
}catch(error){status='failed';failure=error.message;report={status,clients:count,error:failure,errors,samples,transport:{...app.transport}};process.exitCode=1;}
finally{
 clearInterval(inputTimer);clearInterval(maintenanceTimer);for(const c of clients)c.disconnect();await app.close();eventLoop.disable();rmSync(tmp,{recursive:true,force:true});
 report.totalSeconds=+((performance.now()-start)/1000).toFixed(2);report.limitations=['Single local Node process with local HTTP/SSE clients; not a mobile radio or TLS benchmark.','Application SSE bytes include data framing but exclude HTTP/TCP/TLS headers and input HTTP traffic.','Reference bytes are full snapshots of the same actual frames, not a separate legacy-server run.','Short soak, not production capacity certification or a physical device test.'];
 const folder=process.env.NYRATHEN_TEST_REPORT_DIR;if(folder){mkdirSync(resolve(folder),{recursive:true});writeFileSync(resolve(folder,'soak.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report,null,2));
}
