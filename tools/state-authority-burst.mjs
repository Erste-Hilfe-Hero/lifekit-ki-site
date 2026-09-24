#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
// Capacity certification for the central v5.5 state authority, independent of realtime rendering/SSE CPU.
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createStateAuthority} from '../server/state-authority.mjs';
import {StateAuthorityClient} from '../server/state-client.mjs';

const total=Number(process.env.STATE_BURST_ACCOUNTS||1000);
const concurrency=Number(process.env.STATE_BURST_CONCURRENCY||100);
const p99Slo=Number(process.env.STATE_BURST_P99_SLO_MS||750);
if(!Number.isInteger(total)||total<10||total>20000)throw new Error('STATE_BURST_ACCOUNTS invalid');
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>1000)throw new Error('STATE_BURST_CONCURRENCY invalid');
const secret=randomBytes(48).toString('base64url');
const app=createStateAuthority({dataPath:':memory:',secret,nodeDeadMs:2500,leaseTtlMs:10000});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
const url=`http://127.0.0.1:${app.server.address().port}`;
const latencies=[];let created=0,failed=0;const errors=[];
const nodeCount=16,nodeClients=Array.from({length:nodeCount},(_,i)=>new StateAuthorityClient({url,secret,nodeId:`burst-${i}`,timeoutMs:10000}));
const leasesByNode=Array.from({length:nodeCount},()=>[]),heartbeatLatencies=[];
const started=performance.now();
try{
  for(let start=0;start<total;start+=concurrency){
    const count=Math.min(concurrency,total-start);
    const rows=await Promise.all(Array.from({length:count},async(_,offset)=>{
      const index=start+offset,node=index%nodeCount,client=nodeClients[node],t0=performance.now();
      try{
        const opened=await client.openSession({name:`Burst${index}`,classId:'warden'});
        if(!opened?.record?.id||!opened?.record?.token||!opened?.lease?.epoch)throw new Error('invalid session.open result');
        leasesByNode[node].push({accountId:opened.record.id,epoch:opened.lease.epoch});
        return {ok:true,ms:performance.now()-t0};
      }catch(error){return{ok:false,ms:performance.now()-t0,error:error.message};}
    }));
    for(const row of rows){latencies.push(row.ms);if(row.ok)created++;else{failed++;if(errors.length<20)errors.push(row.error);}}
  }
  const heartbeatRows=await Promise.all(nodeClients.map(async(client,node)=>{const t0=performance.now();try{const leases=leasesByNode[node],result=await client.heartbeatBatch(leases.length,leases);return{ok:result?.lost?.length===0,ms:performance.now()-t0,lost:result?.lost?.length||0};}catch(error){return{ok:false,ms:performance.now()-t0,error:error.message};}}));
  for(const row of heartbeatRows){heartbeatLatencies.push(row.ms);if(!row.ok){failed++;if(errors.length<20)errors.push(row.error||`heartbeat lost ${row.lost}`);}}
  const health=await(await fetch(url+'/healthz')).json();
  const sorted=[...latencies].sort((a,b)=>a-b),q=(values,p)=>values[Math.min(values.length-1,Math.floor((values.length-1)*p))]||0,hbSorted=[...heartbeatLatencies].sort((a,b)=>a-b);
  const elapsed=performance.now()-started;
  const report={status:failed===0&&created===total&&health.accounts===total&&q(sorted,.99)<=p99Slo?'passed':'failed',kind:'central-state-authority-account-burst',accounts:total,concurrency,nodeCount,created,failed,elapsedMs:Number(elapsed.toFixed(2)),throughputPerSecond:Number((created/(elapsed/1000)).toFixed(2)),latencyMs:{p50:Number(q(sorted,.5).toFixed(2)),p95:Number(q(sorted,.95).toFixed(2)),p99:Number(q(sorted,.99).toFixed(2)),max:Number((sorted.at(-1)||0).toFixed(2)),sloP99:p99Slo},heartbeatBatchMs:{p50:Number(q(hbSorted,.5).toFixed(2)),p95:Number(q(hbSorted,.95).toFixed(2)),p99:Number(q(hbSorted,.99).toFixed(2)),max:Number((hbSorted.at(-1)||0).toFixed(2)),requests:heartbeatRows.length},authority:{accounts:health.accounts,nodes:health.nodes,requests:health.requests,rejected:health.rejected,opCounts:health.opCounts||{}},errors};
  const dir=resolve(process.env.NYRATHEN_TEST_REPORT_DIR||'release/verification/v5.5/state-authority-burst');mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,'summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;
}finally{await app.close();}
