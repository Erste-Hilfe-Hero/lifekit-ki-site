#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Deterministic local adversarial API audit. Never targets an external host.
import {once} from 'node:events';
import {createGameServer} from '../server/server.mjs';
import {PROTOCOL} from '../shared/data.mjs';
const app=createGameServer({dataPath:':memory:',sessionRateLimit:10000,maxSessions:128,metricsToken:'m'.repeat(40)});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
let cases=0,fiveHundreds=0;const check=async(path,options={},allowed=[400,401,403,404,405,409,413,415,422,429,503])=>{const r=await fetch(base+path,{...options,signal:AbortSignal.timeout(4000)});await r.arrayBuffer();cases++;if(r.status>=500&&r.status!==503)fiveHundreds++;if(r.status>=500&&r.status!==503)throw new Error(`${options.method||'GET'} ${path} -> ${r.status}`);if(r.status<400&&!allowed.includes(r.status))throw new Error(`Unexpected success ${options.method||'GET'} ${path} -> ${r.status}`);return r.status;};
try{
 for(let i=0;i<40;i++){
  await check('/api/input',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer invalid-'+i},body:JSON.stringify({sequence:i,input:{dx:99,dy:-99,fire:true}})});
  await check('/api/action',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer invalid-'+i},body:JSON.stringify({type:'__proto__',requestId:'r'+i})});
  await check('/api/session',{method:'POST',headers:{'content-type':'application/json',Origin:'https://evil.invalid'},body:JSON.stringify({protocol:PROTOCOL,name:'X',classId:'warden',room:'ASH01'})});
 }
 const created=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({protocol:PROTOCOL,name:'Audit',classId:'warden',room:'ASH01'})});const s=await created.json();if(created.status!==200)throw new Error('session setup failed');
 for(let i=0;i<50;i++){
  const sequence=i+1;const r=await fetch(base+'/api/input',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+s.token},body:JSON.stringify({sequence,input:{dx:.2,dy:.1,fire:false}})});await r.arrayBuffer();cases++;if(r.status>=500)throw new Error('valid input 5xx');
  await check('/api/input',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+s.token},body:JSON.stringify({sequence,input:{dx:.2,dy:.1,fire:false}})});
 }
 // Commerce abuse surface: malformed products/providers/receipts, wishlist/spend/event tampering and replay-shaped inputs must fail closed without 5xx.
 const auth={authorization:'Bearer '+s.token,'content-type':'application/json'};
 for(let i=0;i<20;i++){
  await check('/api/store/verify',{method:'POST',headers:auth,body:JSON.stringify({provider:i%2?'apple':'google',productId:'nyr.invalid.'+i,receipt:'x'.repeat(64)})});
  await check('/api/store/verify',{method:'POST',headers:auth,body:JSON.stringify({provider:'bogus',productId:'nyr.shards.180',receipt:'x'.repeat(64)})});
  await check('/api/store/wishlist',{method:'POST',headers:auth,body:JSON.stringify({productId:'__proto__'+i,enabled:true})});
  await check('/api/store/spend',{method:'POST',headers:auth,body:JSON.stringify({offerId:'unknown-'+i,requestId:'sec-'+i})});
  await check('/api/store/event',{method:'POST',headers:auth,body:JSON.stringify({event:'purchase_complete_'+i,productId:'nyr.shards.180'})});
 }
 for(const p of ['/../server/server.mjs','/%2e%2e/%2e%2e/etc/passwd','/server/store.mjs','/.env','/package.json'])await check(p,{},[404]);
 const health=await fetch(base+'/healthz');if(!health.ok||fiveHundreds)throw new Error(`audit failed health=${health.status} 5xx=${fiveHundreds}`);
 console.log(JSON.stringify({ok:true,cases,fiveHundreds,health:health.status,checks:['auth','origin','sequence-replay','prototype-like-actions','path-traversal','source-secrecy','commerce-invalid-product','commerce-invalid-provider','commerce-invalid-receipt','commerce-wishlist','commerce-spend','commerce-event']},null,2));
}finally{await app.close();}
