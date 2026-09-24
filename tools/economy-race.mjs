#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {once} from 'node:events';
import {createGameServer} from '../server/server.mjs';
import {makeItem} from '../shared/realm-data.mjs';
import {PROTOCOL} from '../shared/data.mjs';
const app=createGameServer({dataPath:':memory:',sessionRateLimit:10000});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
async function req(path,token,value){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(value)});return{status:r.status,data:await r.json()};}
async function login(name){const r=await req('/api/session','',{protocol:PROTOCOL,name,classId:'weaver',room:'RACE'});if(r.status!==200)throw new Error('login '+r.status);return r.data;}
try{
 const a=await login('RaceA'),b=await login('RaceB'),e=app.rooms.get('RACE').engine,p=e.players.get(a.playerId),q=e.players.get(b.playerId);p.inventory=[makeItem('race-a','weaver','weapon',2,1)];q.inventory=[makeItem('race-b','weaver','charm',3,2)];
 let r=await req('/api/action',a.token,{type:'tradeInvite',playerId:b.playerId,requestId:'race_invite_0001'});if(!r.data.accepted)throw new Error('invite rejected');const trade=e.tradeFor(a.playerId);r=await req('/api/action',b.token,{type:'tradeAccept',tradeId:trade.id,requestId:'race_accept_0001'});if(!r.data.accepted)throw new Error('accept rejected');await req('/api/action',a.token,{type:'tradeOffer',tradeId:trade.id,itemIds:['race-a'],requestId:'race_offer_a_001'});await req('/api/action',b.token,{type:'tradeOffer',tradeId:trade.id,itemIds:['race-b'],requestId:'race_offer_b_001'});
 const revision=trade.revision;await req('/api/action',a.token,{type:'tradeConfirm',tradeId:trade.id,revision,requestId:'race_confirm_a1'});
 const burst=await Promise.all(Array.from({length:8},()=>req('/api/action',b.token,{type:'tradeConfirm',tradeId:trade.id,revision,requestId:'race_confirm_b1'})));
 if(burst.some(x=>x.status!==200||x.data.accepted!==true))throw new Error('duplicate confirmation was not idempotent');const ra=app.store.find(a.token).profile,rb=app.store.find(b.token).profile,ids=[...ra.inventory,...rb.inventory,...ra.vault,...rb.vault].map(x=>x.id);if(ids.filter(x=>x==='race-a').length!==1||ids.filter(x=>x==='race-b').length!==1)throw new Error('item duplication/loss');const ledger=app.store.db.prepare("SELECT COUNT(*) AS n FROM economy_ledger WHERE tx_id=?").get('action:'+b.playerId+':race_confirm_b1').n;if(ledger!==1)throw new Error('economy ledger duplicated');
 console.log(JSON.stringify({ok:true,duplicateRequests:8,itemCopies:{raceA:ids.filter(x=>x==='race-a').length,raceB:ids.filter(x=>x==='race-b').length},ledgerRows:ledger},null,2));
}finally{await app.close();}
