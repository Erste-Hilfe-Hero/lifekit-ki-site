// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Real HTTP + streaming clients; no mocked transport.
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGameServer} from '../server/server.mjs';
import {ProfileStore} from '../server/store.mjs';
import {makeItem} from '../shared/realm-data.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function appFixture(t,path=':memory:'){
 const app=createGameServer({dataPath:path});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');if(t)t.after(()=>app.close());const base='http://127.0.0.1:'+app.server.address().port;
 const post=async(path,token,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return{status:r.status,...await r.json()};};
 const login=(name,token='')=>post('/api/session',token,{name,classId:'weaver',room:'PUBLIC',protocol:2});return{app,base,post,login};
}
async function watch(base,token){
 const control=new AbortController(),r=await fetch(base+'/api/stream',{headers:{Authorization:'Bearer '+token},signal:control.signal});assert.equal(r.status,200);
 const out={snapshots:0,bytes:0,last:null,messages:[],maxPlayers:0,sawForeignMovement:false,sawBullets:false,stop:()=>control.abort()};
 const reader=r.body.getReader(),decoder=new TextDecoder();let pending='';
 out.done=(async()=>{try{while(true){const q=await reader.read();if(q.done)break;out.bytes+=q.value.byteLength;pending+=decoder.decode(q.value,{stream:true});let i;while((i=pending.indexOf('\n\n'))>=0){const block=pending.slice(0,i);pending=pending.slice(i+2);const line=block.split('\n').find(l=>l.startsWith('data: '));if(!line)continue;const m=JSON.parse(line.slice(6));if(m.type==='snapshot'){out.last=m.state;out.snapshots++;out.maxPlayers=Math.max(out.maxPlayers,m.state.players.length);out.sawBullets ||= m.state.bullets.length>0;for(const p of m.state.players)if(Math.abs(p.x-2540)>60&&p.worldId.startsWith('realm'))out.sawForeignMovement=true;}}}}catch(e){if(e.name!=='AbortError')throw e;}finally{reader.releaseLock();}})();return out;
}
async function until(predicate,timeout=4000){const t=Date.now();while(!predicate()){if(Date.now()-t>timeout)throw new Error('Timed out waiting for real network state');await sleep(40);}}
test('24 real network clients concurrently inhabit two realms, receive combat and survive channel changes',async t=>{
 const{app,base,post,login}=await appFixture(t);const clients=[],start=performance.now();
 for(let i=0;i<24;i++){const c=await login('Net'+i);assert.equal(c.status,200);clients.push({...c,seq:0,realm:i<12?'realm-1':'realm-2'});}
 const streams=await Promise.all(clients.map(c=>watch(base,c.token)));t.after(async()=>{for(const s of streams)s.stop();await Promise.allSettled(streams.map(s=>s.done));});
 for(const c of clients){const r=await post('/api/action',c.token,{type:'realm',target:c.realm});assert(r.accepted);}
 await until(()=>streams.every(s=>s.last?.world.kind==='realm'&&s.last.players.length===12));
 for(let turn=0;turn<16;turn++){
   const responses=await Promise.all(clients.map((c,i)=>post('/api/input',c.token,{sequence:++c.seq,input:{dx:1,dy:i%3===0?-.22:0,angle:0,fire:true,auto:true}})));
   assert(responses.every(r=>r.status===200));await sleep(120);
 }
 await until(()=>streams.every(s=>s.sawBullets&&s.sawForeignMovement));
 for(let i=0;i<streams.length;i++){const s=streams[i];assert(s.snapshots>=8);assert(s.last.players.every(p=>p.worldId===clients[i].realm));assert.equal(s.last.players.length,12);assert(s.last.players.filter(p=>p.id!==clients[i].playerId).every(p=>!p.inventory&&!p.vault));}
 assert((await post('/api/action',clients[0].token,{type:'nexus'})).accepted);await until(()=>streams[0].last.world.kind==='nexus');
 const info={name:'24 concurrent real HTTP/SSE clients',transport:'authenticated HTTP inputs / SSE snapshots',durationSeconds:Math.round((performance.now()-start)/100)/10,clients:24,realms:2,playersPerRealm:12,minSnapshotsPerClient:Math.min(...streams.map(s=>s.snapshots)),totalSnapshotMessages:streams.reduce((a,s)=>a+s.snapshots,0),totalStreamBytes:streams.reduce((a,s)=>a+s.bytes,0),everyClientSawMovementAndProjectiles:streams.every(s=>s.sawBullets&&s.sawForeignMovement),crossRealmIsolation:true,privateInventoriesHidden:true,nexusReturn:true,productionLoadTest:false};
 if(process.env.NYRATHEN_TEST_REPORT_DIR){mkdirSync(process.env.NYRATHEN_TEST_REPORT_DIR,{recursive:true});writeFileSync(join(process.env.NYRATHEN_TEST_REPORT_DIR,'multiplayer-smoke.json'),JSON.stringify(info,null,2));}
 for(const s of streams)s.stop();await Promise.allSettled(streams.map(s=>s.done));
});
test('Actual browser-protocol group chat arrives only at the two group members, not a bystander',async t=>{
 const{base,post,login}=await appFixture(t),a=await login('Alpha'),b=await login('Beta'),c=await login('Other');
 const streams=await Promise.all([a,b,c].map(c=>watch(base,c.token)));t.after(async()=>{streams.forEach(s=>s.stop());await Promise.allSettled(streams.map(s=>s.done));});
 assert((await post('/api/action',a.token,{type:'partyCreate'})).accepted);await until(()=>streams[0].last?.party);const code=streams[0].last.party.id;
 assert((await post('/api/action',b.token,{type:'partyJoin',code})).accepted);assert((await post('/api/action',a.token,{type:'chat',channel:'party',text:'Nächster Dungeon zusammen'})).accepted);
 await until(()=>streams[1].last?.chat.some(m=>m.text==='Nächster Dungeon zusammen'));assert(!streams[2].last.chat.some(m=>m.text==='Nächster Dungeon zusammen'));streams.forEach(s=>s.stop());
});
test('Server restart restores the same dungeon, boss health, owned loot, fourth equipment slot and vault',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'nyrathen-worlds-')),path=join(dir,'game.sqlite');let first,second;
 try{
  first=await appFixture(null,path);const a=await first.login('Persist');const e=first.app.rooms.get('PUBLIC').engine,p=e.players.get(a.playerId);e.action(p.id,{type:'realm',target:'realm-1'});const w=e.world(p);w.portals.push({id:'saved-door',theme:'crypt',kind:'dungeon',name:'Crypt',target:null,x:p.x,y:p.y,life:100});e.action(p.id,{type:'portal',portalId:'saved-door'});const dw=e.world(p);dw.enemies.find(m=>m.dungeonBoss).hp=1234;p.vault=[makeItem('permanent',p.classId,'armor',3)];dw.loot.push({id:'owned',owner:p.id,x:p.x,y:p.y,kind:'item',item:makeItem('personal',p.classId,'ability',3),life:100});const worldId=p.worldId;
  await first.app.close();first=null;second=await appFixture(null,path);const resumed=await second.login('Ignored',a.token);assert.equal(resumed.status,200);assert.equal(resumed.snapshot.world.id,worldId);assert.equal(resumed.snapshot.enemies.find(e=>e.dungeonBoss).hp,1234);assert.equal(resumed.snapshot.players[0].vault[0].id,'permanent');assert(resumed.snapshot.players[0].equipment.ability);assert.equal(resumed.snapshot.loot[0].item.id,'personal');
 }finally{if(first)await first.app.close();if(second)await second.app.close();rmSync(dir,{recursive:true,force:true});}
});
test('World and profile transactions roll back together on failure (no half-committed loot)',()=>{
 const s=new ProfileStore(':memory:');try{const a=s.create('Atomic','weaver');s.saveWorld('PUBLIC',{version:2,test:'before'});assert.throws(()=>s.transaction(()=>{s.save(a.id,{...a.profile,bank:999});s.saveWorld('PUBLIC',{version:2,test:'after'});throw new Error('Simulated failure');}));assert.equal(s.find(a.token).profile.bank,0);assert.equal(s.loadWorld('PUBLIC').test,'before');}finally{s.close();}
});
test('Public region discovery exposes counts, never guest credentials or account inventories',async t=>{const{base,login}=await appFixture(t);const a=await login('Discovery');const r=await fetch(base+'/api/realms'),text=await r.text(),info=JSON.parse(text);assert.equal(r.status,200);assert.equal(info.defaultRegion,'PUBLIC');assert.equal(info.regions[0].players,1);assert(!text.includes(a.token));assert(!text.includes('inventory'));});
