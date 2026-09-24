// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createStateAuthority} from '../server/state-authority.mjs';
import {StateAuthorityClient} from '../server/state-client.mjs';
const secret='s'.repeat(48);
async function serve(t){const app=createStateAuthority({dataPath:':memory:',secret,leaseTtlMs:1000});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base=`http://127.0.0.1:${app.server.address().port}`;t.after(()=>app.close());return{app,base,client:new StateAuthorityClient({url:base,secret,nodeId:'game-a'})};}

test('v5.5 state authority authenticates RPC and persists profiles centrally',async t=>{const{client}=await serve(t);const created=await client.create('Aster','ranger');assert.equal(created.profile.name,'Aster');const found=await client.find(created.token);assert.equal(found.id,created.id);found.profile.fame=123;await client.save(found.id,found.profile);assert.equal((await client.find(created.token)).profile.fame,123);});

test('v5.5 state authority rejects unsigned RPC',async t=>{const{base}=await serve(t);const r=await fetch(base+'/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'social.load',args:{}})});assert.equal(r.status,401);});

test('v5.5 state authority leases prevent split brain and allow expiry failover',async t=>{const{base,client:a}=await serve(t);const b=new StateAuthorityClient({url:base,secret,nodeId:'game-b'});const p=await a.create('Lease','ranger');const la=await a.acquireLease(p.id);assert.ok(la);assert.equal(await b.acquireLease(p.id),null);await new Promise(r=>setTimeout(r,1125));const lb=await b.acquireLease(p.id);assert.equal(lb.nodeId,'game-b');assert(lb.epoch>la.epoch);});

test('v5.5 state authority action receipts and economy commits are idempotent',async t=>{const{client,app}=await serve(t);const p=await client.create('Econ','ranger'),hash='h'.repeat(64);await client.persistBatch({profiles:[{id:p.id,profile:p.profile}],receipt:{playerId:p.id,requestId:'request_0001',hash,accepted:true},economyTx:{txId:'action:'+p.id+':request_0001',playerId:p.id,kind:'salvage',payload:{type:'salvage',requestId:'request_0001'}}});const receipt=await client.receipt(p.id,'request_0001');assert.equal(receipt.hash,hash);assert.equal(app.store.db.prepare('SELECT COUNT(*) n FROM economy_ledger').get().n,1);await client.persistBatch({profiles:[],receipt:{playerId:p.id,requestId:'request_0001',hash,accepted:true},economyTx:{txId:'action:'+p.id+':request_0001',playerId:p.id,kind:'salvage',payload:{type:'salvage',requestId:'request_0001'}}});assert.equal(app.store.db.prepare('SELECT COUNT(*) n FROM economy_ledger').get().n,1);});

test('v5.5 social revision rejects stale multi-node writes',async t=>{const{base,client:a}=await serve(t);const b=new StateAuthorityClient({url:base,secret,nodeId:'game-b'});const s=await a.loadSocial();assert.equal(s.revision,0);const state={version:2,guilds:[],friends:[],friendRequests:[]};const saved=await a.saveSocial(state,0);assert.equal(saved.revision,1);await assert.rejects(()=>b.saveSocial(state,0),/social revision conflict/);});

test('v5.5 global social lock serializes GameServer mutations',async t=>{const{base,client:a}=await serve(t);const b=new StateAuthorityClient({url:base,secret,nodeId:'game-b'});const l=await a.acquireLock('social');assert.ok(l);assert.equal(await b.acquireLock('social'),null);assert.equal((await a.releaseLock('social',l.epoch)).released,true);assert.ok(await b.acquireLock('social'));});

test('v5.5 dead GameServer heartbeat allows fast lease takeover before TTL expiry',async t=>{const app=createStateAuthority({dataPath:':memory:',secret,leaseTtlMs:10000,nodeDeadMs:80});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`,a=new StateAuthorityClient({url:base,secret,nodeId:'dead-a'}),b=new StateAuthorityClient({url:base,secret,nodeId:'live-b'}),p=await a.create('DeadNode','ranger');await a.heartbeat();await b.heartbeat();const first=await a.acquireLease(p.id);assert.ok(first);assert.equal(await b.acquireLease(p.id),null);await new Promise(r=>setTimeout(r,100));await b.heartbeat();const takeover=await b.acquireLease(p.id);assert.equal(takeover.nodeId,'live-b');assert(takeover.epoch>first.epoch);});


test('v5.5 graceful node.down releases account ownership for immediate rolling-update takeover',async t=>{
 const{base,client:a}=await serve(t),first=await a.openSession({name:'Drain',classId:'ranger'}),b=new StateAuthorityClient({url:base,secret,nodeId:'node-b'});
 assert.equal((await b.openSession({token:first.record.token})).busy,true);
 await a.nodeDown();
 const takeover=await b.openSession({token:first.record.token});assert.equal(takeover.record.id,first.record.id);assert.equal(takeover.lease.nodeId,'node-b');
});

test('v5.6 guest session opens are batched into durable transactions under burst load',async t=>{
 const app=createStateAuthority({dataPath:':memory:',secret,guestOpenBatchMs:4,guestOpenBatchMax:128});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());
 const base=`http://127.0.0.1:${app.server.address().port}`;
 const rows=await Promise.all(Array.from({length:96},(_,i)=>new StateAuthorityClient({url:base,secret,nodeId:'batch-'+(i%3),timeoutMs:10000}).openSession({name:'Batch'+i,classId:'ranger'})));
 assert.equal(rows.length,96);assert.equal(new Set(rows.map(r=>r.record.id)).size,96);assert(rows.every(r=>r.lease?.epoch));
 const health=await(await fetch(base+'/healthz')).json();assert.equal(health.accounts,96);assert(health.guestOpenBatches<96);assert(health.guestOpenMaxBatch>1);assert.equal(health.guestOpenQueueDepth,0);
});

test('v5.6 GameServer client coalesces concurrent guest opens into batched authority RPCs',async t=>{
 const app=createStateAuthority({dataPath:':memory:',secret,guestOpenBatchMs:3,guestOpenBatchMax:128});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());
 const base=`http://127.0.0.1:${app.server.address().port}`,client=new StateAuthorityClient({url:base,secret,nodeId:'batch-client',guestOpenBatchMs:3,guestOpenBatchMax:64});
 const rows=await Promise.all(Array.from({length:48},(_,i)=>client.openSession({name:'RpcBatch'+i,classId:'ranger'})));
 assert.equal(rows.length,48);assert.equal(new Set(rows.map(r=>r.record.id)).size,48);
 const health=await(await fetch(base+'/healthz')).json();assert.equal(health.accounts,48);assert.equal(health.opCounts['session.open']||0,0);assert((health.opCounts['session.openBatch']||0)<48);
});

test('v5.7 commerce receipt replay is idempotent and wrong account or product is rejected',async t=>{
 const{client}=await serve(t),a=await client.create('BuyerA','ranger'),b=await client.create('BuyerB','weaver');
 const productId='nyr.shards.1100',grant={productId,kind:'currency',shards:1100,characterSlots:0,vaultPages:0,skin:null,weaponStyle:null,petStyle:null,title:null,emote:null,seasonId:null,founder:false};
 a.profile.account.commerce.shards=1100;
 const first=await client.commerceRedeem({provider:'apple',transactionId:'tx-replay-1',playerId:a.id,productId,profile:a.profile,grant});assert.equal(first.duplicate,false);
 const again=await client.commerceRedeem({provider:'apple',transactionId:'tx-replay-1',playerId:a.id,productId,profile:a.profile,grant});assert.equal(again.duplicate,true);
 await assert.rejects(()=>client.commerceRedeem({provider:'apple',transactionId:'tx-replay-1',playerId:b.id,productId,profile:b.profile,grant}),/store transaction already owned/);
 await assert.rejects(()=>client.commerceRedeem({provider:'apple',transactionId:'tx-replay-1',playerId:a.id,productId:'nyr.bundle.wanderer',profile:a.profile,grant}),/store transaction already owned/);
});

test('v5.7 concurrent refund requests are idempotent and revoke the entitlement once',async t=>{
 const{client}=await serve(t),a=await client.create('RefundRace','ranger'),productId='nyr.shards.1100',grant={productId,kind:'currency',shards:1100,characterSlots:0,vaultPages:0,skin:null,weaponStyle:null,petStyle:null,title:null,emote:null,seasonId:null,founder:false};
 a.profile.account.commerce.shards=1100;await client.commerceRedeem({provider:'google',transactionId:'gp-refund-race',playerId:a.id,productId,profile:a.profile,grant});
 const rows=await Promise.all([client.commerceRevoke('google','gp-refund-race','test','race'),client.commerceRevoke('google','gp-refund-race','test','race')]);
 assert(rows.some(x=>x.revoked===true));assert(rows.some(x=>x.duplicate===true));
 const receipt=await client.commerceReceipt('google','gp-refund-race');assert.equal(receipt.status,'REVOKED');
 const after=await client.find(a.token);assert.equal(after.profile.account.commerce.shards,0);
});
