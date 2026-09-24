#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Deterministic local protocol robustness test. Never targets an external host.
import {once} from 'node:events';
import {createGameServer} from '../server/server.mjs';
const app=createGameServer({dataPath:':memory:',sessionRateLimit:10000,maxSessions:256});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
const cases=[
 ['/api/session','POST','application/json','{'],['/api/session','POST','text/plain','{}'],['/api/input','POST','application/json','{}'],['/api/action','POST','application/json',JSON.stringify({type:'x'.repeat(1000)})],['/api/store/verify','POST','application/json','{'],['/api/store/wishlist','POST','application/json',JSON.stringify({productId:'x'.repeat(2000)})],['/api/store/spend','POST','application/json',JSON.stringify({offerId:'__proto__'})],['/api/store/event','POST','application/json',JSON.stringify({event:'x'.repeat(1000)})],['/'+ 'a'.repeat(2500),'GET',null,null],['/api/%00','GET',null,null],['/api/session','PATCH','application/json','{}'],['/metrics','POST','application/json','{}']
];
let fiveHundreds=0,completed=0;try{for(let round=0;round<40;round++)for(const [path,method,ct,body] of cases){const headers={Origin:'https://app.nyrathen.local'};if(ct)headers['content-type']=ct;let res;try{res=await fetch(base+path,{method,headers,body:body??undefined});await res.arrayBuffer();completed++;if(res.status>=500)fiveHundreds++;}catch(e){throw new Error(`Fuzz transport failed: ${e.message}`);}}const health=await fetch(base+'/healthz');const state=await health.json();if(!state.ok||fiveHundreds)throw new Error(`Fuzz failures: 5xx=${fiveHundreds}, health=${health.status}`);console.log(JSON.stringify({ok:true,cases:completed,fiveHundreds,health:health.status},null,2));}finally{await app.close();}
