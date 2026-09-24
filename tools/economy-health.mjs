#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-Nyrathen-Proprietary
import {DatabaseSync} from 'node:sqlite';
import {EconomyLedger,EconomyHealthPolicy} from '../server/production.mjs';
const db=new DatabaseSync(':memory:');const ledger=new EconomyLedger(db);let balance=100000,sources=0,sinks=0,duplicates=0;
try{
 for(let i=0;i<1000;i++){
  const gain=20+(i%7),spend=18+(i%5);sources+=gain;sinks+=spend;balance+=gain-spend;
  const tx='econ-'+i;const a=ledger.run({txId:tx,playerId:'sim-'+(i%100),kind:'loop',payload:{gain,spend}},()=>true);if(a.duplicate)throw new Error('first tx duplicate');
  const b=ledger.run({txId:tx,playerId:'sim-'+(i%100),kind:'loop',payload:{gain,spend}},()=>true);if(!b.duplicate)throw new Error('duplicate receipt executed');duplicates+=b.duplicate?0:1;
 }
 const policy=new EconomyHealthPolicy({maxSourceSinkRatio:1.35,maxDailyInflation:.10});const result=policy.evaluate({sources,sinks,supplyBefore:100000,supplyAfter:balance,duplicateReceipts:duplicates});if(!result.ok)throw new Error('synthetic economy policy breach '+JSON.stringify(result));console.log(JSON.stringify({ok:true,transactions:1000,sources,sinks,supplyBefore:100000,supplyAfter:balance,...result},null,2));
}finally{db.close();}
