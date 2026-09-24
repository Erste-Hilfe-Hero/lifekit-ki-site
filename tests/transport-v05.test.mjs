// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { SnapshotEncoder, SnapshotAssembler } from '../shared/snapshot-wire.mjs';
import { AdventureEngine } from '../shared/adventure.mjs';
import { GameNetwork } from '../client/network.mjs';
import { createGameServer } from '../server/server.mjs';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,timeout=4000){const end=Date.now()+timeout;while(!fn()){if(Date.now()>end)throw new Error('Timed out');await pause(15);}}
function fixture(revision=1){return {version:2,world:{id:'nexus',kind:'nexus'},wireEpoch:'epoch',revision,time:revision/10,seed:123,players:[{id:'own',x:40,y:90,name:'Ali',inventory:Array.from({length:8},(_,id)=>({id:'item'+id,name:'Original equipment '+id,description:'Stable metadata that must not be retransmitted'})),mp:100},{id:'other',x:50,y:90,name:'Other'}],enemies:[],bullets:[],chat:[],events:[],loot:[]};}
async function serve(t){const app=createGameServer({dataPath:':memory:'});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());return {app,base:'http://127.0.0.1:'+app.server.address().port};}
test('delta reconstructs exactly and avoids repeatedly sending inventory',()=>{
 const encoder=new SnapshotEncoder(),assembler=new SnapshotAssembler(),a=fixture();assert.deepEqual(assembler.accept(encoder.encode(a).message),a);
 const b=fixture(2);b.players[0].x=43.71842791;b.players[0].mp=99.23331;
 const packet=encoder.encode(b);assert.equal(packet.message.type,'delta');assert(packet.text.length<packet.fullText.length*.5);assert(!packet.text.includes('Original equipment'));assert.deepEqual(assembler.accept(packet.message),b);
});
test('entities can be removed, inserted and reordered without ghosts',()=>{
 const encoder=new SnapshotEncoder(),assembler=new SnapshotAssembler();let state=fixture();state.enemies=[{id:'a',hp:10},{id:'b',hp:20},{id:'c',hp:30}];assembler.accept(encoder.encode(state).message);
 state=structuredClone(state);state.revision++;state.enemies=[{id:'c',hp:29},{id:'new',hp:100},{id:'a',hp:10}];assert.deepEqual(assembler.accept(encoder.encode(state).message),state);
 state.revision++;state.enemies=[];assert.deepEqual(assembler.accept(encoder.encode(state).message),state);
});
test('deleted entity attributes and root fields disappear',()=>{const e=new SnapshotEncoder(),a=new SnapshotAssembler(),first=fixture();first.extra={a:1};first.players[1].status='shield';a.accept(e.encode(first).message);const next=fixture(2);assert.deepEqual(a.accept(e.encode(next).message),next);});
test('duplicate chat identifiers fall back to replacement rather than losing messages',()=>{const e=new SnapshotEncoder(),a=new SnapshotAssembler(),first=fixture();first.chat=[{id:1,text:'realm'},{id:1,text:'guild'}];a.accept(e.encode(first).message);first.revision++;first.chat[1].text='new';assert.deepEqual(a.accept(e.encode(first).message),first);});
test('periodic keyframes and world/epoch changes reset transport',()=>{const e=new SnapshotEncoder({keyframeEvery:3});assert.equal(e.encode(fixture()).message.type,'snapshot');assert.equal(e.encode(fixture(2)).message.type,'delta');assert.equal(e.encode(fixture(3)).message.type,'delta');assert.equal(e.encode(fixture(4)).message.type,'snapshot');const next=fixture(5);next.world.id='realm-1';assert.equal(e.encode(next).message.type,'snapshot');next.revision++;next.wireEpoch='new';assert.equal(e.encode(next).message.type,'snapshot');});
test('out-of-order, missing baseline and duplicate patches cannot silently corrupt client',()=>{const e=new SnapshotEncoder(),a=new SnapshotAssembler();const first=e.encode(fixture()).message,b=e.encode(fixture(2)).message,c=e.encode(fixture(3)).message;assert.throws(()=>a.accept(b));a.accept(first);assert.throws(()=>a.accept(c));assert.deepEqual(a.accept(b),fixture(2));assert.throws(()=>a.accept(b));assert.deepEqual(a.accept(c),fixture(3));});
test('consumer mutations cannot poison encoder or assembler baselines',()=>{const e=new SnapshotEncoder(),a=new SnapshotAssembler(),first=fixture();const packet=e.encode(first);const consumed=a.accept(packet.message);first.players[0].inventory=[];consumed.players[0].name='tampered';assert.deepEqual(a.accept(e.encode(fixture(2)).message),fixture(2));});
test('prototype keys and unknown collection names are rejected atomically',()=>{const e=new SnapshotEncoder(),a=new SnapshotAssembler();a.accept(e.encode(fixture()).message);const p=e.encode(fixture(2)).message;assert.equal(p.type,'delta');const bad=structuredClone(p);bad.set=JSON.parse('{"__proto__":{"polluted":true}}');assert.throws(()=>a.accept(bad));assert.equal({}.polluted,undefined);const unknown=structuredClone(p);unknown.entities.surprise={remove:[],add:[],change:[]};assert.throws(()=>a.accept(unknown));assert.deepEqual(a.accept(p),fixture(2));});
test('real 400-step game snapshots round-trip without simulation mutation',()=>{
 const engine=new AdventureEngine(),p=engine.addPlayer('a','Ali','weaver');engine.addPlayer('b','Berta','ranger');const encoder=new SnapshotEncoder(),assembler=new SnapshotAssembler();let revision=0,deltas=0,total=0,reference=0;
 for(let frame=0;frame<400;frame++){
  if(frame===10)engine.action(p.id,{type:'realm',target:'realm-1'});
  if(frame===20)engine.action('b',{type:'realm',target:'realm-1'});
  if(frame===200)engine.action(p.id,{type:'nexus'});
  if(frame===230)engine.action(p.id,{type:'realm',target:'realm-2'});
  engine.setInput('a',{dx:Math.sin(frame/30),dy:-.8,angle:frame/20,fire:true,auto:false});engine.step(.05);
  const state={...engine.snapshot('a'),wireEpoch:'real',revision:++revision};const packet=encoder.encode(state);deltas+=packet.message.type==='delta';total+=packet.text.length;reference+=packet.fullText.length;
  assert.deepEqual(assembler.accept(packet.message),JSON.parse(JSON.stringify(state)));
 }
 assert(deltas>200);assert(total<reference*.7,`${total}/${reference}`);
});
test('real client negotiates delta transport and retains private inventory boundaries',async t=>{
 const {app,base}=await serve(t);const states=[];const a=new GameNetwork(s=>states.push(s),()=>{}),b=new GameNetwork(()=>{},()=>{});t.after(()=>{a.disconnect();b.disconnect();});
 await a.connect({base,name:'Ali',classId:'weaver',room:'PUBLIC'});await b.connect({base,name:'Other',classId:'ranger',room:'PUBLIC'});await until(()=>a.connected&&b.connected&&a.metrics.deltaFrames>1);
 assert(await a.action({type:'realm',target:'realm-1'}));assert(await b.action({type:'realm',target:'realm-1'}));await a.sendInput({dx:1,dy:-1,angle:0,fire:true,auto:false});
 await until(()=>states.at(-1).players.length===2&&app.transport.deltaFrames>5);
 assert(!Object.hasOwn(states.at(-1).players.find(p=>p.id===b.id),'inventory'));assert(states.at(-1).players.find(p=>p.id===a.id).inventory);
 const bytes=app.transport;assert(bytes.wireBytes<bytes.referenceBytes);assert(a.metrics.wireBytes>0);
});
test('server stops stale movement while an SSE connection remains alive',async t=>{
 const {app,base}=await serve(t);const client=new GameNetwork(()=>{},()=>{});t.after(()=>client.disconnect());await client.connect({base,name:'Watchdog',classId:'ranger',room:'PUBLIC'});await until(()=>client.connected);
 await client.sendInput({dx:1,dy:0,angle:0,fire:true,auto:false});await until(()=>app.transport.inputTimeouts===1,2500);
 const p=app.rooms.get('PUBLIC').engine.players.get(client.id);assert.equal(p.input.dx,0);assert.equal(p.input.fire,false);assert(client.connected);const x=p.x;await pause(150);assert.equal(p.x,x);
});
test('neutral release bypasses an in-flight input and stale responses cannot unlock its lease',async()=>{
 const calls=[];const network=new GameNetwork(()=>{},()=>{},{fetch:(url,opts)=>new Promise(resolve=>calls.push({url,body:JSON.parse(opts.body),resolve}))});network.closed=false;network.connected=true;network.base='http://localhost';network.token='x';
 const first=network.sendInput({dx:1,dy:0,fire:true});const second=network.releaseInput();assert.equal(calls.length,2);assert(calls[1].body.sequence>calls[0].body.sequence);assert.equal(calls[1].body.input.fire,false);
 calls[0].resolve({status:200});await first;assert(network.busy);calls[1].resolve({status:200});await second;assert(!network.busy);network.disconnect();
});
test('unchanged input is coalesced but changes and urgent stops are sent immediately',async()=>{
 const calls=[];const network=new GameNetwork(()=>{},()=>{},{fetch:async(_url,opts)=>{calls.push(JSON.parse(opts.body));return{status:200};}});network.closed=false;network.connected=true;network.base='http://localhost';
 const input={dx:1,dy:0,fire:false};await network.sendInput(input);await network.sendInput(input);assert.equal(calls.length,1);await network.sendInput({...input,dy:1});assert.equal(calls.length,2);await network.releaseInput();await network.releaseInput();assert.equal(calls.length,4);network.disconnect();
});
