// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import test from 'node:test';
import assert from 'node:assert/strict';
import {ReleaseEvidenceGate} from '../server/production.mjs';

test('v5.7 1000-player evidence accepts certified 14-worker Railway layout',()=>{
  const now=Date.parse('2026-09-24T09:00:00Z');
  const gate=new ReleaseEvidenceGate({now:()=>now,maxAgeMs:30*86400000});
  const recent={passed:true,at:'2026-09-24T02:50:41Z'};
  const result=gate.evaluate({multiNode1000:{...recent,players:1008,nodes:3,workers:14}});
  assert.equal(result.checks.multiNode1000,true);
});

test('v5.7 1000-player evidence still rejects under-provisioned layouts',()=>{
  const now=Date.parse('2026-09-24T09:00:00Z');
  const gate=new ReleaseEvidenceGate({now:()=>now,maxAgeMs:30*86400000});
  const recent={passed:true,at:'2026-09-24T02:50:41Z'};
  assert.equal(gate.evaluate({multiNode1000:{...recent,players:1008,nodes:3,workers:13}}).checks.multiNode1000,false);
});

test('v5.7 six-hour soak evidence requires a real complete distributed end report',()=>{
  const finishedAt='2026-09-24T19:00:00Z',startedAt='2026-09-24T13:00:00Z',targets=Array.from({length:14},(_,i)=>`http://worker-${i+1}.internal:3000`),clientsPerTarget=6;
  const readiness={ok:true,body:{ready:true,storageHealthy:true,stateBackendHealthy:true}};
  const rows=targets.map((baseUrl,index)=>({index,baseUrl,status:'passed',p99Ms:130,clientReport:{status:'passed',connected:clientsPerTarget},targetReadiness:readiness,postCleanupReadiness:readiness}));
  const soak={passed:true,at:finishedAt,hours:6,report:{status:'passed',startedAt,finishedAt,targets,clientsPerTarget,totalClients:84,connected:84,seconds:21600,sloMs:180,maxP99Ms:130,rows}};
  const gate=new ReleaseEvidenceGate({now:()=>Date.parse('2026-09-24T19:01:00Z'),maxAgeMs:30*86400000});
  assert.equal(gate.evaluate({soak}).checks.soak6h,true);
});

test('v5.7 soak evidence fails closed for short, partial, slow or unhealthy reports',()=>{
  const finishedAt='2026-09-24T19:00:00Z',targets=Array.from({length:14},(_,i)=>`http://worker-${i+1}.internal:3000`),clientsPerTarget=6;
  const readiness={ok:true,body:{ready:true,storageHealthy:true,stateBackendHealthy:true}};
  const make=()=>({passed:true,at:finishedAt,hours:6,report:{status:'passed',startedAt:'2026-09-24T13:00:00Z',finishedAt,targets,clientsPerTarget,totalClients:84,connected:84,seconds:21600,sloMs:180,maxP99Ms:130,rows:targets.map((baseUrl,index)=>({index,baseUrl,status:'passed',p99Ms:130,clientReport:{status:'passed',connected:clientsPerTarget},targetReadiness:readiness,postCleanupReadiness:readiness}))}});
  const gate=new ReleaseEvidenceGate({now:()=>Date.parse('2026-09-24T19:01:00Z'),maxAgeMs:30*86400000});
  const check=soak=>gate.evaluate({soak}).checks.soak6h;
  const short=make();short.report.startedAt='2026-09-24T13:01:00Z';assert.equal(check(short),false);
  const partial=make();partial.report.connected=83;assert.equal(check(partial),false);
  const slow=make();slow.report.maxP99Ms=181;assert.equal(check(slow),false);
  const unhealthy=make();unhealthy.report.rows[0]={...unhealthy.report.rows[0],postCleanupReadiness:{ok:false,body:{ready:false,storageHealthy:false,stateBackendHealthy:true}}};assert.equal(check(unhealthy),false);
  const noReport={passed:true,at:finishedAt,hours:6};assert.equal(check(noReport),false);
});
