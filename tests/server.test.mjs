// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGameServer } from '../server/server.mjs';
import { ProfileStore } from '../server/store.mjs';
import { HOME,PROTOCOL } from '../shared/data.mjs';
async function serve(t,options={}){
 const app=createGameServer({dataPath:':memory:',...options});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
 const base='http://127.0.0.1:'+app.server.address().port;
 if(t)t.after(()=>app.close());
 const request=async(path,{method='GET',token='',value,headers={}}={})=>{
  const res=await fetch(base+path,{method,headers:{...(value!==undefined?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{}),...headers},body:value===undefined?undefined:JSON.stringify(value)});
  const text=await res.text();let data;try{data=JSON.parse(text);}catch{data=text;}return{status:res.status,data,headers:res.headers};
 };
 const login=async(name='Tester',room='ASH01',token='')=>request('/api/session',{method:'POST',token,value:{protocol:PROTOCOL,name,classId:'warden',room}});
 return{app,base,request,login};
}
async function stream(base,token){
 const stop=new AbortController(),res=await fetch(base+'/api/stream',{headers:{authorization:'Bearer '+token},signal:stop.signal});assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/event-stream/);
 const reader=res.body.getReader(),decoder=new TextDecoder();let buffer='';
 return{stop:()=>{stop.abort();reader.cancel().catch(()=>{});},async next(){
  while(true){const at=buffer.indexOf('\n\n');if(at>=0){const part=buffer.slice(0,at);buffer=buffer.slice(at+2);const line=part.split('\n').find(l=>l.startsWith('data: '));if(line)return JSON.parse(line.slice(6));continue;}
   const result=await reader.read();if(result.done)throw new Error('Stream closed');buffer+=decoder.decode(result.value,{stream:true});
  }
 }};
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('HTTP health/readiness and mobile-only status are served; browser game/source/database are not exposed',async t=>{
 const{request}=await serve(t);assert.equal((await request('/health')).data.ok,true);assert.equal((await request('/healthz')).data.ok,true);assert.equal((await request('/readyz')).data.ready,true);const page=await request('/');assert.equal(page.status,200);const status=page.data;assert.equal(status.product,'Nyrathen');assert.equal(status.browserGame,false);assert.equal(status.service,'mobile-multiplayer-server');
 for(const path of ['/index.html','/sw.js','/manifest.webmanifest','/server/store.mjs','/.data/nyrathen.sqlite','/LICENSE','/../package.json'])assert.equal((await request(path)).status,404);
 assert.equal((await request('/metrics')).status,404);
});
test('Operational metrics require a private bearer token and contain no player names or chat data',async t=>{
 const{request,login}=await serve(t,{metricsToken:'0123456789abcdef0123456789abcdef'});await login('MetricUser');assert.equal((await request('/metrics')).status,401);
 const metrics=await request('/metrics',{headers:{authorization:'Bearer 0123456789abcdef0123456789abcdef'}});assert.equal(metrics.status,200);assert.match(metrics.data,/nyrathen_requests_total/);assert.match(metrics.data,/nyrathen_storage_healthy 1/);assert.doesNotMatch(metrics.data,/MetricUser|chat|token/i);
});
test('Guest tokens are independent, random and profile data is private',async t=>{
 const{login,request}=await serve(t);const a=(await login('Alpha')).data,b=(await login('Beta')).data;assert.notEqual(a.token,b.token);assert.notEqual(a.playerId,b.playerId);assert.equal(a.token.length,43);
 assert.equal((await request('/api/profile')).status,401);assert.equal((await request('/api/profile',{token:'invalid'})).status,401);assert.equal((await request('/api/profile',{token:a.token})).data.profile.name,'Alpha');
});
test('Two real SSE clients see one shared world and synchronized movement',async t=>{
 const{login,request,base}=await serve(t);const a=(await login('Alpha')).data,b=(await login('Beta')).data;
 const sa=await stream(base,a.token),sb=await stream(base,b.token);t.after(()=>{sa.stop();sb.stop();});
 const firstA=await sa.next(),firstB=await sb.next();assert.equal(firstA.state.players.length,2);assert.equal(firstB.state.players.length,2);assert.equal(firstA.state.seed,firstB.state.seed);
 const start=firstB.state.players.find(p=>p.id===a.playerId).x;
 const sent=await request('/api/input',{method:'POST',token:a.token,value:{sequence:1,input:{dx:1,dy:0,angle:0}}});assert.equal(sent.status,200);
 let moved=null;for(let i=0;i<10;i++){const data=await sb.next();if(data.type==='snapshot'){const p=data.state.players.find(p=>p.id===a.playerId);if(p.x>start+20){moved=p;break;}}}
 assert(moved,'Second client must receive first client movement');assert.equal(moved.inventory,undefined);
 sa.stop();sb.stop();
});
test('Server rejects stale sequence and ignores client-assigned gold or coordinates',async t=>{
 const{login,request}=await serve(t);const a=(await login()).data;
 const value={sequence:1,input:{dx:0,dy:0,x:999999,y:99999,bank:999999,hp:99999}};
 assert.equal((await request('/api/input',{method:'POST',token:a.token,value})).status,200);assert.equal((await request('/api/input',{method:'POST',token:a.token,value})).status,409);
 const p=(await request('/api/profile',{token:a.token})).data.profile;assert.equal(p.x,880);assert.equal(p.bank,0);assert.equal(p.hp,223);
 assert.equal((await request('/api/input',{method:'POST',token:a.token,value:{sequence:2,input:null}})).status,400);
});
test('Missing mana/cooldowns and unavailable actions are validated server-side',async t=>{
 const{login,request}=await serve(t);const a=(await login()).data;
 for(const type of ['ability','heal','refill','rebirth','descend'])assert.equal((await request('/api/action',{method:'POST',token:a.token,value:{type}})).data.accepted,false);
 assert.equal((await request('/api/action',{method:'POST',token:a.token,value:{type:'dash'}})).data.accepted,false);assert.equal((await request('/api/action',{method:'POST',token:a.token,value:{type:'dash'}})).data.accepted,false);
});
test('Origin checks, protocol checks, invalid room and large payload rejected',async t=>{
 const{login,request,base}=await serve(t);assert.equal((await request('/health',{headers:{Origin:'https://untrusted.invalid'}})).status,403);
 assert.equal((await request('/health',{headers:{Origin:base}})).status,200);assert.equal((await request('/health',{headers:{Origin:'https://app.nyrathen.local'}})).status,200);
 assert.equal((await login('Tester','!')).status,400);assert.equal((await request('/api/session',{method:'POST',value:{protocol:1,classId:'warden',room:'ASH01'}})).status,409);
 const res=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({protocol:PROTOCOL,name:'x'.repeat(5000),classId:'warden',room:'ASH01'})});assert.equal(res.status,413);await res.text();
});
test('64-player region capacity is enforced, another region remains usable',async t=>{
 const{login}=await serve(t);for(let i=0;i<64;i++)assert.equal((await login('Player'+i)).status,200);assert.equal((await login('Overflow')).status,409);assert.equal((await login('Elsewhere','ASH02')).status,200);
});
test('Room switching cannot bypass combat extraction',async t=>{
 const{login,app}=await serve(t);const a=(await login()).data;const e=app.rooms.get('ASH01').engine,p=e.players.get(a.playerId);e.action(p.id,{type:'realm',target:'realm-1'});p.x=2900;p.y=3500;
 assert.equal((await login('Tester','ASH02',a.token)).status,409);assert(e.players.has(a.playerId));e.action(p.id,{type:'nexus'});assert.equal((await login('Tester','ASH02',a.token)).status,200);assert(!e.players.has(a.playerId));
});
test('Session deletion requires confirmation and destroys the saved guest account',async t=>{
 const{login,request}=await serve(t);const a=(await login()).data;assert.equal((await request('/api/profile',{method:'DELETE',token:a.token,value:{}})).status,400);
 assert.equal((await request('/api/profile',{method:'DELETE',token:a.token,value:{confirm:'DELETE'}})).data.deleted,true);assert.equal((await request('/api/profile',{token:a.token})).status,401);assert.equal((await login('Tester','ASH01',a.token)).status,401);
});
test('SQLite persists profile on close/restart without storing the bearer token',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'nyrathen-test-')),path=join(dir,'profiles.sqlite');let first=null,second=null;
 try{first=await serve(null,{dataPath:path});const a=(await first.login('Persistenz')).data;const p=first.app.rooms.get('ASH01').engine.players.get(a.playerId);p.bank=81;p.x=1000;p.y=820;p.hp=73;p.abilityCd=4;
 await first.app.close();first=null;assert(!readFileSync(path).includes(Buffer.from(a.token)));
 second=await serve(null,{dataPath:path});const resumed=await second.login('Ignored rename','ASH01',a.token);assert.equal(resumed.status,200);assert.equal(resumed.data.playerId,a.playerId);const own=resumed.data.snapshot.players.find(p=>p.id===a.playerId);assert.equal(own.bank,81);assert.equal(own.hp,73);assert.equal(own.x,1000);assert.equal(own.name,'Persistenz');assert(own.abilityCd>3);
 }finally{if(first)await first.app.close();if(second)await second.app.close();rmSync(dir,{recursive:true,force:true});}
});
test('Duplicate SSE stream replaces the old connection cleanly',async t=>{
 const{base,login}=await serve(t);const a=(await login()).data;const one=await stream(base,a.token);await one.next();const two=await stream(base,a.token);t.after(()=>{one.stop();two.stop();});const replaced=await one.next();assert.equal(replaced.type,'replaced');assert.equal((await two.next()).type,'snapshot');one.stop();two.stop();
});
test('SQLite API uses token hashes and handles missing/corrupt records',()=>{
 const store=new ProfileStore(':memory:');try{const record=store.create('DB','ranger');assert.equal(store.find(record.token).id,record.id);assert.equal(store.find("' OR 1=1 --"),null);store.db.prepare('UPDATE players SET profile = ? WHERE id = ?').run('broken',record.id);assert.equal(store.find(record.token),null);store.delete(record.id);assert.equal(store.find(record.token),null);}finally{store.close();}
});
