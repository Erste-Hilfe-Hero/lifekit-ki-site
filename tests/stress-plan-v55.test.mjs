import test from 'node:test';import assert from 'node:assert/strict';
import {stressDistribution} from '../tools/stress-plan.mjs';

test('v5.5 stress plan balances realms independently inside each room',()=>{
  for(const clients of [100,250,300,500,1000]){
    const rooms=Math.max(1,Math.ceil(clients/64)),rows=stressDistribution(clients,rooms),counts=new Map();
    for(const row of rows)counts.set(`${row.room}:${row.realm}`,(counts.get(`${row.room}:${row.realm}`)||0)+1);
    assert.equal(rows.length,clients);
    assert.ok(Math.max(...counts.values())<=32,`clients=${clients} max realm shard ${Math.max(...counts.values())}`);
  }
});
